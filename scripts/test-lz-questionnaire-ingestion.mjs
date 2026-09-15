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

const mapping = JSON.parse(
  await readFile(new URL("../src/domain-packs/landing-zone/questionnaire-mapping.json", import.meta.url), "utf8"),
);
assert.equal(mapping.questions.length, 48);

const source = await readFile(new URL("../src/acquisition/questionnaireIngestion.ts", import.meta.url), "utf8");
const rewritten = source
  .replace(
    /import \{ LANDING_ZONE_QUESTIONNAIRE \} from "\.\.\/domain-packs\/loadLandingZonePack";\n/,
    `const LANDING_ZONE_QUESTIONNAIRE = ${JSON.stringify(mapping.questions)};\n`,
  )
  .replace(
    /import \{\n  LZ_SOURCE_CLASSIFICATION_SCHEMA,\n  type LzSourceClassification,\n\} from "\.\/landingZoneSourceClassification";\n/,
    'const LZ_SOURCE_CLASSIFICATION_SCHEMA = "lz_source_classification_v1";\n',
  );
assert.doesNotMatch(rewritten, /loadLandingZonePack/);

const dir = await mkdtemp(join(tmpdir(), "lz-questionnaire-"));
const modulePath = join(dir, "questionnaireIngestion.mjs");
await writeFile(modulePath, compile(rewritten), "utf8");
const {
  ingestQuestionnaireExport,
  tryIngestQuestionnaireFromText,
  isQuestionnaireExport,
  renderWorkshopObservationText,
  evidenceLeadRequests,
  applyQuestionnaireIngestion,
  summarizeQuestionnaireIngestion,
  EVIDENCE_LEADS_ARE_NOT_FINDINGS,
} = await import(`file://${modulePath}`);

const htmlExport = {
  version: 1,
  saved_at: "2026-09-15T07:00:00.000Z",
  meta: {
    customer: "Northstar Retail",
    facilitator: "Alex Rivera",
    participants: "Pat — Platform\nSam — Security",
    clouds: "Azure",
    tenant: "contoso.onmicrosoft.com",
    areas: "A,B",
    inventory: "No",
    globalNotes: "Need MG export before Day 2",
  },
  answers: {
    "A-Q1": {
      answer: "We point at Tenant Root Group; platform owns it.",
      evidence: "Request management group hierarchy export",
    },
    "A-Q2": { answer: "", evidence: "Ask finance for leftover invoices" },
    "B-Q1": { answer: "Landing zones are vended from a central repo.", evidence: "" },
  },
};

assert.equal(isQuestionnaireExport(htmlExport), true);
assert.equal(isQuestionnaireExport(mapping), false);
assert.equal(isQuestionnaireExport({ questions: mapping.questions }), false);

const session = ingestQuestionnaireExport(htmlExport, { fileName: "Landing_Zone_Interview_Evidence_Northstar_2026-09-15.json", sourceId: "src-002" });
assert.equal(session.schema_version, "lz_questionnaire_session_v1");
assert.equal(session.evidence_class, "workshop");
assert.equal(session.meta.facilitator, "Alex Rivera");
assert.match(session.meta.participants, /Pat/);
assert.equal(session.attestations.length, 3);
const a1 = session.attestations.find((item) => item.question_id === "A-Q1");
assert.deepEqual(a1.referenced_criterion_ids, ["A1", "A4", "AP-A1"]);
assert.equal(a1.interview_observation, "We point at Tenant Root Group; platform owns it.");
assert.equal(a1.evidence_lead, "Request management group hierarchy export");
assert.equal(a1.source_locator.source_id, "src-002");
assert.equal(a1.source_locator.question_id, "A-Q1");
assert.equal(session.answered_observation_count, 2);
assert.equal(session.evidence_lead_count, 2);
assert.ok(session.notes.includes(EVIDENCE_LEADS_ARE_NOT_FINDINGS));

const observationText = renderWorkshopObservationText(session);
assert.match(observationText, /evidence_class=workshop/);
assert.match(observationText, /question_id="A-Q1"/);
assert.match(observationText, /referenced_criteria="A1 A4 AP-A1"/);
assert.match(observationText, /We point at Tenant Root Group/);
assert.match(observationText, /Landing zones are vended from a central repo/);
assert.doesNotMatch(observationText, /Request management group hierarchy export/);
assert.doesNotMatch(observationText, /Ask finance for leftover invoices/);
assert.match(observationText, /facilitator=Alex Rivera/);

const leads = evidenceLeadRequests(session);
assert.equal(leads.length, 2);
assert.equal(leads[0].locator, "src-002#A-Q1");
assert.ok(leads.every((lead) => lead.evidence_lead.length > 0));

assert.throws(
  () => ingestQuestionnaireExport({ version: 1, meta: {}, answers: { "A-Q7": { answer: "nope", evidence: "" } } }),
  (error) => error.code === "QUESTIONNAIRE_QUESTION_UNKNOWN",
);

assert.equal(tryIngestQuestionnaireFromText(JSON.stringify(mapping)), null);
assert.equal(tryIngestQuestionnaireFromText("not json"), null);

const prefixed = `Format: JSON\n\n${JSON.stringify(htmlExport)}`;
const fromText = tryIngestQuestionnaireFromText(prefixed, { sourceId: "src-003" });
assert.equal(fromText.answered_observation_count, 2);

const ingested = applyQuestionnaireIngestion([
  {
    schema_version: "source_record_v1",
    source_id: "src-001",
    source_name: "Document 001",
    original_file_name: "Landing_Zone_Interview_Evidence_Northstar_2026-09-15.json",
    kind: "json",
    text: prefixed,
  },
  {
    schema_version: "source_record_v1",
    source_id: "src-002",
    source_name: "Document 002",
    kind: "json",
    text: JSON.stringify({ managementGroups: [{ id: "root" }] }),
  },
]);
assert.equal(ingested[0].lz_questionnaire_session.attestations[0].question_id, "A-Q1");
assert.equal(ingested[0].lz_classification.evidence_class, "workshop");
assert.equal(ingested[0].lz_classification.source_kind, "workshop_attestation");
assert.doesNotMatch(ingested[0].text, /Request management group hierarchy export/);
assert.equal(ingested[1].lz_questionnaire_session, undefined);
assert.match(ingested[1].text, /managementGroups/);

const summary = summarizeQuestionnaireIngestion(ingested);
assert.equal(summary.session_count, 1);
assert.equal(summary.evidence_lead_count, 2);
assert.equal(summary.evidence_leads.some((lead) => lead.evidence_lead.includes("hierarchy export")), true);

const empty = ingestQuestionnaireExport({
  version: 1,
  meta: { facilitator: "Alex" },
  answers: { "A-Q1": { answer: "", evidence: "" } },
});
assert.equal(empty.answered_observation_count, 0);
assert.ok(empty.notes.some((note) => note.includes("QUESTIONNAIRE_EMPTY_SESSION")));

const analysis = await readFile(new URL("../src/services/analysisService.ts", import.meta.url), "utf8");
const privacyToRegistry = analysis.slice(
  analysis.indexOf("const privacy = sanitizeEvidenceSources"),
  analysis.indexOf("const sourceRegistry = buildSourceRegistry"),
);
assert.match(privacyToRegistry, /applyLandingZoneSourceClassification/);
assert.match(privacyToRegistry, /applyQuestionnaireIngestion/);
assert.ok(
  privacyToRegistry.indexOf("applyLandingZoneSourceClassification") < privacyToRegistry.indexOf("applyQuestionnaireIngestion"),
  "questionnaire ingestion must run after classification and before the source registry",
);

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
assert.match(app, /tryIngestQuestionnaireFromText/);
assert.match(app, /evidence leads \(requests, not findings\)/);
const reportImport = await readFile(new URL("../src/services/reportImportService.ts", import.meta.url), "utf8");
assert.match(reportImport, /kind: 'not_report'/);

console.log(
  `questionnaire ingestion passed (48 mapping questions, A-Q1 refs=${a1.referenced_criterion_ids.join(",")}, leads excluded from packet text)`,
);
