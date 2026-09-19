import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "../node_modules/typescript/lib/typescript.js";

const dir = await mkdtemp(join(tmpdir(), "lz-forensic-eval-"));
const transpile = (source) => ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2020,
    importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
  },
}).outputText;

const forensicSource = await readFile(new URL("../src/services/lzForensicEvaluation.ts", import.meta.url), "utf8");
assert.doesNotMatch(forensicSource, /buildDomainPackets|DOMAIN_TERMS|calculateMetrics|pair-registry|maturityModelService|BATCH_IDS/);
assert.doesNotMatch(forensicSource, /from ['"]\.\.\/orchestrator['"]/);
assert.match(forensicSource, /lz_evidence_authority_v1/);
assert.match(forensicSource, /lz_evidence_class_contradiction_v1/);

await writeFile(join(dir, "lzForensicEvaluation.mjs"), transpile(forensicSource), "utf8");
const {
  applyLzForensicEvaluation,
  stampQuoteEvidenceClass,
  strongestEvidenceClass,
  LZ_FORENSIC_EVALUATION_SCHEMA,
} = await import(`file://${join(dir, "lzForensicEvaluation.mjs")}`);

const analysis = await readFile(new URL("../src/services/analysisService.ts", import.meta.url), "utf8");
const provenanceIndex = analysis.indexOf("reconcileEvidenceProvenance(");
const forensicIndex = analysis.indexOf("applyLzForensicEvaluation(");
const integrityIndex = analysis.indexOf("validatePreSynthesisIntegrity(");
const sanitationIndex = analysis.indexOf("const auditLogs = validateAndSanitizeLogs(");
const calculationIndex = analysis.indexOf("scoreLandingZoneAssessment(");
assert.ok(provenanceIndex > 0 && forensicIndex > provenanceIndex, "authority overlay must run after provenance");
assert.ok(forensicIndex < integrityIndex && integrityIndex < sanitationIndex && sanitationIndex < calculationIndex,
  "authority overlay must run before integrity, sanitation, and pair scoring");
assert.match(analysis, /evidence_class: isLzEvidenceClass\(q\.evidence_class\)/);
assert.match(analysis, /safeItem\.lz_authority_cap = item\.lz_authority_cap/);
assert.match(analysis, /safeItem\.lz_contradiction_classes = item\.lz_contradiction_classes/);

const orchestrator = await readFile(new URL("../src/orchestrator.ts", import.meta.url), "utf8");
assert.doesNotMatch(orchestrator, /quote\.evidence_class/, "models must not be required to emit evidence_class");
assert.match(orchestrator, /assertForensicBatchIds/);
assert.match(orchestrator, /forensicClientFailureCode/);
assert.match(orchestrator, /INVALID_BATCH_OUTPUT_IDS/);
assert.match(orchestrator, /INVALID_BATCH_OUTPUT_SCHEMA/);
assert.match(orchestrator, /INVALID_BATCH_OUTPUT_PROVENANCE/);

const prompts = await readFile(new URL("../src/prompts.ts", import.meta.url), "utf8");
assert.match(prompts, /Landing Zone Forensic Auditor/);
assert.doesNotMatch(prompts, /Cloud Financial Forensic Auditor/);
assert.match(prompts, /Do not emit evidence_class/);
assert.match(prompts, /JSON key remains "maturity"/);

const guardrails = await readFile(new URL("../src/knowledge_base/index.ts", import.meta.url), "utf8");
assert.match(guardrails, /Silence is UNKNOWN/);
assert.doesNotMatch(guardrails, /Silence is Data:\*\* If the text is silent, score is \*\*0\*\*/);

const verifier = await readFile(new URL("../src/services/evidenceCheckService.ts", import.meta.url), "utf8");
assert.match(verifier, /independent Landing Zone evidence verifier/);
assert.match(verifier, /tested_absent".*Class 1 coverage/s);
assert.doesNotMatch(verifier, /independent FinOps evidence verifier/);

const quote = (chunkId, sourceId, text = "policy assignment attached") => ({
  quote: text,
  source_id: sourceId,
  chunk_id: chunkId,
  category: "Policy",
  evidence_source: "text",
});

const assessed = (count, quotes, extra = {}) => ({
  count,
  status: count === 3 ? "OK" : count === 0 ? "NOK" : "Partial",
  evidence: "Quoted source evidence.",
  evidence_quotes: quotes,
  assessment_status: "assessed",
  question_results: Array.from({ length: 3 }, (_, index) => index < count ? "supported" : "unknown"),
  reasoning: "Sub-criteria evaluated from cited chunks.",
  is_silent: false,
  ...extra,
});

const unknownItem = () => ({
  count: 0,
  status: "NOK",
  evidence: "Packet silent.",
  evidence_quotes: [],
  assessment_status: "not_assessed",
  question_results: ["unknown", "unknown", "unknown"],
  reasoning: "No relevant customer evidence.",
  is_silent: true,
});

const registry = {
  chunks: [
    { chunk_id: "src-plat-c001", source_id: "src-plat", evidence_class: "platform", text: "policy assignment attached" },
    { chunk_id: "src-doc-c001", source_id: "src-doc", evidence_class: "document", text: "architecture says deny public IP" },
    { chunk_id: "src-ws-c001", source_id: "src-ws", evidence_class: "workshop", text: "workshop: platform team owns the root" },
  ],
};

const phase1 = (maturity = {}, antipattern = {}) => ({
  phase_1_audit_logs: { maturity, antipattern },
  evidence_check: {
    items: [
      ...Object.keys(maturity).map((id) => ({
        stream: "maturity",
        id,
        status: "supported",
        original_count: maturity[id].count,
        verified_count: maturity[id].count,
        rationale: "Verifier accepted the scanner quotes.",
      })),
      ...Object.keys(antipattern).map((id) => ({
        stream: "antipattern",
        id,
        status: "supported",
        original_count: antipattern[id].count,
        verified_count: antipattern[id].count,
        rationale: "Verifier accepted the scanner quotes.",
        antipattern_absence_status: antipattern[id].antipattern_absence_status,
      })),
    ],
  },
});

{
  const stamped = stampQuoteEvidenceClass(
    { ...quote("src-ws-c001", "src-ws"), evidence_class: "platform" },
    registry,
  );
  assert.equal(stamped.evidence_class, "workshop", "cited CHUNK class must overwrite a model-invented class");
  assert.equal(strongestEvidenceClass(["workshop", "document", "platform"]), "platform");
}

{
  const result = applyLzForensicEvaluation(phase1({
    A1: assessed(3, [quote("src-ws-c001", "src-ws", "workshop: platform team owns the root")]),
  }), registry);
  const item = result.phase_1_audit_logs.maturity.A1;
  assert.equal(item.count, 1);
  assert.deepEqual(item.question_results, ["supported", "unknown", "unknown"]);
  assert.equal(item.assessment_status, "assessed");
  assert.equal(item.evidence_quotes[0].evidence_class, "workshop");
  assert.equal(item.lz_authority_cap.reason, "workshop_cannot_award_embedded");
  assert.equal(item.lz_authority_cap.from_count, 3);
  assert.equal(item.lz_authority_cap.to_count, 1);
  assert.equal(result.evidence_check.items[0].verified_count, 1);
  assert.equal(result.meta.lz_forensic_evaluation.schema, LZ_FORENSIC_EVALUATION_SCHEMA);
  assert.equal(result.meta.lz_forensic_evaluation.authority_caps.length, 1);
}

{
  const result = applyLzForensicEvaluation(phase1({
    A2: assessed(3, [quote("src-doc-c001", "src-doc", "architecture says deny public IP")]),
  }), registry);
  const item = result.phase_1_audit_logs.maturity.A2;
  assert.equal(item.count, 2);
  assert.deepEqual(item.question_results, ["supported", "supported", "unknown"]);
  assert.equal(item.lz_authority_cap.reason, "document_cannot_prove_current_enforcement");
  assert.equal(item.evidence_quotes.length, 1, "capped capability quotes stay bound for lineage");
}

{
  const result = applyLzForensicEvaluation(phase1({
    A3: assessed(3, [quote("src-plat-c001", "src-plat")]),
  }), registry);
  const item = result.phase_1_audit_logs.maturity.A3;
  assert.equal(item.count, 3);
  assert.deepEqual(item.question_results, ["supported", "supported", "supported"]);
  assert.equal(item.evidence_quotes[0].evidence_class, "platform");
  assert.equal(item.lz_authority_cap, undefined);
}

{
  const result = applyLzForensicEvaluation(phase1({}, {
    A1: {
      ...assessed(0, [quote("src-ws-c001", "src-ws", "workshop: platform team owns the root")]),
      status: "OK",
      antipattern_absence_status: "tested_absent",
      coverage_reason: "Workshop said the anti-pattern is gone.",
    },
  }), registry);
  const item = result.phase_1_audit_logs.antipattern.A1;
  assert.equal(item.antipattern_absence_status, "unknown_absent");
  assert.equal(item.assessment_status, "not_assessed");
  assert.equal(item.count, 0);
  assert.deepEqual(item.question_results, ["unknown", "unknown", "unknown"]);
  assert.deepEqual(item.evidence_quotes, []);
  assert.equal(item.lz_authority_cap.reason, "tested_absence_requires_platform_evidence");
  const check = result.evidence_check.items.find((entry) => entry.stream === "antipattern");
  assert.equal(check.antipattern_absence_status, "unknown_absent");
  assert.equal(check.assessment_status, "not_assessed");
}

{
  const result = applyLzForensicEvaluation(phase1({
    A4: assessed(3, [
      quote("src-plat-c001", "src-plat"),
      quote("src-doc-c001", "src-doc", "architecture says deny public IP"),
    ]),
  }), registry);
  const item = result.phase_1_audit_logs.maturity.A4;
  assert.equal(item.count, 3, "platform evidence keeps Embedded; contradiction is flagged, not zeroed");
  assert.deepEqual(item.question_results, ["supported", "supported", "supported"]);
  assert.deepEqual(item.lz_contradiction_classes.kinds, ["platform_document"]);
  assert.match(item.lz_evidence_authority_note, /do not vote away platform facts/);
  assert.equal(item.lz_authority_cap, undefined);
  assert.equal(result.meta.lz_forensic_evaluation.contradictions.length, 1);
  assert.equal(result.meta.lz_forensic_evaluation.authority_caps.length, 0);
}

{
  const silent = unknownItem();
  const result = applyLzForensicEvaluation(phase1({ A5: silent }), registry);
  assert.deepEqual(result.phase_1_audit_logs.maturity.A5.question_results, ["unknown", "unknown", "unknown"]);
  assert.equal(result.phase_1_audit_logs.maturity.A5.assessment_status, "not_assessed");
  assert.equal(result.phase_1_audit_logs.maturity.A5.count, 0);
  assert.equal(result.phase_1_audit_logs.maturity.A5.lz_authority_cap, undefined);
}

{
  const outOfScope = {
    ...unknownItem(),
    coverage_reason: "step0_out_of_scope",
    evidence: "Out of Step 0 scope.",
  };
  const result = applyLzForensicEvaluation(phase1({ B1: { ...outOfScope, count: 3, question_results: ["supported", "supported", "supported"] } }), registry);
  const item = result.phase_1_audit_logs.maturity.B1;
  assert.equal(item.coverage_reason, "step0_out_of_scope");
  assert.equal(item.count, 3, "Step 0 placeholders are not rewritten here; sanitation replaces out-of-scope IDs");
  assert.equal(item.lz_authority_cap, undefined);
}

{
  const derivedQuote = {
    quote: "owner row coverage: 50%; valid=1/2; invalid placeholders=0; state=FIELD_PRESENT_PARTIAL.",
    evidence_source: "derived",
    source_id: "src-plat",
    derived_evidence_id: "EVID-DER-12345678",
  };
  const stamped = stampQuoteEvidenceClass(derivedQuote, registry);
  assert.equal(stamped.evidence_class, "platform", "derived quotes inherit class from the cited source");
}

{
  const result = applyLzForensicEvaluation(phase1({}, {
    A2: {
      ...assessed(0, [quote("src-plat-c001", "src-plat")]),
      status: "OK",
      antipattern_absence_status: "tested_absent",
      coverage_reason: "Platform export has no public IP attachments.",
    },
  }), registry);
  const item = result.phase_1_audit_logs.antipattern.A2;
  assert.equal(item.antipattern_absence_status, "tested_absent");
  assert.equal(item.assessment_status, "assessed");
  assert.equal(item.evidence_quotes[0].evidence_class, "platform");
  assert.equal(item.lz_authority_cap, undefined);
}

console.log("landing zone forensic evaluation tests passed");
