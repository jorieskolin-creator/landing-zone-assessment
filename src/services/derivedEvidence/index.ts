import type { DerivedAnalyticalEvidence, SourceRecord, SourceRegistry } from '../../types';
import { analyzeStructuredSources } from '../structuredDataAnalysisService';
import { analyzeRetrievalCoverage, type CoverageLocationMap, type CoverageScope } from './coverageAnalyzer';

export const deriveAllEvidenceSignals = (
  sources: SourceRecord[],
  registry?: SourceRegistry,
  scope: CoverageScope = {},
): { evidence: DerivedAnalyticalEvidence[]; locations: CoverageLocationMap } => {
  const coverage = analyzeRetrievalCoverage(sources, registry, scope);
  const tableFacts = analyzeStructuredSources(sources, scope);
  return { evidence: [...coverage.evidence, ...tableFacts], locations: coverage.locations };
};
