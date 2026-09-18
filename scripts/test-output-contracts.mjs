import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  authorizeOutputContract,
  OUTPUT_CONTRACT_IDS,
  outputContractDiagnostics,
  structuredOutputForPacket,
  validateOutputContractText,
  withOneOutputRegeneration,
} from '../lib/outputContracts.js';

const evidence = {
  phase_3_strategy: {
    executive_summaries: { ciso_leadership: 'Lead', platform_owner: 'Platform', security_owners: 'Security', application_delivery: 'Delivery' },
    evidence_summary: {
      headline: 'Walk', maturity_classification: 'Walk', key_metrics: [], confirmed_strengths: [],
      confirmed_gaps: [], confirmed_antipatterns: [], silent_or_missing_evidence: [],
    },
    diagnosis: {
      primary_bottleneck: 'Ownership', root_causes: [],
      domain_diagnosis: { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E', F: 'F', G: 'G', H: 'H' },
      confidence: 'medium', confidence_rationale: 'Evidence is mixed.',
    },
    visual_scorecard: { headline: 'Walk', maturity_score: 'Medium', burden_score: 'Medium' },
  },
};

const evidenceText = JSON.stringify(evidence);
assert.deepEqual(validateOutputContractText(OUTPUT_CONTRACT_IDS.evidenceSynthesis, evidenceText), evidence);
assert.throws(() => validateOutputContractText(OUTPUT_CONTRACT_IDS.evidenceSynthesis, `${evidenceText}\n{"other":true}`), /INVALID_OUTPUT_CONTRACT/);
assert.throws(() => validateOutputContractText(OUTPUT_CONTRACT_IDS.evidenceSynthesis, evidenceText.slice(0, -1)), /INVALID_OUTPUT_CONTRACT/);
assert.throws(() => validateOutputContractText(OUTPUT_CONTRACT_IDS.evidenceSynthesis, JSON.stringify({ ...evidence, extra: true })), /INVALID_OUTPUT_CONTRACT/);
assert.throws(() => validateOutputContractText(OUTPUT_CONTRACT_IDS.evidenceSynthesis, JSON.stringify({ phase_3_strategy: {} })), /INVALID_OUTPUT_CONTRACT/);
assert.throws(() => authorizeOutputContract('roadmap_synthesis', OUTPUT_CONTRACT_IDS.evidenceSynthesis), /INVALID_OUTPUT_CONTRACT/);
assert.throws(() => validateOutputContractText(OUTPUT_CONTRACT_IDS.evidenceSynthesis, JSON.stringify({
  ...evidence,
  phase_3_strategy: {
    ...evidence.phase_3_strategy,
    executive_summaries: { finops_lead: 'Lead', cfo: 'CFO', engineering_lead: 'Engineering' },
  },
})), /INVALID_OUTPUT_CONTRACT/, 'evidence synthesis must require Landing Zone personas, not FinOps aliases');
assert.throws(() => validateOutputContractText(OUTPUT_CONTRACT_IDS.evidenceSynthesis, JSON.stringify({
  ...evidence,
  phase_3_strategy: {
    ...evidence.phase_3_strategy,
    diagnosis: {
      ...evidence.phase_3_strategy.diagnosis,
      domain_diagnosis: { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E', F: 'F' },
    },
  },
})), /INVALID_OUTPUT_CONTRACT/, 'Landing Zone domain_diagnosis requires pack keys A–H, not A–F');

const gapQuery = {
  schema_version: 'finops_evidence_gap_query_v1',
  domain_id: 'D',
  queries: [{ criterion_id: 'maturity.D1', themes: ['autoscaling controls'], terms: ['utilization threshold'] }],
};
assert.deepEqual(validateOutputContractText(OUTPUT_CONTRACT_IDS.evidenceGapQuery, JSON.stringify(gapQuery)), gapQuery);
assert.doesNotThrow(() => authorizeOutputContract('evidence_gap_analysis', OUTPUT_CONTRACT_IDS.evidenceGapQuery));
assert.throws(() => authorizeOutputContract('synthesis', OUTPUT_CONTRACT_IDS.evidenceGapQuery), /INVALID_OUTPUT_CONTRACT/);
assert.throws(() => validateOutputContractText(OUTPUT_CONTRACT_IDS.evidenceGapQuery, JSON.stringify({
  ...gapQuery,
  score: 100,
})), /INVALID_OUTPUT_CONTRACT/, 'the query planner has no scoring authority');
assert.throws(() => validateOutputContractText(OUTPUT_CONTRACT_IDS.evidenceGapQuery, JSON.stringify({
  ...gapQuery,
  queries: [{ ...gapQuery.queries[0], terms: ['x'.repeat(81)] }],
})), /INVALID_OUTPUT_CONTRACT/);

const contract = structuredOutputForPacket({ stage: 'synthesis', output_contract: OUTPUT_CONTRACT_IDS.evidenceSynthesis });
assert.equal(contract.name, OUTPUT_CONTRACT_IDS.evidenceSynthesis);
assert.equal(contract.schema.additionalProperties, false);
assert.deepEqual(contract.schema.required, ['phase_3_strategy']);

const factCheck = {
  claims: [{
    claim: 'Evidence density is 92%.',
    classification: 'supported_by_audit',
    rationale: 'The value is present in Phase 2 metrics.',
    source_location: 'diagnosis',
    failure_type: 'not_applicable',
    severity: 'SUPPORTED',
    missing_material: '',
  }],
};
assert.deepEqual(
  validateOutputContractText(OUTPUT_CONTRACT_IDS.summaryFactCheck, JSON.stringify(factCheck)),
  factCheck,
);
assert.throws(
  () => validateOutputContractText(OUTPUT_CONTRACT_IDS.summaryFactCheck, JSON.stringify({ claims: [] })),
  /INVALID_OUTPUT_CONTRACT/,
);
assert.throws(
  () => authorizeOutputContract('synthesis', OUTPUT_CONTRACT_IDS.summaryFactCheck),
  /INVALID_OUTPUT_CONTRACT/,
);
const roadmapFactCheck = {
  claims: [{
    claim: 'Apply [TAC-GOV-002] after validating the governed account prerequisite [C3].',
    classification: 'supported_by_tactics_db',
    rationale: 'The tactic and its use condition exist in the supplied Playbook.',
    source_location: 'roadmap',
    failure_type: 'not_applicable',
    severity: 'SUPPORTED',
    tactic_disposition: 'not_applicable',
    missing_material: '',
  }, {
    claim: 'Apply [TAC-GOV-003] despite a verified do-not-use condition [C2].',
    classification: 'unsupported',
    rationale: 'The locked finding establishes the Playbook contraindication.',
    source_location: 'roadmap',
    failure_type: 'other',
    severity: 'WARN_TACTIC_HYGIENE',
    tactic_disposition: 'contraindicated',
    missing_material: 'Evidence that the do-not-use condition no longer applies.',
  }],
};
assert.equal(OUTPUT_CONTRACT_IDS.roadmapFactCheck, 'assessment_roadmap_fact_check_v2');
assert.equal(OUTPUT_CONTRACT_IDS.evidenceGapQuery, 'assessment_evidence_gap_query_v1');
assert.deepEqual(
  validateOutputContractText(OUTPUT_CONTRACT_IDS.roadmapFactCheck, JSON.stringify(roadmapFactCheck)),
  roadmapFactCheck,
);
assert.deepEqual(
  validateOutputContractText('finops_roadmap_fact_check_v2', JSON.stringify(roadmapFactCheck)),
  roadmapFactCheck,
);
assert.throws(
  () => validateOutputContractText(OUTPUT_CONTRACT_IDS.roadmapFactCheck, JSON.stringify({
    claims: roadmapFactCheck.claims.map(({ tactic_disposition, ...claim }) => claim),
  })),
  /INVALID_OUTPUT_CONTRACT/,
  'strict roadmap output must require the parser-required tactic disposition field',
);
const anthropicFactCheck = structuredOutputForPacket({
  stage: 'fact_check',
  provider: 'anthropic',
  output_contract: OUTPUT_CONTRACT_IDS.summaryFactCheck,
});
assert.equal('maxItems' in anthropicFactCheck.schema.properties.claims, false);
assert.equal(anthropicFactCheck.schema.properties.claims.minItems, 1);

const diagnostics = outputContractDiagnostics(`${evidenceText}\n{"other":true}`, { code: 'INVALID_OUTPUT_CONTRACT' });
assert.equal(diagnostics.output_chars > evidenceText.length, true);
assert.equal(diagnostics.balanced_object_count, 2);
assert.equal('text' in diagnostics, false);

let attempts = 0;
let retries = 0;
const recovered = await withOneOutputRegeneration(async regenerated => {
  attempts++;
  if (!regenerated) throw Object.assign(new Error(), { code: 'SYNTHESIS_OUTPUT_INVALID' });
  return 'recovered';
}, () => { retries++; });
assert.equal(recovered, 'recovered');
assert.equal(attempts, 2);
assert.equal(retries, 1);
await assert.rejects(
  withOneOutputRegeneration(async () => { throw Object.assign(new Error(), { code: 'INVALID_OUTPUT_CONTRACT' }); }),
  error => error.code === 'SYNTHESIS_OUTPUT_INVALID' && /provider fallback/.test(error.message),
);

const forensicPrompts = await readFile(new URL('../src/prompts.ts', import.meta.url), 'utf8');
assert.match(forensicPrompts, /exactly ONE best evidence quote per assessed item/);
assert.match(forensicPrompts, /quote text at most 240 characters/);
assert.match(forensicPrompts, /evidence at most 180 characters/);
assert.match(forensicPrompts, /reasoning at most 240 characters/);
assert.match(forensicPrompts, /no recommendations or repeated definitions/);
assert.match(forensicPrompts, /"items": \[/);
assert.match(forensicPrompts, /"stream": "maturity"/);
assert.doesNotMatch(forensicPrompts, /"maturity": \{\s*"\$\{columnId\}1"/);

const emptyQuote = {
  quote: '',
  category: 'Policy',
  evidence_source: 'text',
  source_id: '',
  chunk_id: '',
  derived_evidence_id: '',
};
const forensicItem = (stream, id) => ({
  stream,
  id,
  count: 0,
  assessment_status: 'not_assessed',
  question_results: ['unknown', 'unknown', 'unknown'],
  evidence: 'Silent.',
  reasoning: 'Not assessed.',
  evidence_quotes: [],
});
const forensicAudit = {
  items: ['1', '2', '3', '4', '5'].flatMap(n => [
    forensicItem('maturity', `A${n}`),
    forensicItem('antipattern', `A${n}`),
  ]),
};
assert.equal(OUTPUT_CONTRACT_IDS.forensicAudit, 'assessment_forensic_audit_v1');
assert.deepEqual(validateOutputContractText(OUTPUT_CONTRACT_IDS.forensicAudit, JSON.stringify(forensicAudit)), forensicAudit);
assert.doesNotThrow(() => authorizeOutputContract('forensic_audit', OUTPUT_CONTRACT_IDS.forensicAudit));
assert.throws(() => authorizeOutputContract('evidence_check', OUTPUT_CONTRACT_IDS.forensicAudit), /INVALID_OUTPUT_CONTRACT/);
assert.throws(
  () => validateOutputContractText(OUTPUT_CONTRACT_IDS.forensicAudit, JSON.stringify({ items: forensicAudit.items.slice(0, 9) })),
  /INVALID_OUTPUT_CONTRACT/,
  'forensic_audit requires all 10 criterion items',
);
const assessedForensic = {
  items: forensicAudit.items.map((item, index) => index === 0 ? {
    ...item,
    count: 1,
    assessment_status: 'assessed',
    question_results: ['supported', 'not_supported', 'unknown'],
    evidence: 'Found one sub-criterion.',
    evidence_quotes: [{ ...emptyQuote, quote: 'platform landing zone', source_id: 'src-001', chunk_id: 'src-001-c001' }],
  } : item),
};
assert.deepEqual(validateOutputContractText(OUTPUT_CONTRACT_IDS.forensicAudit, JSON.stringify(assessedForensic)), assessedForensic);

const targeted = { items: [forensicItem('maturity', 'B2')] };
assert.deepEqual(validateOutputContractText(OUTPUT_CONTRACT_IDS.targetedRescan, JSON.stringify(targeted)), targeted);
assert.doesNotThrow(() => authorizeOutputContract('targeted_rescan', OUTPUT_CONTRACT_IDS.targetedRescan));

const evidenceCheckItem = (stream, id) => ({
  stream,
  id,
  status: 'missing',
  assessment_status: 'not_assessed',
  original_count: 0,
  verified_count: 0,
  rationale: 'Silent source.',
  quote_supported: false,
  rescan_recommended: false,
  antipattern_absence_status: stream === 'antipattern' ? 'unknown_absent' : 'unknown_absent',
  coverage_reason: stream === 'antipattern' ? 'Coverage is silent.' : 'not applicable',
});
const evidenceCheck = {
  items: ['1', '2', '3', '4', '5'].flatMap(n => [
    evidenceCheckItem('maturity', `C${n}`),
    evidenceCheckItem('antipattern', `C${n}`),
  ]),
};
assert.equal(OUTPUT_CONTRACT_IDS.evidenceCheck, 'assessment_evidence_check_v1');
assert.deepEqual(validateOutputContractText(OUTPUT_CONTRACT_IDS.evidenceCheck, JSON.stringify(evidenceCheck)), evidenceCheck);
assert.doesNotThrow(() => authorizeOutputContract('evidence_check', OUTPUT_CONTRACT_IDS.evidenceCheck));
assert.throws(
  () => validateOutputContractText(OUTPUT_CONTRACT_IDS.evidenceCheck, JSON.stringify({ items: evidenceCheck.items.slice(0, 9) })),
  /INVALID_OUTPUT_CONTRACT/,
);
assert.throws(
  () => validateOutputContractText(OUTPUT_CONTRACT_IDS.evidenceCheck, JSON.stringify({
    items: evidenceCheck.items.map((item, index) => index === 0 ? { ...item, verified_count: 1.5 } : item),
  })),
  /INVALID_OUTPUT_CONTRACT/,
);

const metaEvidence = structuredOutputForPacket({
  stage: 'evidence_check',
  provider: 'meta',
  output_contract: OUTPUT_CONTRACT_IDS.evidenceCheck,
});
assert.equal(metaEvidence.name, OUTPUT_CONTRACT_IDS.evidenceCheck);
assert.equal(metaEvidence.schema.additionalProperties, false);
assert.equal(metaEvidence.schema.properties.items.minItems, 10);

const orchestrator = await readFile(new URL('../src/orchestrator.ts', import.meta.url), 'utf8');
assert.match(orchestrator, /OUTPUT_CONTRACT_IDS\.forensicAudit/);
assert.match(orchestrator, /OUTPUT_CONTRACT_IDS\.targetedRescan/);

const synthesisPrompts = await readFile(new URL('../src/constants.ts', import.meta.url), 'utf8');
assert.match(synthesisPrompts, /ASSESSMENT-STATUS FIDELITY/);
assert.match(synthesisPrompts, /unsupported, verification_unresolved, and not_assessed criteria only as evidence\/verification gaps/);
assert.match(synthesisPrompts, /ciso_leadership/);
assert.match(synthesisPrompts, /TAC-ORG-A1-01/);
assert.match(synthesisPrompts, /TAC-IDENTITY-AP-B1-01/);
assert.doesNotMatch(synthesisPrompts, /FinOps Strategic Architect/);
assert.doesNotMatch(synthesisPrompts, /"finops_lead"/);

const factCheckPrompts = await readFile(new URL('../src/services/factCheckService.ts', import.meta.url), 'utf8');
assert.match(factCheckPrompts, /marks a criterion unsupported, verification_unresolved, or not_assessed/);
assert.match(factCheckPrompts, /supplied use and do-not-use conditions/);

console.log('structured output contract tests passed');
