import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), "utf8"));

const pack = await readJson("../src/domain-packs/landing-zone/pack.json");
const taxonomy = await readJson("../src/domain-packs/landing-zone/taxonomy.json");
const criteria = await readJson("../src/domain-packs/landing-zone/criteria.json");
const antipatterns = await readJson("../src/domain-packs/landing-zone/antipatterns.json");
const pairs = await readJson("../src/domain-packs/landing-zone/pair-registry.json");
const knowledge = await readJson("../src/domain-packs/landing-zone/knowledge-base-manifest.json");
const tactics = await readJson("../src/domain-packs/landing-zone/tactics.json");
const baseline = await readFile(new URL("../src/knowledge_base/KERNEL_BASELINE.md", import.meta.url), "utf8");
const knowledgeIndex = await readFile(new URL("../src/knowledge_base/index.ts", import.meta.url), "utf8");

assert.equal(pack.packId, "landing-zone");
assert.equal(taxonomy.design_areas.length, 8);
assert.deepEqual(taxonomy.design_areas.map((area) => area.id), [..."ABCDEFGH"]);
assert.equal(criteria.criteria.length, 40);
assert.equal(antipatterns.criteria.length, 40);
assert.equal(pairs.pairs.length, 40);
assert.ok(antipatterns.criteria.some((item) => item.id === "AP-H5"));
assert.ok(pairs.pairs.some((pair) => pair.antipattern_id === "AP-H5" && pair.design_area_id === "H"));
assert.equal(knowledge.must_not_fallback_to_finops_content, true);
assert.equal(knowledge.status, "contract_defined_content_pending");
assert.deepEqual(tactics.tactics, []);
assert.match(baseline, /d671a38723d76398f683ee7362acf12343a796bd/);
assert.match(knowledgeIndex, /landingZoneCapabilities\(\)/);
assert.match(knowledgeIndex, /landingZonePairRegistry\(\)/);
assert.match(knowledgeIndex, /mustNotFallbackToFinopsContent\(\)/);
assert.doesNotMatch(knowledgeIndex, /VITE_FINOPS_TACTICS_URL/);
assert.doesNotMatch(knowledgeIndex, /FALLBACK_TACTICS/);
assert.match(knowledgeIndex, /expectedKnowledgeKeysFor/);
assert.doesNotMatch(knowledgeIndex, /Array\.from\(\{ length: 5 \}/);

const titles = Object.fromEntries(taxonomy.design_areas.map((area) => [area.id, area.name]));
assert.equal(titles.H, "Platform automation & DevOps");
assert.notEqual(titles.A, "Cost Visibility & Allocation");

console.log(`landing zone pack runtime contract passed (${criteria.criteria.length} capabilities, ${antipatterns.criteria.length} anti-patterns, ${pairs.pairs.length} pairs)`);
