import assert from 'node:assert/strict';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emitTypescript } from './ts-emit.mjs';

const dir = await mkdtemp(join(tmpdir(), 'governed-display-'));
const outfile = await emitTypescript(new URL('../src/services/domainSignalService.ts', import.meta.url).pathname, dir);
const { computeDomainSignalRows, criterionIsGoverned, heatmapDisplayForCriterion } = await import(`file://${outfile}`);

const DOMAINS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const quote = {
  quote: 'Bound current-state quote from the source packet.',
  evidence_source: 'text',
  source_id: 'SRC-1',
  chunk_id: 'CHK-1',
};

const maturityItem = (spec) => ({
  count: spec.count,
  status: spec.silent ? 'Gap' : spec.status,
  evidence: 'Model score from the published summary heatmap.',
  evidence_quotes: spec.quotes || [],
  assessment_status: spec.silent ? 'not_assessed' : 'assessed',
  evidence_check_status: spec.silent ? 'missing' : 'supported',
  is_silent: Boolean(spec.silent),
});

const antiItem = (spec) => ({
  count: spec.count,
  status: spec.count > 0 ? 'Partial' : 'OK',
  evidence: 'Model anti-pattern score from the published summary heatmap.',
  evidence_quotes: spec.quotes || [],
  assessment_status: spec.status === 'unknown_absent' ? 'not_assessed' : 'assessed',
  evidence_check_status: spec.status === 'unknown_absent' ? 'missing' : 'supported',
  antipattern_absence_status: spec.status,
  is_silent: false,
  ...(spec.status === 'tested_absent'
    ? { coverage_reason: 'Relevant criterion coverage was reviewed and the anti-pattern was not found.' }
    : {}),
});

// Counts and labels reconstructed from Landing_Zone_Summary_Report_7691.pdf.
// Maturity percents are round(sum of assessed counts / (assessed * 3) * 100).
const maturitySpec = {
  A1: { count: 2, status: 'Partial' },
  A2: { count: 0, status: 'Gap' },
  A3: { count: 0, status: 'Gap' },
  A4: { count: 1, status: 'Partial' },
  A5: { count: 1, status: 'Partial' },
  B1: { count: 1, status: 'Partial' },
  B2: { count: 1, status: 'Partial' },
  B3: { count: 1, status: 'Partial' },
  B4: { count: 0, status: 'Gap' },
  B5: { count: 1, status: 'Partial' },
  C1: { count: 1, status: 'Partial', quotes: [quote] },
  C2: { count: 2, status: 'Partial' },
  C3: { count: 1, status: 'Partial' },
  C4: { count: 0, status: 'Gap' },
  C5: { count: 1, status: 'Partial' },
  D1: { count: 0, status: 'Gap' },
  D2: { count: 0, status: 'Gap', silent: true },
  D3: { count: 0, status: 'Gap' },
  D4: { count: 0, status: 'Gap' },
  D5: { count: 0, status: 'Gap' },
  E1: { count: 0, status: 'Gap' },
  E2: { count: 0, status: 'Gap' },
  E3: { count: 0, status: 'Gap', silent: true },
  E4: { count: 0, status: 'Gap', silent: true },
  E5: { count: 0, status: 'Gap' },
  F1: { count: 1, status: 'Partial', quotes: [quote] },
  F2: { count: 0, status: 'Gap' },
  F3: { count: 0, status: 'Gap', silent: true },
  F4: { count: 0, status: 'Gap' },
  F5: { count: 0, status: 'Gap', silent: true },
  G1: { count: 1, status: 'Partial' },
  G2: { count: 0, status: 'Gap' },
  G3: { count: 0, status: 'Gap' },
  G4: { count: 1, status: 'Partial' },
  G5: { count: 0, status: 'Gap' },
  H1: { count: 1, status: 'Partial' },
  H2: { count: 0, status: 'Gap' },
  H3: { count: 0, status: 'Gap' },
  H4: { count: 0, status: 'Gap', silent: true },
  H5: { count: 0, status: 'Gap', silent: true },
};

const notAssessedAnti = new Set(['AP-A4', 'AP-B2', 'AP-B4', 'AP-D2', 'AP-E3', 'AP-F3', 'AP-F5', 'AP-G1', 'AP-H4', 'AP-H5']);
const antiSpec = Object.fromEntries(DOMAINS.flatMap(domain => [1, 2, 3, 4, 5].map(index => {
  const id = `AP-${domain}${index}`;
  if (id === 'AP-C1') return [id, { count: 0, status: 'tested_absent' }];
  if (id === 'AP-F2') return [id, { count: 1, status: 'partially_present', quotes: [quote] }];
  if (notAssessedAnti.has(id)) return [id, { count: 0, status: 'unknown_absent' }];
  return [id, { count: 1, status: 'partially_present' }];
})));

const publishedCards = {
  A: { evidence: 0, maturity: 27, assessed: 5, anti: 40, findings: 0, partial: 4, notAssessed: 1, silent: true },
  B: { evidence: 0, maturity: 27, assessed: 5, anti: 30, findings: 0, partial: 3, notAssessed: 2, silent: true },
  C: { evidence: 20, maturity: 33, assessed: 5, anti: 40, findings: 0, partial: 4, notAssessed: 0, silent: false },
  D: { evidence: 0, maturity: 0, assessed: 4, anti: 40, findings: 0, partial: 4, notAssessed: 1, silent: true },
  E: { evidence: 0, maturity: 0, assessed: 3, anti: 40, findings: 0, partial: 4, notAssessed: 1, silent: true },
  F: { evidence: 20, maturity: 11, assessed: 3, anti: 30, findings: 0, partial: 3, notAssessed: 2, silent: false },
  G: { evidence: 0, maturity: 13, assessed: 5, anti: 40, findings: 0, partial: 4, notAssessed: 1, silent: true },
  H: { evidence: 0, maturity: 11, assessed: 3, anti: 30, findings: 0, partial: 3, notAssessed: 2, silent: true },
};

const oldAssessed = (item) => {
  if (!item || item.is_silent || item.verification_unresolved) return false;
  if ((item.evidence_quotes?.length ?? 0) > 0) return true;
  if (item.count > 0) return true;
  return item.evidence_check_status === 'supported' || item.evidence_check_status === 'weak';
};

const oldAntiStatus = (item) => {
  const count = Math.max(0, Math.min(3, Math.round(item?.count || 0)));
  if (count >= 3) return 'confirmed_present';
  if (count > 0) return 'partially_present';
  if (
    item?.antipattern_absence_status === 'tested_absent'
    && item.evidence_check_status === 'supported'
    && typeof item.coverage_reason === 'string'
    && item.coverage_reason.trim().length > 0
  ) return 'tested_absent';
  return 'unknown_absent';
};

const oldMaturityLabel = (item) => {
  if (!item || item.is_silent) return 'Silent';
  const status = (item.status || '').toUpperCase();
  if (status === 'OK') return 'OK';
  if (status === 'PARTIAL') return 'Partial';
  return 'Gap';
};

for (const [domain, expected] of Object.entries(publishedCards)) {
  const items = [1, 2, 3, 4, 5].map(index => maturityItem(maturitySpec[`${domain}${index}`]));
  const assessed = items.filter(oldAssessed);
  const score = assessed.reduce((sum, item) => sum + item.count, 0);
  const percent = assessed.length ? Math.round((score / (assessed.length * 3)) * 100) : 0;
  assert.equal(assessed.length, expected.assessed, `${domain} published maturity assessed count`);
  assert.equal(percent, expected.maturity, `${domain} published maturity percent`);
  let findings = 0;
  let partial = 0;
  let notAssessed = 0;
  let weight = 0;
  for (const index of [1, 2, 3, 4, 5]) {
    const status = oldAntiStatus(antiItem(antiSpec[`AP-${domain}${index}`]));
    if (status === 'confirmed_present') {
      findings += 1;
      weight += 1;
    } else if (status === 'partially_present') {
      partial += 1;
      weight += 0.5;
    } else if (status !== 'tested_absent') {
      notAssessed += 1;
    }
  }
  assert.equal(findings, expected.findings, `${domain} published findings`);
  assert.equal(partial, expected.partial, `${domain} published partial findings`);
  assert.equal(notAssessed, expected.notAssessed, `${domain} published anti-pattern not-assessed count`);
  assert.equal(Math.round((weight / 5) * 100), expected.anti, `${domain} published anti-pattern rate`);
}

const record = (stream, id, state, extra = {}) => ({
  schema_version: 'maturity_criterion_resolution_v1',
  stream,
  criterion_id: id,
  domain_id: id.replace(/^AP-/, '').charAt(0),
  state,
  reason: state === 'RESOLVED' ? 'PROVENANCE_BOUND_EVIDENCE' : 'NO_GOVERNED_EVIDENCE',
  evidence_basis: state === 'RESOLVED' ? 'DIRECT' : 'NONE',
  score_count: state === 'RESOLVED' ? extra.score_count ?? 0 : null,
  normalized_value: state === 'RESOLVED' ? (extra.score_count ?? 0) / 3 : null,
  ...extra,
});

const resolutions = [
  record('maturity', 'C1', 'RESOLVED', { score_count: 1, normalized_value: 1 / 3 }),
  record('maturity', 'F1', 'RESOLVED', { score_count: 1, normalized_value: 1 / 3 }),
  record('antipattern', 'AP-C1', 'RESOLVED', {
    reason: 'GOVERNED_TESTED_ABSENCE',
    evidence_basis: 'TESTED_ABSENCE',
    score_count: 0,
    normalized_value: 1,
    antipattern_absence_status: 'tested_absent',
  }),
  record('antipattern', 'AP-F2', 'RESOLVED', {
    score_count: 1,
    normalized_value: 2 / 3,
    antipattern_absence_status: 'partially_present',
  }),
  ...Object.keys(maturitySpec).filter(id => id !== 'C1' && id !== 'F1').map(id => record('maturity', id, 'UNKNOWN')),
  ...Object.keys(antiSpec).filter(id => id !== 'AP-C1' && id !== 'AP-F2').map(id => record('antipattern', id, 'UNKNOWN')),
];

const density = {
  A: 0, B: 0, C: 20, D: 0, E: 0, F: 20, G: 0, H: 0,
};

const result = {
  phase_1_audit_logs: {
    maturity: Object.fromEntries(Object.entries(maturitySpec).map(([id, spec]) => [id, maturityItem(spec)])),
    antipattern: Object.fromEntries(Object.entries(antiSpec).map(([id, spec]) => [id, antiItem(spec)])),
  },
  phase_2_validation: {
    resolution_maturity: { criterion_resolutions: resolutions },
    assessment_sufficiency: {
      domain_criterion_evidence_density: density,
      silent_domain_ids: ['A', 'B', 'D', 'E', 'G', 'H'],
    },
  },
};

const rows = computeDomainSignalRows(result);
const byDomain = Object.fromEntries(rows.map(row => [row.domain, row]));

const governedCards = {
  A: { maturityAvailable: false, maturityAssessed: 0, antiAvailable: false, findings: 0, partial: 0, notAssessed: 5, evidence: 0, silent: true, tone: 'grey' },
  B: { maturityAvailable: false, maturityAssessed: 0, antiAvailable: false, findings: 0, partial: 0, notAssessed: 5, evidence: 0, silent: true, tone: 'grey' },
  C: { maturityAvailable: true, maturityPercent: 33, maturityAssessed: 1, antiAvailable: true, antiPercent: 0, findings: 0, partial: 0, testedAbsent: 1, notAssessed: 4, evidence: 20, silent: false, tone: 'grey' },
  D: { maturityAvailable: false, maturityAssessed: 0, antiAvailable: false, findings: 0, partial: 0, notAssessed: 5, evidence: 0, silent: true, tone: 'grey' },
  E: { maturityAvailable: false, maturityAssessed: 0, antiAvailable: false, findings: 0, partial: 0, notAssessed: 5, evidence: 0, silent: true, tone: 'grey' },
  F: { maturityAvailable: true, maturityPercent: 33, maturityAssessed: 1, antiAvailable: true, antiPercent: 10, findings: 0, partial: 1, testedAbsent: 0, notAssessed: 4, evidence: 20, silent: false, tone: 'grey' },
  G: { maturityAvailable: false, maturityAssessed: 0, antiAvailable: false, findings: 0, partial: 0, notAssessed: 5, evidence: 0, silent: true, tone: 'grey' },
  H: { maturityAvailable: false, maturityAssessed: 0, antiAvailable: false, findings: 0, partial: 0, notAssessed: 5, evidence: 0, silent: true, tone: 'grey' },
};

for (const [domain, expected] of Object.entries(governedCards)) {
  const row = byDomain[domain];
  assert.ok(row, `${domain} row`);
  assert.equal(row.evidencePercent, expected.evidence, `${domain} evidence percent stays on the sufficiency value`);
  assert.equal(row.isSilent, expected.silent, `${domain} silent flag`);
  assert.equal(row.maturityAvailable, expected.maturityAvailable, `${domain} maturity availability`);
  assert.equal(row.maturityAssessed, expected.maturityAssessed, `${domain} governed maturity count`);
  assert.equal(row.maturityTotal, 5);
  if (expected.maturityPercent !== undefined) assert.equal(row.maturityPercent, expected.maturityPercent, `${domain} governed maturity percent`);
  assert.equal(row.maturityTone, expected.tone, `${domain} maturity tone`);
  assert.equal(row.antiPatternAvailable, expected.antiAvailable, `${domain} anti-pattern availability`);
  if (expected.antiPercent !== undefined) assert.equal(row.antiPatternPercent, expected.antiPercent, `${domain} governed anti-pattern rate`);
  assert.equal(row.antiPatternFindings, expected.findings, `${domain} findings`);
  assert.equal(row.antiPatternPartialFindings, expected.partial, `${domain} partial findings`);
  assert.equal(row.antiPatternNotAssessed, expected.notAssessed, `${domain} not assessed`);
  assert.equal(row.antiPatternTone, expected.tone, `${domain} anti-pattern tone`);
  if (expected.testedAbsent !== undefined) assert.equal(row.antiPatternTestedAbsent, expected.testedAbsent, `${domain} tested absent`);
}

assert.match(byDomain.C.coverageNote, /Anti-pattern absence is not fully assessable/, 'domain C gains a coverage note once four anti-patterns are unresolved');
assert.match(byDomain.F.coverageNote, /Anti-pattern absence is not fully assessable/, 'domain F keeps a coverage note');
assert.match(byDomain.A.coverageNote, /Silent domain/, 'silent domains keep the collection note');

const kept = {
  C1: { label: 'Partial', cssClass: 'heat-partial' },
  F1: { label: 'Partial', cssClass: 'heat-partial' },
  'AP-C1': { label: 'Tested absent', cssClass: 'heat-tested-absent' },
  'AP-F2': { label: 'Partial finding', cssClass: 'heat-partial' },
};

let notAssessedCells = 0;
for (const domain of DOMAINS) {
  for (const index of [1, 2, 3, 4, 5]) {
    const maturityId = `${domain}${index}`;
    const antiId = `AP-${maturityId}`;
    const maturityDisplay = heatmapDisplayForCriterion(result, 'maturity', maturityId, result.phase_1_audit_logs.maturity[maturityId]);
    const antiDisplay = heatmapDisplayForCriterion(result, 'antipattern', antiId, result.phase_1_audit_logs.antipattern[antiId]);
    for (const [id, display] of [[maturityId, maturityDisplay], [antiId, antiDisplay]]) {
      if (kept[id]) {
        assert.deepEqual(display, kept[id], `${id} keeps its governed status`);
      } else {
        assert.deepEqual(display, { label: 'Not assessed', cssClass: 'heat-silent' }, `${id} heatmap status follows unresolved records`);
        notAssessedCells += 1;
      }
    }
  }
}
assert.equal(notAssessedCells, 76, '76 of 80 heatmap cells become Not assessed');
assert.equal(criterionIsGoverned(result, 'maturity', 'A1', result.phase_1_audit_logs.maturity.A1), false, 'a scored Partial without a resolved record is not assessed');
assert.equal(criterionIsGoverned(result, 'maturity', 'C1', result.phase_1_audit_logs.maturity.C1), true);

const live = {
  phase_1_audit_logs: {
    maturity: {
      A1: maturityItem({ count: 2, status: 'Partial', quotes: [quote] }),
      A2: maturityItem({ count: 2, status: 'Partial' }),
    },
    antipattern: {},
  },
  phase_2_validation: {
    assessment_sufficiency: { domain_criterion_evidence_density: {}, silent_domain_ids: [] },
  },
};
assert.equal(criterionIsGoverned(live, 'maturity', 'A1', live.phase_1_audit_logs.maturity.A1), true, 'without stored records a bound quote still resolves');
assert.equal(criterionIsGoverned(live, 'maturity', 'A2', live.phase_1_audit_logs.maturity.A2), false, 'without stored records a count and no quote stays unresolved');
assert.deepEqual(
  heatmapDisplayForCriterion(live, 'maturity', 'A2', live.phase_1_audit_logs.maturity.A2),
  { label: 'Not assessed', cssClass: 'heat-silent' },
);

const diagnosisLine = (row) => {
  const maturity = row.maturityAvailable ? `${row.maturityPercent}%` : 'unresolved';
  const anti = row.antiPatternAvailable ? `${row.antiPatternPercent}%` : 'unresolved';
  const silent = row.isSilent ? ' Silent domain: evidence collection only.' : '';
  const missing = row.antiPatternNotAssessed > 0
    ? ` ${row.antiPatternNotAssessed} anti-pattern ${row.antiPatternNotAssessed === 1 ? 'criterion was' : 'criteria were'} not assessed.`
    : '';
  return `${row.domain}: evidence ${row.evidencePercent}%; maturity ${maturity}; anti-pattern ${anti}.${silent}${missing}`;
};

const publishedDiagnosis = {
  A: 'A: evidence 0%; maturity 27%; anti-pattern 40%. Silent domain: evidence collection only. 1 anti-pattern criterion was not assessed.',
  B: 'B: evidence 0%; maturity 27%; anti-pattern 30%. Silent domain: evidence collection only. 2 anti-pattern criteria were not assessed.',
  C: 'C: evidence 20%; maturity 33%; anti-pattern 40%.',
  D: 'D: evidence 0%; maturity 0%; anti-pattern 40%. Silent domain: evidence collection only. 1 anti-pattern criterion was not assessed.',
  E: 'E: evidence 0%; maturity 0%; anti-pattern 40%. Silent domain: evidence collection only. 1 anti-pattern criterion was not assessed.',
  F: 'F: evidence 20%; maturity 11%; anti-pattern 30%. 2 anti-pattern criteria were not assessed.',
  G: 'G: evidence 0%; maturity 13%; anti-pattern 40%. Silent domain: evidence collection only. 1 anti-pattern criterion was not assessed.',
  H: 'H: evidence 0%; maturity 11%; anti-pattern 30%. Silent domain: evidence collection only. 2 anti-pattern criteria were not assessed.',
};

const cardLine = (domain, before, afterRow) => {
  const beforeMaturity = `${before.maturity}% · ${before.assessed}/5`;
  const afterMaturity = afterRow.maturityAvailable ? `${afterRow.maturityPercent}% · ${afterRow.maturityAssessed}/5` : `Not assessed · ${afterRow.maturityAssessed}/5`;
  const beforeAnti = `${before.anti}% · ${before.findings} findings, ${before.partial} partial, ${before.notAssessed} not assessed`;
  const afterAnti = afterRow.antiPatternAvailable
    ? `${afterRow.antiPatternPercent}% · ${afterRow.antiPatternFindings} findings, ${afterRow.antiPatternPartialFindings} partial, ${afterRow.antiPatternNotAssessed} not assessed`
    : `Not assessed · ${afterRow.antiPatternFindings} findings, ${afterRow.antiPatternPartialFindings} partial, ${afterRow.antiPatternNotAssessed} not assessed`;
  return `${domain} | evidence ${before.evidence}% | maturity ${beforeMaturity} -> ${afterMaturity} | anti-pattern ${beforeAnti} -> ${afterAnti}`;
};

const comparison = [
  'Summary 7691 shape compared with governed resolution',
  'Run 27c96f56-3a4e-4c02-9495-a7be8560fcf0, Landing Zone Summary Report generated 2026-09-28T09:42:46.835Z.',
  'Evidence density stays 5% (4 resolved criteria / 80). Domain evidence stays 0% for A, B, D, E, G, H and 20% for C and F. The sufficiency fields are unchanged.',
  '',
  'The published domain cards counted a criterion as assessed when the model emitted a score, a supported check, or a quote. The heatmap then printed Partial, Gap, Silent, Partial finding, or Tested absent from that score. Governed resolution only counted four criteria, so those cards overstated assessment.',
  '',
  'Card comparison (published summary -> governed display):',
  ...DOMAINS.map(domain => cardLine(domain, publishedCards[domain], byDomain[domain])),
  '',
  'Domain diagnosis uses the same rows:',
  ...DOMAINS.map(domain => `${publishedDiagnosis[domain]} -> ${diagnosisLine(byDomain[domain])}`),
  '',
  'Heatmap: rubric titles and descriptions stay under every cell. Status changes.',
  'Cells that keep a status in this aggregate-matching fixture: C1 Partial, F1 Partial, AP-C1 Tested absent, AP-F2 Partial finding.',
  'The other 76 cells, including every published Partial, Gap, Silent, and Partial finding outside those four, display Not assessed.',
  'The evidence-coverage subtitle changes from "Assessed criterion surface" to "Governed resolution".',
  '',
  'C and F maturity percentages use a smaller denominator. C stays 33%, now 1/3 on the one resolved criterion rather than 5/15 across five scored criteria. F moves from 11% (1/9 across three scored criteria, including zero-count gaps) to 33% (1/3 on F1).',
  'Domains A, B, D, E, G, and H drop the 0–27% maturity signal and the 30–40% finding rate. Those cards read Not assessed, 0/5, and stay silent at 0% evidence.',
  'Domain C anti-pattern rate moves from 40% (four partial findings) to 0% because the only resolved anti-pattern is tested absent. The four unresolved partial findings become not assessed, so the card gains the coverage note. Domain F moves from 30% to 10% (one partial finding, four not assessed).',
  '',
  'The run log does not name the four resolved ids. This fixture places them on C1, F1, AP-C1, and AP-F2 so the card arithmetic matches the published aggregates: domain density 20% only in C and F, category scores 1/15 in C and F, one fully resolved pair, and two partial pairs. AP-C1 is the only published anti-pattern cell whose label already requires tested-absence checks. If the real resolved cells inside C and F are a different pair, those two domains keep one maturity status and one anti-pattern status, and the other six domains still collapse to Not assessed.',
].join('\n');

const artifactDir = '/opt/cursor/artifacts';
await mkdir(artifactDir, { recursive: true });
await writeFile(join(artifactDir, 'summary-shape-comparison.txt'), `${comparison}\n`, 'utf8');

console.log('governed display matches summary 7691 resolution shape');
console.log(comparison);
