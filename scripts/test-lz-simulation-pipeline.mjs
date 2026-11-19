import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { createServer } from 'vite';
import { validShadowTelemetry } from '../api/run.js';
import { inspectOutput, sha256 } from '../lib/governance.js';

const runId = '00000000-0000-4000-8000-000000000001';
const originalFetch = globalThis.fetch;
const checkpoints = [];
const stages = [];
let verifierOffline = false;
let recoveryMode;
let fVerificationCalls = 0;
const northstarHashes = [
  'e7bed48dfe522b3e54f19b9bee0127f04d78af0fcfa8bb0cd7578d867a14e543',
  '6950084f28cefe8a8523fc59b155dbda5075a81f6f93649e9fcd3955bb97768b',
  '0044f85ee31b662c8a28f3843c09ef0bc0894c80f18d68cc52bee5167d2472fb',
  '776a2446580940df9e9e0fdf1d3272db05a79679bad2f2ee3ae25486591057c5',
  'ea50d4a7d057d5c8abf4a9a6eedeeeccfac2f68d34057827bede8641ee3db4ca',
  'd23af5fd67a4d74afb3375aa9a87eb5223e19b420c054504b4cf56f6800364c9',
  'a9e787906a042c465a38408c506418fdeead858ee60d8956d53a18d049eb5e05',
  'd2ce049f9e0526990fa0fc94af98968a72c60cd37bb5192c5846378e0a3f49c7',
];

const evidence = {
  A1: ['"displayName": "Tenant Root Group"', 'maturity', 1],
  B2: ['"maximumActivationMinutes": 60', 'maturity', 1],
  'AP-F1': ['Query LOG-271 returned activity for all five subscriptions and Entra logs.', 'antipattern', 0],
  'AP-G3': ['"id": "waiver-prod-legacy-recovery"', 'antipattern', 3],
};

const packetQuote = (prompt, span) => {
  const escaped = span.replaceAll('"', '&quot;');
  for (const match of prompt.matchAll(/<CHUNK id="([^"]+)" source_id="([^"]+)"[^>]*>([\s\S]*?)<\/CHUNK>/g)) {
    if (match[3].includes(escaped)) return {
      chunk_id: match[1], source_id: match[2], quote: span, category: 'Policy', evidence_source: 'text',
    };
  }
};

const domainFor = prompt => /<EVIDENCE_LANE_STAGE_PACKET [^>]*domain="([A-H])"/.exec(prompt)?.[1];

const scannerItems = (domain, prompt) => ['maturity', 'antipattern'].flatMap(stream =>
  [1, 2, 3, 4, 5].map(index => {
    const id = `${stream === 'antipattern' ? 'AP-' : ''}${domain}${index}`;
    const reference = evidence[id];
    const quote = reference?.[1] === stream && packetQuote(prompt, reference[0]);
    const count = quote ? reference[2] : 0;
    return {
      stream, id, count, assessment_status: quote ? 'assessed' : 'not_assessed',
      question_results: [1, 2, 3].map(i => i <= count ? 'supported' : 'unknown'),
      evidence: quote ? 'The platform export contains the cited object.' : 'Evidence was not supplied.',
      reasoning: quote ? 'The cited source has a matching object.' : 'No relevant evidence in the supplied packet.',
      evidence_quotes: quote ? [quote] : [],
    };
  }),
);

const checkedItems = (domain, prompt) => scannerItems(domain, prompt).map(item => ({
  stream: item.stream, id: item.id,
  status: item.assessment_status === 'assessed' ? 'supported' : 'weak', assessment_status: item.assessment_status,
  original_count: item.count, verified_count: item.count,
  rationale: item.reasoning, quote_supported: item.evidence_quotes.length > 0, rescan_recommended: false,
  antipattern_absence_status: item.count ? 'confirmed_present' : item.id === 'AP-F1' ? 'tested_absent' : 'unknown_absent',
  coverage_reason: item.evidence_quotes.length ? 'Current state was verified from the cited source.' : 'No affirmative source coverage.',
}));

const loggingSpans = [
  'Query LOG-271 returned activity for all five subscriptions and Entra logs.',
  '"archiveRetentionDays": 365,\n    "immutableRetentionLocked": true',
  '"queryRoles": ["Cloud Platform Monitor Reader", "SOC Log Analytics Reader"]',
];
const exactQuotes = (prompt, spans) => spans.map(span => {
  const quote = packetQuote(prompt, span);
  assert.ok(quote, 'Expected a source-bound fixture quote');
  return quote;
});
const recoveryScannerItems = (domain, prompt, isRescan) => scannerItems(domain, prompt).map(item => {
  if (item.id === 'F1' || item.id === 'AP-F1') {
    const quotes = exactQuotes(prompt, loggingSpans);
    if (item.id === 'AP-F1') return { ...item, evidence_quotes: quotes, question_results: ['not_supported', 'not_supported', 'not_supported'] };
    if (!isRescan || recoveryMode === 'bad-rescan') quotes[1] = { ...quotes[1], quote: 'The archive was retained for one year.' };
    return { ...item, count: 3, assessment_status: 'assessed', question_results: ['supported', 'supported', 'supported'], evidence_quotes: quotes };
  }
  if (item.id === 'AP-G3') return {
    ...item, count: 1, question_results: ['not_supported', 'unknown', 'supported'],
    evidence_quotes: exactQuotes(prompt, ['"id": "waiver-prod-legacy-recovery"', '"scopeType": "Production subscription"', '"ownerStatus": "Retired without reassignment"']),
    reasoning: 'The policy export identifies one undocumented waiver on the production subscription; it does not show a hierarchy exclusion.',
  };
  return item;
});
const recoveryVerifierItems = (prompt, renewed) => {
  const forwarded = JSON.parse(/<scanner_output_to_verify>\s*([\s\S]*?)\s*<\/scanner_output_to_verify>/.exec(prompt)[1]);
  return Object.entries(forwarded).flatMap(([stream, items]) => Object.entries(items).map(([id, item]) => {
    // Deliberately let a permissive verifier miss the bad F1 citation and
    // disagree on unrelated AP-F1 during reverification. Neither may be promoted.
    const assessed = item.assessment_status === 'assessed' && !(id === 'AP-F1' && renewed);
    return {
      stream, id, status: assessed ? 'supported' : 'weak', assessment_status: assessed ? 'assessed' : 'not_assessed',
      original_count: item.count, verified_count: assessed ? item.count : 0,
      rationale: assessed ? 'The export supports the stated conclusions.' : 'Coverage is insufficient.',
      quote_supported: assessed, rescan_recommended: false,
      antipattern_absence_status: assessed && id === 'AP-G3' ? 'partially_present'
        : assessed && id === 'AP-F1' ? 'tested_absent' : 'unknown_absent',
      coverage_reason: assessed ? 'Verified within the scope declared by the export.' : 'No affirmative scope coverage.',
    };
  }));
};

const response = (body, status = 200) => new Response(JSON.stringify(body), { status });
globalThis.fetch = async (url, init) => {
  if (url === '/api/kb-index') return response({}, 503);
  if (url === '/api/run') {
    const body = JSON.parse(init.body);
    if (body.action === 'ready') {
      assert.ok(validShadowTelemetry(body.shadow_telemetry));
      assert.equal(checkpoints.some(item => item.kind === 'final_report'), true);
    }
    return response({ run_id: runId, state: body.action === 'ready' ? 'ready_for_delivery' : 'active', cleanup_status: null });
  }
  if (url === '/api/checkpoint') {
    const body = JSON.parse(init.body);
    const content = inspectOutput(JSON.stringify(body.payload), {
      packet_id: 'mock', packet_hash: 'mock', run_id: runId, stage: body.kind, provider: 'mock', model: 'mock',
    }).text;
    checkpoints.push(body);
    return response({ schema_version: 'checkpoint_v1', run_id: runId, kind: body.kind, scope: body.scope,
      checkpoint_id: `checkpoint-${checkpoints.length}`, revision: 1, state: 'available',
      payload_hash: sha256(content), char_count: content.length, parent_hash: body.parent_hash ?? null });
  }
  throw new Error(`Unexpected HTTP request ${url}`);
};

globalThis.lzSimulationRouting = {
  getModelRoutingConfig: async () => ({
    label: 'simulation-test', policy_version: 'test', roles: {}, routes: new Proxy({}, { get: () => [{ id: 'simulation-test' }] }),
  }),
  serverLog: async () => {},
  runStage: async (stage, request) => {
    stages.push(stage);
    const domain = domainFor(request.userText);
    const renewed = recoveryMode && domain === 'F' && stage === 'evidence_check' && ++fVerificationCalls > 1;
    if (stage === 'evidence_check' && (verifierOffline || (renewed && recoveryMode === 'verifier-unavailable'))) {
      throw Object.assign(new Error('Verifier unavailable'), { code: 'OUTPUT_INSPECTION_REJECTED' });
    }
    assert.ok(domain, `Expected a routed evidence packet for ${stage}`);
    assert.ok(['forensic_audit', 'evidence_check', 'targeted_rescan'].includes(stage), `Unexpected model call ${stage}`);
    if (stage === 'targeted_rescan') assert.equal(domain, 'F', 'Unrelated silence must not trigger a same-packet rescan');
    const items = !recoveryMode ? (stage === 'forensic_audit' ? scannerItems(domain, request.userText) : checkedItems(domain, request.userText))
      : stage === 'evidence_check' ? recoveryVerifierItems(request.userText, renewed)
      : recoveryScannerItems(domain, request.userText, stage === 'targeted_rescan').filter(item => stage !== 'targeted_rescan' || item.id === 'F1');
    const text = JSON.stringify({ items });
    request.validateOutput?.(text);
    return { text, modelUsed: { id: 'simulation-test' } };
  },
};

const virtualRouter = '\0lz-simulation-routing';
const server = await createServer({
  configFile: false, logLevel: 'silent', server: { middlewareMode: true, ws: false },
  plugins: [{
    name: 'lz-simulation-fixture-routing',
    enforce: 'pre',
    resolveId: id => /(?:^|\/)modelRouter(?:\.ts)?$/.test(id) ? virtualRouter : undefined,
    load: id => id === virtualRouter ? `
      export const { getModelRoutingConfig, serverLog, runStage } = globalThis.lzSimulationRouting;
      export class StageExecutionError extends Error {}
      export class StageExhaustedError extends Error {}
    ` : undefined,
  }],
});

try {
  const { analyzeDocument } = await server.ssrLoadModule('/src/services/analysisService.ts');
  const { demoAssessmentScopeDraft } = await server.ssrLoadModule('/src/scope/step0Scope.ts');
  const fixtureDir = new URL('../test/demo-landing-zone/', import.meta.url);
  const names = (await readdir(fixtureDir)).filter(name => name.endsWith('.json')).sort();
  const sources = await Promise.all(names.map(async (name, index) => ({
    schema_version: 'source_record_v1', kind: 'json', source_id: `src-00${index + 1}`,
    source_name: `Document ${index + 1}`, original_file_name: name, text: await readFile(new URL(name, fixtureDir), 'utf8'),
  })));
  assert.deepEqual(sources.map(source => sha256(source.text)), northstarHashes, 'The eight Northstar exports are unchanged');
  for (const offline of [false, true]) {
    verifierOffline = offline;
    stages.length = 0;
    checkpoints.length = 0;
    const result = await analyzeDocument(sources, () => {}, { scope: demoAssessmentScopeDraft() });
    assert.equal(result.quality_gate.decision, 'BLOCK');
    assert.equal(result.quality_gate.fact_check.attempts, 0);
    assert.equal(result.quality_gate.fact_check.skipped_reason, offline ? 'REQUIRED_EVIDENCE_CHECK_FAILED' : 'EVIDENCE_DENSITY_BELOW_FLOOR');
    assert.equal(result.phase_3_strategy.remediation_roadmap.length, 0);
    assert.equal(result.evidence_check.failed, offline);
    assert.equal(stages.filter(stage => stage === 'forensic_audit').length, 8);
    assert.ok(stages.every(stage => ['forensic_audit', 'evidence_check'].includes(stage)));
    const phase1 = checkpoints.find(item => item.kind === 'phase1').payload;
    assert.equal(phase1.assessment_scope.pack_id, 'landing-zone');
    assert.ok(phase1.effective_evidence_integrity.packet_manifest_hash);
    assert.equal(result.phase_1_audit_logs.maturity.F5.assessment_status, 'not_assessed');
    assert.equal(result.phase_1_audit_logs.antipattern['AP-F5'].antipattern_absence_status, 'unknown_absent');
    if (offline) assert.equal(result.phase_1_audit_logs.maturity.B2.verification_unresolved, true);
    else {
      assert.equal(result.phase_1_audit_logs.maturity.A1.count, 1);
      assert.equal(result.phase_1_audit_logs.maturity.B2.count, 1);
      assert.equal(result.phase_1_audit_logs.antipattern['AP-G3'].antipattern_absence_status, 'confirmed_present');
      assert.equal(result.phase_1_audit_logs.antipattern['AP-F1'].antipattern_absence_status, 'tested_absent');
    }
  }
  console.log('Bundled Azure simulation completed both the sparse-evidence and unavailable-verifier diagnostic paths');

  // Separate Northstar evidence acceptance replay. This intentionally mocks only
  // selected supported verdicts, so the existing density policy still blocks the roadmap.
  verifierOffline = false;
  for (recoveryMode of ['reverified', 'verifier-unavailable', 'bad-rescan']) {
    fVerificationCalls = 0;
    stages.length = 0;
    checkpoints.length = 0;
    const result = await analyzeDocument(sources, () => {}, { scope: demoAssessmentScopeDraft() });
    const phase1 = checkpoints.find(item => item.kind === 'phase1').payload;
    const trace = result.meta.run_trace.semantic_gap_retrieval;
    assert.deepEqual(trace.citation_recovery, phase1.semantic_gap_retrieval.citation_recovery);
    const [repair] = trace.citation_recovery;
    const recovered = recoveryMode === 'reverified';
    assert.deepEqual(repair, {
      domain_id: 'F', stream: 'maturity', criterion_id: 'F1', reason: 'QUOTE_NOT_BOUND',
      packet_hash: repair.packet_hash, rescan_packet_hash: repair.packet_hash,
      outcome: recovered ? 'rescan_reverified' : recoveryMode === 'bad-rescan' ? 'rescan_rejected' : 'rescan_unavailable',
      final_disposition: recovered ? 'supported' : 'unsupported',
    });
    assert.match(repair.packet_hash, /^fnv1a_[a-f0-9]{8}$/);
    assert.ok(trace.passes.every(pass => pass.selected_chunk_ids.length === 0));
    assert.equal(stages.filter(stage => stage === 'forensic_audit').length, 8);
    assert.equal(stages.filter(stage => stage === 'targeted_rescan').length, 1);
    assert.equal(stages.filter(stage => stage === 'evidence_check').length, recoveryMode === 'verifier-unavailable' ? 10 : 9);
    const { maturity, antipattern } = result.phase_1_audit_logs;
    assert.equal(maturity.F1.count, recovered ? 3 : 0);
    assert.equal(maturity.F1.evidence_quotes.length, recovered ? 3 : 0);
    assert.equal(maturity.F1.assessment_status, recovered ? 'assessed' : 'not_assessed');
    assert.equal(antipattern['AP-F1'].antipattern_absence_status, 'tested_absent', 'Preserve verified results outside the target');
    assert.equal(antipattern['AP-G3'].antipattern_absence_status, 'partially_present');
    assert.deepEqual(antipattern['AP-G3'].question_results, ['not_supported', 'unknown', 'supported']);
    assert.equal(maturity.F5.assessment_status, 'not_assessed');
    assert.equal(antipattern['AP-F5'].antipattern_absence_status, 'unknown_absent');
    assert.equal(result.quality_gate.decision, 'BLOCK');
    assert.equal(result.quality_gate.fact_check.skipped_reason, 'EVIDENCE_DENSITY_BELOW_FLOOR');
  }
  console.log('Northstar citation recovery, conservative fallback and scoped waiver replay passed');
} finally {
  await server.close();
  globalThis.fetch = originalFetch;
  delete globalThis.lzSimulationRouting;
}
