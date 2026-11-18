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
    if (stage === 'evidence_check' && verifierOffline) {
      throw Object.assign(new Error('Verifier unavailable'), { code: 'OUTPUT_INSPECTION_REJECTED' });
    }
    assert.ok(domain, `Expected a routed evidence packet for ${stage}`);
    assert.ok(['forensic_audit', 'evidence_check'].includes(stage), `Unexpected model call ${stage}`);
    const items = stage === 'forensic_audit' ? scannerItems(domain, request.userText) : checkedItems(domain, request.userText);
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
} finally {
  await server.close();
  globalThis.fetch = originalFetch;
  delete globalThis.lzSimulationRouting;
}
