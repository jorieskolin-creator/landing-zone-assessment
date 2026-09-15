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
const knowledge = await readJson("../src/domain-packs/landing-zone/knowledge-base-manifest.json");

const PACK = {
  packId: packManifest.packId,
  version: packManifest.version,
  schemaVersion: packManifest.schemaVersion,
  designAreas: taxonomy.design_areas,
  criteria: [...criteria.criteria, ...antipatterns.criteria],
  knowledgeBase: knowledge,
};

const source = await readFile(new URL("../src/knowledge_base/landingZoneKnowledgeIndex.ts", import.meta.url), "utf8");
assert.doesNotMatch(source, /from ['"].*finops_.*\.json['"]/, "LZ knowledge index must not import FinOps JSON fixtures");
assert.doesNotMatch(source, /LEGACY_FINOPS_DOMAIN_NAMES/);

const rewritten = source
  .replace(/import type \{[\s\S]*?\} from "\.\.\/domain-packs\/assessment-domain-pack";\n/, "")
  .replace(/import type \{[\s\S]*?\} from "\.\.\/types";\n/, "");
assert.doesNotMatch(rewritten, /loadLandingZonePack/, "index builder must accept a pack argument");

const dir = await mkdtemp(join(tmpdir(), "lz-knowledge-index-"));
const modulePath = join(dir, "landingZoneKnowledgeIndex.mjs");
await writeFile(modulePath, compile(rewritten), "utf8");
const {
  buildLandingZoneKnowledgeIndex,
  indexContainsRejectedFinopsKnowledge,
  validateLandingZoneKnowledgeTopics,
} = await import(`file://${modulePath}`);

const pendingIndex = buildLandingZoneKnowledgeIndex(PACK);
assert.equal(pendingIndex.status.source, "lz_pack_pending");
assert.equal(pendingIndex.status.document_count, 0);
assert.deepEqual(pendingIndex.documents, []);
assert.equal(pendingIndex.status.kb_pack_version, knowledge.version);
assert.equal(pendingIndex.status.kb_schema_version, knowledge.schemaVersion);
assert.equal(pendingIndex.status.kb_content_status, "contract_defined_content_pending");
assert.ok(pendingIndex.failures.some((item) => item.reason === "LZ_KNOWLEDGE_CONTENT_PENDING"));
assert.equal(knowledge.topics.length, 0);
assert.equal(knowledge.must_not_fallback_to_finops_content, true);
assert.ok(knowledge.topic_contract.required_fields.includes("citation"));
assert.ok(knowledge.topic_contract.required_fields.includes("provenance"));

const availableEmpty = structuredClone(PACK);
availableEmpty.knowledgeBase = {
  ...knowledge,
  status: "content_available",
};
const missing = buildLandingZoneKnowledgeIndex(availableEmpty);
assert.equal(missing.status.source, "unavailable");
assert.ok(missing.failures.some((item) => item.reason === "REQUIRED_LZ_KNOWLEDGE_MISSING"));

const validTopic = {
  id: "lz-kb-a1-maturity",
  title: "Authoritative organization root rubric",
  applicable_design_area_ids: ["A"],
  applicable_criterion_ids: ["A1"],
  provider_applicability: ["azure", "aws", "gcp"],
  allowed_interpretation_use: ["rubric_context"],
  prohibited_use: ["customer_current_state_claim", "source_evidence_quote"],
  citation: { source: "Landing Zone pack A1", locator: "criteria.json#A1" },
  provenance: { origin: "landing-zone-pack", version: "1.0.0" },
};
const withTopic = structuredClone(PACK);
withTopic.knowledgeBase = {
  ...knowledge,
  status: "content_available",
  topics: [validTopic],
};
assert.deepEqual(validateLandingZoneKnowledgeTopics(withTopic), []);
const topicIndex = buildLandingZoneKnowledgeIndex(withTopic);
assert.equal(topicIndex.status.source, "lz_pack_index");
assert.equal(topicIndex.status.document_count, 1);
assert.equal(topicIndex.documents[0].criterion_id, "A1");
assert.equal(topicIndex.documents[0].domain_name, "Tenant, billing & organization construct");
assert.match(topicIndex.documents[0].body_excerpt, /not customer-state evidence/);
assert.doesNotMatch(topicIndex.documents[0].body_excerpt, /Cost Visibility & Allocation/);
assert.equal(indexContainsRejectedFinopsKnowledge(topicIndex), false);

const unknownTopic = structuredClone(PACK);
unknownTopic.knowledgeBase = {
  ...knowledge,
  topics: [{
    ...validTopic,
    applicable_criterion_ids: ["Z1"],
  }],
};
assert.ok(validateLandingZoneKnowledgeTopics(unknownTopic).some((error) => error.includes("Z1")));

const finopsTopic = structuredClone(PACK);
finopsTopic.knowledgeBase = {
  ...knowledge,
  topics: [{
    ...validTopic,
    title: "Cost Visibility & Allocation tagging rubric",
    citation: { source: "FinOps Engine A1" },
  }],
};
assert.ok(validateLandingZoneKnowledgeTopics(finopsTopic).some((error) => error.includes("rejected FinOps")));
assert.equal(indexContainsRejectedFinopsKnowledge({
  documents: [{
    pathname: "Knowledge Base/Cost Visibility & Allocation/A - Cost Visibility & Allocation - A1.pdf",
    domain_name: "Cost Visibility & Allocation",
    title: "Comprehensive Cost Allocation & Tagging",
  }],
}), true);

const kbIndexJs = await readFile(new URL("../lib/kbIndex.js", import.meta.url), "utf8");
assert.doesNotMatch(kbIndexJs, /LEGACY_FINOPS_DOMAIN_NAMES/);
assert.match(kbIndexJs, /FinOps Knowledge Base content is rejected/);

const apiSource = await readFile(new URL("../api/kb-index.js", import.meta.url), "utf8");
assert.doesNotMatch(apiSource, /FINOPS_KB_BLOB_PREFIX/);
assert.match(apiSource, /LZ_KB_BLOB_PREFIX/);
assert.match(apiSource, /Landing Zone KnowledgeBase/);
assert.doesNotMatch(apiSource, /\[FinOps KnowledgeBase\]/);

const runtimeIndex = await readFile(new URL("../src/knowledge_base/index.ts", import.meta.url), "utf8");
assert.match(runtimeIndex, /buildLandingZoneKnowledgeIndex/);
assert.match(runtimeIndex, /REMOTE_KB_FINOPS_CONTENT_REJECTED/);
assert.doesNotMatch(runtimeIndex, /source: 'built_in'/);
assert.doesNotMatch(runtimeIndex, /finops_criteria\.json/);
assert.doesNotMatch(runtimeIndex, /finops_tactics_database\.json/);

console.log("landing zone knowledge index tests passed");
