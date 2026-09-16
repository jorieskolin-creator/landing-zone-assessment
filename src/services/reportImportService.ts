import type { DiagnosticResult, PersonaId } from '../types';

export type ReportImportResult =
  | { kind: 'report'; result: DiagnosticResult }
  | { kind: 'not_report' }
  | { kind: 'invalid_report'; error: string };

const PACK_PERSONA_IDS = ['ciso_leadership', 'platform_owner', 'security_owners', 'application_delivery'] as const;
const LEGACY_PERSONA_ID_MAP: Record<string, (typeof PACK_PERSONA_IDS)[number]> = {
  finops_lead: 'ciso_leadership',
  cfo: 'ciso_leadership',
  engineering_lead: 'platform_owner',
};

export const isDiagnosticResultPayload = (payload: unknown): payload is DiagnosticResult => {
  if (!payload || typeof payload !== 'object') return false;
  const value = payload as Partial<DiagnosticResult>;
  const phase2 = value.phase_2_validation;
  return Boolean(
    value.meta &&
    value.phase_1_audit_logs &&
    phase2?.resolution_maturity?.mode === 'ACTIVE' &&
    phase2?.assessment_sufficiency?.scoring_authority === true &&
    typeof phase2?.metrics?.assessment_resolution === 'number' &&
    value.phase_3_strategy &&
    value.quality_gate
  );
};

const REPORT_DATA_SCRIPT_RE = /<script\b(?=[^>]*\bid\s*=\s*["'](?:lz-assessment-data|finops-data)["'])[^>]*>([\s\S]*?)<\/script>/i;

const extractReportPayloadScript = (html: string): string | null => {
  if (typeof DOMParser !== 'undefined') {
    try {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const script = doc.querySelector('script#lz-assessment-data, script#finops-data');
      const text = script?.textContent?.trim();
      if (text) return text;
    } catch {
      // Fall back to regex extraction for malformed browser-saved HTML.
    }
  }
  const match = html.match(REPORT_DATA_SCRIPT_RE);
  return match?.[1]?.trim() || null;
};

const looksLikeDiagnosticAttempt = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') return false;
  const value = payload as Record<string, unknown>;
  return 'phase_1_audit_logs' in value
    || 'phase_2_validation' in value
    || 'phase_3_strategy' in value
    || 'quality_gate' in value;
};

const remapImportedPersonas = (result: DiagnosticResult): DiagnosticResult => {
  const strategy = result.phase_3_strategy as DiagnosticResult['phase_3_strategy'] & {
    executive_summaries?: Record<string, unknown>;
    executive_summary?: string;
    active_persona?: string;
  };
  if (!strategy || typeof strategy !== 'object') return result;
  const incoming = strategy.executive_summaries;
  const fallback = typeof strategy.executive_summary === 'string' ? strategy.executive_summary : '';
  const summaries = Object.fromEntries(PACK_PERSONA_IDS.map((id) => [id, ''])) as Record<(typeof PACK_PERSONA_IDS)[number], string>;
  if (incoming && typeof incoming === 'object') {
    for (const [key, value] of Object.entries(incoming)) {
      const packKey = (PACK_PERSONA_IDS as readonly string[]).includes(key);
      const id = packKey ? key as (typeof PACK_PERSONA_IDS)[number] : LEGACY_PERSONA_ID_MAP[key];
      if (!id || typeof value !== 'string' || value.length === 0) continue;
      if (!summaries[id] || packKey) summaries[id] = value;
    }
  }
  const first = PACK_PERSONA_IDS.find((id) => summaries[id].length > 0);
  const fill = first ? summaries[first] : fallback;
  for (const id of PACK_PERSONA_IDS) {
    if (!summaries[id]) summaries[id] = fill;
  }
  const active = strategy.active_persona;
  const mappedActive = (PACK_PERSONA_IDS as readonly string[]).includes(active || '')
    ? active as PersonaId
    : (active ? LEGACY_PERSONA_ID_MAP[active] : undefined) || 'ciso_leadership';
  return {
    ...result,
    phase_3_strategy: {
      ...strategy,
      executive_summaries: summaries,
      executive_summary: summaries.ciso_leadership || fallback,
      active_persona: mappedActive,
    },
  };
};

export const parseDiagnosticResultJson = (jsonText: string): ReportImportResult => {
  try {
    const parsed = JSON.parse(jsonText);
    if (isDiagnosticResultPayload(parsed)) {
      return { kind: 'report', result: remapImportedPersonas(parsed) };
    }
    if (looksLikeDiagnosticAttempt(parsed)) {
      return { kind: 'invalid_report', error: 'The embedded Landing Zone report payload is incomplete or uses an inactive historical maturity contract.' };
    }
    return { kind: 'not_report' };
  } catch {
    return { kind: 'invalid_report', error: 'The embedded Landing Zone report payload could not be parsed.' };
  }
};

export const extractDiagnosticResultFromHtmlReport = (html: string): ReportImportResult => {
  const payload = extractReportPayloadScript(html);
  if (!payload) return { kind: 'not_report' };
  return parseDiagnosticResultJson(payload);
};

export const serializeDiagnosticResultForHtml = (result: DiagnosticResult): string =>
  JSON.stringify(result)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
