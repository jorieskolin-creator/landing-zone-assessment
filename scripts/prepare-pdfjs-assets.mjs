import { cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'public', 'pdfjs');
const pdfjs = path.join(root, 'node_modules', 'pdfjs-dist');

await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, 'standard_fonts'), { recursive: true });
await cp(path.join(pdfjs, 'build', 'pdf.worker.min.mjs'), path.join(output, 'pdf.worker.min.mjs'));
await cp(path.join(pdfjs, 'standard_fonts'), path.join(output, 'standard_fonts'), { recursive: true });

console.log('Prepared same-origin PDF.js worker and standard font data.');
