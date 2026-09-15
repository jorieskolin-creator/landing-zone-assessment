import assert from 'node:assert/strict';
import {
  buildKbStatus,
  extractKbSections,
  extractJsonFrontMatter,
  expectedIdsFromPathname,
  landingZoneKbPackMetadata,
  LZ_KNOWLEDGE_BLOB_PREFIX,
  normalizeDomainName,
  normalizeCapabilityId,
  normalizeCriterionId,
  sanitizeKbDocument,
  textLooksLikeFinopsKnowledge,
  validateKbMetadata,
} from '../lib/kbIndex.js';
import { fetchBlobBytes, listBlobPdfs } from '../api/kb-index.js';

const lzMeta = {
  kb_type: 'reference',
  domain_id: 'A',
  domain_name: 'Tenant, billing & organization construct',
  stream: 'maturity',
  criterion_id: 'A1',
  capability_id: 'A1',
  capability_name: 'Authoritative organization root',
  evidence_categories: ['Policy', 'Process'],
  allowed_uses: ['rubric_context', 'evidence_requirements'],
  forbidden_uses: ['customer_current_state_claim', 'source_evidence_quote'],
  version: '1.0.0',
};

const lzMaturityPath = `${LZ_KNOWLEDGE_BLOB_PREFIX}Tenant, billing & organization construct/A - Tenant, billing & organization construct - A1 - Authoritative organization root.pdf`;
const lzAntiPath = `${LZ_KNOWLEDGE_BLOB_PREFIX}Tenant, billing & organization construct/A - Tenant, billing & organization construct - AP-A1 - Shadow tenants and unmanaged orgs.pdf`;
const finopsMaturityPath = 'Knowledge Base/Cost Visibility & Allocation/A - Cost Visibility & Allocation - A1 - Comprehensive Cost Allocation & Tagging.pdf';
const finopsAntiPath = 'Knowledge Base/Cost Visibility & Allocation/A - Cost Visibility & Allocation - AP-A1 - Tag Sprawl & Missing Tags.pdf';
const finopsFPath = 'Knowledge Base/GenAI & AI Cost Management/F - GenAI & AI Cost Management - F2 - AI Cost Allocation & Unit Economics.pdf';

assert.equal(expectedIdsFromPathname(finopsMaturityPath), null);
assert.equal(expectedIdsFromPathname(finopsAntiPath), null);
assert.equal(expectedIdsFromPathname(finopsFPath), null);
assert.ok(textLooksLikeFinopsKnowledge(finopsMaturityPath));
assert.ok(validateKbMetadata({
  ...lzMeta,
  domain_name: 'Cost Visibility & Allocation',
  capability_name: 'Comprehensive Cost Allocation & Tagging',
}, finopsMaturityPath).some(problem => problem.includes('FinOps Knowledge Base content is rejected')));

assert.deepEqual(expectedIdsFromPathname(lzMaturityPath), {
  domainId: 'A',
  domainName: 'Tenant, billing & organization construct',
  criterionId: 'A1',
  capabilityId: 'A1',
  stream: 'maturity',
});
assert.equal(normalizeCriterionId('H5'), 'H5');
assert.equal(normalizeCriterionId('AP-H5'), 'AP-H5');
assert.deepEqual(expectedIdsFromPathname(
  `${LZ_KNOWLEDGE_BLOB_PREFIX}Platform automation & DevOps/H - Platform automation & DevOps - H5 - Platform change management.pdf`
), {
  domainId: 'H',
  domainName: 'Platform automation & DevOps',
  criterionId: 'H5',
  capabilityId: 'H5',
  stream: 'maturity',
});

assert.deepEqual(validateKbMetadata(lzMeta, lzMaturityPath), []);
assert.notEqual(normalizeDomainName('F', 'GenAI / Token Cost Management'), 'Management & observability');
assert.notEqual(normalizeDomainName('F', 'GenAI & AI Cost Management'), 'Management & observability');
assert.equal(normalizeDomainName('F', 'Management & observability'), 'Management & observability');

const antiMeta = {
  ...lzMeta,
  stream: 'antipattern',
  criterion_id: 'AP-A1',
  capability_id: 'A1',
  antipattern_name: 'Shadow tenants and unmanaged orgs',
};
delete antiMeta.capability_name;
assert.deepEqual(validateKbMetadata(antiMeta, lzAntiPath), []);
assert.equal(normalizeCriterionId('AP – A1'), 'AP-A1');
assert.equal(normalizeCriterionId('AP - A1'), 'AP-A1');
assert.equal(normalizeCriterionId('AP—A1'), 'AP-A1');
assert.equal(normalizeCriterionId('APA1'), 'AP-A1');
assert.equal(normalizeCapabilityId('AP – A1'), 'A1');

const extractedDashMeta = {
  ...antiMeta,
  criterion_id: 'AP – A1',
  capability_id: 'AP - A1',
};
assert.deepEqual(validateKbMetadata(extractedDashMeta, lzAntiPath), []);

const legacyMeta = {
  ...antiMeta,
  streams: ['anti-pattern'],
  antipattern_id: 'antipattern.A1',
  capability_id: 'A1-AP',
};
assert(validateKbMetadata(legacyMeta, lzAntiPath).some(p => p.includes('legacy streams')));
assert(validateKbMetadata(legacyMeta, lzAntiPath).some(p => p.includes('legacy antipattern_id')));
assert(validateKbMetadata(legacyMeta, lzAntiPath).some(p => p.includes('capability_id=A1-AP')));

const finopsMeta = {
  ...lzMeta,
  domain_name: 'Cost Visibility & Allocation',
  capability_name: 'Comprehensive Cost Allocation & Tagging',
};
assert.ok(validateKbMetadata(finopsMeta, finopsMaturityPath).length > 0);
assert.ok(validateKbMetadata({
  ...lzMeta,
  domain_id: 'F',
  domain_name: 'GenAI & AI Cost Management',
  criterion_id: 'F2',
  capability_id: 'F2',
  capability_name: 'AI Cost Allocation & Unit Economics',
}, finopsFPath).some(problem => problem.includes('FinOps')));

const lzFPath = `${LZ_KNOWLEDGE_BLOB_PREFIX}Management & observability/F - Management & observability - F2 - Inventory as landing-zone truth.pdf`;
const lzFMeta = {
  ...lzMeta,
  domain_id: 'F',
  domain_name: 'Management & observability',
  criterion_id: 'F2',
  capability_id: 'F2',
  capability_name: 'Inventory as landing-zone truth',
};
assert.deepEqual(validateKbMetadata(lzFMeta, lzFPath), []);

const text = `Title line\n${JSON.stringify(lzMeta, null, 2)}\n\nReference body for evidence requirements.`;
assert.equal(extractJsonFrontMatter(text).criterion_id, 'A1');
const doc = sanitizeKbDocument({
  pathname: lzMaturityPath,
  url: 'https://example.test/a.pdf',
  downloadUrl: 'https://example.test/a.pdf?download=1',
  size: 123,
  uploadedAt: '2026-05-21T00:00:00.000Z',
  text,
});
assert.equal(doc.stream, 'maturity');
assert.equal(doc.criterion_id, 'A1');
assert.equal(doc.domain_name, 'Tenant, billing & organization construct');
assert(doc.body_excerpt.includes('Reference body'));

await assert.rejects(
  async () => sanitizeKbDocument({
    pathname: finopsMaturityPath,
    url: 'https://example.test/finops.pdf',
    downloadUrl: 'https://example.test/finops.pdf?download=1',
    size: 123,
    uploadedAt: '2026-05-21T00:00:00.000Z',
    text: `${JSON.stringify(finopsMeta, null, 2)}\n\nFinOps body.`,
  }),
  /FinOps Knowledge Base content is rejected/,
);

const antiDoc = sanitizeKbDocument({
  pathname: lzAntiPath,
  url: 'https://example.test/ap.pdf',
  downloadUrl: 'https://example.test/ap.pdf?download=1',
  size: 123,
  uploadedAt: '2026-05-21T00:00:00.000Z',
  text: `${JSON.stringify(extractedDashMeta, null, 2)}\n\nAnti-pattern reference body.`,
});
assert.equal(antiDoc.criterion_id, 'AP-A1');
assert.equal(antiDoc.capability_id, 'A1');

const fDoc = sanitizeKbDocument({
  pathname: lzFPath,
  url: 'https://example.test/f.pdf',
  downloadUrl: 'https://example.test/f.pdf?download=1',
  size: 123,
  uploadedAt: '2026-05-21T00:00:00.000Z',
  text: `${JSON.stringify(lzFMeta, null, 2)}\n\nF2 reference body.`,
});
assert.equal(fDoc.domain_name, 'Management & observability');
assert.equal(fDoc.stream, 'maturity');
assert.equal(fDoc.criterion_id, 'F2');

const apD1Meta = {
  ...antiMeta,
  domain_id: 'D',
  domain_name: 'Network topology & connectivity',
  criterion_id: 'AP-D1',
  capability_id: 'D1',
  antipattern_name: 'Per-application internet edge',
};
const apD1Path = `${LZ_KNOWLEDGE_BLOB_PREFIX}Network topology & connectivity/D - Network topology & connectivity - AP-D1 - Per-application internet edge.pdf`;
const longPrefix = 'Persistent inspection-path context. '.repeat(220);
const apD1Body = `Purpose
${longPrefix}
This prose mentions Validation Questions but is not a heading boundary.
Canonical Definition
Persistent inherited infrastructure assumptions create unmanaged internet edges.
Primary Assessment Questions
Were workloads given their own public edge instead of the hub?
Anti-Pattern State Interpretation
confirmed_present requires persistent operational evidence.
Evidence Requirements
Strong Evidence
Persistently team-owned public IPs and optional inspection.
Moderate Evidence
A modernization backlog with incomplete hub routing.
Weak Evidence
A single public IP mention alone.
Contradictory Evidence
Forced hub inspection and retired team edges.
False Positive Guards
A recent migration or temporary over-provisioning is not sufficient.
Validation Questions
Are workloads rightsized operationally?
Detection Heuristics
Per-app firewalls as the normal path is a strong signal.
Prohibited Inference Rules
A diagram must not be treated as proof of this anti-pattern.
Scoring Guidance Notes
confirmed_present requires persistent inherited inefficiency.
Canonical Source Foundations
Landing Zone catalogue.`;
const apD1Text = `${JSON.stringify(apD1Meta, null, 2)}\n\n${apD1Body}`;
const apD1LegacyText = `${JSON.stringify(apD1Meta)}\n\n${apD1Body.replace(/\n/g, ' ')}`;
const sections = extractKbSections(apD1Text);
assert(Object.hasOwn(sections, 'evidence_requirements'));
assert(sections.false_positive_guards.includes('recent migration'));
assert(sections.prohibited_inference_rules.includes('must not be treated as proof'));
assert(sections.scoring_guidance.includes('persistent inherited inefficiency'));
assert(!sections.purpose.includes('Are workloads rightsized operationally?'));

const apD1Doc = sanitizeKbDocument({
  pathname: apD1Path,
  text: apD1LegacyText,
  sectionText: apD1Text,
  pdfSha256: 'sha256_pdf',
  extractedTextSha256: 'sha256_text',
  extraction: {
    totalPages: 15,
    processedPages: 15,
    sparsePages: [],
    pageLimitReached: false,
  },
});
assert(apD1Doc.body_excerpt.length > 6000, 'complete KB body must not be truncated at ingestion');
assert(!apD1Doc.body_excerpt.includes('[truncated]'));
assert(!apD1Doc.body_excerpt.includes('\nCanonical Definition'), 'legacy prompt body representation must remain flattened');
assert(apD1Doc.sections.validation_questions.includes('rightsized operationally'));
assert.equal(apD1Doc.extraction.processed_pages, 15);
assert.equal(apD1Doc.extraction.page_limit_reached, false);
assert.equal(apD1Doc.extraction.section_order_valid, true);
assert.deepEqual(apD1Doc.extraction.duplicate_section_headings, []);
assert.equal(apD1Doc.pdf_sha256, 'sha256_pdf');
assert.equal(apD1Doc.domain_name, 'Network topology & connectivity');

const status = buildKbStatus([apD1Doc], [], 'remote_blob', LZ_KNOWLEDGE_BLOB_PREFIX);
assert.equal(status.delivery.sectioned_document_count, 1);
assert.equal(status.delivery.missing_expected_document_count, 79);
assert.equal(status.delivery.shadow_ready, false);
assert.equal(status.kb_pack_version, landingZoneKbPackMetadata().kb_pack_version);
assert.equal(status.kb_content_status, 'contract_defined_content_pending');

const completeDocuments = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].flatMap(domainId => (
  Array.from({ length: 5 }, (_, index) => {
    const capabilityId = `${domainId}${index + 1}`;
    return [
      { ...apD1Doc, domain_id: domainId, stream: 'maturity', criterion_id: capabilityId, capability_id: capabilityId },
      { ...apD1Doc, domain_id: domainId, stream: 'antipattern', criterion_id: `AP-${capabilityId}`, capability_id: capabilityId },
    ];
  }).flat()
));
const completeStatus = buildKbStatus(completeDocuments, [], 'remote_blob', LZ_KNOWLEDGE_BLOB_PREFIX);
assert.equal(completeStatus.delivery.missing_expected_document_count, 0);
assert.equal(completeStatus.delivery.unexpected_document_count, 0);
assert.equal(completeStatus.delivery.duplicate_document_count, 0);
assert.equal(completeStatus.delivery.shadow_ready, true);

await assert.rejects(
  fetchBlobBytes({ pathname: 'oversized.pdf', size: (20 * 1024 * 1024) + 1, url: 'https://example.test/oversized.pdf' }, 'token'),
  /KB_PDF_BYTE_LIMIT_EXCEEDED/
);

const originalFetch = globalThis.fetch;
let listCalls = 0;
globalThis.fetch = async () => {
  const page = listCalls++;
  const start = page * 100;
  const count = page < 3 ? 100 : 1;
  return {
    ok: true,
    json: async () => ({
      blobs: Array.from({ length: count }, (_, index) => ({ pathname: `non-pdf-${start + index}.txt` })),
      hasMore: page < 3,
      cursor: page < 3 ? `cursor-${page + 1}` : undefined,
    }),
  };
};
try {
  const boundedListing = await listBlobPdfs({ token: 'vercel_blob_rw_store_secret', prefix: LZ_KNOWLEDGE_BLOB_PREFIX });
  assert.equal(listCalls, 4);
  assert.equal(boundedListing.blobs.length, 0);
  assert.equal(boundedListing.limitReached, true);
} finally {
  globalThis.fetch = originalFetch;
}

console.log('KB index tests passed');
