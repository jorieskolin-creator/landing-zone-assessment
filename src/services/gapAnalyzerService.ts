import type { DerivedAnalyticalEvidence, GapRetrievalPlan, RoutedSourcePacket } from '../types';
import type { CoverageLocationMap } from './derivedEvidence/coverageAnalyzer';
import { termsForCoverageItem } from '../domain-packs/landing-zone/coverage';
import { LZ_RETRIEVAL_COVERAGE_ANALYZER_ID } from './derivedEvidence/coverageAnalyzer';
import { routingTermsForDomain } from './sourceRegistryService';

const LOW_BANDS = new Set(['0_25', '25_50']);

export const planGapRetrieval = (input: {
  packets: Record<string, RoutedSourcePacket>;
  derived: DerivedAnalyticalEvidence[];
  locations?: CoverageLocationMap;
}): GapRetrievalPlan => {
  const termsByDomain: Record<string, string[]> = {};
  const chunkIdsByDomain: Record<string, string[]> = {};
  const reasons: GapRetrievalPlan['reasons'] = [];
  const trigger = new Set<string>();

  for (const [domainId, packet] of Object.entries(input.packets)) {
    const domainDerived = input.derived.filter(item =>
      item.targets.some(target => target.criterion_id.startsWith(domainId))
    );
    const coverageDerived = domainDerived.filter(item => item.derivation.analyzer_id === LZ_RETRIEVAL_COVERAGE_ANALYZER_ID);
    const selected = new Set(packet.manifest.map(item => item.chunk_id));
    const terms = new Set<string>();
    const chunks = new Set<string>();

    for (const evidence of coverageDerived) {
      const coverage = evidence.result.coverage;
      if (!coverage) continue;
      const criterionId = evidence.targets[0]?.criterion_id;
      if (LOW_BANDS.has(coverage.coverage_band) || coverage.critical_coverage !== 'COMPLETE') {
        coverage.missing_items.forEach(itemId => termsForCoverageItem(itemId).forEach(term => terms.add(term)));
        trigger.add(domainId);
        reasons.push({
          domain_id: domainId,
          reason: `${criterionId || domainId} coverage_band=${coverage.coverage_band} critical=${coverage.critical_coverage}`,
        });
      }
      if (criterionId && input.locations?.[criterionId]) {
        for (const chunkIds of Object.values(input.locations[criterionId])) {
          chunkIds.filter(id => !selected.has(id)).forEach(id => chunks.add(id));
        }
      }
    }

    if (packet.weak_coverage) {
      routingTermsForDomain(domainId).forEach(term => terms.add(term));
      trigger.add(domainId);
      reasons.push({ domain_id: domainId, reason: 'packet weak_coverage' });
    }
    if (domainDerived.some(item => item.result.status === 'NO_STATISTICALLY_USABLE_POPULATION')) {
      trigger.add(domainId);
      reasons.push({ domain_id: domainId, reason: 'NO_STATISTICALLY_USABLE_POPULATION' });
    }
    if (chunks.size > 0) {
      trigger.add(domainId);
      reasons.push({ domain_id: domainId, reason: `unrouted supporting chunks=${chunks.size}` });
    }

    if (terms.size) termsByDomain[domainId] = [...terms].sort();
    if (chunks.size) chunkIdsByDomain[domainId] = [...chunks].sort();
  }

  return {
    schema_version: 'gap_retrieval_plan_v1',
    generative: false,
    trigger_domains: [...trigger].sort(),
    terms_by_domain: termsByDomain,
    chunk_ids_by_domain: chunkIdsByDomain,
    reasons: reasons.sort((a, b) => a.domain_id.localeCompare(b.domain_id) || a.reason.localeCompare(b.reason)),
  };
};
