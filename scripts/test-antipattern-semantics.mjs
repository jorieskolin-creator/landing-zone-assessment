import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from '../node_modules/typescript/lib/typescript.js';

const transpile = (source) => ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2020,
    importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
  },
}).outputText;

const dir = await mkdtemp(join(tmpdir(), 'finops-antipattern-semantics-'));

const antiPatternSource = await readFile(new URL('../src/services/antiPatternSemantics.ts', import.meta.url), 'utf8');
await writeFile(join(dir, 'antiPatternSemantics.mjs'), transpile(antiPatternSource), 'utf8');
const registry = JSON.parse(await readFile(new URL('../src/domain-packs/landing-zone/pair-registry.json', import.meta.url), 'utf8'));
registry.pairs = registry.pairs.filter(pair => pair.design_area_id <= 'F').map(pair => ({ ...pair, antipattern_id: pair.antipattern_id.replace(/^AP-/, ''), domain_id: pair.design_area_id }));
const maturityModelSource = (await readFile(new URL('../src/services/maturityModelService.ts', import.meta.url), 'utf8'))
  .replace("import { LZ_MATURITY_PAIR_REGISTRY } from '../knowledge_base';", `const LZ_MATURITY_PAIR_REGISTRY = ${JSON.stringify(registry)};`)
  .replace('./antiPatternSemantics', './antiPatternSemantics.mjs');
await writeFile(join(dir, 'maturityModelService.mjs'), transpile(maturityModelSource), 'utf8');

const metricsSource = (await readFile(new URL('../src/services/metricsService.ts', import.meta.url), 'utf8'))
  .replace(
    "import { BATCH_TITLES, LZ_ANTIPATTERNS, LZ_CRITERIA } from '../knowledge_base';",
    "const BATCH_TITLES = { A: '', B: '', C: '', D: '', E: '', F: '' }; const LZ_ANTIPATTERNS = Array(30); const LZ_CRITERIA = Array(30);"
  )
  .replace('./antiPatternSemantics', './antiPatternSemantics.mjs')
  .replace('./maturityModelService', './maturityModelService.mjs');
await writeFile(join(dir, 'metricsService.mjs'), transpile(metricsSource), 'utf8');

const {
  inferAntiPatternAbsenceStatus,
  resolveAntiPatternAbsenceStatus
} = await import(`file://${join(dir, 'antiPatternSemantics.mjs')}`);
const { calculateMetrics } = await import(`file://${join(dir, 'metricsService.mjs')}`);

assert.equal(resolveAntiPatternAbsenceStatus({
  verifiedCount: 0, originalCount: 1, explicitStatus: 'partially_present', evidenceStatus: 'weak',
}), 'partially_present');
assert.equal(resolveAntiPatternAbsenceStatus({
  verifiedCount: 0, originalCount: 1, explicitStatus: 'tested_absent', evidenceStatus: 'weak',
}), 'unknown_absent', 'a weak prior harmful signal cannot become a tested absence');

assert.equal(inferAntiPatternAbsenceStatus({
  count: 0,
  assessment_status: 'not_assessed',
  evidence_check_status: 'unsupported',
  antipattern_absence_status: 'unknown_absent',
  reasoning: 'Initial scanner suggested partial presence of an ownerless policy exemption.',
}), 'unknown_absent', 'AP-G3 must not be restored by stale scanner text');
assert.equal(inferAntiPatternAbsenceStatus({
  count: 0, antipattern_absence_status: 'tested_absent', evidence_check_status: 'supported',
  assessment_status: 'not_assessed', coverage_reason: 'Stale reason',
}), 'unknown_absent', 'structured provenance rejection outweighs a stale absence verdict');
assert.equal(inferAntiPatternAbsenceStatus({
  count: 0, evidence_quotes: [{ quote: 'The source discusses the topic.' }],
}), 'unknown_absent', 'a source quote alone must never imply tested absence');

assert.equal(
  resolveAntiPatternAbsenceStatus({
    verifiedCount: 0,
    originalCount: 1,
    explicitStatus: 'tested_absent',
    evidenceStatus: 'unsupported',
    rationale: 'The quote could not be located in the source.',
  }),
  'unknown_absent',
  'unsupported scanner signals become unknown absence, not positive absence'
);

assert.equal(
  resolveAntiPatternAbsenceStatus({
    verifiedCount: 0,
    originalCount: 0,
    explicitStatus: 'partially_present',
    evidenceStatus: 'supported',
    rationale: 'The source does not contain criterion-specific evidence, but coverage is weak.',
  }),
  'unknown_absent',
  'the verifier must not create a partial finding when the scanner found no harmful criterion'
);

assert.equal(
  resolveAntiPatternAbsenceStatus({
    verifiedCount: 0,
    originalCount: 0,
    explicitStatus: 'tested_absent',
    evidenceStatus: 'supported',
    coverageReason: 'Relevant coverage was reviewed and the anti-pattern was not found.',
  }),
  'tested_absent',
  'true verified absence remains tested_absent'
);

const metrics = calculateMetrics({
  maturity: {},
  antipattern: {
    D2: {
      id: 'D2',
      criterion: 'Per-application internet edge',
      count: 0,
      status: 'OK',
      evidence: 'Evidence-check found a partial per-application internet edge signal.',
      reasoning: 'Final anti-pattern assessment: Partial finding. Verifier status: weak.',
      antipattern_absence_status: 'partially_present',
      assessment_status: 'assessed',
      evidence_check_status: 'weak',
      evidence_quotes: [{ quote: 'Partial per-application internet edge signal.', evidence_source: 'text' }],
    },
  },
});

assert.ok(
  metrics.metrics.antipattern_burden > 0,
  'partial anti-pattern findings must contribute to anti-pattern burden'
);
assert.equal(
  metrics.metrics.antipattern_clearance,
  0,
  'partial anti-pattern findings must not contribute to clearance'
);
assert.equal(
  metrics.metrics.antipattern_coverage,
  3,
  'partial anti-pattern findings should count as assessed coverage'
);
assert.match(
  metrics.antipattern_findings.join('\n'),
  /Partial finding/,
  'metrics should expose partial findings as findings'
);

console.log('anti-pattern semantics tests passed');
