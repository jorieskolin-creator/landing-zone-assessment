import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { OUTPUT_CONTRACT_DOMAIN_IDS, OUTPUT_CONTRACT_IDS } from "../lib/outputContracts.js";

const ROOT = dirname(fileURLToPath(new URL(".", import.meta.url)));
const SKIP_DIRS = new Set([".git", "node_modules", "dist", "build", ".pytest_cache", "__pycache__"]);
const KERNEL_DIRS = [
  "src/services",
  "src/components",
  "src/orchestrator.ts",
  "src/knowledge_base/index.ts",
  "src/knowledge_base/landingZoneKnowledge.ts",
  "src/App.tsx",
  "lib/kbIndex.js",
  "lib/outputContracts.js",
];
const ALLOW_NAME = /(characterizationFixtures|finops_.*\.json|KERNEL_BASELINE)/;
const FORBIDDEN = [
  { name: "[A-F][1-5] criterion regex", pattern: /\[A-F\]\[1-5\]/ },
  { name: "five-wide criterion generation", pattern: /Array\.from\(\{\s*length:\s*5\s*\}/ },
  { name: "FinOps persistence prefix", pattern: /finops:last-assessment/ },
];

async function collect(target, files = []) {
  const path = join(ROOT, target);
  try {
    const entries = await readdir(path, { withFileTypes: true });
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry.name)) continue;
      await collect(join(target, entry.name), files);
    }
  } catch {
    files.push(target);
  }
  return files;
}

const files = [];
for (const target of KERNEL_DIRS) await collect(target, files);

const scanned = [];
for (const rel of files) {
  if (ALLOW_NAME.test(rel)) continue;
  if (![".ts", ".tsx", ".js", ".mjs"].includes(extname(rel))) continue;
  const source = await readFile(join(ROOT, rel), "utf8");
  scanned.push(rel);
  for (const rule of FORBIDDEN) {
    if (rule.pattern.test(source)) {
      assert.fail(`${rel} still contains ${rule.name}`);
    }
  }
}

const taxonomy = JSON.parse(
  await readFile(join(ROOT, "src/domain-packs/landing-zone/taxonomy.json"), "utf8"),
);
const pack = JSON.parse(await readFile(join(ROOT, "src/domain-packs/landing-zone/pack.json"), "utf8"));
assert.deepEqual([...OUTPUT_CONTRACT_DOMAIN_IDS], taxonomy.design_areas.map((area) => area.id));
assert.equal(OUTPUT_CONTRACT_IDS.evidenceGapQuery, "assessment_evidence_gap_query_v1");
assert.equal(pack.packId.replace(/-/g, "_"), "landing_zone");

const app = await readFile(join(ROOT, "src/App.tsx"), "utf8");
assert.match(app, /persistencePrefix\(\)/);
assert.doesNotMatch(app, /finops:last-assessment/);

const sourceRegistry = await readFile(join(ROOT, "src/services/sourceRegistryService.ts"), "utf8");
assert.doesNotMatch(sourceRegistry, /const DOMAIN_TERMS/);
assert.match(sourceRegistry, /DOMAIN_ROUTING_TERMS\[domain\]/);

const kbIndex = await readFile(join(ROOT, "src/knowledge_base/index.ts"), "utf8");
assert.match(kbIndex, /expectedKnowledgeKeysFor\(options\.batchId\)/);

const structured = await readFile(join(ROOT, "src/services/structuredDataAnalysisService.ts"), "utf8");
assert.match(structured, /expectedPhase1Ids\(LANDING_ZONE_PACK/);
assert.doesNotMatch(structured, /\['A','B','C','D','E','F'\]/);

assert.ok(scanned.length > 10, "must scan production kernel files");
console.log(
  `work 2 structural assumption tests passed (${scanned.length} production files, ${taxonomy.design_areas.length} design areas)`,
);
