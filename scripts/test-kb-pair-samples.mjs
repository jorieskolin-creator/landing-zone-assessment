import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  extractKbSections,
  extractJsonFrontMatter,
  sanitizeKbDocument,
  validateKbMetadata,
} from "../lib/kbIndex.js";

const capabilityText = await readFile(
  new URL("../docs/kb-authoring/samples/PAIR-A1.capability.md", import.meta.url),
  "utf8",
);
const antipatternText = await readFile(
  new URL("../docs/kb-authoring/samples/PAIR-A1.antipattern.md", import.meta.url),
  "utf8",
);

const capabilityPath =
  "Knowledge Base/Tenant, billing & organization construct/A - Tenant, billing & organization construct - A1 - Authoritative organization root.pdf";
const antipatternPath =
  "Knowledge Base/Tenant, billing & organization construct/A - Tenant, billing & organization construct - AP-A1 - Shadow tenants and unmanaged orgs.pdf";

const capabilityDoc = sanitizeKbDocument({
  pathname: capabilityPath,
  text: capabilityText,
  pdfSha256: "sample",
  extractedTextSha256: "sample",
});
const antipatternDoc = sanitizeKbDocument({
  pathname: antipatternPath,
  text: antipatternText,
  pdfSha256: "sample",
  extractedTextSha256: "sample",
});

assert.equal(capabilityDoc.stream, "maturity");
assert.equal(capabilityDoc.criterion_id, "A1");
assert.equal(capabilityDoc.capability_id, "A1");
assert.equal(capabilityDoc.kb_id, "lz-kb-A1-v1");
assert.equal(capabilityDoc.title, "Authoritative organization root");
assert.ok(capabilityDoc.forbidden_uses.includes("customer_current_state_claim"));
assert.ok(capabilityDoc.forbidden_uses.includes("source_evidence_quote"));
assert.ok(capabilityDoc.forbidden_uses.includes("audited_finding"));
assert.equal(capabilityDoc.extraction.section_order_valid, true);
assert.deepEqual(capabilityDoc.extraction.duplicate_section_headings, []);

assert.equal(antipatternDoc.stream, "antipattern");
assert.equal(antipatternDoc.criterion_id, "AP-A1");
assert.equal(antipatternDoc.capability_id, "A1");
assert.equal(antipatternDoc.kb_id, "lz-kb-AP-A1-v1");
assert.equal(antipatternDoc.title, "Shadow tenants and unmanaged orgs");
assert.equal(antipatternDoc.extraction.section_order_valid, true);

for (const key of [
  "canonical_definition",
  "evidence_requirements",
  "false_positive_guards",
  "validation_questions",
  "scoring_guidance",
]) {
  assert.ok(capabilityDoc.sections[key], `capability missing ${key}`);
  assert.ok(antipatternDoc.sections[key], `antipattern missing ${key}`);
}
assert.ok(antipatternDoc.sections.state_interpretation, "antipattern missing state_interpretation");
assert.ok(antipatternDoc.sections.prohibited_inference_rules, "antipattern missing prohibited_inference_rules");
assert.ok(capabilityDoc.sections.related_capabilities.includes("PAIR-A1"));
assert.ok(antipatternDoc.sections.related_capabilities.includes("A1"));

assert.doesNotMatch(capabilityText, /"streams"\s*:/);
assert.doesNotMatch(capabilityText, /"antipattern_id"\s*:/);
assert.doesNotMatch(antipatternText, /"streams"\s*:/);
assert.doesNotMatch(antipatternText, /"antipattern_id"\s*:/);

assert.deepEqual(validateKbMetadata(extractJsonFrontMatter(capabilityText), capabilityPath), []);
assert.deepEqual(validateKbMetadata(extractJsonFrontMatter(antipatternText), antipatternPath), []);

const antiSections = extractKbSections(antipatternText);
assert.ok(antiSections.canonical_definition);

console.log("kb pair document samples passed (PAIR-A1 capability + antipattern)");
