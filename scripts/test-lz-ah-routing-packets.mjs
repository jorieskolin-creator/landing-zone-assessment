import assert from "node:assert/strict";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "esbuild";

const registrySource = await readFile(new URL("../src/services/sourceRegistryService.ts", import.meta.url), "utf8");
assert.match(registrySource, /import \{ BATCH_TITLES, DOMAIN_ROUTING_TERMS \} from '\.\.\/knowledge_base';/);
assert.doesNotMatch(registrySource, /const DOMAIN_TERMS/);
assert.match(registrySource, /DOMAIN_ROUTING_TERMS\[domain\]/);
assert.match(registrySource, /routeChunk\(text, doc\.lz_classification\)/);
assert.match(registrySource, /kind_prior=/);
assert.match(registrySource, /\\b\(\?:AP-\)\?\(\[A-H\]\)\[1-5\]\\b/);
assert.doesNotMatch(registrySource, /\\b\(\?:AP-\)\?\(\[A-H\]\)\\d\+\\b/);
assert.match(registrySource, /UNCLASSIFIED_SOURCES_PRESENT/);
assert.match(registrySource, /OUT_OF_LOCKED_SCOPE_PROVIDERS_PRESENT/);
assert.match(registrySource, /UNUSABLE_SOURCE_EXTRACTION_PRESENT/);
assert.match(registrySource, /const TARGET_PACKET_CHARS = 35000;/);
assert.match(registrySource, /const HARD_PACKET_CHARS = 45000;/);
assert.match(registrySource, /domainIds: string\[\] = Object\.keys\(BATCH_TITLES\)/);

const retrievalSource = await readFile(new URL("../src/services/boundedRetrievalService.ts", import.meta.url), "utf8");
assert.doesNotMatch(retrievalSource, /showback|chargeback|savings plan|ai spend/);
assert.match(retrievalSource, /G:\[/);
assert.match(retrievalSource, /H:\[/);
assert.match(retrievalSource, /hierarchy/);
assert.match(retrievalSource, /policy assignment/);
assert.match(retrievalSource, /vending pipeline/);

const analysis = await readFile(new URL("../src/services/analysisService.ts", import.meta.url), "utf8");
const packetization = analysis.slice(
  analysis.indexOf("const privacy = sanitizeEvidenceSources"),
  analysis.indexOf("emitProgress({ stage: 'privacy'"),
);
assert.match(packetization, /buildDomainPackets\(sourceRegistry\)/);
assert.doesNotMatch(packetization, /buildDomainPackets\(sourceRegistry,\s*scopedBatchIds\)/);
assert.ok(
  packetization.indexOf("applyQuestionnaireIngestion") < packetization.indexOf("buildSourceRegistry"),
  "questionnaire ingestion must stay before packetization",
);
assert.ok(
  packetization.indexOf("buildDomainPackets(sourceRegistry)") < packetization.indexOf("applyBoundedRetrieval"),
  "bounded retrieval must expand the A-H baseline packets",
);
assert.match(analysis, /validateEvidenceAcquisition\(acquiredSources, sourceRegistry, sourcePackets\)/);

const dir = await mkdtemp(join(tmpdir(), "lz-ah-routing-"));
const bundle = async (name, entry) => {
  const outfile = join(dir, `${name}.mjs`);
  await build({
    entryPoints: [new URL(entry, import.meta.url).pathname],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
    logLevel: "silent",
  });
  return import(`file://${outfile}`);
};

const {
  applyLandingZoneSourceClassification,
} = await bundle("classification", "../src/acquisition/landingZoneSourceClassification.ts");
const {
  buildSourceRegistry,
  buildDomainPackets,
  sourceRegistryRuntimeStatus,
  scanRegistryDlp,
} = await bundle("registry", "../src/services/sourceRegistryService.ts");
const { applyBoundedRetrieval } = await bundle("retrieval", "../src/services/boundedRetrievalService.ts");

const AREA_IDS = ["A", "B", "C", "D", "E", "F", "G", "H"];
const classified = (sourceId, fileName, kind, text, lockedProviders) =>
  applyLandingZoneSourceClassification([{
    schema_version: "source_record_v1",
    source_id: sourceId,
    source_name: `Document ${sourceId}`,
    original_file_name: fileName,
    kind,
    text,
  }], lockedProviders)[0];

const hint = (registry, domain) =>
  registry.chunks[0].routing.find((item) => item.domain === domain);

const kindPoorHierarchy = {
  schema_version: "source_record_v1",
  source_id: "src-prior-a",
  source_name: "Document src-prior-a",
  kind: "json",
  text: '{"id":"root","children":[{"id":"corp"}]}',
  lz_classification: {
    schema_version: "lz_source_classification_v1",
    source_kind: "hierarchy_organization",
    evidence_class: "platform",
    evidence_class_number: 1,
    object_type: "Inventory",
    status: "classified",
    providers_detected: ["azure"],
    out_of_locked_scope_providers: [],
    structured_export: true,
    object_count: 1,
    id_fields: [],
    signals: ["manual-prior"],
  },
};
const priorRegistry = buildSourceRegistry([kindPoorHierarchy]);
const priorA = hint(priorRegistry, "A");
assert.equal(priorA.tier, "high");
assert.ok(priorA.reasons.includes("kind_prior=hierarchy_organization"));
assert.ok(priorA.reasons.includes("evidence_class=platform"));
assert.ok(priorA.reasons.includes("provider=azure"));
assert.equal(priorRegistry.chunks[0].evidence_class, "platform");
assert.equal(priorRegistry.chunks[0].lz_source_kind, "hierarchy_organization");

const kindToFile = [
  ["src-a", "azure-mg-hierarchy.json", "json", JSON.stringify({ managementGroups: [{ id: "root", displayName: "Tenant Root Group" }] }), "A", "hierarchy_organization"],
  ["src-b", "role-assignments.json", "json", JSON.stringify({ roleAssignments: [{ principalId: "aaaa", roleDefinitionId: "Owner" }] }), "B", "iam_bindings"],
  ["src-c", "subscriptions.csv", "csv", "SubscriptionId,SubscriptionName\n111,prod", "C", "inventory_accounts"],
  ["src-d", "hub-spoke-peerings.json", "json", JSON.stringify({ peerings: [{ name: "hub-to-spoke", vnet: "hub" }] }), "D", "network_topology"],
  ["src-e", "defender-secure-score.json", "json", JSON.stringify({ secureScore: 62, securityCenter: { assessments: [{ assessmentId: "storage-https" }] } }), "E", "security_configuration"],
  ["src-f", "diagnostic-settings.json", "json", JSON.stringify({ diagnosticSettings: [{ name: "platform-logs", workspaceId: "/subscriptions/111/workspaces/central", logsink: "central-archive" }] }), "F", "logging_monitoring"],
  ["src-g", "policy-assignments.json", "json", JSON.stringify({ policyAssignments: [{ id: "deny-public-ip", enforcementMode: "Default" }] }), "G", "policy_guardrails"],
  ["src-h", "alz-main.json", "json", JSON.stringify({ $schema: "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#", resources: [{ type: "Microsoft.Resources/deployments", name: "connectivity" }] }), "H", "iac_vending"],
];

const mixedRecords = kindToFile.map(([sourceId, fileName, kind, text]) =>
  classified(sourceId, fileName, kind, text, ["azure"]),
);
const mixedRegistry = buildSourceRegistry(mixedRecords);
const mixedPackets = buildDomainPackets(mixedRegistry);
assert.deepEqual(Object.keys(mixedPackets).sort(), AREA_IDS);
for (const [sourceId, , , , domain, kind] of kindToFile) {
  const packet = mixedPackets[domain];
  assert.ok(packet.manifest.some((item) => item.source_id === sourceId), `${kind} must packetize into ${domain}`);
  assert.ok(packet.text.includes(`lz_source_kind="${kind}"`), `${domain} packet must stamp ${kind}`);
  assert.equal(packet.char_count, packet.text.length);
  assert.ok(packet.text.length <= 45000, `${domain} packet must stay under the hard cap`);
}

const workshopText = [
  "LANDING ZONE QUESTIONNAIRE SESSION",
  "evidence_class=workshop",
  "authority=operating_model_interpretation_only",
  "Evidence leads identify additional material to request; they are not findings.",
  `<workshop_observation question_id="A-Q1" design_area_id="A" referenced_criteria="A1 A4 AP-A1" evidence_class="workshop" locator="src-q#A-Q1">`,
  "We point at Tenant Root Group; platform owns it.",
  "</workshop_observation>",
].join("\n");
const workshopRecord = {
  schema_version: "source_record_v1",
  source_id: "src-q",
  source_name: "Document src-q",
  kind: "json",
  text: workshopText,
  lz_classification: {
    schema_version: "lz_source_classification_v1",
    source_kind: "workshop_attestation",
    evidence_class: "workshop",
    evidence_class_number: 3,
    object_type: "Workshop",
    status: "classified",
    providers_detected: ["azure"],
    out_of_locked_scope_providers: [],
    structured_export: true,
    object_count: 1,
    id_fields: ["question_id"],
    signals: ["questionnaire-session"],
  },
};
const workshopRegistry = buildSourceRegistry([workshopRecord]);
const workshopA = hint(workshopRegistry, "A");
assert.ok(workshopA.score >= 6, "literal criterion tokens and design_area_id must boost area A");
assert.ok(workshopA.reasons.includes("criterion=A1"));
assert.ok(workshopA.reasons.includes("design_area=A"));
assert.ok(workshopA.reasons.includes("evidence_class=workshop"));
const workshopPackets = buildDomainPackets(workshopRegistry);
assert.deepEqual(Object.keys(workshopPackets).sort(), AREA_IDS);
assert.match(workshopPackets.A.text, /Tenant Root Group/);
assert.doesNotMatch(workshopPackets.A.text, /Request management group hierarchy export/);
assert.match(workshopPackets.A.text, /evidence_class="workshop"/);
assert.equal(workshopPackets.A.manifest[0].evidence_class, "workshop");
assert.deepEqual(Object.keys(workshopPackets).sort(), AREA_IDS, "integrity still requires an A-H packet for every design area");

const silent = buildDomainPackets(buildSourceRegistry([{
  schema_version: "source_record_v1",
  source_id: "src-notes",
  source_name: "Document src-notes",
  kind: "text",
  text: "Hello. The attached slides are for tomorrow.",
}]));
assert.deepEqual(Object.keys(silent).sort(), AREA_IDS);
for (const domain of AREA_IDS) {
  assert.match(silent[domain].text, /<NO_ROUTED_CHUNKS>/);
  assert.equal(silent[domain].included_chunk_count, 0);
  assert.equal(silent[domain].weak_coverage, true);
}

const outOfScopeRecord = classified(
  "src-aws",
  "aws-organizations.json",
  "json",
  JSON.stringify({ organizationId: "o-abc", accounts: [{ accountId: "111122223333", name: "payer" }] }),
  ["azure"],
);
assert.ok(outOfScopeRecord.lz_classification.out_of_locked_scope_providers.includes("aws"));
const outRegistry = buildSourceRegistry([outOfScopeRecord]);
assert.ok(outRegistry.warnings.some((warning) => warning.includes("outside locked Step 0")));
const outPackets = buildDomainPackets(outRegistry);
const outStatus = sourceRegistryRuntimeStatus(
  outRegistry,
  outPackets,
  0,
  scanRegistryDlp(outRegistry),
  { decision: "PASS", blocking_codes: [] },
  { registry_hash: "registry-hash", packet_manifest_hash: "packet-hash" },
);
assert.equal(outStatus.acquisition_readiness.status, "READY_WITH_WARNINGS");
assert.ok(outStatus.acquisition_readiness.reasons.includes("OUT_OF_LOCKED_SCOPE_PROVIDERS_PRESENT"));
assert.ok(outRegistry.chunks[0].routing.some((item) => item.reasons.includes("out_of_scope_provider=aws")));
assert.ok(outRegistry.warnings.some((warning) => warning.includes("withheld from A-H packets")));
assert.ok(
  Object.values(outPackets).every((packet) => !packet.manifest.some((item) => item.source_id === "src-aws")),
  "exclusively out-of-scope provider evidence must not enter A-H packets",
);
assert.ok(Object.values(outPackets).every((packet) => !packet.text.includes("src-aws")));

const mixedProviderRecord = {
  schema_version: "source_record_v1",
  source_id: "src-mixed",
  source_name: "Document src-mixed",
  kind: "json",
  text: '{"id":"root","children":[{"id":"corp"}]}',
  lz_classification: {
    schema_version: "lz_source_classification_v1",
    source_kind: "hierarchy_organization",
    evidence_class: "platform",
    evidence_class_number: 1,
    object_type: "Inventory",
    status: "classified",
    providers_detected: ["azure", "aws"],
    out_of_locked_scope_providers: ["aws"],
    structured_export: true,
    object_count: 1,
    id_fields: [],
    signals: ["mixed-provider"],
  },
};
const mixedProviderPackets = buildDomainPackets(buildSourceRegistry([mixedProviderRecord]));
assert.ok(mixedProviderPackets.A.manifest.some((item) => item.source_id === "src-mixed"));
assert.match(mixedProviderPackets.A.text, /providers="azure,aws"/);
assert.match(mixedProviderPackets.A.text, /out_of_scope_providers="aws"/);

const inventedCriterion = buildSourceRegistry([{
  schema_version: "source_record_v1",
  source_id: "src-b12",
  source_name: "Document src-b12",
  kind: "text",
  text: "Locker label B12 is not a catalogue criterion.",
}]);
assert.ok(inventedCriterion.chunks[0].routing.every((item) => !item.reasons.includes("criterion=B12")));
assert.ok(inventedCriterion.chunks[0].routing.every((item) => item.score === 0));

const catalogueCriterion = buildSourceRegistry([{
  schema_version: "source_record_v1",
  source_id: "src-a1",
  source_name: "Document src-a1",
  kind: "text",
  text: "Referenced criterion A1 is in the frozen catalogue.",
}]);
assert.ok(hint(catalogueCriterion, "A").reasons.includes("criterion=A1"));
assert.ok(hint(catalogueCriterion, "A").score >= 4);

const unclassifiedRegistry = buildSourceRegistry([{
  schema_version: "source_record_v1",
  source_id: "src-unclassified",
  source_name: "Document src-unclassified",
  kind: "text",
  text: "Hello. The attached slides are for tomorrow.",
  extraction: { unit: "document", total_units: 1, processed_units: 1, truncated: false, quality: "poor" },
}]);
assert.ok(unclassifiedRegistry.warnings.some((warning) => warning.includes("treated as Class 2 document")));
assert.ok(unclassifiedRegistry.warnings.some((warning) => warning.includes("unusable for A-H packetization")));
const unclassifiedPackets = buildDomainPackets(unclassifiedRegistry);
const unclassifiedStatus = sourceRegistryRuntimeStatus(
  unclassifiedRegistry,
  unclassifiedPackets,
  0,
  scanRegistryDlp(unclassifiedRegistry),
  { decision: "PASS", blocking_codes: [] },
  { registry_hash: "registry-hash", packet_manifest_hash: "packet-hash" },
);
assert.ok(unclassifiedStatus.acquisition_readiness.reasons.includes("UNCLASSIFIED_SOURCES_PRESENT"));
assert.ok(unclassifiedStatus.acquisition_readiness.reasons.includes("UNUSABLE_SOURCE_EXTRACTION_PRESENT"));
assert.ok(unclassifiedStatus.acquisition_readiness.reasons.includes("PACKET_COVERAGE_WARNINGS_PRESENT"));

const expansionRegistry = {
  source_count: 1,
  chunk_count: 2,
  warnings: [],
  extraction: { overall_completeness: 100, status: "COMPLETE", warning_count: 0, sources: [], blocking_reasons: [] },
  chunks: [
    { chunk_id: "g1", source_id: "src-g", type: "text", text: "guardrail baseline", routing: [{ domain: "G", tier: "high", score: 6, reasons: [] }] },
    { chunk_id: "g2", source_id: "src-g", type: "text", text: "ownership review policy assignment", routing: [{ domain: "G", tier: "low", score: 0, reasons: [] }] },
  ],
};
const expansionBaseline = {
  G: {
    domain_id: "G",
    title: "G",
    text: "not inspected",
    images: [],
    manifest: [{ chunk_id: "g1", source_id: "src-g", type: "text", relevance: "high", routed_domains: ["G"] }],
    included_chunk_count: 1,
    total_candidate_chunks: 1,
    weak_coverage: true,
    coverage_notes: [],
    char_count: 0,
  },
};
const expanded = applyBoundedRetrieval(expansionRegistry, expansionBaseline);
const gTrace = expanded.trace.domains.find((domain) => domain.domain_id === "G");
assert.equal(gTrace.passes.length, 2);
assert.deepEqual(gTrace.passes[1].selected_chunk_ids, ["g2"]);
assert.match(expanded.packets.G.text, /ownership review policy assignment/);
assert.ok(expanded.packets.G.text.length <= 45000);

console.log("landing zone A-H routing and packetization passed");
