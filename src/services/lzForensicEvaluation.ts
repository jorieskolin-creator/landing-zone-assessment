/**
 * Work 8 — Landing Zone forensic evaluation overlay.
 *
 * Pure, deterministic, and independent of packetization, pair math, and model
 * output schemas. The copied kernel already runs 8×5×5 batches, three
 * sub-criteria, locator-bound quotes, independent verification, and bounded
 * rescans. This module stamps evidence class from cited chunks and applies
 * evidence-authority limits plus class-contradiction flags.
 *
 * Models never have to emit evidence_class. Chunk class always wins over a
 * model-supplied value.
 */
import type {
  AuditItem,
  CriterionQuestionResult,
  EvidenceCheckItem,
  EvidenceQuote,
  LzEvidenceClass,
  LzEvidenceClassContradiction,
  LzEvidenceClassContradictionKind,
  LzEvidenceAuthorityCap,
  SourceChunk,
} from '../types';

export const LZ_EVIDENCE_CLASSES: readonly LzEvidenceClass[] = ['platform', 'document', 'workshop'];
export const LZ_EVIDENCE_CLASS_RANK: Record<LzEvidenceClass, number> = {
  platform: 3,
  document: 2,
  workshop: 1,
};
export const LZ_FORENSIC_EVALUATION_SCHEMA = 'lz_forensic_evaluation_v1';

export interface LzClassifiedChunk {
  chunk_id: string;
  source_id: string;
  evidence_class?: LzEvidenceClass | string;
}

export interface LzForensicRegistry {
  chunks?: LzClassifiedChunk[];
}

export interface LzForensicAuthorityEvent {
  stream: 'maturity' | 'antipattern';
  id: string;
  from_count: number;
  to_count: number;
  strongest_class: LzEvidenceClass | 'none';
  reason: LzEvidenceAuthorityCap['reason'];
}

export interface LzForensicContradictionEvent {
  stream: 'maturity' | 'antipattern';
  id: string;
  classes: LzEvidenceClass[];
  kinds: LzEvidenceClassContradictionKind[];
}

export interface LzForensicEvaluationSummary {
  schema: typeof LZ_FORENSIC_EVALUATION_SCHEMA;
  authority_caps: LzForensicAuthorityEvent[];
  contradictions: LzForensicContradictionEvent[];
}

export interface LzForensicPhase1 {
  phase_1_audit_logs: {
    maturity: Record<string, any>;
    antipattern: Record<string, any>;
  };
  evidence_check?: {
    items?: EvidenceCheckItem[];
  };
  meta?: Record<string, any>;
}

export const isLzEvidenceClass = (value: unknown): value is LzEvidenceClass =>
  value === 'platform' || value === 'document' || value === 'workshop';

export const strongestEvidenceClass = (
  classes: Array<LzEvidenceClass | undefined>,
): LzEvidenceClass | undefined => {
  let strongest: LzEvidenceClass | undefined;
  for (const evidenceClass of classes) {
    if (!isLzEvidenceClass(evidenceClass)) continue;
    if (!strongest || LZ_EVIDENCE_CLASS_RANK[evidenceClass] > LZ_EVIDENCE_CLASS_RANK[strongest]) {
      strongest = evidenceClass;
    }
  }
  return strongest;
};

export const contradictionKindsFor = (
  classes: Iterable<LzEvidenceClass>,
): LzEvidenceClassContradictionKind[] => {
  const present = new Set(classes);
  const kinds: LzEvidenceClassContradictionKind[] = [];
  if (present.has('platform') && present.has('document')) kinds.push('platform_document');
  if (present.has('platform') && present.has('workshop')) kinds.push('platform_workshop');
  if (present.has('document') && present.has('workshop')) kinds.push('document_workshop');
  return kinds;
};

const uniqueClasses = (classes: Array<LzEvidenceClass | undefined>): LzEvidenceClass[] => {
  const present: LzEvidenceClass[] = [];
  for (const evidenceClass of LZ_EVIDENCE_CLASSES) {
    if (classes.includes(evidenceClass)) present.push(evidenceClass);
  }
  return present;
};

const rewriteQuestionResultsToCount = (
  results: unknown,
  maxSupported: number,
  fallbackSupported: number,
): CriterionQuestionResult[] => {
  const source = Array.isArray(results) && results.length === 3
    ? results.map((result) => (
      result === 'supported' || result === 'not_supported' || result === 'unknown'
        ? result
        : 'unknown'
    )) as CriterionQuestionResult[]
    : Array.from({ length: 3 }, (_, index) => (
      index < fallbackSupported ? 'supported' : 'unknown'
    )) as CriterionQuestionResult[];
  if (maxSupported <= 0) return ['unknown', 'unknown', 'unknown'];
  let supported = 0;
  return source.map((result) => {
    if (result !== 'supported') return result;
    if (supported < maxSupported) {
      supported += 1;
      return 'supported';
    }
    return 'unknown';
  });
};

const supportedCount = (results: CriterionQuestionResult[]): number =>
  results.filter((result) => result === 'supported').length;

const capabilityStatus = (count: number): AuditItem['status'] => {
  if (count === 3) return 'OK';
  if (count === 0) return 'NOK';
  return 'Partial';
};

const antipatternStatus = (count: number): AuditItem['status'] => {
  if (count === 0) return 'OK';
  if (count === 3) return 'NOK';
  return 'Partial';
};

const classLookup = (registry: LzForensicRegistry | undefined) => {
  const chunksById = new Map<string, LzClassifiedChunk>();
  const classBySourceId = new Map<string, LzEvidenceClass>();
  for (const chunk of registry?.chunks || []) {
    if (!chunk || typeof chunk.chunk_id !== 'string') continue;
    chunksById.set(chunk.chunk_id, chunk);
    if (!isLzEvidenceClass(chunk.evidence_class) || !chunk.source_id) continue;
    const existing = classBySourceId.get(chunk.source_id);
    if (!existing || LZ_EVIDENCE_CLASS_RANK[chunk.evidence_class] > LZ_EVIDENCE_CLASS_RANK[existing]) {
      classBySourceId.set(chunk.source_id, chunk.evidence_class);
    }
  }
  return { chunksById, classBySourceId };
};

export const resolveQuoteEvidenceClass = (
  quote: Partial<EvidenceQuote> | undefined,
  registry: LzForensicRegistry | undefined,
): LzEvidenceClass | undefined => {
  if (!quote) return undefined;
  const { chunksById, classBySourceId } = classLookup(registry);
  const chunk = typeof quote.chunk_id === 'string' ? chunksById.get(quote.chunk_id) : undefined;
  if (isLzEvidenceClass(chunk?.evidence_class)) return chunk.evidence_class;
  if (typeof quote.source_id === 'string' && classBySourceId.has(quote.source_id)) {
    return classBySourceId.get(quote.source_id);
  }
  return isLzEvidenceClass(quote.evidence_class) ? quote.evidence_class : undefined;
};

export const stampQuoteEvidenceClass = (
  quote: EvidenceQuote,
  registry: LzForensicRegistry | undefined,
): EvidenceQuote => {
  const evidenceClass = resolveQuoteEvidenceClass(quote, registry);
  if (!evidenceClass) {
    if (!quote.evidence_class) return quote;
    const { evidence_class: _dropped, ...rest } = quote;
    return rest;
  }
  return { ...quote, evidence_class: evidenceClass };
};

const appendAdjustment = (existing: unknown, note: string): string => {
  const prior = typeof existing === 'string' && existing.trim() ? existing.trim() : '';
  return prior && !prior.includes(note) ? `${prior} ${note}` : note;
};

const applyCountCap = (
  item: any,
  stream: 'maturity' | 'antipattern',
  maxCount: number,
  strongest: LzEvidenceClass | undefined,
  reason: LzEvidenceAuthorityCap['reason'],
): { item: any; event: LzForensicAuthorityEvent } => {
  const fromCount = Number.isInteger(item.count) ? item.count : 0;
  const questionResults = rewriteQuestionResultsToCount(item.question_results, maxCount, fromCount);
  const toCount = supportedCount(questionResults);
  const cap: LzEvidenceAuthorityCap = {
    schema: 'lz_evidence_authority_v1',
    from_count: fromCount,
    to_count: toCount,
    strongest_class: strongest || 'none',
    reason,
  };
  const next = {
    ...item,
    count: toCount,
    question_results: questionResults,
    assessment_status: 'assessed',
    is_silent: false,
    status: stream === 'antipattern' ? antipatternStatus(toCount) : capabilityStatus(toCount),
    original_count: Number.isInteger(item.original_count) ? item.original_count : fromCount,
    verified_count: toCount,
    lz_authority_cap: cap,
    adjustment_reason: appendAdjustment(
      item.adjustment_reason,
      `Landing Zone evidence-authority cap: ${reason} (${fromCount}→${toCount}).`,
    ),
  };
  return {
    item: next,
    event: {
      stream,
      id: '',
      from_count: fromCount,
      to_count: toCount,
      strongest_class: cap.strongest_class,
      reason,
    },
  };
};

const rewriteTestedAbsence = (
  item: any,
  strongest: LzEvidenceClass | undefined,
): { item: any; event: LzForensicAuthorityEvent } => {
  const fromCount = Number.isInteger(item.count) ? item.count : 0;
  const cap: LzEvidenceAuthorityCap = {
    schema: 'lz_evidence_authority_v1',
    from_count: fromCount,
    to_count: 0,
    strongest_class: strongest || 'none',
    reason: 'tested_absence_requires_platform_evidence',
  };
  const coverage = 'Tested absence requires Class 1 (platform) coverage. Document or workshop material cannot prove a control-plane anti-pattern is absent.';
  return {
    item: {
      ...item,
      count: 0,
      status: 'OK',
      evidence_quotes: [],
      assessment_status: 'not_assessed',
      question_results: ['unknown', 'unknown', 'unknown'],
      is_silent: true,
      antipattern_absence_status: 'unknown_absent',
      coverage_reason: coverage,
      original_count: Number.isInteger(item.original_count) ? item.original_count : fromCount,
      verified_count: 0,
      lz_authority_cap: cap,
      adjustment_reason: appendAdjustment(
        item.adjustment_reason,
        'Landing Zone evidence-authority: tested absence requires platform evidence, so the result remains unknown.',
      ),
    },
    event: {
      stream: 'antipattern',
      id: '',
      from_count: fromCount,
      to_count: 0,
      strongest_class: cap.strongest_class,
      reason: 'tested_absence_requires_platform_evidence',
    },
  };
};

const evaluateItem = (
  item: any,
  stream: 'maturity' | 'antipattern',
  id: string,
  registry: LzForensicRegistry | undefined,
): { item: any; cap?: LzForensicAuthorityEvent; contradiction?: LzForensicContradictionEvent } => {
  if (!item || typeof item !== 'object') return { item };
  if (item.count === -1 && item.is_silent === true) return { item };

  const stampedQuotes = Array.isArray(item.evidence_quotes)
    ? item.evidence_quotes.map((quote: EvidenceQuote) => stampQuoteEvidenceClass(quote, registry))
    : [];
  let next = { ...item, evidence_quotes: stampedQuotes };
  if (item.verification_unresolved === true || item.coverage_reason === 'step0_out_of_scope') {
    return { item: next };
  }
  const quoteClasses = stampedQuotes.map((quote: EvidenceQuote) => quote.evidence_class);
  const classes = uniqueClasses(quoteClasses);
  const strongest = strongestEvidenceClass(classes);
  const kinds = contradictionKindsFor(classes);
  let contradiction: LzForensicContradictionEvent | undefined;
  if (kinds.length > 0) {
    const record: LzEvidenceClassContradiction = {
      schema: 'lz_evidence_class_contradiction_v1',
      classes,
      kinds,
    };
    next = {
      ...next,
      lz_contradiction_classes: record,
      lz_evidence_authority_note: `Cited evidence includes multiple classes (${classes.join(', ')}). Documents and workshops explain; they do not vote away platform facts.`,
    };
    contradiction = { stream, id, classes, kinds };
  }

  if (stream === 'antipattern' && next.antipattern_absence_status === 'tested_absent' && strongest !== 'platform') {
    const rewritten = rewriteTestedAbsence(next, strongest);
    rewritten.event.id = id;
    return { item: rewritten.item, cap: rewritten.event, contradiction };
  }

  const count = Number.isInteger(next.count) ? next.count : 0;
  if (count === 3 && strongest === 'document') {
    const capped = applyCountCap(next, stream, 2, strongest, 'document_cannot_prove_current_enforcement');
    capped.event.id = id;
    return { item: capped.item, cap: capped.event, contradiction };
  }
  if (count === 3 && strongest === 'workshop') {
    const capped = applyCountCap(next, stream, 1, strongest, 'workshop_cannot_award_embedded');
    capped.event.id = id;
    return { item: capped.item, cap: capped.event, contradiction };
  }

  return { item: next, contradiction };
};

const syncEvidenceCheck = (
  item: EvidenceCheckItem | undefined,
  auditItem: any,
  cap?: LzForensicAuthorityEvent,
): void => {
  if (!item || !cap) return;
  item.verified_count = cap.to_count;
  if (cap.reason === 'tested_absence_requires_platform_evidence') {
    item.assessment_status = 'not_assessed';
    item.antipattern_absence_status = 'unknown_absent';
    item.coverage_reason = auditItem.coverage_reason;
    item.verified_count = 0;
  }
};

export const applyLzForensicEvaluation = <T extends LzForensicPhase1>(
  phase1: T,
  registry?: LzForensicRegistry | Pick<{ chunks: SourceChunk[] }, 'chunks'>,
): T => {
  if (!phase1?.phase_1_audit_logs) return phase1;

  const maturity: Record<string, any> = { ...phase1.phase_1_audit_logs.maturity };
  const antipattern: Record<string, any> = { ...phase1.phase_1_audit_logs.antipattern };
  const evidenceItems = Array.isArray(phase1.evidence_check?.items)
    ? phase1.evidence_check.items.map((item) => ({ ...item }))
    : [];
  const evidenceByKey = new Map(evidenceItems.map((item) => [`${item.stream}.${item.id}`, item]));
  const authorityCaps: LzForensicAuthorityEvent[] = [];
  const contradictions: LzForensicContradictionEvent[] = [];

  const visit = (stream: 'maturity' | 'antipattern', bucket: Record<string, any>) => {
    for (const [id, existing] of Object.entries(bucket)) {
      const evaluated = evaluateItem(existing, stream, id, registry);
      bucket[id] = evaluated.item;
      if (evaluated.cap) {
        authorityCaps.push(evaluated.cap);
        syncEvidenceCheck(evidenceByKey.get(`${stream}.${id}`), evaluated.item, evaluated.cap);
      }
      if (evaluated.contradiction) contradictions.push(evaluated.contradiction);
    }
  };

  visit('maturity', maturity);
  visit('antipattern', antipattern);

  const summary: LzForensicEvaluationSummary = {
    schema: LZ_FORENSIC_EVALUATION_SCHEMA,
    authority_caps: authorityCaps,
    contradictions,
  };

  return {
    ...phase1,
    phase_1_audit_logs: { maturity, antipattern },
    evidence_check: phase1.evidence_check
      ? { ...phase1.evidence_check, items: evidenceItems }
      : phase1.evidence_check,
    meta: {
      ...(phase1.meta && typeof phase1.meta === 'object' ? phase1.meta : {}),
      lz_forensic_evaluation: summary,
    },
  } as T;
};
