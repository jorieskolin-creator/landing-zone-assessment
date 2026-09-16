import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "../node_modules/typescript/lib/typescript.js";

const compile = (source) => ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2020,
    importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
  },
}).outputText;

const policy = JSON.parse(
  await readFile(new URL("../src/domain-packs/landing-zone/scoring-policy.json", import.meta.url), "utf8"),
);
const qualityGatePolicy = JSON.parse(
  await readFile(new URL("../src/domain-packs/landing-zone/quality-gate-policy.json", import.meta.url), "utf8"),
);
assert.equal(policy.provider_blending, "forbidden");
assert.equal(policy.scoring_surface, "provider_scoped_criterion_instance");
assert.deepEqual(policy.maturity_labels, ["Foundation", "Pilot", "Rollout", "Operate"]);
assert.deepEqual(policy.exclude_from_denominator, ["out_of_scope", "not_applicable"]);
assert.equal(policy.capability_cannot_conceal_confirmed_paired_antipattern, true);
assert.equal(qualityGatePolicy.meaning, "evidence_sufficiency_not_customer_pass_fail");

const dir = await mkdtemp(join(tmpdir(), "lz-pair-scoring-"));
const semanticsSource = await readFile(new URL("../src/services/antiPatternSemantics.ts", import.meta.url), "utf8");
await writeFile(join(dir, "antiPatternSemantics.mjs"), compile(semanticsSource), "utf8");

const emptyRegistry = {
  schema_version: "lz_maturity_pair_registry_v1",
  registry_version: "test",
  status: "ACTIVE",
  description: "test",
  pairs: [],
};
const maturityModelSource = (await readFile(new URL("../src/services/maturityModelService.ts", import.meta.url), "utf8"))
  .replace("import { FINOPS_MATURITY_PAIR_REGISTRY } from '../knowledge_base';", `const FINOPS_MATURITY_PAIR_REGISTRY = ${JSON.stringify(emptyRegistry)};`)
  .replace("./antiPatternSemantics", "./antiPatternSemantics.mjs");
await writeFile(join(dir, "maturityModelService.mjs"), compile(maturityModelSource), "utf8");

const metricsSource = (await readFile(new URL("../src/services/metricsService.ts", import.meta.url), "utf8"))
  .replace(
    "import { BATCH_TITLES, FINOPS_ANTIPATTERNS, FINOPS_CRITERIA } from '../knowledge_base';",
    "const BATCH_TITLES = { A: '' }; const FINOPS_ANTIPATTERNS = Array(1); const FINOPS_CRITERIA = Array(1);",
  )
  .replace("./antiPatternSemantics", "./antiPatternSemantics.mjs")
  .replace("./maturityModelService", "./maturityModelService.mjs");
await writeFile(join(dir, "metricsService.mjs"), compile(metricsSource), "utf8");

const adapterSource = (await readFile(new URL("../src/services/landingZoneScoringAdapter.ts", import.meta.url), "utf8"))
  .replace(
    /import scoringPolicy from '\.\.\/domain-packs\/landing-zone\/scoring-policy\.json';\n/,
    `const scoringPolicy = ${JSON.stringify(policy)};\n`,
  )
  .replace("./metricsService", "./metricsService.mjs");
assert.doesNotMatch(adapterSource, /loadLandingZonePack|knowledge_base|calculateResolutionBasedMaturity/);
await writeFile(join(dir, "landingZoneScoringAdapter.mjs"), compile(adapterSource), "utf8");

const {
  applyEvidenceClassPolicy,
  classBySourceId,
  concealConfirmedAntipatterns,
  mapLzMaturityLabel,
  scoreLandingZoneAssessment,
} = await import(`file://${join(dir, "landingZoneScoringAdapter.mjs")}`);

const pair = (id, strength = 1) => ({
  pair_id: `PAIR-${id}`,
  capability_id: id,
  antipattern_id: `AP-${id}`,
  domain_id: id.charAt(0),
  relationship_type: "DIRECT_INVERSE",
  interaction_strength: strength,
  weight: 1,
  rationale: "test pair",
});

const registryOf = (...pairs) => ({
  schema_version: "lz_maturity_pair_registry_v1",
  registry_version: "test",
  status: "ACTIVE",
  description: "test",
  pairs,
});

const instance = (provider, criterion_id, stream, applicability = "applicable") => ({
  provider,
  criterion_id,
  design_area_id: criterion_id.replace(/^AP-/, "").charAt(0),
  stream,
  kind: applicability === "not_applicable" ? "not_applicable" : "mapped",
  applicability,
});

const surfaceFor = (providers, rows) => ({
  providers,
  design_area_ids: [...new Set(rows.map((row) => row.design_area_id))],
  instances: rows,
  denominator_instances: rows.filter((row) => row.applicability === "applicable"),
});

const quote = (source_id) => ({
  quote: "Control-plane evidence for this criterion.",
  evidence_source: "text",
  source_id,
  chunk_id: "CHK-1",
});

const capability = (count, source_id) => ({
  count,
  status: count === 3 ? "OK" : count === 0 ? "NOK" : "Partial",
  evidence: "Capability evidence.",
  evidence_quotes: source_id ? [quote(source_id)] : [],
  assessment_status: source_id ? "assessed" : "not_assessed",
  evidence_check_status: source_id ? "supported" : "missing",
  question_results: source_id
    ? Array.from({ length: 3 }, (_, index) => (index < count ? "supported" : "not_supported"))
    : ["unknown", "unknown", "unknown"],
  reasoning: source_id ? "Assessed." : "Not assessed.",
  is_silent: !source_id,
});

const antipattern = (count, status, source_id) => ({
  count,
  status: count === 3 ? "NOK" : count === 0 ? "OK" : "Partial",
  evidence: "Anti-pattern evidence.",
  evidence_quotes: source_id ? [quote(source_id)] : [],
  assessment_status: status === "unknown_absent" ? "not_assessed" : "assessed",
  evidence_check_status: status === "unknown_absent" ? "missing" : "supported",
  antipattern_absence_status: status,
  coverage_reason: status === "tested_absent" ? "Relevant coverage reviewed; anti-pattern was not found." : undefined,
  question_results: status === "unknown_absent"
    ? ["unknown", "unknown", "unknown"]
    : Array.from({ length: 3 }, (_, index) => (index < count ? "supported" : "not_supported")),
  reasoning: "Assessed.",
  is_silent: status === "unknown_absent",
});

const logsFor = (ids, capFactory, apFactory) => ({
  maturity: Object.fromEntries(ids.map((id) => [id, capFactory(id)])),
  antipattern: Object.fromEntries(ids.map((id) => [`AP-${id}`, apFactory(id)])),
});

const source = (source_id, evidence_class) => ({
  source_id,
  lz_classification: { evidence_class },
});

assert.equal(mapLzMaturityLabel("Insufficient evidence"), "Insufficient evidence");
assert.equal(mapLzMaturityLabel("Crawl"), "Foundation");
assert.equal(mapLzMaturityLabel("Walk"), "Pilot");
assert.equal(mapLzMaturityLabel("Walk with significant friction"), "Rollout");
assert.equal(mapLzMaturityLabel("Run"), "Operate");

{
  const classes = classBySourceId([source("src-workshop", "workshop")]);
  const result = applyEvidenceClassPolicy(
    logsFor(["A1"], () => capability(3, "src-workshop"), () => antipattern(0, "unknown_absent")),
    classes,
  );
  assert.equal(result.logs.maturity.A1.assessment_status, "not_assessed");
  assert.equal(result.logs.maturity.A1.coverage_reason, "evidence_class_policy");
  assert.equal(result.demotions.length, 1);
  assert.equal(result.demotions[0].criterion_id, "A1");
}

{
  const classes = classBySourceId([source("src-doc", "document")]);
  const result = applyEvidenceClassPolicy(
    logsFor(["A1"], () => capability(3, "src-doc"), () => antipattern(0, "unknown_absent")),
    classes,
  );
  assert.equal(result.logs.maturity.A1.assessment_status, "not_assessed");
}

{
  const classes = classBySourceId([source("src-platform", "platform")]);
  const result = applyEvidenceClassPolicy(
    logsFor(["A1"], () => capability(3, "src-platform"), () => antipattern(0, "tested_absent", "src-platform")),
    classes,
  );
  assert.equal(result.logs.maturity.A1.assessment_status, "assessed");
  assert.equal(result.logs.maturity.A1.count, 3);
  assert.equal(result.demotions.length, 0);
}

{
  const classes = classBySourceId([source("src-workshop", "workshop")]);
  const result = applyEvidenceClassPolicy(
    logsFor(["A1"], () => capability(0), () => antipattern(0, "tested_absent", "src-workshop")),
    classes,
  );
  assert.equal(result.logs.antipattern["AP-A1"].antipattern_absence_status, "unknown_absent");
  assert.equal(result.logs.antipattern["AP-A1"].assessment_status, "not_assessed");
  assert.ok(result.demotions.some((item) => item.stream === "antipattern"));
}

{
  const classes = classBySourceId([]);
  const result = applyEvidenceClassPolicy(
    {
      maturity: {
        A1: {
          ...capability(3, undefined),
          assessment_status: "assessed",
          evidence_check_status: "supported",
          evidence_quotes: [{ quote: "No source_id, so this is not Class 1.", evidence_source: "text", chunk_id: "CHK-1" }],
        },
      },
      antipattern: { "AP-A1": antipattern(0, "unknown_absent") },
    },
    classes,
  );
  assert.equal(result.logs.maturity.A1.assessment_status, "not_assessed");
}

const azureSurface = surfaceFor(["azure"], [
  instance("azure", "A1", "capability"),
  instance("azure", "AP-A1", "antipattern"),
]);

{
  const scored = scoreLandingZoneAssessment({
    logs: logsFor(["A1"], () => capability(0, "src-platform"), () => antipattern(0, "tested_absent", "src-platform")),
    scoringSurface: azureSurface,
    pairRegistry: registryOf(pair("A1")),
    sources: [source("src-platform", "platform")],
  });
  assert.equal(scored.schema_version, "lz_provider_scoring_v1");
  assert.equal(scored.blended_headline_published, false);
  assert.equal(scored.headline_provider, "azure");
  assert.equal(scored.headline_maturity_label, "Foundation");
  assert.equal(scored.published_phase2.crawl_walk_run, "Crawl");
  assert.equal(scored.published_phase2.lz_maturity_label, "Foundation");
  assert.equal(scored.provider_results[0].attribution, "estate_logs_single_provider");
  assert.equal(scored.provider_results[0].lz_maturity_label, "Foundation");
}

{
  const scored = scoreLandingZoneAssessment({
    logs: logsFor(["A1"], () => capability(3, "src-workshop"), () => antipattern(0, "tested_absent", "src-workshop")),
    scoringSurface: azureSurface,
    pairRegistry: registryOf(pair("A1")),
    sources: [source("src-workshop", "workshop")],
  });
  const capabilityRecord = scored.published_phase2.resolution_maturity.criterion_resolutions.find(
    (record) => record.criterion_id === "A1" && record.stream === "maturity",
  );
  assert.equal(capabilityRecord.state, "UNKNOWN");
  assert.equal(capabilityRecord.normalized_value, null);
  assert.ok(scored.evidence_class_demotions >= 1);
}

{
  const scored = scoreLandingZoneAssessment({
    logs: logsFor(["A1"], () => capability(3, "src-doc"), () => antipattern(0, "tested_absent", "src-doc")),
    scoringSurface: azureSurface,
    pairRegistry: registryOf(pair("A1")),
    sources: [source("src-doc", "document")],
  });
  const capabilityRecord = scored.published_phase2.resolution_maturity.criterion_resolutions.find(
    (record) => record.criterion_id === "A1" && record.stream === "maturity",
  );
  assert.equal(capabilityRecord.state, "UNKNOWN");
}

{
  const scored = scoreLandingZoneAssessment({
    logs: logsFor(["A1"], () => capability(3, "src-platform"), () => antipattern(0, "tested_absent", "src-workshop")),
    scoringSurface: azureSurface,
    pairRegistry: registryOf(pair("A1")),
    sources: [source("src-platform", "platform"), source("src-workshop", "workshop")],
  });
  const apRecord = scored.published_phase2.resolution_maturity.criterion_resolutions.find(
    (record) => record.criterion_id === "AP-A1",
  );
  assert.equal(apRecord.state, "UNKNOWN");
  assert.notEqual(apRecord.reason, "GOVERNED_TESTED_ABSENCE");
}

{
  const weakInverse = registryOf(pair("A1", 0.4));
  const logs = logsFor(
    ["A1"],
    () => capability(3, "src-platform"),
    () => antipattern(3, "confirmed_present", "src-platform"),
  );
  const scored = scoreLandingZoneAssessment({
    logs,
    scoringSurface: azureSurface,
    pairRegistry: weakInverse,
    sources: [source("src-platform", "platform")],
  });
  const pairResult = scored.published_phase2.resolution_maturity.pair_results[0];
  assert.equal(pairResult.capability_value, 1, "capability evidence stays visible");
  assert.equal(pairResult.antipattern_health, 0);
  assert.equal(pairResult.observed_pair_value, 0, "confirmed anti-pattern must clamp pair value to zero");
  assert.equal(pairResult.corroborated_pair_value, 0);
  assert.equal(pairResult.contradiction_status, "DETECTED");
  assert.ok(scored.provider_results[0].concealed_confirmed_antipattern_pairs >= 1);
}

{
  const { calculateMetrics } = await import(`file://${join(dir, "metricsService.mjs")}`);
  const raw = calculateMetrics(
    logsFor(
      ["A1"],
      () => capability(3, "src-platform"),
      () => antipattern(3, "confirmed_present", "src-platform"),
    ),
    { pairRegistry: registryOf(pair("A1", 0.4)), maturityCriterionTotal: 1, antipatternCriterionTotal: 1, designAreaIds: ["A"] },
  );
  assert.ok(raw.resolution_maturity.pair_results[0].observed_pair_value > 0, "ADR-002 kernel still allows non-zero pair value when strength < 1");
  const clamped = concealConfirmedAntipatterns(raw, policy);
  assert.equal(clamped.phase2.resolution_maturity.pair_results[0].observed_pair_value, 0);
  assert.equal(raw.resolution_maturity.pair_results[0].capability_value, 1);
}

{
  const naSurface = surfaceFor(["azure"], [
    instance("azure", "A1", "capability"),
    instance("azure", "AP-A1", "antipattern"),
    instance("azure", "A2", "capability", "not_applicable"),
    instance("azure", "AP-A2", "antipattern", "not_applicable"),
  ]);
  const scored = scoreLandingZoneAssessment({
    logs: logsFor(
      ["A1", "A2"],
      (id) => capability(3, "src-platform"),
      (id) => antipattern(0, "tested_absent", "src-platform"),
    ),
    scoringSurface: naSurface,
    pairRegistry: registryOf(pair("A1"), pair("A2")),
    sources: [source("src-platform", "platform")],
  });
  const pairIds = scored.provider_results[0].phase_2.resolution_maturity.pair_results.map((item) => item.pair_id);
  assert.deepEqual(pairIds, ["PAIR-A1"]);
  assert.equal(scored.provider_results[0].denominator_instance_count, 2);
  assert.equal(scored.provider_results[0].excluded_not_applicable_count, 2);
  assert.equal(scored.published_phase2.resolution_maturity.pair_results.length, 1);
}

{
  const oosSurface = surfaceFor(["azure"], [
    instance("azure", "A1", "capability"),
    instance("azure", "AP-A1", "antipattern"),
    instance("azure", "A2", "capability", "out_of_scope"),
    instance("azure", "AP-A2", "antipattern", "out_of_scope"),
  ]);
  const scored = scoreLandingZoneAssessment({
    logs: logsFor(
      ["A1", "A2"],
      () => capability(3, "src-platform"),
      () => antipattern(0, "tested_absent", "src-platform"),
    ),
    scoringSurface: oosSurface,
    pairRegistry: registryOf(pair("A1"), pair("A2")),
    sources: [source("src-platform", "platform")],
  });
  assert.deepEqual(
    scored.provider_results[0].phase_2.resolution_maturity.pair_results.map((item) => item.pair_id),
    ["PAIR-A1"],
  );
  assert.equal(scored.provider_results[0].excluded_out_of_scope_count, 2);
}

{
  const multi = surfaceFor(["azure", "aws"], [
    instance("azure", "A1", "capability"),
    instance("azure", "AP-A1", "antipattern"),
    instance("aws", "A1", "capability"),
    instance("aws", "AP-A1", "antipattern"),
  ]);
  const scored = scoreLandingZoneAssessment({
    logs: logsFor(["A1"], () => capability(3, "src-platform"), () => antipattern(0, "tested_absent", "src-platform")),
    scoringSurface: multi,
    pairRegistry: registryOf(pair("A1")),
    sources: [source("src-platform", "platform")],
  });
  assert.equal(scored.blended_headline_published, false);
  assert.equal(scored.headline_provider, null);
  assert.equal(scored.headline_maturity_label, "Insufficient evidence");
  assert.equal(scored.published_phase2.crawl_walk_run, "Insufficient evidence");
  assert.equal(scored.published_phase2.metrics.adjusted_maturity, null);
  assert.equal(scored.provider_results.length, 2);
  for (const slot of scored.provider_results) {
    assert.equal(slot.attribution, "unattributed_pending_provider_forensic");
    assert.equal(slot.lz_maturity_label, "Insufficient evidence");
    assert.equal(slot.blended, false);
    assert.match(slot.publication_blocked_reason, /keyed by criterion id/);
    assert.equal(slot.phase_2.metrics.adjusted_maturity, null);
  }
  assert.notEqual(scored.estate_phase2.metrics.adjusted_maturity, null, "estate diagnostic remains available; it is not the published headline");
  assert.deepEqual(scored.pending_work, []);
}

const analysis = await readFile(new URL("../src/services/analysisService.ts", import.meta.url), "utf8");
assert.match(analysis, /scoreLandingZoneAssessment\(/);
assert.match(analysis, /lz_scoring: lzScoring/);
assert.doesNotMatch(analysis, /calculateMetrics\(auditLogs/);
assert.ok(analysis.indexOf("validateAndSanitizeLogs(") < analysis.indexOf("scoreLandingZoneAssessment("));

const adapterFile = await readFile(new URL("../src/services/landingZoneScoringAdapter.ts", import.meta.url), "utf8");
assert.match(adapterFile, /calculateMetrics\(/);
assert.doesNotMatch(adapterFile, /pairResult\s*=/);
assert.match(adapterFile, /provider_blending: 'forbidden'/);

const maturityModel = await readFile(new URL("../src/services/maturityModelService.ts", import.meta.url), "utf8");
assert.match(maturityModel, /Math\.sqrt\(capabilityValue \* antipatternHealth\)/);

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
assert.match(app, /headline_maturity_label/);
assert.match(app, /No blended headline/);

console.log("landing zone pair scoring adapter passed");
