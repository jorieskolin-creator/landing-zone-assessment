import path from 'node:path';
import { pathToFileURL } from 'node:url';

// PDF.js warns, and can substitute missing glyphs, when standard font data is
// fetched from the network. Server-side parsing points at the package fonts.
export function pdfjsStandardFontDataUrl(root = process.cwd()) {
  const fontsDir = path.join(root, 'node_modules', 'pdfjs-dist', 'standard_fonts');
  const href = pathToFileURL(fontsDir).href;
  return href.endsWith('/') ? href : `${href}/`;
}
