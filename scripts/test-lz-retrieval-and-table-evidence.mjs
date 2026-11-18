import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { emitTypescript } from './ts-emit.mjs';

const dir = await mkdtemp(join(tmpdir(), 'lz-retrieval-'));
const load = async (path, subdir) => import(await emitTypescript(new URL(path, import.meta.url).pathname, join(dir, subdir)));
try {
  const [
    { buildSourceRegistry, buildDomainPackets },
    { applyLandingZoneSourceClassification },
    { deriveAllEvidenceSignals },
    { planGapRetrieval },
    { expandWeakEvidencePacket, hasSemanticRetrievalCandidates },
    { buildDataSignalCoverageReport, isDerivedEvidenceApprovedForPacket },
    { verifyTextEvidenceSupport, isEvidenceQuoteBoundToChunk },
  ] = await Promise.all([
    load('../src/services/sourceRegistryService.ts', 'source'),
    load('../src/acquisition/landingZoneSourceClassification.ts', 'classify'),
    load('../src/services/derivedEvidence/index.ts', 'derive'),
    load('../src/services/gapAnalyzerService.ts', 'plan'),
    load('../src/services/semanticGapRetrievalService.ts', 'semantic'),
    load('../src/services/structuredDataAnalysisService.ts', 'table'),
    load('../src/services/evidenceSupport.ts', 'verify'),
  ]);

  const fixtureDir = new URL('../test/demo-landing-zone/', import.meta.url);
  const names = (await readdir(fixtureDir)).filter(name => name.endsWith('.json')).sort();
  const sources = applyLandingZoneSourceClassification(await Promise.all(names.map(async (name, index) => ({
    schema_version: 'source_record_v1', kind: 'json', source_id: `src-${index + 1}`, source_name: name,
    text: await readFile(new URL(name, fixtureDir), 'utf8'),
  }))), ['azure']);
  const registry = buildSourceRegistry(sources);
  const packets = buildDomainPackets(registry);
  const coverage = deriveAllEvidenceSignals(sources, registry, { providers: ['azure'] });
  assert.equal(coverage.evidence.length, 40);
  assert.ok(coverage.evidence.every(item => item.mode === 'shadow' && item.result.coverage.unusable === 0));
  assert.ok(coverage.locations.B2['B2:1']?.length > 0, 'PIM configuration should provide a retrieval lead');
  assert.ok(coverage.locations.G3['G3:0']?.length > 0, 'policy exemption evidence should provide a retrieval lead');
  assert.equal(coverage.evidence.find(item => item.targets[0].criterion_id === 'F5').result.coverage.found, 0);
  const scoped = deriveAllEvidenceSignals(sources, registry, { providers: ['azure'], designAreaIds: ['G', 'H'] });
  assert.equal(scoped.evidence.length, 10);
  assert.ok(scoped.evidence.every(item => !isDerivedEvidenceApprovedForPacket(item)));
  const gaps = planGapRetrieval({ packets: { G: packets.G, H: packets.H }, derived: scoped.evidence, locations: scoped.locations });
  assert.ok(gaps.terms_by_domain.G.some(term => /exemption|expiry|waiver/.test(term)));
  assert.ok(gaps.terms_by_domain.H.some(term => /vending|pipeline/.test(term)));
  assert.ok(!gaps.trigger_domains.some(domain => !['G', 'H'].includes(domain)));

  const noCandidateRegistry = { ...registry, chunks: registry.chunks.filter(chunk =>
    packets.G.manifest.some(item => item.chunk_id === chunk.chunk_id)
  ) };
  assert.equal(hasSemanticRetrievalCandidates(noCandidateRegistry, packets.G), false);
  assert.equal(expandWeakEvidencePacket({
    registry: noCandidateRegistry, packet: packets.G, pass: 1, seenTerms: new Set(),
    items: [{ id: 'AP-G3', stream: 'antipattern', status: 'weak', rescan_recommended: true, rationale: 'Find exemption ownership.' }],
  }).trace.stop_reason, 'NO_NEW_CANDIDATES');

  const pimChunk = registry.chunks.find(chunk => chunk.text.includes('"maximumActivationMinutes": 60'));
  assert.ok(pimChunk);
  const manifest = packets.B.manifest.find(item => item.chunk_id === pimChunk.chunk_id);
  assert.ok(manifest);
  const rawQuote = { chunk_id: pimChunk.chunk_id, source_id: pimChunk.source_id, quote: '"maximumActivationMinutes": 60' };
  const escapedQuote = { ...rawQuote, quote: '&quot;maximumActivationMinutes&quot;: 60' };
  for (const quote of [rawQuote, escapedQuote]) {
    assert.equal(verifyTextEvidenceSupport({ count: 1, evidence_quotes: [quote] }, packets.B.text), 'supported');
    assert.equal(isEvidenceQuoteBoundToChunk(quote, manifest, pimChunk), true);
  }
  const wrongChunk = { ...rawQuote, chunk_id: registry.chunks.find(chunk => chunk.source_id !== pimChunk.source_id).chunk_id };
  assert.equal(verifyTextEvidenceSupport({ count: 1, evidence_quotes: [wrongChunk] }, packets.B.text), 'unsupported');
  assert.equal(isEvidenceQuoteBoundToChunk(wrongChunk, manifest, pimChunk), false);
  const chunkOne = '<CHUNK id="one" source_id="a">Approval required</CHUNK>';
  const chunkTwo = '<CHUNK id="two" source_id="a">within two hours</CHUNK>';
  assert.equal(verifyTextEvidenceSupport({ count: 1, evidence_quotes: [
    { chunk_id: 'one', source_id: 'a', quote: 'Approval required within two hours' },
  ] }, chunkOne + chunkTwo), 'unsupported');
  assert.equal(verifyTextEvidenceSupport({ count: 1, evidence_quotes: [
    { chunk_id: 'one', source_id: 'a', quote: 'Approval required' },
    { chunk_id: 'two', source_id: 'a', quote: 'within two hours' },
  ] }, chunkOne + chunkTwo), 'supported');

  const table = { schema_version: 'structured_table_v1', total_row_count: 1, analysis_complete: true, truncated: false };
  const source = { schema_version: 'source_record_v1', source_id: 'src-9', kind: 'csv' };
  const cost = { ...source, source_name: 'spend.csv', structured_table: {
    ...table, headers: ['Owner', 'Cost Center', 'Tags', 'Spend'], rows: [['owner', 'CC-1', 'prod', '100']],
  } };
  const inventory = { ...source, source_name: 'azure-management-group-hierarchy.csv', structured_table: {
    ...table, headers: ['subscriptionId', 'parentManagementGroupId', 'tenantId', 'displayName'],
    rows: [['dddddddd-1111-2222-3333-eeeeeeeeeeee', '/providers/Microsoft.Management/managementGroups/platform', 'fixture-tenant', 'Platform']],
  } };
  const analyzed = (item, providers = ['azure']) => deriveAllEvidenceSignals(
    applyLandingZoneSourceClassification([item], providers), undefined, { providers, designAreaIds: ['C'] },
  ).evidence.filter(item => item.mode === 'authoritative');
  assert.deepEqual(analyzed(cost), []);
  const [fact] = analyzed(inventory);
  assert.ok(fact, 'Recognized platform inventory should produce the reviewed C1 fact');
  assert.equal(isDerivedEvidenceApprovedForPacket(fact), true);
  assert.equal(isDerivedEvidenceApprovedForPacket({ ...fact, targets: [{ stream: 'maturity', criterion_id: 'A1' }] }), false);
  assert.equal(isDerivedEvidenceApprovedForPacket({ ...fact, derivation: { ...fact.derivation, analyzer_version: '2.0.0' } }), false);
  assert.doesNotMatch(JSON.stringify(fact), /dddddddd|fixture-tenant/);
  for (const limitation of [{ hidden_row_count: 1 }, { hidden_column_count: 1 }, { analysis_complete: false },
    { total_row_count: 2 }, { active_filter_range: 'A1:C2' }, { formula_cell_count: 1 }]) {
    assert.deepEqual(analyzed({ ...inventory, structured_table: { ...inventory.structured_table, ...limitation } }), []);
  }
  assert.deepEqual(analyzed(inventory, ['aws']), []);
  const scale = buildDataSignalCoverageReport({ providers: ['azure'] });
  assert.equal(scale.total_object_count, 80);
  assert.deepEqual(scale.objects.filter(item => item.analyzer_ids.length).map(item => item.criterion_id), ['C1']);
  assert.equal(buildDataSignalCoverageReport({ providers: ['aws'] }).analyzer_available_count, 0);
  console.log('Azure simulation retrieval, citation and table authority passed');
} finally {
  await rm(dir, { recursive: true, force: true });
}
