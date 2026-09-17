#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { canonicalKbPathname } from '../lib/lzKbAuthoringValidate.js';
import { DEFAULT_LZ_KB_BLOB_PREFIX } from '../lib/lzKbBlobPrefix.js';

const packDir = new URL('../src/domain-packs/landing-zone/', import.meta.url);
const taxonomy = JSON.parse(await readFile(new URL('./taxonomy.json', packDir), 'utf8'));
const criteria = JSON.parse(await readFile(new URL('./criteria.json', packDir), 'utf8'));
const antipatterns = JSON.parse(await readFile(new URL('./antipatterns.json', packDir), 'utf8'));

const pathFor = (item) => canonicalKbPathname({
  domainId: item.design_area_id,
  domainName: item.design_area,
  criterionId: item.id,
  title: item.title,
});

const folders = taxonomy.design_areas.map((area) => `${DEFAULT_LZ_KB_BLOB_PREFIX}${area.name}/`);
const paths = [...criteria.criteria.map(pathFor), ...antipatterns.criteria.map(pathFor)];

console.log(`Drive (human authoring): letter folders A–H. Do not point the engine at Drive.`);
console.log(`Blob (runtime ingest): ${paths.length} PDFs under ${DEFAULT_LZ_KB_BLOB_PREFIX}`);
console.log('');
console.log('Folders:');
for (const folder of folders) console.log(`  ${folder}`);
console.log('');
console.log('Pathnames:');
for (const pathname of paths) console.log(pathname);
console.log('');
console.log(`count=${paths.length} folders=${folders.length}`);
