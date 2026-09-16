import { readdir, readFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import {
  expectedIdsFromPathname,
  extractJsonFrontMatter,
  LZ_KNOWLEDGE_BLOB_PREFIX,
  sanitizeKbDocument,
} from './kbIndex.js';

const REQUIRED_SECTIONS = [
  'canonical_definition',
  'evidence_requirements',
  'false_positive_guards',
  'validation_questions',
  'scoring_guidance',
];

const PAIR_CAPABILITY_RX = /^PAIR-([A-H][1-5])\.capability\.md$/i;
const PAIR_ANTIPATTERN_RX = /^PAIR-([A-H][1-5])\.antipattern\.md$/i;
const PAIR_ENVELOPE_RX = /^PAIR-([A-H][1-5])\.json$/i;

export function canonicalKbPathname({ domainId, domainName, criterionId, title }) {
  const shortTitle = String(title || '').trim();
  const suffix = shortTitle ? ` - ${shortTitle}` : '';
  return `${LZ_KNOWLEDGE_BLOB_PREFIX}${domainName}/${domainId} - ${domainName} - ${criterionId}${suffix}.pdf`;
}

export function classifyAuthoringFile(filename) {
  const base = basename(filename);
  const capability = base.match(PAIR_CAPABILITY_RX);
  if (capability) {
    return { kind: 'pair_capability_md', pairId: `PAIR-${capability[1].toUpperCase()}`, capabilityId: capability[1].toUpperCase() };
  }
  const antipattern = base.match(PAIR_ANTIPATTERN_RX);
  if (antipattern) {
    const capabilityId = antipattern[1].toUpperCase();
    return { kind: 'pair_antipattern_md', pairId: `PAIR-${capabilityId}`, capabilityId, criterionId: `AP-${capabilityId}` };
  }
  const envelope = base.match(PAIR_ENVELOPE_RX);
  if (envelope) {
    return { kind: 'pair_envelope_json', pairId: `PAIR-${envelope[1].toUpperCase()}` };
  }
  const expected = expectedIdsFromPathname(base);
  if (expected && /\.pdf$/i.test(base)) {
    return { kind: 'ingest_pdf', ...expected };
  }
  if (expected && /\.md$/i.test(base)) {
    return { kind: 'canonical_markdown', ...expected };
  }
  return { kind: 'other' };
}

export function pathnameForAuthoringText(filename, text) {
  const classified = classifyAuthoringFile(filename);
  if (classified.kind === 'ingest_pdf' || classified.kind === 'canonical_markdown') {
    const expected = expectedIdsFromPathname(basename(filename));
    if (!expected) return filename;
    const titleMatch = basename(filename).match(/ - ((?:AP-)?[A-H][1-5]) - (.+)\.(?:pdf|md)$/i);
    return canonicalKbPathname({
      domainId: expected.domainId,
      domainName: expected.domainName,
      criterionId: expected.criterionId,
      title: titleMatch?.[2] || '',
    });
  }
  const meta = extractJsonFrontMatter(text);
  const domainId = meta.domain_id;
  const domainName = meta.domain_name;
  const criterionId = meta.criterion_id;
  const title = meta.capability_name || meta.antipattern_name || '';
  return canonicalKbPathname({ domainId, domainName, criterionId, title });
}

export function validateAuthoringText({ filename, text }) {
  const warnings = [];
  const problems = [];
  let meta;
  try {
    meta = extractJsonFrontMatter(text);
  } catch (error) {
    return {
      ok: false,
      filename,
      problems: [`front matter: ${error.message}`],
      warnings,
    };
  }

  let pathname;
  try {
    pathname = pathnameForAuthoringText(filename, text);
  } catch (error) {
    return {
      ok: false,
      filename,
      problems: [`pathname: ${error.message}`],
      warnings,
    };
  }

  let doc;
  try {
    doc = sanitizeKbDocument({
      pathname,
      text,
      pdfSha256: 'authoring',
      extractedTextSha256: 'authoring',
    });
  } catch (error) {
    return {
      ok: false,
      filename,
      pathname,
      problems: String(error.message).split('; ').filter(Boolean),
      warnings,
    };
  }

  for (const key of REQUIRED_SECTIONS) {
    if (!doc.sections[key]) problems.push(`missing section ${key}`);
  }
  if (doc.stream === 'antipattern' && !doc.sections.state_interpretation) {
    problems.push('missing section state_interpretation');
  }
  if (doc.stream === 'antipattern' && !doc.sections.prohibited_inference_rules) {
    problems.push('missing section prohibited_inference_rules');
  }
  if (doc.extraction?.section_order_valid === false) {
    problems.push('section headings are out of canonical order');
  }
  if (doc.extraction?.duplicate_section_headings?.length) {
    problems.push(`duplicate headings: ${doc.extraction.duplicate_section_headings.join(', ')}`);
  }

  return {
    ok: problems.length === 0,
    filename,
    pathname,
    stream: doc.stream,
    criterion_id: doc.criterion_id,
    kb_id: doc.kb_id,
    title: doc.title,
    key: `${doc.stream}:${doc.criterion_id}`,
    problems,
    warnings,
  };
}

async function walkFiles(root) {
  const out = [];
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(root, entry.name);
    if (entry.isDirectory()) {
      out.push(...await walkFiles(full));
    } else if (entry.isFile()) {
      out.push(full);
    }
  }
  return out;
}

export async function validateAuthoringTree(root, { expectedKeys } = {}) {
  const files = await walkFiles(root);
  const documents = [];
  const skipped = [];
  const failures = [];

  for (const full of files) {
    const rel = relative(root, full);
    const classified = classifyAuthoringFile(rel);
    if (classified.kind === 'pair_envelope_json') {
      skipped.push({ filename: rel, reason: 'pair envelope JSON is not ingested; split into two documents' });
      continue;
    }
    if (classified.kind === 'ingest_pdf') {
      skipped.push({
        filename: rel,
        reason: 'PDF binary is not parsed here; filename matches ingest pattern',
        key: `${classified.stream}:${classified.criterionId}`,
      });
      continue;
    }
    if (classified.kind === 'other') {
      skipped.push({ filename: rel, reason: 'not a pair markdown or canonical ingest filename' });
      continue;
    }
    const text = await readFile(full, 'utf8');
    const result = validateAuthoringText({ filename: rel, text });
    if (result.ok) documents.push(result);
    else failures.push(result);
  }

  const actualKeys = new Set(documents.map(doc => doc.key));
  for (const skip of skipped) {
    if (skip.key) actualKeys.add(skip.key);
  }
  const missing = (expectedKeys || []).filter(key => !actualKeys.has(key));

  return {
    root,
    document_count: documents.length,
    failure_count: failures.length,
    skipped_count: skipped.length,
    missing_expected_count: missing.length,
    documents,
    failures,
    skipped,
    missing,
  };
}
