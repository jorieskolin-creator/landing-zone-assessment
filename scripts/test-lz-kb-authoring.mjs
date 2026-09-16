import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  canonicalKbPathname,
  classifyAuthoringFile,
  validateAuthoringText,
  validateAuthoringTree,
} from '../lib/lzKbAuthoringValidate.js';
import { LZ_KNOWLEDGE_BLOB_PREFIX } from '../lib/kbIndex.js';

const capabilityText = await readFile(
  new URL('../docs/kb-authoring/samples/PAIR-A1.capability.md', import.meta.url),
  'utf8',
);
const antipatternText = await readFile(
  new URL('../docs/kb-authoring/samples/PAIR-A1.antipattern.md', import.meta.url),
  'utf8',
);

assert.deepEqual(classifyAuthoringFile('A/PAIR-A1.capability.md'), {
  kind: 'pair_capability_md',
  pairId: 'PAIR-A1',
  capabilityId: 'A1',
});
assert.equal(classifyAuthoringFile('PAIR-A1.json').kind, 'pair_envelope_json');
assert.equal(
  classifyAuthoringFile('A - Tenant, billing & organization construct - A1 - Authoritative organization root.pdf').kind,
  'ingest_pdf',
);

const capability = validateAuthoringText({
  filename: 'PAIR-A1.capability.md',
  text: capabilityText,
});
assert.equal(capability.ok, true, capability.problems.join('; '));
assert.equal(capability.key, 'maturity:A1');
assert.equal(
  capability.pathname,
  canonicalKbPathname({
    domainId: 'A',
    domainName: 'Tenant, billing & organization construct',
    criterionId: 'A1',
    title: 'Authoritative organization root',
  }),
);
assert.match(capability.pathname, new RegExp(`^${LZ_KNOWLEDGE_BLOB_PREFIX}`));

const antipattern = validateAuthoringText({
  filename: 'PAIR-A1.antipattern.md',
  text: antipatternText,
});
assert.equal(antipattern.ok, true, antipattern.problems.join('; '));
assert.equal(antipattern.key, 'antipattern:AP-A1');
assert.equal(antipattern.warnings.length, 0);

const stale = validateAuthoringText({
  filename: 'PAIR-A1.capability.md',
  text: capabilityText.replace(
    'Questionnaire leads: A-Q1, A-Q2, A-Q6.',
    'Registered source identities (Source Register v1.0.0 PRELIMINARY): SRC-MS-CAF-LZ. Questionnaire leads: A-Q1, A-Q2, A-Q6.',
  ),
});
assert.equal(stale.ok, true);
assert.ok(stale.warnings.some(warning => warning.includes('PRELIMINARY')));

const dir = await mkdtemp(join(tmpdir(), 'lz-kb-authoring-'));
await writeFile(join(dir, 'PAIR-A1.capability.md'), capabilityText);
await writeFile(join(dir, 'PAIR-A1.antipattern.md'), antipatternText);
await writeFile(join(dir, 'PAIR-A1.json'), '{"pair_id":"PAIR-A1"}');
await writeFile(
  join(dir, 'A - Tenant, billing & organization construct - A1 - Authoritative organization root.pdf'),
  'binary-placeholder',
);

const tree = await validateAuthoringTree(dir, { expectedKeys: ['maturity:A1', 'antipattern:AP-A1', 'maturity:B1'] });
assert.equal(tree.failure_count, 0, JSON.stringify(tree.failures, null, 2));
assert.equal(tree.document_count, 2);
assert.equal(tree.missing_expected_count, 1);
assert.deepEqual(tree.missing, ['maturity:B1']);
assert.ok(tree.skipped.some(item => item.filename.endsWith('.json')));
assert.ok(tree.skipped.some(item => item.filename.endsWith('.pdf') && item.key === 'maturity:A1'));

const envExample = await readFile(new URL('../.env.example', import.meta.url), 'utf8');
assert.match(envExample, /GOOGLE_DRIVE_KB=/);
assert.match(envExample, /LZ_KB_BLOB_PREFIX=Landing Zone Knowledge Base\//);
assert.match(envExample, /Runtime ingest remains Vercel Blob/);

const apiKb = await readFile(new URL('../api/kb-index.js', import.meta.url), 'utf8');
assert.doesNotMatch(apiKb, /GOOGLE_DRIVE_KB/);
assert.match(apiKb, /LZ_KB_BLOB_PREFIX/);
