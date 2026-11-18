import type { AntiPatternAbsenceStatus, AuditItem, EvidenceCheckStatus } from '../types';

const STATUSES: AntiPatternAbsenceStatus[] = [
  'confirmed_present',
  'partially_present',
  'tested_absent',
  'unknown_absent'
];

export const normalizeAntiPatternAbsenceStatus = (value: unknown): AntiPatternAbsenceStatus | undefined =>
  typeof value === 'string' && STATUSES.includes(value as AntiPatternAbsenceStatus)
    ? value as AntiPatternAbsenceStatus
    : undefined;

const clampScore = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(Math.max(Math.round(value), 0), 3);
};

export const resolveAntiPatternAbsenceStatus = (input: {
  verifiedCount: number;
  originalCount?: number;
  explicitStatus?: unknown;
  evidenceStatus?: EvidenceCheckStatus;
  existing?: Partial<AuditItem>;
  rationale?: string;
  coverageReason?: string;
}): AntiPatternAbsenceStatus => {
  const verified = clampScore(input.verifiedCount);
  const original = clampScore(input.originalCount);
  const explicit = normalizeAntiPatternAbsenceStatus(input.explicitStatus);
  const status = input.evidenceStatus;
  if (status === 'unsupported' || status === 'missing') return 'unknown_absent';
  if (verified >= 3) return 'confirmed_present';
  if (verified > 0) return 'partially_present';
  if (original === 0 && explicit === 'tested_absent' && status === 'supported') return 'tested_absent';
  if (original > 0 && explicit === 'partially_present' && status === 'weak') return 'partially_present';
  return 'unknown_absent';
};

export const inferAntiPatternAbsenceStatus = (item: Partial<AuditItem> | undefined): AntiPatternAbsenceStatus => {
  if (!item || item.verification_unresolved || item.assessment_status === 'not_assessed'
    || item.evidence_check_status === 'unsupported' || item.evidence_check_status === 'missing') return 'unknown_absent';

  const explicit = normalizeAntiPatternAbsenceStatus(item.antipattern_absence_status);
  if (explicit === 'unknown_absent') return explicit;
  const count = clampScore(item.count);
  if (count >= 3) return 'confirmed_present';
  if (count > 0) return 'partially_present';
  if (explicit === 'partially_present' && item.evidence_check_status === 'weak' && item.evidence_quotes?.length) return explicit;
  if (explicit === 'tested_absent' && item.evidence_check_status === 'supported'
    && item.coverage_reason?.trim()) return explicit;
  return 'unknown_absent';
};

export const antiPatternStatusLabel = (item: Partial<AuditItem> | undefined): string => {
  const status = inferAntiPatternAbsenceStatus(item);
  if (status === 'confirmed_present') return 'Finding';
  if (status === 'partially_present') return 'Partial finding';
  if (status === 'tested_absent') return 'Tested absent';
  return 'Not assessed';
};

export const antiPatternStatusDescription = (status: AntiPatternAbsenceStatus): string => {
  if (status === 'confirmed_present') return 'Evidence shows the anti-pattern is present.';
  if (status === 'partially_present') return 'Evidence shows a partial or weak anti-pattern signal.';
  if (status === 'tested_absent') return 'Relevant source coverage was reviewed and the anti-pattern was not found.';
  return 'The source did not provide enough relevant coverage to treat absence as positive evidence.';
};
