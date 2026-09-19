export const OUTPUT_CONTRACT_IDS = Object.freeze({
  forensicAudit: 'assessment_forensic_audit_v1',
  targetedRescan: 'assessment_targeted_rescan_v1',
  evidenceCheck: 'assessment_evidence_check_v1',
  evidenceGapQuery: 'assessment_evidence_gap_query_v1',
  evidenceSynthesis: 'assessment_evidence_synthesis_v1',
  roadmapSynthesis: 'assessment_roadmap_synthesis_v1',
  findingsSynthesis: 'assessment_findings_synthesis_v1',
  summaryFactCheck: 'assessment_summary_fact_check_v1',
  roadmapFactCheck: 'assessment_roadmap_fact_check_v2',
});

export const OUTPUT_CONTRACT_DOMAIN_IDS = Object.freeze(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);

export const FINOPS_OUTPUT_CONTRACT_ALIASES = Object.freeze({
  finops_evidence_gap_query_v1: OUTPUT_CONTRACT_IDS.evidenceGapQuery,
  finops_evidence_synthesis_v1: OUTPUT_CONTRACT_IDS.evidenceSynthesis,
  finops_roadmap_synthesis_v1: OUTPUT_CONTRACT_IDS.roadmapSynthesis,
  finops_findings_synthesis_v1: OUTPUT_CONTRACT_IDS.findingsSynthesis,
  finops_summary_fact_check_v1: OUTPUT_CONTRACT_IDS.summaryFactCheck,
  finops_roadmap_fact_check_v2: OUTPUT_CONTRACT_IDS.roadmapFactCheck,
});

export const resolveOutputContractId = (contractId) =>
  FINOPS_OUTPUT_CONTRACT_ALIASES[contractId] ?? contractId;

const string = (extra = {}) => ({ type: 'string', ...extra });
const integer = (extra = {}) => ({ type: 'integer', ...extra });
const booleanType = (extra = {}) => ({ type: 'boolean', ...extra });
const stringArray = (extra = {}) => ({ type: 'array', items: string(), ...extra });
const boundedQueryTextArray = (extra = {}) => ({
  type: 'array',
  items: string({ minLength: 2, maxLength: 80 }),
  ...extra,
});
const object = (properties, required = Object.keys(properties)) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
});
const criterionId = () => string({ minLength: 2, maxLength: 2, pattern: '^[A-H][1-5]$' });
const evidenceCategory = () => string({
  enum: ['Policy', 'Process', 'Operational', 'Automation', 'Accountability', 'Financial-Integration', 'Cultural'],
});
const questionResult = () => string({ enum: ['supported', 'not_supported', 'unknown'] });
const forensicQuote = object({
  quote: string(),
  category: evidenceCategory(),
  evidence_source: string({ enum: ['text', 'image', 'derived'] }),
  source_id: string(),
  chunk_id: string(),
  derived_evidence_id: string(),
  page_id: string(),
  page_number: integer({ minimum: 1 }),
  sheet_name: string(),
  row_number: integer({ minimum: 1 }),
}, ['quote', 'category', 'evidence_source', 'source_id']);
const forensicAuditItem = object({
  stream: string({ enum: ['maturity', 'antipattern'] }),
  id: criterionId(),
  count: integer({ minimum: 0, maximum: 3 }),
  assessment_status: string({ enum: ['assessed', 'not_assessed'] }),
  question_results: { type: 'array', minItems: 3, maxItems: 3, items: questionResult() },
  evidence: string(),
  reasoning: string(),
  evidence_quotes: { type: 'array', maxItems: 1, items: forensicQuote },
});
const domainAuditSchema = (minItems, maxItems) => object({
  items: {
    type: 'array',
    minItems,
    maxItems,
    items: forensicAuditItem,
  },
});
const evidenceCheckItem = object({
  stream: string({ enum: ['maturity', 'antipattern'] }),
  id: criterionId(),
  status: string({ enum: ['supported', 'weak', 'unsupported', 'missing'] }),
  assessment_status: string({ enum: ['assessed', 'not_assessed'] }),
  original_count: integer({ minimum: 0, maximum: 3 }),
  verified_count: integer({ minimum: 0, maximum: 3 }),
  rationale: string(),
  quote_supported: booleanType(),
  rescan_recommended: booleanType(),
  antipattern_absence_status: string({ enum: ['confirmed_present', 'partially_present', 'tested_absent', 'unknown_absent'] }),
  coverage_reason: string(),
});
const evidenceCheckSchema = object({
  items: {
    type: 'array',
    minItems: 10,
    maxItems: 10,
    items: evidenceCheckItem,
  },
});

const executiveSummaries = object({
  ciso_leadership: string(),
  platform_owner: string(),
  security_owners: string(),
  application_delivery: string(),
});
const evidenceSummary = object({
  headline: string(),
  maturity_classification: string({ enum: ['Insufficient evidence', 'Crawl', 'Walk', 'Walk with significant friction', 'Run'] }),
  key_metrics: stringArray(),
  confirmed_strengths: stringArray(),
  confirmed_gaps: stringArray(),
  confirmed_antipatterns: stringArray(),
  silent_or_missing_evidence: stringArray(),
});
const diagnosis = object({
  primary_bottleneck: string(),
  root_causes: stringArray(),
  domain_diagnosis: object(
    Object.fromEntries(OUTPUT_CONTRACT_DOMAIN_IDS.map(id => [id, string()])),
    [...OUTPUT_CONTRACT_DOMAIN_IDS],
  ),
  confidence: string({ enum: ['high', 'medium', 'low'] }),
  confidence_rationale: string(),
});
const visualScorecard = object({
  headline: string(),
  maturity_score: string(),
  burden_score: string(),
});
const planningDecision = object({
  decision: string({ enum: ['GO', 'CONDITIONAL_GO', 'NO_GO'] }),
  rationale: string(),
  safe_to_act_on: stringArray(),
  evidence_needed_before_action: stringArray(),
});

const evidenceGapQuerySchema = object({
  schema_version: string({ enum: [OUTPUT_CONTRACT_IDS.evidenceGapQuery, 'finops_evidence_gap_query_v1'] }),
  domain_id: string({ minLength: 1, maxLength: Math.max(...OUTPUT_CONTRACT_DOMAIN_IDS.map(id => id.length), 1) }),
  queries: {
    type: 'array',
    minItems: 1,
    maxItems: 10,
    items: object({
      criterion_id: string({ minLength: 2, maxLength: 24 }),
      themes: boundedQueryTextArray({ minItems: 1, maxItems: 4 }),
      terms: boundedQueryTextArray({ minItems: 1, maxItems: 8 }),
    }),
  },
});

const evidenceSchema = object({
  phase_3_strategy: object({
    executive_summaries: executiveSummaries,
    evidence_summary: evidenceSummary,
    diagnosis,
    visual_scorecard: visualScorecard,
  }),
});

const roadmapItem = object({
  phase: string(),
  why: string(),
  what: string(),
  actions: stringArray(),
  confidence: string({ enum: ['high', 'medium', 'low'] }),
  assumptions: stringArray({ maxItems: 4 }),
});
const roadmapSchema = object({
  phase_3_strategy: object({
    planning_decision: planningDecision,
    remediation_roadmap: { type: 'array', items: roadmapItem },
  }),
});

const findingsSchema = object({
  phase_3_strategy: object({
    executive_summaries: executiveSummaries,
    evidence_summary: evidenceSummary,
    diagnosis,
    planning_decision: planningDecision,
    visual_scorecard: visualScorecard,
    remediation_roadmap: { type: 'array', items: roadmapItem, maxItems: 0 },
    findings_mode: object({
      evidence_backed_findings: stringArray({ minItems: 4, maxItems: 8 }),
      candidate_themes: stringArray({ minItems: 3, maxItems: 6 }),
      missing_evidence: stringArray({ minItems: 4, maxItems: 8 }),
      validation_plan: stringArray({ minItems: 3, maxItems: 6 }),
    }),
  }),
});

const factCheckSchema = (classifications, sourceLocations, unsupportedSeverities, includeTacticDisposition = false) => object({
  claims: {
    type: 'array',
    minItems: 1,
    maxItems: 15,
    items: object({
      claim: string(),
      classification: string({ enum: classifications }),
      rationale: string(),
      source_location: string({ enum: sourceLocations }),
      failure_type: string({ enum: ['fabricated_number', 'unverifiable_entity', 'unsupported_org_claim', 'out_of_scope', 'other', 'not_applicable'] }),
      severity: string({ enum: [...unsupportedSeverities, 'SUPPORTED'] }),
      ...(includeTacticDisposition ? {
        tactic_disposition: string({ enum: ['not_applicable', 'contraindicated', 'citation_rejected'] }),
      } : {}),
      missing_material: string(),
    }),
  },
});

const summaryFactCheckSchema = factCheckSchema(
  ['supported_by_source', 'supported_by_audit', 'unsupported'],
  ['ciso_leadership', 'platform_owner', 'security_owners', 'application_delivery', 'diagnosis'],
  ['BLOCKING_UNSUPPORTED_FACT', 'WARN_MISCLASSIFIED_BUT_REAL', 'WARN_TACTIC_HYGIENE'],
);
const roadmapFactCheckSchema = factCheckSchema(
  ['supported_by_source', 'supported_by_audit', 'supported_by_tactics_db', 'unsupported'],
  ['planning_decision', 'roadmap'],
  ['BLOCKING_UNSUPPORTED_FACT', 'BLOCKING_UNSAFE_ROADMAP', 'WARN_MISCLASSIFIED_BUT_REAL', 'WARN_TACTIC_HYGIENE'],
  true,
);

const CONTRACTS = Object.freeze({
  [OUTPUT_CONTRACT_IDS.forensicAudit]: Object.freeze({
    stages: Object.freeze(['forensic_audit']),
    schema: domainAuditSchema(10, 10),
  }),
  [OUTPUT_CONTRACT_IDS.targetedRescan]: Object.freeze({
    stages: Object.freeze(['targeted_rescan']),
    schema: domainAuditSchema(1, 10),
  }),
  [OUTPUT_CONTRACT_IDS.evidenceCheck]: Object.freeze({
    stages: Object.freeze(['evidence_check']),
    schema: evidenceCheckSchema,
  }),
  [OUTPUT_CONTRACT_IDS.evidenceGapQuery]: Object.freeze({
    stages: Object.freeze(['evidence_gap_analysis']),
    schema: evidenceGapQuerySchema,
  }),
  [OUTPUT_CONTRACT_IDS.evidenceSynthesis]: Object.freeze({
    stages: Object.freeze(['synthesis', 'synthesis_escalation']),
    schema: evidenceSchema,
  }),
  [OUTPUT_CONTRACT_IDS.roadmapSynthesis]: Object.freeze({
    stages: Object.freeze(['roadmap_synthesis']),
    schema: roadmapSchema,
  }),
  [OUTPUT_CONTRACT_IDS.findingsSynthesis]: Object.freeze({
    stages: Object.freeze(['synthesis', 'synthesis_escalation']),
    schema: findingsSchema,
  }),
  [OUTPUT_CONTRACT_IDS.summaryFactCheck]: Object.freeze({
    stages: Object.freeze(['fact_check', 'fact_check_high']),
    schema: summaryFactCheckSchema,
  }),
  [OUTPUT_CONTRACT_IDS.roadmapFactCheck]: Object.freeze({
    stages: Object.freeze(['fact_check', 'fact_check_high']),
    schema: roadmapFactCheckSchema,
  }),
});

export class OutputContractError extends Error {
  constructor(category) {
    super('INVALID_OUTPUT_CONTRACT');
    this.name = 'OutputContractError';
    this.code = 'INVALID_OUTPUT_CONTRACT';
    this.category = category;
  }
}

export class SynthesisOutputExhaustedError extends Error {
  constructor() {
    super('The synthesis models returned invalid structured output after a safe retry and provider fallback. No assessment was finalized. Start a new analysis.');
    this.name = 'SynthesisOutputExhaustedError';
    this.code = 'SYNTHESIS_OUTPUT_INVALID';
  }
}

const isRetryableOutputError = error => error?.code === 'SYNTHESIS_OUTPUT_INVALID'
  || error?.code === 'INVALID_OUTPUT_CONTRACT'
  || error?.message === 'AI response was malformed and could not be repaired safely.';

export async function withOneOutputRegeneration(execute, onRetry = () => undefined) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try { return await execute(attempt > 0); }
    catch (error) {
      if (!isRetryableOutputError(error)) throw error;
      if (attempt >= 1) throw new SynthesisOutputExhaustedError();
      await onRetry();
    }
  }
  throw new SynthesisOutputExhaustedError();
}

export function getOutputContract(id) {
  if (typeof id !== 'string') return undefined;
  return CONTRACTS[resolveOutputContractId(id)] || CONTRACTS[id];
}

export function authorizeOutputContract(stage, id) {
  if (id === undefined) return true;
  const contract = getOutputContract(id);
  if (!contract || !contract.stages.includes(stage)) throw new OutputContractError('unauthorized_contract');
  return true;
}

const dangerousKeys = new Set(['__proto__', 'prototype', 'constructor']);
const validateValue = (value, schema) => {
  if (schema.type === 'string') {
    if (typeof value !== 'string'
      || (schema.enum && !schema.enum.includes(value))
      || (schema.minLength !== undefined && value.length < schema.minLength)
      || (schema.maxLength !== undefined && value.length > schema.maxLength)
      || (schema.pattern && !new RegExp(schema.pattern).test(value))) return false;
    return true;
  }
  if (schema.type === 'integer') {
    return Number.isInteger(value)
      && (schema.minimum === undefined || value >= schema.minimum)
      && (schema.maximum === undefined || value <= schema.maximum);
  }
  if (schema.type === 'boolean') return typeof value === 'boolean';
  if (schema.type === 'array') {
    return Array.isArray(value)
      && (schema.minItems === undefined || value.length >= schema.minItems)
      && (schema.maxItems === undefined || value.length <= schema.maxItems)
      && value.every(item => validateValue(item, schema.items));
  }
  if (schema.type === 'object') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const keys = Object.keys(value);
    if (keys.some(key => dangerousKeys.has(key))) return false;
    if (schema.required.some(key => !Object.hasOwn(value, key))) return false;
    if (schema.additionalProperties === false && keys.some(key => !Object.hasOwn(schema.properties, key))) return false;
    return keys.every(key => !schema.properties[key] || validateValue(value[key], schema.properties[key]));
  }
  return false;
};

export function isForensicAuditContract(id) {
  const resolved = resolveOutputContractId(id);
  return resolved === OUTPUT_CONTRACT_IDS.forensicAudit || resolved === OUTPUT_CONTRACT_IDS.targetedRescan;
}

const presentString = value => typeof value === 'string' && value.trim() !== '';
const locatorAliases = Object.freeze({ page: 'page_number', sheet: 'sheet_name', row: 'row_number' });

const normalizeForensicQuote = quote => {
  if (!quote || typeof quote !== 'object' || Array.isArray(quote)) return quote;
  const next = { ...quote };
  for (const [from, to] of Object.entries(locatorAliases)) {
    if (next[to] == null && next[from] != null) next[to] = next[from];
    delete next[from];
  }
  delete next.evidence_class;
  if (!presentString(next.evidence_source)) next.evidence_source = 'text';
  if (next.evidence_source === 'derived') {
    delete next.chunk_id;
    if (!presentString(next.derived_evidence_id)) delete next.derived_evidence_id;
  } else {
    delete next.derived_evidence_id;
    if (!presentString(next.chunk_id)) delete next.chunk_id;
  }
  for (const key of ['page_id', 'sheet_name']) {
    if (!presentString(next[key])) delete next[key];
  }
  if (typeof next.page_number === 'string' && /^\d+$/.test(next.page_number)) next.page_number = Number(next.page_number);
  if (typeof next.row_number === 'string' && /^\d+$/.test(next.row_number)) next.row_number = Number(next.row_number);
  if (!Number.isInteger(next.page_number) || next.page_number < 1) delete next.page_number;
  if (!Number.isInteger(next.row_number) || next.row_number < 1) delete next.row_number;
  return next;
};

const normalizeForensicItem = item => {
  if (!item || typeof item !== 'object' || Array.isArray(item)) return item;
  const next = { ...item };
  if (Array.isArray(next.evidence_quotes)) next.evidence_quotes = next.evidence_quotes.map(normalizeForensicQuote);
  const results = Array.isArray(next.question_results) ? next.question_results : [];
  if (results.length === 3 && results.every(result => ['supported', 'not_supported', 'unknown'].includes(String(result)))) {
    next.count = results.filter(result => result === 'supported').length;
  }
  return next;
};

export function normalizeForensicAuditValue(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray(value.items)) return value;
  return { ...value, items: value.items.map(normalizeForensicItem) };
}

const assertForensicSemantics = value => {
  const seen = new Set();
  for (const item of value.items) {
    const key = `${item.stream}:${item.id}`;
    if (seen.has(key)) throw new OutputContractError('forensic_schema');
    seen.add(key);
    const supported = item.question_results.filter(result => result === 'supported').length;
    if (item.count !== supported) throw new OutputContractError('forensic_schema');
    if (item.assessment_status === 'not_assessed') {
      if (item.evidence_quotes.length !== 0 || item.count !== 0 || item.question_results.some(result => result !== 'unknown')) {
        throw new OutputContractError('forensic_schema');
      }
    } else if (item.assessment_status === 'assessed') {
      if (item.evidence_quotes.length !== 1) throw new OutputContractError('forensic_provenance');
      const quote = item.evidence_quotes[0];
      if (quote.evidence_source === 'derived') {
        if (!presentString(quote.derived_evidence_id) || quote.chunk_id !== undefined) {
          throw new OutputContractError('forensic_provenance');
        }
      } else if (!presentString(quote.chunk_id) || quote.derived_evidence_id !== undefined) {
        throw new OutputContractError('forensic_provenance');
      }
    }
  }
};

export function forensicBucketsFromContract(value) {
  const result = { maturity: {}, antipattern: {} };
  if (!Array.isArray(value?.items)) return result;
  for (const item of value.items) {
    if (!item || typeof item !== 'object') continue;
    const { stream, id, ...rest } = item;
    if ((stream === 'maturity' || stream === 'antipattern') && typeof id === 'string') {
      result[stream][id] = rest;
    }
  }
  return result;
}

export function assertForensicBatchIds(value, expected) {
  const buckets = forensicBucketsFromContract(value);
  for (const stream of ['maturity', 'antipattern']) {
    const keys = Object.keys(buckets[stream]).sort();
    const wanted = [...(expected?.[stream] || [])].sort();
    if (keys.length !== wanted.length || keys.some((key, index) => key !== wanted[index])) {
      throw Object.assign(new Error('INVALID_BATCH_OUTPUT_IDS'), { code: 'INVALID_BATCH_OUTPUT_IDS' });
    }
  }
}

export function forensicClientFailureCode(error) {
  if (error instanceof OutputContractError) {
    if (error.category === 'forensic_provenance') return 'INVALID_BATCH_OUTPUT_PROVENANCE';
    if (error.category === 'forensic_schema' || error.category === 'schema_mismatch') return 'INVALID_BATCH_OUTPUT_SCHEMA';
    return 'INVALID_OUTPUT_CONTRACT';
  }
  if (typeof error?.code === 'string' && error.code.startsWith('INVALID_BATCH_OUTPUT_')) return error.code;
  return 'INVALID_OUTPUT_CONTRACT';
}

export function canonicalOutputContractText(id, parsed, original) {
  if (!isForensicAuditContract(id) || !parsed || typeof parsed !== 'object') return original;
  try { return JSON.stringify(parsed); } catch { return original; }
}

export function validateOutputContractValue(id, value) {
  const contract = getOutputContract(id);
  if (!contract) throw new OutputContractError('unknown_contract');
  const candidate = isForensicAuditContract(id) ? normalizeForensicAuditValue(value) : value;
  if (!validateValue(candidate, contract.schema)) throw new OutputContractError('schema_mismatch');
  if (isForensicAuditContract(id)) assertForensicSemantics(candidate);
  return candidate;
}

export function validateOutputContractText(id, text) {
  if (typeof text !== 'string' || !text.trim()) throw new OutputContractError('empty_output');
  let parsed;
  try { parsed = JSON.parse(text); }
  catch { throw new OutputContractError('json_syntax'); }
  return validateOutputContractValue(id, parsed);
}

export function outputContractDiagnostics(text, error) {
  let objectCount = 0;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (const char of typeof text === 'string' ? text : '') {
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') inString = true;
    else if (char === '{') depth++;
    else if (char === '}' && depth > 0 && --depth === 0) objectCount++;
  }
  return {
    output_chars: typeof text === 'string' ? text.length : 0,
    balanced_object_count: depth === 0 && !inString ? objectCount : 0,
    failure_category: error instanceof OutputContractError ? error.category : 'validation_error',
  };
}

const anthropicUnsupportedConstraints = new Set([
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'exclusiveMaximum',
  'multipleOf',
  'minLength',
  'maxLength',
  'maxItems',
  'uniqueItems',
]);

const schemaForProvider = (schema, provider) => {
  if (provider !== 'anthropic' || !schema || typeof schema !== 'object') return schema;
  if (Array.isArray(schema)) return schema.map(value => schemaForProvider(value, provider));
  return Object.fromEntries(Object.entries(schema).flatMap(([key, value]) => {
    // Anthropic's REST API rejects these otherwise-valid JSON Schema
    // constraints. The full contract remains enforced by the worker.
    if (anthropicUnsupportedConstraints.has(key)) return [];
    if (key === 'minItems' && value !== 0 && value !== 1) return [];
    return [[key, schemaForProvider(value, provider)]];
  }));
};

export function structuredOutputForPacket(packet) {
  if (!packet.output_contract) return undefined;
  authorizeOutputContract(packet.stage, packet.output_contract);
  const contract = getOutputContract(packet.output_contract);
  return { name: packet.output_contract, schema: schemaForProvider(contract.schema, packet.provider) };
}
