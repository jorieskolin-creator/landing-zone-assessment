import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const index = JSON.parse(
  await readFile(new URL('../docs/tactics-authoring/catalogue-index.json', import.meta.url), 'utf8'),
);
const criteria = JSON.parse(
  await readFile(new URL('../src/domain-packs/landing-zone/criteria.json', import.meta.url), 'utf8'),
);
const antipatterns = JSON.parse(
  await readFile(new URL('../src/domain-packs/landing-zone/antipatterns.json', import.meta.url), 'utf8'),
);
const tacticsManifest = JSON.parse(
  await readFile(new URL('../src/domain-packs/landing-zone/tactics.json', import.meta.url), 'utf8'),
);

assert.equal(index.tactic_count, 80);
assert.equal(index.tactics.length, 80);
assert.equal(index.version, '1.0.0');
assert.equal(index.status, 'APPROVED-ACTIVE');

const ids = index.tactics.map(item => item.id);
assert.equal(new Set(ids).size, 80);

const idPattern = new RegExp(`^${index.id_pattern}$`);
for (const item of index.tactics) {
  assert.match(item.id, idPattern, item.id);
}

const namespaces = {
  A: 'ORG',
  B: 'IDENTITY',
  C: 'RESOURCE',
  D: 'NETWORK',
  E: 'SECURITY',
  F: 'OPERATIONS',
  G: 'GOVERNANCE',
  H: 'AUTOMATION',
};
const expectedPrimaries = [
  ...criteria.criteria.map(item => item.id),
  ...antipatterns.criteria.map(item => item.id),
];
assert.deepEqual(
  index.tactics.map(item => item.primary_criterion_id).sort(),
  [...expectedPrimaries].sort(),
);

for (const item of index.tactics) {
  assert.equal(item.namespace, namespaces[item.design_area_id], item.id);
  assert.ok(item.title.length > 8, item.id);
  assert.ok(expectedPrimaries.includes(item.pair_criterion_id), `${item.id} pair ${item.pair_criterion_id}`);
  for (const supporting of item.supporting_criterion_ids) {
    assert.ok(expectedPrimaries.includes(supporting), `${item.id} supporting ${supporting}`);
  }
}

assert.equal(tacticsManifest.tactics.length, 80);
assert.equal(tacticsManifest.status, 'approved_active');

console.log('lz tactic catalogue index passed (80 approved IDs; runtime pack still empty)');
