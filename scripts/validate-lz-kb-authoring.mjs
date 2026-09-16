#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateAuthoringTree } from '../lib/lzKbAuthoringValidate.js';

const packDir = new URL('../src/domain-packs/landing-zone/', import.meta.url);
const criteria = JSON.parse(await readFile(new URL('./criteria.json', packDir), 'utf8'));
const antipatterns = JSON.parse(await readFile(new URL('./antipatterns.json', packDir), 'utf8'));
const expectedKeys = [
  ...criteria.criteria.map(item => `maturity:${item.id}`),
  ...antipatterns.criteria.map(item => `antipattern:${item.id}`),
];

const root = resolve(process.argv[2] || 'docs/kb-authoring/samples');
const report = await validateAuthoringTree(root, { expectedKeys });

const lines = [
  `LZ KB authoring validation: ${report.root}`,
  `parsed ${report.document_count} document(s), ${report.failure_count} failure(s), ${report.skipped_count} skipped, ${report.missing_expected_count} of ${expectedKeys.length} expected keys missing`,
];
for (const doc of report.documents) {
  const warn = doc.warnings.length ? ` warnings=${doc.warnings.join(' | ')}` : '';
  lines.push(`  OK ${doc.key} ${doc.filename}${warn}`);
}
for (const failure of report.failures) {
  lines.push(`  FAIL ${failure.filename}: ${failure.problems.join('; ')}`);
}
for (const skip of report.skipped) {
  lines.push(`  skip ${skip.filename}: ${skip.reason}`);
}
if (report.missing.length && report.missing.length <= 80) {
  lines.push(`  missing: ${report.missing.join(', ')}`);
}
console.log(lines.join('\n'));

if (report.failure_count > 0) process.exit(1);
