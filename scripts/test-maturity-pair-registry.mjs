import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const readJson = async path => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));
const registry = await readJson('../src/domain-packs/landing-zone/pair-registry.json');
const criteria = (await readJson('../src/domain-packs/landing-zone/criteria.json')).criteria;
const antipatterns = (await readJson('../src/domain-packs/landing-zone/antipatterns.json')).criteria;

assert.equal(registry.schema_version, 'lz_maturity_pair_registry_v1');
assert.equal(registry.registry_version, '1.0.0');
assert.equal(registry.status, 'ACTIVE', 'the governed registry must be the active gauge formula source');
assert.equal(registry.pairs.length, 40, 'v1 requires one reviewed pair for every capability and anti-pattern criterion');

const validCapabilities = new Set(criteria.map(item => item.id));
const validAntipatterns = new Set(antipatterns.map(item => item.id));
const domainByCapability = new Map(criteria.map(item => [item.id, item.batch]));
const domainByAntipattern = new Map(antipatterns.map(item => [item.id, item.batch]));
const expectedStrength = new Map([
  ['DIRECT_INVERSE', 1],
  ['STRONGLY_RELATED', 0.75],
  ['CONTEXTUAL', 0.25],
]);
const pairIds = new Set();
const pairedCapabilities = new Set();
const pairedAntipatterns = new Set();

for (const pair of registry.pairs) {
  assert.match(pair.pair_id, /^PAIR-[A-H][1-5]$/);
  assert.ok(!pairIds.has(pair.pair_id), `${pair.pair_id} must be unique`);
  pairIds.add(pair.pair_id);
  assert.ok(validCapabilities.has(pair.capability_id), `${pair.pair_id} has an unknown capability`);
  assert.ok(validAntipatterns.has(pair.antipattern_id), `${pair.pair_id} has an unknown anti-pattern`);
  assert.equal(pair.design_area_id, domainByCapability.get(pair.capability_id));
  assert.equal(pair.design_area_id, domainByAntipattern.get(pair.antipattern_id));
  assert.equal(pair.interaction_strength, expectedStrength.get(pair.relationship_type));
  assert.ok(Number.isFinite(pair.weight) && pair.weight > 0, `${pair.pair_id} needs a positive weight`);
  assert.ok(typeof pair.rationale === 'string' && pair.rationale.trim().length >= 30, `${pair.pair_id} needs a substantive rationale`);
  assert.ok(!pairedCapabilities.has(pair.capability_id), `${pair.capability_id} is paired more than once in v1`);
  assert.ok(!pairedAntipatterns.has(pair.antipattern_id), `${pair.antipattern_id} is paired more than once in v1`);
  pairedCapabilities.add(pair.capability_id);
  pairedAntipatterns.add(pair.antipattern_id);
}

assert.deepEqual([...validCapabilities].filter(id => !pairedCapabilities.has(id)), []);
assert.deepEqual([...validAntipatterns].filter(id => !pairedAntipatterns.has(id)), []);

console.log(`maturity pair registry validation passed (${registry.pairs.length} governed pairs)`);
