import type { AuditItem, DiagnosticResult, DomainId, MaturityCriterionResolutionRecord } from '../types';
import { BATCH_TITLES, MASTER_BINGO_FINOPS } from '../knowledge_base';
import { inferAntiPatternAbsenceStatus } from './antiPatternSemantics';
import { governedCriterionState } from './maturityModelService';

export type DomainSignalTone = 'green' | 'yellow' | 'red' | 'grey';

export interface DomainSignalRow {
  domain: string;
  title: string;
  maturityPercent: number;
  antiPatternPercent: number;
  maturityAvailable: boolean;
  antiPatternAvailable: boolean;
  verificationUnresolved: boolean;
  maturityTone: DomainSignalTone;
  antiPatternTone: DomainSignalTone;
  maturityAssessed: number;
  maturityTotal: number;
  antiPatternTotal: number;
  antiPatternFindings: number;
  antiPatternPartialFindings: number;
  antiPatternTestedAbsent: number;
  antiPatternNotAssessed: number;
  evidencePercent: number;
  isSilent: boolean;
  coverageNote?: string;
}

const BATCHES = Object.keys(BATCH_TITLES) as DomainId[];

const clampScore = (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(Math.max(value, 0), 3);
};

const resolutionRecords = (result: DiagnosticResult): MaturityCriterionResolutionRecord[] | undefined => {
  const records = result.phase_2_validation?.resolution_maturity?.criterion_resolutions;
  return records && records.length > 0 ? records : undefined;
};

const resolutionRecord = (
  result: DiagnosticResult,
  stream: 'maturity' | 'antipattern',
  id: string,
): MaturityCriterionResolutionRecord | undefined =>
  resolutionRecords(result)?.find(record => record.stream === stream && record.criterion_id === id);

export const criterionIsGoverned = (
  result: DiagnosticResult,
  stream: 'maturity' | 'antipattern',
  id: string,
  item?: AuditItem,
): boolean => {
  const records = resolutionRecords(result);
  if (records) return resolutionRecord(result, stream, id)?.state === 'RESOLVED';
  return governedCriterionState(stream, id, item) === 'RESOLVED';
};

export const heatmapDisplayForCriterion = (
  result: DiagnosticResult,
  stream: 'maturity' | 'antipattern',
  id: string,
  item: AuditItem | undefined,
): { label: string; cssClass: string } => {
  if (!criterionIsGoverned(result, stream, id, item)) {
    return { label: 'Not assessed', cssClass: 'heat-silent' };
  }
  if (stream === 'antipattern') {
    const status = resolutionRecord(result, stream, id)?.antipattern_absence_status
      || inferAntiPatternAbsenceStatus(item);
    if (status === 'confirmed_present') return { label: 'Finding', cssClass: 'heat-gap' };
    if (status === 'partially_present') return { label: 'Partial finding', cssClass: 'heat-partial' };
    if (status === 'tested_absent') return { label: 'Tested absent', cssClass: 'heat-tested-absent' };
    return { label: 'Not assessed', cssClass: 'heat-silent' };
  }
  if (!item || item.is_silent) return { label: 'Silent', cssClass: 'heat-silent' };
  const status = (item.status || '').toUpperCase();
  if (status === 'OK') return { label: 'OK', cssClass: 'heat-good' };
  if (status === 'PARTIAL') return { label: 'Partial', cssClass: 'heat-partial' };
  return { label: 'Gap', cssClass: 'heat-gap' };
};

const maturityTone = (percent: number, assessed: number, total: number): DomainSignalTone => {
  if (assessed === 0 || assessed / Math.max(total, 1) < 0.6) return 'grey';
  if (percent >= 70) return 'green';
  if (percent >= 40) return 'yellow';
  return 'red';
};

const antiPatternTone = (percent: number, notAssessed: number, total: number): DomainSignalTone => {
  if (total > 0 && notAssessed / total >= 0.6) return 'grey';
  if (percent <= 10) return 'green';
  if (percent <= 30) return 'yellow';
  return 'red';
};

export const computeDomainSignalRows = (result: DiagnosticResult): DomainSignalRow[] => (
  BATCHES.map(domain => {
    const maturityCriteria = MASTER_BINGO_FINOPS.maturity.filter(item => item.batch === domain);
    const antiPatternCriteria = MASTER_BINGO_FINOPS.antipattern.filter(item => item.batch === domain);

    const maturityItems = maturityCriteria.map(criteria => result.phase_1_audit_logs.maturity[criteria.id]);
    const verificationUnresolved = maturityItems.some(item => item?.verification_unresolved)
      || antiPatternCriteria.some(criteria => result.phase_1_audit_logs.antipattern[criteria.id]?.verification_unresolved);
    const maturityTotal = maturityCriteria.length;
    const governedMaturity = maturityCriteria.filter(criteria => criterionIsGoverned(
      result,
      'maturity',
      criteria.id,
      result.phase_1_audit_logs.maturity[criteria.id],
    ));
    const maturityAssessed = governedMaturity.length;
    const maturityAvailable = maturityAssessed > 0;
    const maturityScore = governedMaturity.reduce((sum, criteria) => {
      const record = resolutionRecord(result, 'maturity', criteria.id);
      return sum + clampScore(record?.score_count ?? result.phase_1_audit_logs.maturity[criteria.id]?.count);
    }, 0);
    const maturityPercent = maturityAssessed > 0 ? Math.round((maturityScore / (maturityAssessed * 3)) * 100) : 0;

    let antiPatternFindingWeight = 0;
    let antiPatternFindings = 0;
    let antiPatternPartialFindings = 0;
    let antiPatternTestedAbsent = 0;
    let antiPatternNotAssessed = 0;

    for (const criteria of antiPatternCriteria) {
      const item = result.phase_1_audit_logs.antipattern[criteria.id];
      const record = resolutionRecord(result, 'antipattern', criteria.id);
      if (item?.verification_unresolved || !criterionIsGoverned(result, 'antipattern', criteria.id, item)) {
        antiPatternNotAssessed += 1;
        continue;
      }
      const status = record?.antipattern_absence_status || inferAntiPatternAbsenceStatus(item);
      if (status === 'confirmed_present') {
        antiPatternFindingWeight += 1;
        antiPatternFindings += 1;
      } else if (status === 'partially_present') {
        antiPatternFindingWeight += 0.5;
        antiPatternPartialFindings += 1;
      } else if (status === 'tested_absent') {
        antiPatternTestedAbsent += 1;
      } else {
        antiPatternNotAssessed += 1;
      }
    }

    const antiPatternTotal = antiPatternCriteria.length;
    const antiPatternAvailable = antiPatternNotAssessed < antiPatternTotal;
    const antiPatternPercent = antiPatternTotal > 0
      ? Math.round((antiPatternFindingWeight / antiPatternTotal) * 100)
      : 0;
    const notAssessedShare = antiPatternTotal > 0 ? antiPatternNotAssessed / antiPatternTotal : 0;
    const calculatedEvidencePercent = maturityTotal + antiPatternTotal > 0
      ? Math.round(((maturityAssessed + antiPatternTotal - antiPatternNotAssessed) / (maturityTotal + antiPatternTotal)) * 100)
      : 0;
    const sufficiency = result.phase_2_validation.assessment_sufficiency;
    const evidencePercent = sufficiency.domain_criterion_evidence_density?.[domain] ?? calculatedEvidencePercent;
    const isSilent = sufficiency.silent_domain_ids?.includes(domain) ?? evidencePercent < 10;

    return {
      domain,
      title: BATCH_TITLES[domain] || domain,
      maturityPercent,
      antiPatternPercent,
      maturityAvailable,
      antiPatternAvailable,
      verificationUnresolved,
      maturityTone: maturityTone(maturityPercent, maturityAssessed, maturityTotal),
      antiPatternTone: antiPatternTone(antiPatternPercent, antiPatternNotAssessed, antiPatternTotal),
      maturityAssessed,
      maturityTotal,
      antiPatternTotal,
      antiPatternFindings,
      antiPatternPartialFindings,
      antiPatternTestedAbsent,
      antiPatternNotAssessed,
      evidencePercent,
      isSilent,
      coverageNote: verificationUnresolved
        ? 'Required verification was unresolved; no validated domain signal is available.'
        : isSilent
          ? 'Silent domain: less than 10% of criteria have verified evidence. Collect evidence; do not infer maturity or prescribe remediation.'
        : !maturityAvailable || notAssessedShare >= 0.4
          ? 'Anti-pattern absence is not fully assessable from source coverage.'
        : undefined
    };
  })
);
