/**
 * Work 6: ingest the 48-question interview export as typed Class 3 records.
 *
 * Interview observations support operating-model interpretation.
 * Evidence leads request additional material; they are not findings
 * and must not enter the forensic packet surface.
 */
import type { EvidenceClass, QuestionnaireQuestion } from "../domain-packs/assessment-domain-pack";
import { LANDING_ZONE_QUESTIONNAIRE } from "../domain-packs/loadLandingZonePack";
import {
  LZ_SOURCE_CLASSIFICATION_SCHEMA,
  type LzSourceClassification,
} from "./landingZoneSourceClassification";
import type { SourceRecord } from "../types";

export const LZ_QUESTIONNAIRE_SESSION_SCHEMA = "lz_questionnaire_session_v1" as const;
export const LZ_WORKSHOP_ATTESTATION_SCHEMA = "lz_workshop_attestation_v1" as const;
export const QUESTIONNAIRE_EVIDENCE_CLASS: EvidenceClass = "workshop";
export const EVIDENCE_LEADS_ARE_NOT_FINDINGS =
  "Evidence leads request additional material; they are not findings and cannot replace platform evidence.";

const QUESTION_ID_PATTERN = /^[A-H]-Q[1-6]$/;
const EXPORT_QUESTION_KEY = /^[A-H]-Q\d+$/;

export type QuestionnaireIngestionCode =
  | "QUESTIONNAIRE_EXPORT_INVALID"
  | "QUESTIONNAIRE_QUESTION_UNKNOWN"
  | "QUESTIONNAIRE_CRITERION_UNRESOLVED"
  | "QUESTIONNAIRE_EMPTY_SESSION";

export class QuestionnaireIngestionError extends Error {
  readonly code: QuestionnaireIngestionCode;

  constructor(code: QuestionnaireIngestionCode, message: string) {
    super(`QUESTIONNAIRE_INGESTION: ${code}: ${message}`);
    this.name = "QuestionnaireIngestionError";
    this.code = code;
  }
}

export interface LzQuestionnaireSessionMeta {
  customer?: string;
  date?: string;
  start_time?: string;
  end_time?: string;
  facilitator?: string;
  reference?: string;
  clouds?: string;
  inventory?: string;
  tenant?: string;
  areas?: string;
  participants?: string;
  global_notes?: string;
}

export interface LzWorkshopAttestationRecord {
  schema_version: typeof LZ_WORKSHOP_ATTESTATION_SCHEMA;
  question_id: string;
  design_area_id: string;
  prompt: string;
  referenced_criterion_ids: string[];
  interview_observation: string;
  evidence_lead: string;
  evidence_class: "workshop";
  facilitator?: string;
  participants?: string;
  source_locator: {
    source_id: string;
    question_id: string;
    original_file_name?: string;
    export_saved_at?: string;
  };
}

export interface LzQuestionnaireSession {
  schema_version: typeof LZ_QUESTIONNAIRE_SESSION_SCHEMA;
  evidence_class: "workshop";
  original_file_name?: string;
  export_saved_at?: string;
  source_id?: string;
  meta: LzQuestionnaireSessionMeta;
  attestations: LzWorkshopAttestationRecord[];
  answered_observation_count: number;
  evidence_lead_count: number;
  notes: string[];
}

export interface LzEvidenceLeadRequest {
  question_id: string;
  design_area_id: string;
  evidence_lead: string;
  referenced_criterion_ids: string[];
  source_id: string;
  locator: string;
}

export interface LzQuestionnaireIngestionSummary {
  schema_version: typeof LZ_QUESTIONNAIRE_SESSION_SCHEMA;
  session_count: number;
  answered_observation_count: number;
  evidence_lead_count: number;
  question_ids: string[];
  evidence_leads: LzEvidenceLeadRequest[];
  notes: string[];
}

type MappingQuestion = QuestionnaireQuestion & {
  design_area?: string;
  hint?: string;
  sample?: string;
};

const trim = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const unique = <T,>(values: T[]): T[] => [...new Set(values)];

export const jsonPayloadFromSourceText = (text: string): unknown | undefined => {
  const stripped = text.replace(/^Format:\s*JSON\s*\n+/i, "").trim();
  if (!stripped) return undefined;
  try {
    return JSON.parse(stripped);
  } catch {
    return undefined;
  }
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const looksLikeMappingFile = (payload: Record<string, unknown>): boolean =>
  Array.isArray(payload.questions) && payload.answers === undefined;

export const isQuestionnaireExport = (payload: unknown): boolean => {
  if (!isRecord(payload) || looksLikeMappingFile(payload)) return false;
  if ("phase_1_audit_logs" in payload || "quality_gate" in payload) return false;
  const answers = payload.answers;
  if (!isRecord(answers)) return false;
  const keys = Object.keys(answers);
  return keys.some((key) => EXPORT_QUESTION_KEY.test(key));
};

const sessionMeta = (raw: unknown): LzQuestionnaireSessionMeta => {
  const meta = isRecord(raw) ? raw : {};
  return {
    ...(trim(meta.customer) ? { customer: trim(meta.customer) } : {}),
    ...(trim(meta.date) ? { date: trim(meta.date) } : {}),
    ...(trim(meta.startTime) || trim(meta.start_time) ? { start_time: trim(meta.startTime) || trim(meta.start_time) } : {}),
    ...(trim(meta.endTime) || trim(meta.end_time) ? { end_time: trim(meta.endTime) || trim(meta.end_time) } : {}),
    ...(trim(meta.facilitator) ? { facilitator: trim(meta.facilitator) } : {}),
    ...(trim(meta.reference) ? { reference: trim(meta.reference) } : {}),
    ...(trim(meta.clouds) ? { clouds: trim(meta.clouds) } : {}),
    ...(trim(meta.inventory) ? { inventory: trim(meta.inventory) } : {}),
    ...(trim(meta.tenant) ? { tenant: trim(meta.tenant) } : {}),
    ...(trim(meta.areas) ? { areas: trim(meta.areas) } : {}),
    ...(trim(meta.participants) ? { participants: trim(meta.participants) } : {}),
    ...(trim(meta.globalNotes) || trim(meta.global_notes)
      ? { global_notes: trim(meta.globalNotes) || trim(meta.global_notes) }
      : {}),
  };
};

const answerFields = (value: unknown): { answer: string; evidence: string } => {
  if (typeof value === "string") return { answer: trim(value), evidence: "" };
  if (!isRecord(value)) return { answer: "", evidence: "" };
  return {
    answer: trim(value.answer) || trim(value.interview_observation),
    evidence: trim(value.evidence) || trim(value.evidence_lead),
  };
};

export const ingestQuestionnaireExport = (
  raw: string | Record<string, unknown>,
  options: {
    fileName?: string;
    sourceId?: string;
    questions?: MappingQuestion[];
  } = {},
): LzQuestionnaireSession => {
  const payload = typeof raw === "string" ? jsonPayloadFromSourceText(raw) : raw;
  if (!isQuestionnaireExport(payload) || !isRecord(payload)) {
    throw new QuestionnaireIngestionError(
      "QUESTIONNAIRE_EXPORT_INVALID",
      "JSON is not a Landing Zone interview questionnaire export.",
    );
  }
  const questions = options.questions || (LANDING_ZONE_QUESTIONNAIRE as MappingQuestion[]);
  const byId = new Map(questions.map((question) => [question.id, question]));
  const answers = payload.answers as Record<string, unknown>;
  const meta = sessionMeta(payload.meta);
  const savedAt = trim(payload.saved_at) || trim(payload.savedAt);
  const sourceId = options.sourceId || "src-001";
  const attestations: LzWorkshopAttestationRecord[] = [];
  for (const [questionId, value] of Object.entries(answers)) {
    if (!EXPORT_QUESTION_KEY.test(questionId) || !QUESTION_ID_PATTERN.test(questionId) || !byId.get(questionId)) {
      throw new QuestionnaireIngestionError(
        "QUESTIONNAIRE_QUESTION_UNKNOWN",
        `Answer ${questionId} is not in the frozen 48-question mapping.`,
      );
    }
    const mapping = byId.get(questionId)!;
    const refs = (mapping.referenced_criterion_ids || []).map(trim).filter(Boolean);
    if (refs.length === 0) {
      throw new QuestionnaireIngestionError(
        "QUESTIONNAIRE_CRITERION_UNRESOLVED",
        `${questionId} has no referenced criterion IDs in the pack mapping.`,
      );
    }
    const fields = answerFields(value);
    attestations.push({
      schema_version: LZ_WORKSHOP_ATTESTATION_SCHEMA,
      question_id: questionId,
      design_area_id: mapping.design_area_id,
      prompt: mapping.prompt,
      referenced_criterion_ids: refs,
      interview_observation: fields.answer,
      evidence_lead: fields.evidence,
      evidence_class: "workshop",
      ...(meta.facilitator ? { facilitator: meta.facilitator } : {}),
      ...(meta.participants ? { participants: meta.participants } : {}),
      source_locator: {
        source_id: sourceId,
        question_id: questionId,
        ...(options.fileName ? { original_file_name: options.fileName } : {}),
        ...(savedAt ? { export_saved_at: savedAt } : {}),
      },
    });
  }
  const answeredObservationCount = attestations.filter((item) => item.interview_observation).length;
  const evidenceLeadCount = attestations.filter((item) => item.evidence_lead).length;
  const notes = [EVIDENCE_LEADS_ARE_NOT_FINDINGS];
  if (answeredObservationCount === 0 && evidenceLeadCount === 0) {
    notes.push("QUESTIONNAIRE_EMPTY_SESSION: no interview observations or evidence leads were recorded.");
  }
  return {
    schema_version: LZ_QUESTIONNAIRE_SESSION_SCHEMA,
    evidence_class: "workshop",
    ...(options.fileName ? { original_file_name: options.fileName } : {}),
    ...(savedAt ? { export_saved_at: savedAt } : {}),
    source_id: sourceId,
    meta,
    attestations,
    answered_observation_count: answeredObservationCount,
    evidence_lead_count: evidenceLeadCount,
    notes,
  };
};

export const tryIngestQuestionnaireFromText = (
  text: string,
  options: { fileName?: string; sourceId?: string; questions?: MappingQuestion[] } = {},
): LzQuestionnaireSession | null => {
  const payload = jsonPayloadFromSourceText(text);
  if (!isQuestionnaireExport(payload)) return null;
  return ingestQuestionnaireExport(payload as Record<string, unknown>, options);
};

export const renderWorkshopObservationText = (session: LzQuestionnaireSession): string => {
  const lines = [
    "LANDING ZONE QUESTIONNAIRE SESSION",
    "evidence_class=workshop",
    "authority=operating_model_interpretation_only",
    EVIDENCE_LEADS_ARE_NOT_FINDINGS,
  ];
  if (session.meta.customer) lines.push(`customer=${session.meta.customer}`);
  if (session.meta.facilitator) lines.push(`facilitator=${session.meta.facilitator}`);
  if (session.meta.participants) lines.push(`participants=${session.meta.participants}`);
  if (session.meta.tenant) lines.push(`named_root=${session.meta.tenant}`);
  if (session.meta.clouds) lines.push(`clouds=${session.meta.clouds}`);
  if (session.meta.areas) lines.push(`design_areas=${session.meta.areas}`);
  if (session.meta.reference) lines.push(`workshop_reference=${session.meta.reference}`);
  if (session.meta.global_notes) lines.push(`workshop_notes=${session.meta.global_notes}`);
  const observations = session.attestations.filter((item) => item.interview_observation);
  if (observations.length === 0) {
    lines.push("No interview observations were recorded.");
  }
  for (const item of observations) {
    lines.push("");
    lines.push(
      `<workshop_observation question_id="${item.question_id}" design_area_id="${item.design_area_id}" referenced_criteria="${item.referenced_criterion_ids.join(" ")}" evidence_class="workshop" locator="${item.source_locator.source_id}#${item.question_id}">`,
    );
    lines.push(item.interview_observation);
    lines.push("</workshop_observation>");
  }
  return lines.join("\n");
};

export const evidenceLeadRequests = (session: LzQuestionnaireSession): LzEvidenceLeadRequest[] =>
  session.attestations
    .filter((item) => item.evidence_lead)
    .map((item) => ({
      question_id: item.question_id,
      design_area_id: item.design_area_id,
      evidence_lead: item.evidence_lead,
      referenced_criterion_ids: item.referenced_criterion_ids,
      source_id: item.source_locator.source_id,
      locator: `${item.source_locator.source_id}#${item.question_id}`,
    }));

const workshopClassification = (
  existing: LzSourceClassification | undefined,
  session: LzQuestionnaireSession,
): LzSourceClassification => ({
  schema_version: LZ_SOURCE_CLASSIFICATION_SCHEMA,
  source_kind: "workshop_attestation",
  evidence_class: "workshop",
  evidence_class_number: 3,
  object_type: "Workshop",
  status: "classified",
  providers_detected: existing?.providers_detected || [],
  out_of_locked_scope_providers: existing?.out_of_locked_scope_providers || [],
  structured_export: true,
  object_count: session.attestations.length,
  id_fields: unique(["question_id", ...(existing?.id_fields || [])]),
  signals: unique([...(existing?.signals || []), "questionnaire-session"]),
});

export const applyQuestionnaireIngestion = (records: SourceRecord[]): SourceRecord[] =>
  records.map((record) => {
    const text = record.text;
    if (!text) return record;
    const session = tryIngestQuestionnaireFromText(text, {
      fileName: record.original_file_name,
      sourceId: record.source_id,
    });
    if (!session) return record;
    return {
      ...record,
      text: renderWorkshopObservationText(session),
      lz_questionnaire_session: session,
      lz_classification: workshopClassification(record.lz_classification, session),
    };
  });

export const summarizeQuestionnaireIngestion = (records: SourceRecord[]): LzQuestionnaireIngestionSummary | undefined => {
  const sessions = records
    .map((record) => record.lz_questionnaire_session)
    .filter((session): session is LzQuestionnaireSession => Boolean(session));
  if (sessions.length === 0) return undefined;
  const evidenceLeads = sessions.flatMap(evidenceLeadRequests);
  return {
    schema_version: LZ_QUESTIONNAIRE_SESSION_SCHEMA,
    session_count: sessions.length,
    answered_observation_count: sessions.reduce((sum, session) => sum + session.answered_observation_count, 0),
    evidence_lead_count: sessions.reduce((sum, session) => sum + session.evidence_lead_count, 0),
    question_ids: unique(sessions.flatMap((session) => session.attestations.map((item) => item.question_id))),
    evidence_leads: evidenceLeads,
    notes: unique(sessions.flatMap((session) => session.notes)),
  };
};

export const questionnaireIngestionWarnings = (records: SourceRecord[]): string[] => {
  const summary = summarizeQuestionnaireIngestion(records);
  if (!summary) return [];
  return [
    `Class 3 questionnaire session ingested (${summary.session_count} export(s), ${summary.answered_observation_count} observations, ${summary.evidence_lead_count} evidence leads). ${EVIDENCE_LEADS_ARE_NOT_FINDINGS}`,
  ];
};
