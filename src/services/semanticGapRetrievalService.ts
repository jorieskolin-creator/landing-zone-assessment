import type { EvidenceCheckItem, RoutedSourcePacket, SemanticGapRetrievalPassTrace, SourceChunk, SourceRegistry } from '../types';
import { LANDING_ZONE_PACK } from '../domain-packs/loadLandingZonePack';
import { normalizeRetrievalText, retrievalExpectation } from '../domain-packs/landing-zone/coverage';
import { exclusivelyOutOfScopeProviders, expandDomainPacket, routingTermsForDomain } from './sourceRegistryService';

const MAX_SELECTIONS_PER_PASS = 8;
const MAX_TERMS_PER_PASS = 24;
const STOP_WORDS = new Set([
  'about','after','again','against','also','and','are','because','been','before','being','but','cannot','could','does','each','evidence','from','have','into','more','most','not','only','other','over','same','scanner','score','source','status','than','that','the','their','them','then','there','these','they','this','those','through','under','using','verifier','very','was','were','what','when','where','which','while','with','without','would',
  'että','joka','kanssa','kun','mutta','myös','ole','ovat','sen','sitä','tai','tämä'
]);

const normalize = (value: string): string =>
  normalizeRetrievalText(value.replace(/src-\d+(?:-[a-z]\d+)+/gi, ' '));

const meaningful = (token: string): boolean =>
  token.length >= 4 && !STOP_WORDS.has(token) && !/^\d+$/.test(token);

const semanticTerms = (items: EvidenceCheckItem[], seenTerms: Set<string>): string[] => {
  const weighted = [new Map<string, number>(), new Map<string, number>(), new Map<string, number>()];
  const aliases = new Map<string, number>();
  const add = (term: string, weight: number) => {
    const normalized = normalize(term);
    if (!normalized || seenTerms.has(normalized)) return;
    const tokens = normalized.split(' ');
    if (tokens.some(token => !meaningful(token))) return;
    const bucket = weighted[Math.min(tokens.length, 3) - 1];
    bucket.set(normalized, Math.max(bucket.get(normalized) || 0, weight));
  };
  const addContext = (value: string, baseWeight: number) => {
    const tokens = normalize(value).split(' ').filter(meaningful);
    for (const token of tokens) add(token, baseWeight);
    for (let size = 2; size <= 3; size++) {
      for (let index = 0; index <= tokens.length - size; index++) {
        add(tokens.slice(index, index + size).join(' '), baseWeight + size);
      }
    }
  };
  for (const item of items) {
    const criterionId = item.stream === 'antipattern' && !item.id.startsWith('AP-') ? `AP-${item.id}` : item.id;
    const criterion = LANDING_ZONE_PACK.criteria.find(candidate => candidate.id === criterionId);
    if (criterion) addContext([criterion.title, ...criterion.sub_criteria].join(' '), 1);
    addContext(`${item.rationale} ${item.coverage_reason || ''}`, 4);
    for (const term of retrievalExpectation(criterionId)?.groups.flat() || []) {
      const normalized = normalize(term);
      if (!seenTerms.has(normalized)) aliases.set(normalized, 8);
    }
  }
  const ranked = (terms: Map<string, number>, limit: number) => [...terms.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([term]) => term);
  const balanced = [
    ...ranked(aliases, 6),
    ...ranked(weighted[0], 8),
    ...ranked(weighted[1], 7),
    ...ranked(weighted[2], 3),
  ];
  if (balanced.length < MAX_TERMS_PER_PASS) {
    const selected = new Set(balanced);
    for (const term of weighted.flatMap(bucket => ranked(bucket, MAX_TERMS_PER_PASS))) {
      if (!selected.has(term)) balanced.push(term);
      if (balanced.length === MAX_TERMS_PER_PASS) break;
    }
  }
  return balanced.slice(0, MAX_TERMS_PER_PASS);
};

const matchScore = (chunk: SourceChunk, terms: string[]): number => {
  const text = normalize(chunk.text);
  return terms.reduce((score, term) => {
    if (text.includes(term)) return score + term.split(' ').length * 4;
    const tokens = term.split(' ');
    const matched = tokens.filter(token => text.includes(token)).length;
    return score + (matched === tokens.length ? matched : 0);
  }, 0);
};

const unselectedEligibleChunks = (registry: SourceRegistry, packet: RoutedSourcePacket): SourceChunk[] => {
  const selected = new Set(packet.manifest.map(item => item.chunk_id));
  return registry.chunks.filter(chunk =>
    !selected.has(chunk.chunk_id)
    && !exclusivelyOutOfScopeProviders(chunk.providers_detected, chunk.out_of_locked_scope_providers)
  );
};

export const hasSemanticRetrievalCandidates = (registry: SourceRegistry, packet: RoutedSourcePacket): boolean =>
  unselectedEligibleChunks(registry, packet).length > 0;

export const expandWeakEvidencePacket = (input: {
  registry: SourceRegistry;
  packet: RoutedSourcePacket;
  items: EvidenceCheckItem[];
  pass: 1 | 2;
  seenTerms: Set<string>;
  proposedTerms?: string[];
  gapAnalysisModel?: string;
  gapAnalysisFailed?: boolean;
}): {
  packet: RoutedSourcePacket;
  trace: Omit<SemanticGapRetrievalPassTrace, 'packet_hash_before' | 'packet_hash_after' | 'evidence_status_after' | 'verdict_change'>;
} => {
  const weakItems = input.items.filter(item => item.status === 'weak' && item.rescan_recommended === true);
  const domainTerms = routingTermsForDomain(input.packet.domain_id).map(normalize);
  if (input.seenTerms.size === 0) domainTerms.forEach(term => input.seenTerms.add(term));
  const seenTermsBefore = [...input.seenTerms].sort();
  const generatedTerms = (input.proposedTerms || []).map(normalize).filter(term =>
    term && !input.seenTerms.has(term) && term.split(' ').every(meaningful)
  );
  const proposedTerms = input.proposedTerms
    ? [...new Set(generatedTerms)].slice(0, MAX_TERMS_PER_PASS)
    : semanticTerms(weakItems, input.seenTerms);
  proposedTerms.forEach(term => input.seenTerms.add(term));
  const candidates = proposedTerms.length === 0 ? [] : unselectedEligibleChunks(input.registry, input.packet)
    .map(chunk => ({ chunk, score: matchScore(chunk, proposedTerms) }))
    .filter(candidate => candidate.score > 0)
    .sort((a, b) => b.score - a.score || a.chunk.chunk_id.localeCompare(b.chunk.chunk_id));
  const expanded = expandDomainPacket(
    input.registry,
    input.packet,
    candidates.slice(0, MAX_SELECTIONS_PER_PASS).map(candidate => candidate.chunk.chunk_id)
  );
  const stopReason = !hasSemanticRetrievalCandidates(input.registry, input.packet)
    ? 'NO_NEW_CANDIDATES' as const
    : proposedTerms.length === 0
    ? 'NO_NEW_TERMS' as const
    : candidates.length === 0
      ? 'NO_NEW_CANDIDATES' as const
      : expanded.selected_chunk_ids.length === 0
        ? 'PACKET_LIMIT_REACHED' as const
        : input.pass === 2
          ? 'MAX_PASSES_REACHED' as const
          : 'NEW_EVIDENCE_SELECTED' as const;
  return {
    packet: expanded.packet,
    trace: {
      domain_id: input.packet.domain_id,
      pass: input.pass,
      trigger_status: 'weak',
      criterion_ids: weakItems.map(item => `${item.stream}.${item.id}`).sort(),
      strategy: input.proposedTerms ? 'generative_semantic_expansion' : 'deterministic_semantic_fallback',
      gap_analysis_model: input.gapAnalysisModel,
      gap_analysis_failure: input.gapAnalysisFailed || undefined,
      seen_terms_before: seenTermsBefore,
      proposed_terms: proposedTerms,
      new_term_count: proposedTerms.length,
      matched_candidate_count: candidates.length,
      selected_chunk_ids: expanded.selected_chunk_ids,
      evidence_status_before: Object.fromEntries(weakItems.map(item => [`${item.stream}.${item.id}`, item.status])),
      stop_reason: stopReason
    }
  };
};
