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

const dir = await mkdtemp(join(tmpdir(), "lz-acquisition-"));
const source = await readFile(new URL("../src/acquisition/landingZoneSourceClassification.ts", import.meta.url), "utf8");
await writeFile(join(dir, "landingZoneSourceClassification.mjs"), compile(source), "utf8");
const {
  classifyLandingZoneSource,
  applyLandingZoneSourceClassification,
  summarizeLzAcquisition,
} = await import(`file://${join(dir, "landingZoneSourceClassification.mjs")}`);

const classify = (fileName, kind, text, extra = {}) =>
  classifyLandingZoneSource({ fileName, kind, text, ...extra });

const hierarchy = classify("azure-mg-hierarchy.json", "json", JSON.stringify({
  managementGroups: [
    { id: "/providers/Microsoft.Management/managementGroups/root", displayName: "Tenant Root Group", parentId: null },
    { id: "/providers/Microsoft.Management/managementGroups/corp", displayName: "Corp", parentId: "root" },
  ],
}));
assert.equal(hierarchy.source_kind, "hierarchy_organization");
assert.equal(hierarchy.evidence_class, "platform");
assert.equal(hierarchy.evidence_class_number, 1);
assert.equal(hierarchy.object_count, 2);
assert.ok(hierarchy.providers_detected.includes("azure"));

const inventory = classify("subscriptions.csv", "csv", "SubscriptionId,SubscriptionName\n111,prod\n222,dev", {
  tables: [{ headers: ["SubscriptionId", "SubscriptionName"], rows: [["111", "prod"], ["222", "dev"]], analysis_rows: [["111", "prod"], ["222", "dev"]] }],
});
assert.equal(inventory.source_kind, "inventory_accounts");
assert.equal(inventory.evidence_class, "platform");

const iam = classify("role-assignments.json", "json", JSON.stringify({
  roleAssignments: [{ principalId: "aaaa", roleDefinitionId: "Owner", scope: "/providers/Microsoft.Management/managementGroups/corp" }],
}));
assert.equal(iam.source_kind, "iam_bindings");
assert.equal(iam.evidence_class, "platform");

const policy = classify("policy-assignments.json", "json", JSON.stringify({
  policyAssignments: [{ id: "deny-public-ip", enforcementMode: "Default", policyDefinitionId: "/providers/Microsoft.Authorization/policyDefinitions/deny" }],
}));
assert.equal(policy.source_kind, "policy_guardrails");
assert.equal(policy.evidence_class, "platform");

const network = classify("hub-spoke-peerings.json", "json", JSON.stringify({
  peerings: [{ name: "hub-to-spoke", vnet: "hub", remoteVirtualNetwork: "spoke-prod" }],
}));
assert.equal(network.source_kind, "network_topology");
assert.equal(network.evidence_class, "platform");

const logging = classify("diagnostic-settings.json", "json", JSON.stringify({
  diagnosticSettings: [{ name: "platform-logs", workspaceId: "/subscriptions/111/workspaces/central", logsink: "central-archive" }],
}));
assert.equal(logging.source_kind, "logging_monitoring");
assert.equal(logging.evidence_class, "platform");

const security = classify("defender-secure-score.json", "json", JSON.stringify({
  secureScore: 62,
  securityCenter: { assessments: [{ assessmentId: "storage-https" }] },
}));
assert.equal(security.source_kind, "security_configuration");
assert.equal(security.evidence_class, "platform");

const iac = classify("alz-main.json", "json", JSON.stringify({
  $schema: "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
  resources: [{ type: "Microsoft.Resources/deployments", name: "connectivity" }],
}));
assert.equal(iac.source_kind, "iac_vending");
assert.equal(iac.evidence_class, "document");
assert.equal(iac.evidence_class_number, 2);

const exceptions = classify("policy-exemptions.json", "json", JSON.stringify({
  policyExemptions: [{ exceptionId: "exp-1", expiresOn: "2027-01-01", waiver: "temporary" }],
}));
assert.equal(exceptions.source_kind, "exception_waiver");
assert.equal(exceptions.evidence_class, "document");

const architecture = classify("landing-zone-design.pdf", "pdf", [
  "This document describes the target architecture for the landing zone.",
  "Management groups will encode policy. The operating model and RACI are in appendix B.",
].join("\n"));
assert.equal(architecture.source_kind, "architecture_operating_model");
assert.equal(architecture.evidence_class, "document");

const workshop = classify("lz-questionnaire.json", "json", JSON.stringify({
  evidence_class: "workshop",
  questions: [
    { id: "A-Q1", evidence_class: "workshop", evidence_lead: "Request the management group export", facilitator: "Alex" },
  ],
}));
assert.equal(workshop.source_kind, "workshop_attestation");
assert.equal(workshop.evidence_class, "workshop");
assert.equal(workshop.evidence_class_number, 3);

const credentialCsv = [
  "app_id,display_name,credential_type,client_secret,federated_credential,expiry,rotation_owner",
  "sp-erp-batch,ERP batch,client_secret,expires never,,never,unassigned",
  "ado-pipeline-prod-secret,ADO pipeline prod secret,client_secret,,prod-plain,never,unassigned",
  "sp-old-aks,Old AKS,client_secret,expired 2024-08-01,,2024-08-01,unassigned",
].join("\n");
const credentialRows = credentialCsv.split("\n").slice(1).map((line) => line.split(","));
const credentials = classify("service-principals.csv", "csv", credentialCsv, {
  tables: [{
    headers: credentialCsv.split("\n")[0].split(","),
    rows: credentialRows,
    analysis_rows: credentialRows,
  }],
});
assert.equal(credentials.source_kind, "credential_inventory");
assert.equal(credentials.evidence_class, "platform");
assert.equal(credentials.evidence_class_number, 1);
assert.equal(credentials.object_type, "Identity-binding");
assert.equal(credentials.object_count, 3);
assert.ok(credentials.id_fields.includes("app_id"));

const awsInventoryCsv = [
  "account_id,account_name,email,status",
  "111122223333,payer,billing@example.com,ACTIVE",
  "222233334444,prod,prod@example.com,ACTIVE",
].join("\n");
const awsRows = awsInventoryCsv.split("\n").slice(1).map((line) => line.split(","));
const awsInventory = classify("member-accounts.csv", "csv", awsInventoryCsv, {
  tables: [{
    headers: awsInventoryCsv.split("\n")[0].split(","),
    rows: awsRows,
    analysis_rows: awsRows,
  }],
});
assert.equal(awsInventory.source_kind, "inventory_accounts");
assert.equal(awsInventory.evidence_class, "platform");
assert.equal(awsInventory.evidence_class_number, 1);

const scopeLock = {
  schema_version: "lz_step0_scope_v1",
  pack_id: "landing-zone",
  estate_name: "Nordhaven",
  providers: ["azure"],
  estate_roots: [{ provider: "azure", kind: "tenant", reference: "nordhaven.onmicrosoft.com", label: "Nordhaven tenant" }],
  design_area_ids: ["A", "B", "C", "D", "E", "F", "G", "H"],
  inventory_exports_included: true,
  live_collection_permitted: false,
  exclusions: { providers: ["aws", "gcp"], design_area_ids: [], notes: ["open questions on Nordhaven Lab tenant and EA enrollment E-98112"] },
  locked_at: "2026-09-28T09:00:00.000Z",
  facilitator: "Alex",
  participants: "platform team",
};
const scope = classify("scope-lock.json", "json", JSON.stringify(scopeLock));
assert.equal(scope.source_kind, "assessment_scope");
assert.equal(scope.evidence_class, "document");
assert.equal(scope.evidence_class_number, 2);
assert.equal(scope.object_type, "Scope-metadata");
assert.notEqual(scope.evidence_class, "workshop");

const unclassified = classify("notes.txt", "text", "Hello team, please review the attached slides.");
assert.equal(unclassified.source_kind, "unclassified");
assert.equal(unclassified.evidence_class, "document");
assert.equal(unclassified.status, "unclassified");

const outOfScope = classify("aws-organizations.json", "json", JSON.stringify({
  organizationId: "o-abc",
  accounts: [{ accountId: "111122223333", name: "payer" }],
}), { lockedProviders: ["azure"] });
assert.ok(outOfScope.providers_detected.includes("aws"));
assert.deepEqual(outOfScope.out_of_locked_scope_providers, ["aws"]);

const records = applyLandingZoneSourceClassification([
  { schema_version: "source_record_v1", source_id: "src-001", source_name: "Document 001", original_file_name: "azure-mg-hierarchy.json", kind: "json", text: JSON.stringify({ managementGroups: [{ id: "root" }] }) },
  { schema_version: "source_record_v1", source_id: "src-002", source_name: "Document 002", original_file_name: "lz-questionnaire.json", kind: "json", text: JSON.stringify({ evidence_class: "workshop", questions: [{ id: "A-Q1", evidence_class: "workshop" }] }) },
], ["azure"]);
const summary = summarizeLzAcquisition(records);
assert.equal(summary.platform_source_count, 1);
assert.equal(summary.workshop_source_count, 1);
assert.equal(summary.classified_source_count, 2);
assert.equal(records[0].lz_classification.evidence_class, "platform");
assert.equal(records[1].lz_classification.evidence_class, "workshop");

const analysis = await readFile(new URL("../src/services/analysisService.ts", import.meta.url), "utf8");
assert.match(analysis, /applyLandingZoneSourceClassification\(privacy\.sources/);
assert.ok(
  analysis.indexOf("applyLandingZoneSourceClassification") < analysis.indexOf("buildSourceRegistry(acquiredSources)"),
  "classification must run after privacy and before packetization",
);
assert.match(analysis, /lz_acquisition: summarizeLzAcquisition/);

const registry = await readFile(new URL("../src/services/sourceRegistryService.ts", import.meta.url), "utf8");
assert.match(registry, /evidence_class="\$\{chunk\.evidence_class\}"/);
assert.match(registry, /treated as Class 2 document, not platform inventory/);
assert.match(registry, /not a silent scope expansion/);

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
assert.match(app, /classifyLandingZoneSource/);
assert.match(app, /original_file_name: file\.name/);
assert.match(app, /LZ_SOURCE_KIND_LABELS/);

const pack = JSON.parse(await readFile(new URL("../src/domain-packs/landing-zone/evidence-taxonomy.json", import.meta.url), "utf8"));
assert.ok(pack.source_kinds.includes("hierarchy_organization"));
assert.ok(pack.source_kinds.includes("workshop_attestation"));
assert.ok(pack.source_kinds.includes("credential_inventory"));
assert.ok(pack.source_kinds.includes("assessment_scope"));
assert.ok(pack.object_types.includes("Architecture-document"));
assert.ok(pack.object_types.includes("Scope-metadata"));

console.log("landing zone file acquisition classification passed");
