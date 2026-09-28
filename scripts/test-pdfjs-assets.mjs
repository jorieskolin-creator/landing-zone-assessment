import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { access } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pdfjsStandardFontDataUrl } from '../lib/pdfjsNodeOptions.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const prepared = spawnSync(process.execPath, ['scripts/prepare-pdfjs-assets.mjs'], { cwd: root, encoding: 'utf8' });
assert.equal(prepared.status, 0, prepared.stderr || prepared.stdout);
await access(path.join(root, 'public', 'pdfjs', 'pdf.worker.min.mjs'));
await access(path.join(root, 'public', 'pdfjs', 'standard_fonts', 'LiberationSans-Regular.ttf'));

const pdfSource = await readFile(new URL('../src/services/pdfService.ts', import.meta.url), 'utf8');
assert.match(pdfSource, /workerSrc = `\$\{PDFJS_ASSET_BASE\}pdf\.worker\.min\.mjs`/);
assert.match(pdfSource, /standardFontDataUrl: `\$\{PDFJS_ASSET_BASE\}standard_fonts\/`/);
assert.doesNotMatch(pdfSource, /cdnjs\.cloudflare\.com/);

const serverSource = await readFile(new URL('../server.js', import.meta.url), 'utf8');
assert.match(serverSource, /filePath\.endsWith\('\.mjs'\)/);
assert.match(serverSource, /text\/javascript/);

const kbSource = await readFile(new URL('../api/kb-index.js', import.meta.url), 'utf8');
assert.match(kbSource, /standardFontDataUrl: pdfjsStandardFontDataUrl\(\)/);

const fontUrl = pdfjsStandardFontDataUrl(root);
assert.match(fontUrl, /standard_fonts\/$/);
assert.match(fontUrl, /^file:/);

const minimalPdf = (() => {
  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n',
    '4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 12 Tf 20 100 Td (Hello) Tj ET\nendstream\nendobj\n',
    '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
  ];
  let body = '%PDF-1.4\n';
  const offsets = [0];
  for (const object of objects) {
    offsets.push(Buffer.byteLength(body));
    body += object;
  }
  const xrefAt = Buffer.byteLength(body);
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    xref += `${String(offsets[index]).padStart(10, '0')} 00000 n \n`;
  }
  return Buffer.from(`${body}${xref}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`);
})();

const warningsFor = async (options) => {
  const warnings = [];
  const original = console.log;
  console.log = (...args) => {
    const line = args.map(String).join(' ');
    if (line.startsWith('Warning:')) warnings.push(line);
  };
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(minimalPdf), disableWorker: true, ...options }).promise;
    const page = await pdf.getPage(1);
    const content = await page.getTextContent();
    assert.match(content.items.map(item => item.str).join(''), /Hello/);
    await pdf.destroy();
  } finally {
    console.log = original;
  }
  return warnings.filter(line => /standardFontDataUrl|Indexing all PDF objects/.test(line));
};

const missing = await warningsFor({});
assert.ok(missing.length > 0, 'a standard-font PDF must warn when font data is not configured');
const local = await warningsFor({ standardFontDataUrl: fontUrl });
assert.equal(local.length, 0, 'local standard font data must silence the PDF.js font warning');

console.log('PDF.js uses local standard fonts and a same-origin worker');
