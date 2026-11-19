import type {
  AntiPatternAbsenceStatus,
  AuditItem,
  EvidenceCheckStatus,
  EvidenceQuote,
  SourceChunk,
  SourcePacketManifestItem,
  DerivedAnalyticalEvidence,
  EvidenceLaneStagePacket,
} from '../types';

const EVIDENCE_CHECK_STATUSES: EvidenceCheckStatus[] = ['supported', 'weak', 'unsupported', 'missing'];
const ANTIPATTERN_ABSENCE_STATUSES: AntiPatternAbsenceStatus[] = ['confirmed_present', 'partially_present', 'tested_absent', 'unknown_absent'];

export const normalizeEvidenceText = (value: string): string =>
  value.toLowerCase().replace(/\s+/g, ' ').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").trim();

const XML_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decodePacketXml = (text: string): string =>
  text.replace(/&(amp|lt|gt|quot|apos);/g, (_, name: string) => XML_ENTITIES[name]);

const containsEvidenceSpan = (text: string, quote: string): boolean => {
  const source = normalizeEvidenceText(text);
  const raw = normalizeEvidenceText(quote);
  const decoded = normalizeEvidenceText(decodePacketXml(quote));
  return (raw.length >= 4 && source.includes(raw)) || (decoded.length >= 4 && source.includes(decoded));
};

export const stampQuoteLocators = (
  quote: Partial<EvidenceQuote>,
  manifestItem: SourcePacketManifestItem | undefined,
): Partial<EvidenceQuote> => {
  if (!quote || quote.evidence_source === 'derived' || !manifestItem) return quote;
  const next: Partial<EvidenceQuote> = { ...quote };
  if (manifestItem.page_id !== undefined) next.page_id = manifestItem.page_id;
  if (manifestItem.page_number !== undefined) next.page_number = manifestItem.page_number;
  if (manifestItem.sheet_name !== undefined) next.sheet_name = manifestItem.sheet_name;
  if (typeof manifestItem.row_number === 'number') next.row_number = manifestItem.row_number;
  if (manifestItem.evidence_class !== undefined) next.evidence_class = manifestItem.evidence_class;
  return next;
};

export const isEvidenceQuoteBoundToChunk = (
  quote: Partial<EvidenceQuote>,
  manifestItem: SourcePacketManifestItem | undefined,
  chunk: SourceChunk | undefined,
): boolean => Boolean(
  quote.chunk_id
  && quote.source_id
  && typeof quote.quote === 'string'
  && manifestItem
  && chunk
  && quote.chunk_id === manifestItem.chunk_id
  && quote.chunk_id === chunk.chunk_id
  && quote.source_id === manifestItem.source_id
  && quote.source_id === chunk.source_id
  && quote.page_id === manifestItem.page_id
  && quote.page_number === manifestItem.page_number
  && quote.sheet_name === manifestItem.sheet_name
  && quote.row_number === manifestItem.row_number
  && containsEvidenceSpan(chunk.text, quote.quote)
);

export const isEvidenceQuoteBoundToDerivedEvidence = (
  quote: Partial<EvidenceQuote>,
  evidence: DerivedAnalyticalEvidence | undefined,
  stream: 'maturity' | 'antipattern',
  criterionId: string,
): boolean => Boolean(
  quote.evidence_source === 'derived'
  && quote.derived_evidence_id
  && quote.source_id
  && typeof quote.quote === 'string'
  && evidence
  && evidence.mode === 'authoritative'
  && evidence.report_eligible
  && evidence.eligibility.state === 'ELIGIBLE'
  && evidence.llm_policy?.may_use_as_evidence !== false
  && evidence.derivation?.analyzer_id !== 'crucial_item_coverage_v1'
  && quote.derived_evidence_id === evidence.evidence_id
  && quote.source_id === evidence.source_id
  && evidence.targets.some(target => target.stream === stream && target.criterion_id === criterionId)
  && normalizeEvidenceText(quote.quote).length >= 4
  && evidence.summary_lines.some(line => normalizeEvidenceText(line) === normalizeEvidenceText(quote.quote!))
);

export const isValidEvidenceVerifierItem = (input: {
  raw: any;
  stream: 'maturity' | 'antipattern';
  scannerCount: number;
  duplicate: boolean;
}): boolean => {
  const { raw, stream, scannerCount, duplicate } = input;
  if (!raw || typeof raw !== 'object' || duplicate) return false;
  if (!EVIDENCE_CHECK_STATUSES.includes(raw.status)) return false;
  if (raw.assessment_status !== 'assessed' && raw.assessment_status !== 'not_assessed') return false;
  if (!Number.isInteger(raw.original_count) || raw.original_count !== scannerCount) return false;
  if (!Number.isInteger(raw.verified_count) || raw.verified_count < 0 || raw.verified_count > scannerCount) return false;
  if (typeof raw.rationale !== 'string' || raw.rationale.trim().length === 0) return false;
  if (typeof raw.quote_supported !== 'boolean' || typeof raw.rescan_recommended !== 'boolean') return false;
  if (stream === 'maturity') return true;
  if (!ANTIPATTERN_ABSENCE_STATUSES.includes(raw.antipattern_absence_status)) return false;
  if (raw.antipattern_absence_status === 'confirmed_present' && raw.verified_count === 0) return false;
  if (
    (raw.antipattern_absence_status === 'confirmed_present' || raw.antipattern_absence_status === 'partially_present')
    && scannerCount > 0
    && (raw.assessment_status !== 'assessed' || raw.quote_supported !== true)
  ) return false;
  if (raw.antipattern_absence_status === 'tested_absent' && (scannerCount !== 0 || raw.verified_count !== 0 || raw.status !== 'supported')) return false;
  if (raw.antipattern_absence_status === 'unknown_absent' && raw.verified_count !== 0) return false;
  if (
    (raw.antipattern_absence_status === 'tested_absent' || raw.antipattern_absence_status === 'unknown_absent')
    && (typeof raw.coverage_reason !== 'string' || raw.coverage_reason.trim().length === 0)
  ) return false;
  return true;
};

const packetDerivedQuoteMatches = (quote: EvidenceQuote, sourceText: string): boolean => {
  const section = /<DERIVED_EVIDENCE count="\d+">\s*(\[[\s\S]*?\])\s*<\/DERIVED_EVIDENCE>/.exec(sourceText);
  if (!section || !quote.derived_evidence_id || !quote.source_id) return false;
  try {
    const facts = JSON.parse(section[1]) as Array<Pick<DerivedAnalyticalEvidence, 'evidence_id' | 'source_id' | 'summary_lines'>>;
    return facts.some(fact => fact.evidence_id === quote.derived_evidence_id && fact.source_id === quote.source_id
      && fact.summary_lines.some(line => normalizeEvidenceText(line) === normalizeEvidenceText(quote.quote)));
  } catch {
    return false;
  }
};

const renderedChunks = (sourceText: string) => Array.from(
  sourceText.matchAll(/<CHUNK id="([^"]+)" source_id="([^"]+)"[^>]*>([\s\S]*?)<\/CHUNK>/g),
  ([, chunkId, sourceId, text]) => ({ chunk_id: decodePacketXml(chunkId), source_id: decodePacketXml(sourceId), text: decodePacketXml(text) }),
);

export const packetCitationInspector = (packet: EvidenceLaneStagePacket) => {
  const manifest = new Map([...packet.evidence, ...packet.sanitized_visual_evidence].map(item => [item.chunk_id, item]));
  const chunks = new Map(renderedChunks(packet.text).filter(chunk => manifest.get(chunk.chunk_id)?.source_id === chunk.source_id)
    .map(chunk => [chunk.chunk_id, chunk]));
  const derived = new Map(packet.derived_evidence.map(item => [item.evidence_id, item]));
  return (quote: EvidenceQuote, stream: 'maturity' | 'antipattern', id: string) => {
    if (quote?.evidence_source === 'derived') {
      return isEvidenceQuoteBoundToDerivedEvidence(quote, derived.get(quote.derived_evidence_id || ''), stream, id)
        ? { quote } : { reason: 'UNAPPROVED_DERIVED_CITATION' as const };
    }
    const cited = chunks.get(quote?.chunk_id || '');
    if (!cited) return { reason: 'CHUNK_NOT_IN_PACKET' as const };
    if (cited.source_id !== quote.source_id) return { reason: 'SOURCE_MISMATCH' as const };
    if (typeof quote.quote !== 'string') return { reason: 'QUOTE_NOT_BOUND' as const };
    const citedLocator = manifest.get(cited.chunk_id)!;
    const wrongLocator = (['page_id', 'page_number', 'sheet_name', 'row_number'] as const)
      .some(field => quote[field] !== undefined && quote[field] !== citedLocator[field]);
    if (!wrongLocator && containsEvidenceSpan(cited.text, quote.quote)) return { quote };

    // Never change the source or cross the packet boundary. A normalized/approximate
    // match is not sufficient to move a citation to another chunk.
    const spans = [quote.quote, decodePacketXml(quote.quote)].filter(span => span.trim().length >= 4);
    const matches = [...chunks.values()].filter(chunk => chunk.source_id === cited.source_id
      && spans.some(span => chunk.text.includes(span)));
    if (matches.length !== 1) {
      return { reason: matches.length > 1 ? 'AMBIGUOUS_QUOTE' as const : 'QUOTE_NOT_BOUND' as const };
    }
    const locator = manifest.get(matches[0].chunk_id)!;
    return {
      repaired: true,
      quote: { ...quote, chunk_id: locator.chunk_id, page_id: locator.page_id, page_number: locator.page_number,
        sheet_name: locator.sheet_name, row_number: locator.row_number, evidence_class: locator.evidence_class },
    };
  };
};

export const verifyTextEvidenceSupport = (item: Partial<AuditItem> | undefined, sourceText: string): EvidenceCheckStatus => {
  if (item?.assessment_status === 'not_assessed') return 'weak';
  const quotes = Array.isArray(item?.evidence_quotes) ? item.evidence_quotes : [];
  const textQuotes = quotes.filter(q => q && q.evidence_source !== 'image' && typeof q.quote === 'string' && q.quote.trim().length > 0);
  if (!textQuotes.length) return quotes.some(q => q?.evidence_source === 'image') ? 'supported' : 'missing';

  const chunkText = new Map(renderedChunks(sourceText).map(chunk => [`${chunk.chunk_id}|${chunk.source_id}`, chunk.text]));
  const isPacket = chunkText.size > 0 || sourceText.includes('<EVIDENCE_LANE_STAGE_PACKET');
  let weakMatch = false;
  for (const quote of textQuotes) {
    if (isPacket && quote.evidence_source === 'derived') {
      if (packetDerivedQuoteMatches(quote, sourceText)) return 'supported';
      continue;
    }
    const source = isPacket ? chunkText.get(`${quote.chunk_id}|${quote.source_id}`) : sourceText;
    if (source === undefined) continue;
    if (containsEvidenceSpan(source, quote.quote)) return 'supported';

    const normalizedSource = normalizeEvidenceText(source);
    const meaningfulWords = normalizeEvidenceText(decodePacketXml(quote.quote)).split(/\W+/)
      .filter(word => word.length > 3).slice(0, 12);
    if (meaningfulWords.length >= 4) {
      const found = meaningfulWords.filter(word => normalizedSource.includes(word)).length;
      weakMatch ||= found / meaningfulWords.length >= 0.65;
    }
  }
  return weakMatch ? 'weak' : 'unsupported';
};
