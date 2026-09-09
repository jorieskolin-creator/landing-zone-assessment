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

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

const packManifest = await readJson("../src/domain-packs/landing-zone/pack.json");
const taxonomy = await readJson("../src/domain-packs/landing-zone/taxonomy.json");
const criteria = await readJson("../src/domain-packs/landing-zone/criteria.json");
const antipatterns = await readJson("../src/domain-packs/landing-zone/antipatterns.json");
const providers = await readJson("../src/domain-packs/landing-zone/provider-evidence.json");

const PACK = {
  packId: packManifest.packId,
  version: packManifest.version,
  designAreas: taxonomy.design_areas,
  criteria: [...criteria.criteria, ...antipatterns.criteria],
  providers,
};

const source = await readFile(new URL("../src/scope/step0Scope.ts", import.meta.url), "utf8");
const rewritten = source
  .replace(/import type \{[\s\S]*?\} from "\.\.\/domain-packs\/assessment-domain-pack";\n/, "")
  .replace(
    /import \{ LANDING_ZONE_PACK \} from "\.\.\/domain-packs\/loadLandingZonePack";\n/,
    `const LANDING_ZONE_PACK = ${JSON.stringify(PACK)};\n`,
  );
assert.doesNotMatch(rewritten, /loadLandingZonePack/, "test harness must not import the Vite JSON pack loader");

const dir = await mkdtemp(join(tmpdir(), "lz-step0-"));
const modulePath = join(dir, "step0Scope.mjs");
await writeFile(modulePath, compile(rewritten), "utf8");
const scopeApi = await import(`file://${modulePath}`);

const unnamed = scopeApi.validateScopeDraft({});
assert.ok(unnamed.includes("UNNAMED_ESTATE"));
assert.throws(
  () => scopeApi.lockScope({}),
  (error) => error.code === "UNNAMED_ESTATE" && error.publication === "BLOCK",
);
assert.throws(
  () => scopeApi.assertScoringMayBegin(null),
  (error) => error.code === "UNNAMED_ESTATE" && error.publication === "BLOCK",
);

assert.ok(
  scopeApi.validateScopeDraft({
    estate_name: "Contoso",
    providers: ["azure"],
    design_area_ids: ["A"],
    estate_roots: [],
  }).includes("MISSING_ESTATE_ROOT"),
);

assert.ok(
  scopeApi.validateScopeDraft({
    estate_name: "Contoso",
    providers: ["azure"],
    design_area_ids: ["Z"],
    estate_roots: [{ provider: "azure", kind: "tenant", reference: "contoso.onmicrosoft.com" }],
  }).includes("UNKNOWN_DESIGN_AREA"),
);

assert.ok(
  scopeApi.validateScopeDraft({
    estate_name: "Contoso",
    providers: ["oracle"],
    design_area_ids: ["A"],
    estate_roots: [{ provider: "oracle", kind: "tenant", reference: "x" }],
  }).includes("UNKNOWN_PROVIDER"),
);

assert.ok(
  scopeApi.validateScopeDraft({
    ...scopeApi.demoAssessmentScopeDraft(),
    live_collection_permitted: true,
  }).includes("LIVE_COLLECTION_NOT_AVAILABLE"),
);
assert.throws(
  () => scopeApi.lockScope({ ...scopeApi.demoAssessmentScopeDraft(), live_collection_permitted: true }),
  (error) => error.code === "LIVE_COLLECTION_NOT_AVAILABLE" && error.publication === "BLOCK",
);

const azureAws = scopeApi.lockScope({
  estate_name: "Northstar Retail",
  providers: ["azure", "aws"],
  estate_roots: [
    { provider: "azure", kind: "tenant", reference: "contoso.onmicrosoft.com" },
    { provider: "aws", kind: "management_account", reference: "111122223333" },
  ],
  design_area_ids: taxonomy.design_areas.map((area) => area.id),
  inventory_exports_included: true,
  live_collection_permitted: false,
});
assert.equal(azureAws.live_collection_permitted, false);
assert.deepEqual([...azureAws.exclusions.providers], ["gcp"]);
const azureAwsSurface = scopeApi.loadScoringSurface(azureAws, PACK);
assert.equal(azureAwsSurface.instances.some((item) => item.provider === "gcp"), false);
assert.deepEqual([...new Set(azureAwsSurface.instances.map((item) => item.provider))].sort(), ["aws", "azure"]);
assert.equal(azureAwsSurface.instances.length, PACK.criteria.length * 2);
assert.equal(
  azureAwsSurface.denominator_instances.length,
  azureAwsSurface.instances.filter((item) => item.applicability === "applicable").length,
);

const subset = scopeApi.lockScope({
  estate_name: "Northstar Retail",
  providers: ["azure"],
  estate_roots: [{ provider: "azure", kind: "tenant", reference: "contoso.onmicrosoft.com", label: "Contoso" }],
  design_area_ids: ["A", "B"],
  inventory_exports_included: false,
  exclusion_notes: ["Sandbox directory excluded"],
});
assert.deepEqual([...subset.design_area_ids], ["A", "B"]);
assert.deepEqual([...subset.exclusions.design_area_ids], ["C", "D", "E", "F", "G", "H"]);
assert.deepEqual([...subset.exclusions.notes], ["Sandbox directory excluded"]);
const subsetSurface = scopeApi.loadScoringSurface(subset, PACK);
assert.deepEqual([...new Set(subsetSurface.instances.map((item) => item.design_area_id))].sort(), ["A", "B"]);
assert.equal(subsetSurface.instances.every((item) => item.provider === "azure"), true);
assert.equal(subsetSurface.instances.length, PACK.criteria.filter((item) => ["A", "B"].includes(item.design_area_id)).length);

assert.ok(Object.isFrozen(subset));
assert.ok(Object.isFrozen(subset.providers));
assert.throws(() => { subset.providers.push("gcp"); });
assert.throws(() => { subset.estate_name = "mutated"; });

const mismatched = { ...azureAws, pack_id: "finops" };
assert.throws(
  () => scopeApi.loadScoringSurface(mismatched, PACK),
  (error) => error.code === "PACK_MISMATCH",
);

const analysis = await readFile(new URL("../src/services/analysisService.ts", import.meta.url), "utf8");
const analyzeFn = analysis.slice(
  analysis.indexOf("export const analyzeDocument"),
  analysis.indexOf("const images"),
);
assert.match(analyzeFn, /lockScope\(options\.scope \|\| \{\}/);
assert.doesNotMatch(analyzeFn, /createRun/, "analyzeDocument must lock Step 0 before createRun");
assert.match(analysis, /coverage_reason: "step0_out_of_scope"/);
assert.match(analysis, /runPhase1Audit\([\s\S]*scopedBatchIds\)/);
assert.match(analysis, /buildDomainPackets\(sourceRegistry\)/);
assert.doesNotMatch(analysis, /buildDomainPackets\(sourceRegistry,\s*scopedBatchIds\)/);

const metrics = await readFile(new URL("../src/services/metricsService.ts", import.meta.url), "utf8");
assert.match(metrics, /coverage_reason === 'step0_out_of_scope'/);
assert.match(metrics, /options\.pairRegistry/);
assert.match(metrics, /options\.designAreaIds/);

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
assert.match(app, /Step0ScopeForm/);
assert.match(app, /Lock Step 0 scope before uploading source material/);
assert.match(app, /setLockedScope\(null\)/);
assert.match(app, /disabled=\{files\.length >= MAX_FILES \|\| !lockedScope\}/);
assert.match(app, /Lock Step 0 first/);
assert.match(app, /lockedScope \|\| lockScope\(demoAssessmentScopeDraft\(\)\)/);
assert.match(app, /scope: lockScope\(demoAssessmentScopeDraft\(\)\)/);

const form = await readFile(new URL("../src/components/Step0ScopeForm.tsx", import.meta.url), "utf8");
assert.match(form, /Inventory exports are included in the file set/);
assert.match(form, /Live cloud collection is not available/);
assert.match(form, /Lock Step 0 scope/);
assert.doesNotMatch(form, /live_collection_permitted: true/);

console.log(
  `step 0 scope passed (azure+aws instances=${azureAwsSurface.instances.length}, A+B azure instances=${subsetSurface.instances.length}, gcp excluded=${azureAwsSurface.excluded_providers.join(",")})`,
);
