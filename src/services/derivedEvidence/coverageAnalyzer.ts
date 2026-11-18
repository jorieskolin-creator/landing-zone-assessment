import type { DerivedAnalyticalEvidence, SourceChunk, SourceRecord, SourceRegistry } from '../../types';
import type { ProviderId } from '../../domain-packs/assessment-domain-pack';
import { LANDING_ZONE_PACK } from '../../domain-packs/loadLandingZonePack';
import { normalizeRetrievalText, retrievalExpectation } from '../../domain-packs/landing-zone/coverage';
import { exclusivelyOutOfScopeProviders } from '../sourceRegistryService';
import { hashString } from '../runTraceService';

export const LZ_RETRIEVAL_COVERAGE_ANALYZER_ID = 'lz_retrieval_coverage_v1' as const;
export const LZ_EVIDENCE_REGISTRY_VERSION = 'lz_evidence_analysis_registry_v1' as const;

export interface CoverageScope {
  designAreaIds?: readonly string[];
  providers?: readonly ProviderId[];
}

const coverageBand = (percentValue: number): NonNullable<DerivedAnalyticalEvidence['result']['coverage']>['coverage_band'] => {
  if (percentValue < 25) return '0_25';
  if (percentValue < 50) return '25_50';
  if (percentValue < 75) return '50_75';
  if (percentValue < 90) return '75_90';
  return '90_100';
};

export interface CoverageLocationMap {
  [criterionId: string]: Record<string, string[]>;
}

export const analyzeRetrievalCoverage = (
  sources: SourceRecord[],
  registry?: SourceRegistry,
  scope: CoverageScope = {}
): { evidence: DerivedAnalyticalEvidence[]; locations: CoverageLocationMap } => {

  if (!sources.length) return { evidence: [], locations: {} };
  const chunks = (registry?.chunks || []).filter(chunk =>
    !exclusivelyOutOfScopeProviders(chunk.providers_detected, chunk.out_of_locked_scope_providers)
    && (!scope.providers?.length || !chunk.providers_detected?.length
      || chunk.providers_detected.some(provider => scope.providers?.some(locked => locked === provider)))
  );
  const normalizedChunks = chunks.map(chunk => ({ chunk, text: ` ${normalizeRetrievalText(chunk.text)} ` }));
  const locations: CoverageLocationMap = {};
  const criteria = LANDING_ZONE_PACK.criteria.filter(criterion =>
    criterion.stream === 'capability'
    && (!scope.designAreaIds || scope.designAreaIds.includes(criterion.design_area_id))
    && (!scope.providers?.length || LANDING_ZONE_PACK.providers.records.some(mapping =>
      mapping.id === criterion.id && scope.providers?.some(provider => mapping.providers[provider].applicability === 'applicable')))
  );
  const evidence = criteria.map(criterion => {
    const expectation = retrievalExpectation(criterion.id);
    const itemChunks: Record<string, string[]> = {};
    const missing: string[] = [];
    const eligible = normalizedChunks.filter(({ chunk }) =>
      expectation?.kinds.some(kind => kind === chunk.lz_source_kind)
    );
    for (const [index, group] of (expectation?.groups || []).entries()) {
      const id = `${criterion.id}:${index}`;
      const terms = group.map(term => ` ${normalizeRetrievalText(term)} `);
      const hits = eligible.filter(({ text }) => terms.some(term => text.includes(term)));
      if (hits.length) itemChunks[id] = hits.map(({ chunk }) => chunk.chunk_id).sort();
      else missing.push(id);
    }
    locations[criterion.id] = itemChunks;
    const expected = expectation?.groups.length || 0;
    const foundCount = Object.keys(itemChunks).length;
    const criticalCoverage = foundCount === 0 ? 'MISSING' as const
      : missing.length === 0 ? 'COMPLETE' as const : 'PARTIAL' as const;
    const coverage = {
      expected,
      found: foundCount,
      not_found: missing.length,
      unusable: expectation ? 0 : 1,
      coverage_band: coverageBand(expected ? foundCount / expected * 100 : 0),
      critical_coverage: criticalCoverage,
      missing_items: missing,
    };
    const signature = hashString(JSON.stringify([LZ_RETRIEVAL_COVERAGE_ANALYZER_ID, criterion.id, scope.providers, itemChunks, missing])).replace(/^fnv1a_/, '');
    const summary = expectation
      ? `${criterion.id} ${criterion.title}: ${foundCount}/${expected} retrieval expectations matched. A match is a retrieval lead only.`
      : `${criterion.id} ${criterion.title}: no deterministic retrieval expectations are registered.`;
    const rowCount = eligible.length;
    const object: DerivedAnalyticalEvidence = {
      schema_version: 'derived_analytical_evidence_v1',
      mode: 'shadow',
      evidence_id: `EVID-DER-${signature}`,
      evidence_type: 'deterministic_analytical',
      source_id: eligible[0]?.chunk.source_id || sources[0].source_id,
      targets: [{ stream: 'maturity', criterion_id: criterion.id }],
      derivation: {
        analyzer_id: LZ_RETRIEVAL_COVERAGE_ANALYZER_ID,
        analyzer_version: '1.0.0',
        registry_version: LZ_EVIDENCE_REGISTRY_VERSION,
        method: 'lz_retrieval_coverage',
        calculation_ids: ['expected_vs_found', 'coverage_band', 'critical_coverage'],
      },
      result: {
        status: 'OBSERVED',
        source_row_count: rowCount,
        withheld_source_row_count: 0,
        withheld_source_column_count: 0,
        analyzed_row_count: rowCount,
        eligible_row_count: rowCount,
        excluded_total_row_count: 0,
        row_scope: 'acquired_corpus',
        row_truncated: false,
        detected_signal_count: foundCount,
        mapping_population_coverage: null,
        tagging_population_coverage: null,
        allocation_population_coverage: null,
        field_coverage: [],
        cost_basis: { state: 'NOT_PRESENT', column_index: null, source_column_number: null, currencies: [], excluded_row_count: 0 },
        reconciliation: { state: 'NOT_AVAILABLE' },
        coverage,
      },
      summary_lines: [summary],
      locator: {},
      eligibility: { state: 'SHADOW_ONLY', reasons: [] },
      unit_fingerprint: signature,
      report_eligible: true,
      raw_value_exposure: false,
      quality: {
        population_coverage: 'LOW',
        confidence: 'LOW',
        limitation: summary,
      },
      llm_policy: {
        may_use_as_evidence: false,
        may_recalculate: false,
        may_infer_exact_values: false,
        causal_authority: 'NONE',
      },
    };
    return object;
  });

  return { evidence, locations };
};
