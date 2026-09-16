import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import ts from '../node_modules/typescript/lib/typescript.js';

const readJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

const tacticsDoc = await readJson('../src/domain-packs/landing-zone/tactics.json');
const bindingsDoc = await readJson('../src/domain-packs/landing-zone/tactic-bindings.json');
const index = await readJson('../docs/tactics-authoring/catalogue-index.json');
const criteria = await readJson('../src/domain-packs/landing-zone/criteria.json');
const antipatterns = await readJson('../src/domain-packs/landing-zone/antipatterns.json');
const knowledge = await readFile(new URL('../src/knowledge_base/landingZoneKnowledge.ts', import.meta.url), 'utf8');
const knowledgeIndex = await readFile(new URL('../src/knowledge_base/index.ts', import.meta.url), 'utf8');

assert.equal(tacticsDoc.status, 'approved_active');
assert.equal(tacticsDoc.version, '1.0.0');
assert.equal(tacticsDoc.tactics.length, 80);
assert.equal(bindingsDoc.bindings.length, 240);
assert.equal(tacticsDoc.playbook, 'Landing_Zone_Assessment_Tactical_Playbook_v1.0.0_APPROVED.pdf');

const idPattern = new RegExp(`^${tacticsDoc.id_pattern}$`);
const known = new Set([
  ...criteria.criteria.map(item => item.id),
  ...antipatterns.criteria.map(item => item.id),
]);
const primaries = tacticsDoc.tactics.map(item => item.primary_criterion_id);
assert.equal(new Set(tacticsDoc.tactics.map(item => item.id)).size, 80);
assert.deepEqual([...primaries].sort(), [...known].sort());

for (const tactic of tacticsDoc.tactics) {
  assert.match(tactic.id, idPattern, tactic.id);
  assert.ok(tactic.title.length > 8, tactic.id);
  assert.ok(tactic.activation_trigger.includes('locked'), tactic.id);
  assert.ok(tactic.do_not_use.includes('current state'), tactic.id);
  assert.ok(tactic.implementation_activities.length >= 3, tactic.id);
  assert.ok(tactic.acceptance_criteria.length >= 3, tactic.id);
  assert.ok(tactic.approved_source_ids.every(id => id.startsWith('SRC-')), tactic.id);
  assert.ok(!JSON.stringify(tactic).includes('Approved source identity appendix'), tactic.id);
  const indexRow = index.tactics.find(row => row.id === tactic.id);
  assert.ok(indexRow, tactic.id);
  assert.equal(tactic.primary_criterion_id, indexRow.primary_criterion_id);
  assert.equal(tactic.kind, indexRow.kind);
}

const apPrimary = bindingsDoc.bindings.filter(item => item.relationship === 'PRIMARY' && item.mandatory_when_activated);
assert.equal(apPrimary.length, 40);
assert.ok(apPrimary.every(item => item.antipattern_ids.length === 1));
const capPrimary = bindingsDoc.bindings.filter(item => item.relationship === 'PRIMARY' && !item.mandatory_when_activated);
assert.equal(capPrimary.length, 40);
assert.ok(capPrimary.every(item => item.criterion_ids.length === 1));

assert.match(knowledge, /LANDING_ZONE_PACK\.tactics\.map/);
assert.doesNotMatch(knowledge, /export const landingZoneTactics = \(\): StrategicTactic\[\] => \[\];/);
assert.doesNotMatch(knowledgeIndex, /from ['"].*finops_tactics_database\.json['"]/);
assert.doesNotMatch(knowledgeIndex, /from ['"].*finops_tactic_activity_playbook\.json['"]/);
assert.match(knowledgeIndex, /exact approved mappings/);

const compile = (source) => ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2020,
    importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
  },
}).outputText;
const dir = await mkdtemp(join(tmpdir(), 'lz-tactic-ids-'));
const tacticIdsSource = await readFile(new URL('../src/kernel/tacticIds.ts', import.meta.url), 'utf8');
await writeFile(join(dir, 'tacticIds.mjs'), compile(tacticIdsSource), 'utf8');
const { tacticIdCaptureRx, LANDING_ZONE_TACTIC_ID_PATTERN } = await import(`file://${join(dir, 'tacticIds.mjs')}`);
const rx = tacticIdCaptureRx();
assert.deepEqual(
  Array.from('[TAC-ORG-A1-01] [TAC-IDENTITY-AP-B1-01] [TAC-GOV-002]'.matchAll(rx), match => match[1]),
  ['TAC-ORG-A1-01', 'TAC-IDENTITY-AP-B1-01', 'TAC-GOV-002'],
);
assert.match('TAC-AUTOMATION-AP-H5-01', new RegExp(`^${LANDING_ZONE_TACTIC_ID_PATTERN}$`));
assert.doesNotMatch('TAC-ORG-001', new RegExp(`^${LANDING_ZONE_TACTIC_ID_PATTERN}$`));

console.log('lz tactics pack conversion passed (80 objects, 240 bindings, no FinOps fallback)');
