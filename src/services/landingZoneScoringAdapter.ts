/**
 * Work 9: Landing Zone adapter around copied ADR-002 pair scoring.
 *
 * The kernel calculators stay unchanged. This module:
 * - applies evidence-class authority before scoring
 * - scores provider-scoped applicable instances only
 * - clamps confirmed anti-patterns so capability cannot conceal them
 * - maps Crawl/Walk/Run onto Foundation/Pilot/Rollout/Operate
 * - never publishes a blended multi-provider headline
 *
 * Work 7 A–H packet routing and Work 8 evidence-authority overlay run before
 * this adapter. Phase 1 maps remain keyed by criterion id. When more than
 * one provider is in Step 0 scope, estate logs are not copied onto each
 * provider — that would be blending.
 */
import scoringPolicy from '../domain-packs/landing-zone/scoring-policy.json';
import type { EvidenceClass, ProviderId } from '../domain-packs/assessment-domain-pack';
import type { ScoringSurface, ScoringSurfaceInstance } from '../scope/step0Scope';
import type {
  AuditItem,
  LzMaturityLabel,
  LzProviderScoringSlot,
  LzScoringResult,
  MaturityAggregate,
  MaturityPairRegistry,
  MaturityPairResult,
  Phase1AuditLogs,
  Phase2Validation,
  SourceRecord,
} from '../types';
import { calculateMetrics } from './metricsService';

const GAMMA = 0.5;
const SCHEMA_VERSION = 'lz_provider_scoring_v1' as const;
const PENDING_WORK: Array<'packet_routing_work_7' | 'forensic_evaluation_work_8'> = [];
const UNATTRIBUTED_REASON =
  'Estate Phase 1 logs are keyed by criterion id, not provider. Copying them onto every in-scope provider would publish a blended headline. Per-provider forensic packets are required before this slot can resolve.';

export interface LzScoringPolicy {
  version: string;
  model: string;
  provider_blending: 'forbidden';
  scoring_surface: 'provider_scoped_criterion_instance';
  maturity_labels: LzMaturityLabel[];
  exclude_from_denominator: string[];
  anti_pattern_clearance_requires_tested_absence: boolean;
  capability_cannot_conceal_confirmed_paired_antipattern: boolean;
}

export const LZ_SCORING_POLICY = scoringPolicy as LzScoringPolicy;

export interface LzScoringSource {
  source_id: string;
  lz_classification?: { evidence_class?: EvidenceClass };
}

export interface EvidenceClassDemotion {
  stream: 'maturity' | 'antipattern';
  criterion_id: string;
  reason: string;
}

export interface EvidenceClassPolicyResult {
  logs: Phase1AuditLogs;
  demotions: EvidenceClassDemotion[];
}

export interface ScoreLandingZoneInput {
  logs: Phase1AuditLogs;
  scoringSurface: Pick<ScoringSurface, 'providers' | 'design_area_ids' | 'instances' | 'denominator_instances'>;
  pairRegistry: MaturityPairRegistry;
  sources?: Array<LzScoringSource | SourceRecord>;
  evidencePacketReady?: boolean;
  policy?: LzScoringPolicy;
}

const roundedPercent = (value: number): number => Math.round(value * 1000) / 10;

const cloneItem = (item: AuditItem): AuditItem => ({
  ...item,
  evidence_quotes: Array.isArray(item.evidence_quotes) ? item.evidence_quotes.map((quote) => ({ ...quote })) : [],
  question_results: item.question_results ? [...item.question_results] : undefined,
  category_footprint: item.category_footprint ? { ...item.category_footprint } : undefined,
});

const cloneLogs = (logs: Phase1AuditLogs): Phase1AuditLogs => ({
  maturity: Object.fromEntries(Object.entries(logs.maturity || {}).map(([id, item]) => [id, cloneItem(item)])),
  antipattern: Object.fromEntries(Object.entries(logs.antipattern || {}).map(([id, item]) => [id, cloneItem(item)])),
});

export const classBySourceId = (
  sources: Array<LzScoringSource | SourceRecord> | undefined,
): Map<string, EvidenceClass> => {
  const map = new Map<string, EvidenceClass>();
  for (const source of sources || []) {
    if (!source?.source_id) continue;
    map.set(source.source_id, source.lz_classification?.evidence_class || 'document');
  }
  return map;
};

const quoteClass = (
  quote: AuditItem['evidence_quotes'][number] | undefined,
  classes: Map<string, EvidenceClass>,
): EvidenceClass | null => {
  if (!quote || typeof quote.source_id !== 'string' || quote.source_id.length === 0) return null;
  return classes.get(quote.source_id) || 'document';
};

export const itemHasPlatformEvidence = (
  item: AuditItem | undefined,
  classes: Map<string, EvidenceClass>,
): boolean => {
  if (!item || !Array.isArray(item.evidence_quotes)) return false;
  return item.evidence_quotes.some((quote) => quoteClass(quote, classes) === 'platform');
};

const unknownCapability = (reason: string, original?: AuditItem): AuditItem => ({
  count: 0,
  status: 'NOK',
  evidence: original?.evidence || 'Not resolved under Landing Zone evidence-class policy.',
  evidence_quotes: original?.evidence_quotes ? [...original.evidence_quotes] : [],
  assessment_status: 'not_assessed',
  question_results: ['unknown', 'unknown', 'unknown'],
  reasoning: reason,
  is_silent: true,
  evidence_check_status: 'missing',
  original_count: original?.original_count ?? original?.count,
  coverage_reason: 'evidence_class_policy',
  adjustment_reason: reason,
});

const unknownAntipattern = (reason: string, original?: AuditItem): AuditItem => ({
  count: 0,
  status: 'OK',
  evidence: original?.evidence || 'Not resolved under Landing Zone evidence-class policy.',
  evidence_quotes: original?.evidence_quotes ? [...original.evidence_quotes] : [],
  assessment_status: 'not_assessed',
  question_results: ['unknown', 'unknown', 'unknown'],
  reasoning: reason,
  is_silent: true,
  evidence_check_status: 'missing',
  original_count: original?.original_count ?? original?.count,
  antipattern_absence_status: 'unknown_absent',
  coverage_reason: 'evidence_class_policy',
  adjustment_reason: reason,
});

const capabilityWouldResolve = (item: AuditItem): boolean =>
  item.assessment_status === 'assessed'
  && item.evidence_check_status !== 'unsupported'
  && item.evidence_check_status !== 'missing'
  && Array.isArray(item.evidence_quotes)
  && item.evidence_quotes.length > 0;

const antipatternWouldResolve = (item: AuditItem): boolean => {
  const status = item.antipattern_absence_status;
  if (status === 'tested_absent' || status === 'confirmed_present' || status === 'partially_present') return true;
  return capabilityWouldResolve(item);
};

/**
 * Class 1 may resolve current-state capability, confirmed anti-patterns, and
 * tested absence. Class 2/3 and quotes without source_id cannot. Unclassified
 * sources are Class 2 (Work 5). Demote before ADR-002 so unknown stays unknown.
 */
export const applyEvidenceClassPolicy = (
  logs: Phase1AuditLogs,
  classes: Map<string, EvidenceClass>,
): EvidenceClassPolicyResult => {
  const next = cloneLogs(logs);
  const demotions: EvidenceClassDemotion[] = [];
  const capabilityReason =
    'LZ evidence-class policy: Class 2/3 material cannot resolve current-state capability.';
  const antipatternReason =
    'LZ evidence-class policy: tested absence and anti-pattern findings require Class 1 platform evidence.';

  for (const [id, item] of Object.entries(next.maturity)) {
    if (item.coverage_reason === 'step0_out_of_scope') continue;
    if (!capabilityWouldResolve(item)) continue;
    if (itemHasPlatformEvidence(item, classes)) continue;
    next.maturity[id] = unknownCapability(capabilityReason, item);
    demotions.push({ stream: 'maturity', criterion_id: id, reason: capabilityReason });
  }
  for (const [id, item] of Object.entries(next.antipattern)) {
    if (item.coverage_reason === 'step0_out_of_scope') continue;
    if (!antipatternWouldResolve(item)) continue;
    if (itemHasPlatformEvidence(item, classes)) continue;
    next.antipattern[id] = unknownAntipattern(antipatternReason, item);
    demotions.push({ stream: 'antipattern', criterion_id: id, reason: antipatternReason });
  }
  return { logs: next, demotions };
};

export const mapLzMaturityLabel = (band: Phase2Validation['crawl_walk_run']): LzMaturityLabel => {
  if (band === 'Insufficient evidence') return 'Insufficient evidence';
  if (band === 'Crawl') return 'Foundation';
  if (band === 'Walk') return 'Pilot';
  if (band === 'Walk with significant friction') return 'Rollout';
  return 'Operate';
};

const bandFromAdjusted = (
  sufficiencyDecision: Phase2Validation['assessment_sufficiency']['decision'],
  adjusted: number | null,
): Phase2Validation['crawl_walk_run'] => {
  if (sufficiencyDecision === 'BLOCK' || adjusted === null) return 'Insufficient evidence';
  if (adjusted < 33) return 'Crawl';
  if (adjusted < 66) return 'Walk';
  return 'Run';
};

const aggregatePairs = (pairs: MaturityPairResult[]): MaturityAggregate => {
  const configuredWeight = pairs.reduce((sum, pair) => sum + pair.weight, 0);
  const corroboratedPairs = pairs.filter((pair) => pair.corroborated_pair_value !== null);
  const corroboratedWeight = corroboratedPairs.reduce((sum, pair) => sum + pair.weight, 0);
  const observedWeight = pairs.reduce((sum, pair) => sum + pair.weight * pair.resolution_credit, 0);
  const corroborated = corroboratedWeight > 0
    ? corroboratedPairs.reduce((sum, pair) => sum + pair.weight * pair.corroborated_pair_value!, 0) / corroboratedWeight
    : null;
  const observed = observedWeight > 0
    ? pairs.reduce((sum, pair) => sum + pair.weight * pair.resolution_credit * (pair.observed_pair_value ?? 0), 0) / observedWeight
    : null;
  const resolution = configuredWeight > 0 ? observedWeight / configuredWeight : 0;
  return {
    corroborated_maturity: corroborated === null ? null : roundedPercent(corroborated),
    observed_maturity: observed === null ? null : roundedPercent(observed),
    resolution: roundedPercent(resolution),
    adjusted_maturity: observed === null ? null : roundedPercent(observed * Math.pow(resolution, GAMMA)),
    fully_resolved_pair_count: pairs.filter((pair) => pair.state === 'BOTH_RESOLVED').length,
    partially_resolved_pair_count: pairs.filter((pair) => pair.state === 'CAPABILITY_ONLY' || pair.state === 'ANTIPATTERN_ONLY').length,
    unresolved_pair_count: pairs.filter((pair) => pair.state === 'UNRESOLVED').length,
    contradiction_count: pairs.filter((pair) => pair.contradiction_status === 'DETECTED').length,
  };
};

const withLabel = (phase2: Phase2Validation, label: LzMaturityLabel): Phase2Validation => ({
  ...phase2,
  lz_maturity_label: label,
});

/**
 * Keep capability evidence visible. Zero the pair value when a confirmed
 * paired anti-pattern is present so capability cannot dominate, including
 * when interaction_strength is less than 1.
 */
export const concealConfirmedAntipatterns = (
  phase2: Phase2Validation,
  policy: LzScoringPolicy = LZ_SCORING_POLICY,
): { phase2: Phase2Validation; concealed_count: number } => {
  if (!policy.capability_cannot_conceal_confirmed_paired_antipattern) {
    return { phase2, concealed_count: 0 };
  }
  let concealed_count = 0;
  const pair_results = phase2.resolution_maturity.pair_results.map((pair) => {
    if (pair.antipattern_health !== 0 || pair.capability_value === null) return pair;
    const observed = pair.observed_pair_value ?? 0;
    const corroborated = pair.corroborated_pair_value;
    if (observed <= 0 && (corroborated === null || corroborated <= 0)) return pair;
    concealed_count += 1;
    const contradiction_status: MaturityPairResult['contradiction_status'] =
      pair.contradiction_status === 'NOT_EVALUABLE' ? 'NOT_EVALUABLE' : 'DETECTED';
    return {
      ...pair,
      observed_pair_value: 0,
      corroborated_pair_value: corroborated === null ? null : 0,
      contradiction_status,
    };
  });
  if (concealed_count === 0) return { phase2, concealed_count: 0 };
  const overall = aggregatePairs(pair_results);
  const domainIds = [...new Set(pair_results.map((pair) => pair.domain_id))];
  const domains = domainIds.sort().map((domainId) => ({
    domain_id: domainId,
    ...aggregatePairs(pair_results.filter((pair) => pair.domain_id === domainId)),
  }));
  const crawl_walk_run = bandFromAdjusted(phase2.assessment_sufficiency.decision, overall.adjusted_maturity);
  return {
    concealed_count,
    phase2: {
      ...phase2,
      crawl_walk_run,
      lz_maturity_label: mapLzMaturityLabel(crawl_walk_run),
      resolution_maturity: {
        ...phase2.resolution_maturity,
        pair_results,
        overall,
        domains,
      },
      metrics: {
        ...phase2.metrics,
        corroborated_maturity: overall.corroborated_maturity,
        observed_maturity: overall.observed_maturity,
        assessment_resolution: overall.resolution,
        adjusted_maturity: overall.adjusted_maturity,
        raw_finops_maturity_score: overall.adjusted_maturity ?? 0,
        finops_readiness: overall.adjusted_maturity ?? 0,
      },
    },
  };
};

const instancesFor = (
  surface: ScoreLandingZoneInput['scoringSurface'],
  provider: ProviderId,
): ScoringSurfaceInstance[] => surface.instances.filter((item) => item.provider === provider);

const denominatorFor = (
  surface: ScoreLandingZoneInput['scoringSurface'],
  provider: ProviderId,
): ScoringSurfaceInstance[] => {
  const denom = (surface.denominator_instances || surface.instances.filter((item) => item.applicability === 'applicable'))
    .filter((item) => item.provider === provider);
  return denom;
};

const registryForProvider = (
  registry: MaturityPairRegistry,
  denom: ScoringSurfaceInstance[],
): MaturityPairRegistry => {
  const capabilityIds = new Set(denom.filter((item) => item.stream === 'capability').map((item) => item.criterion_id));
  const antipatternIds = new Set(denom.filter((item) => item.stream === 'antipattern').map((item) => item.criterion_id));
  return {
    ...registry,
    pairs: registry.pairs.filter((pair) =>
      capabilityIds.has(pair.capability_id) && antipatternIds.has(pair.antipattern_id),
    ),
  };
};

const unattributedItem = (reason: string): AuditItem => ({
  count: 0,
  status: 'NOK',
  evidence: reason,
  evidence_quotes: [],
  assessment_status: 'not_assessed',
  question_results: ['unknown', 'unknown', 'unknown'],
  reasoning: reason,
  is_silent: true,
  evidence_check_status: 'missing',
  coverage_reason: 'unattributed_pending_provider_forensic',
});

const logsForIds = (
  source: Phase1AuditLogs,
  capabilityIds: string[],
  antipatternIds: string[],
  fillUnattributed: boolean,
): Phase1AuditLogs => {
  const maturity: Phase1AuditLogs['maturity'] = {};
  const antipattern: Phase1AuditLogs['antipattern'] = {};
  for (const id of capabilityIds) {
    const item = source.maturity[id];
    if (fillUnattributed) {
      maturity[id] = unattributedItem(UNATTRIBUTED_REASON);
    } else if (item && item.coverage_reason !== 'step0_out_of_scope') {
      maturity[id] = cloneItem(item);
    } else {
      maturity[id] = unknownCapability('No assessed evidence for this applicable instance.');
    }
  }
  for (const id of antipatternIds) {
    const item = source.antipattern[id];
    if (fillUnattributed) {
      antipattern[id] = {
        ...unattributedItem(UNATTRIBUTED_REASON),
        status: 'OK',
        antipattern_absence_status: 'unknown_absent',
      };
    } else if (item && item.coverage_reason !== 'step0_out_of_scope') {
      antipattern[id] = cloneItem(item);
    } else {
      antipattern[id] = unknownAntipattern('No assessed evidence for this applicable instance.');
    }
  }
  return { maturity, antipattern };
};

const scoreLogs = (
  logs: Phase1AuditLogs,
  registry: MaturityPairRegistry,
  designAreaIds: string[],
  evidencePacketReady: boolean,
  policy: LzScoringPolicy,
): { phase2: Phase2Validation; concealed_count: number } => {
  const capabilityTotal = new Set(registry.pairs.map((pair) => pair.capability_id)).size;
  const antipatternTotal = new Set(registry.pairs.map((pair) => pair.antipattern_id)).size;
  const raw = calculateMetrics(logs, {
    evidencePacketReady,
    maturityCriterionTotal: Math.max(capabilityTotal, 1),
    antipatternCriterionTotal: Math.max(antipatternTotal, 1),
    pairRegistry: registry,
    designAreaIds,
  });
  const concealed = concealConfirmedAntipatterns(raw, policy);
  const label = mapLzMaturityLabel(concealed.phase2.crawl_walk_run);
  return {
    concealed_count: concealed.concealed_count,
    phase2: withLabel(concealed.phase2, label),
  };
};

const withholdBlendedHeadline = (estate: Phase2Validation): Phase2Validation => ({
  ...estate,
  crawl_walk_run: 'Insufficient evidence',
  lz_maturity_label: 'Insufficient evidence',
  metrics: {
    ...estate.metrics,
    adjusted_maturity: null,
    corroborated_maturity: null,
    observed_maturity: null,
    raw_finops_maturity_score: 0,
    finops_readiness: 0,
  },
});

export const scoreLandingZoneAssessment = (input: ScoreLandingZoneInput): LzScoringResult => {
  const policy = input.policy || LZ_SCORING_POLICY;
  const classes = classBySourceId(input.sources);
  const classFiltered = applyEvidenceClassPolicy(input.logs, classes);
  const providers = input.scoringSurface.providers;
  const designAreaIds = input.scoringSurface.design_area_ids;
  const evidencePacketReady = input.evidencePacketReady !== false;
  const estateRegistry: MaturityPairRegistry = {
    ...input.pairRegistry,
    pairs: input.pairRegistry.pairs.filter((pair) => designAreaIds.includes(pair.domain_id)),
  };
  const estateScored = scoreLogs(classFiltered.logs, estateRegistry, designAreaIds, evidencePacketReady, policy);
  const singleProvider = providers.length === 1;

  const provider_results: LzProviderScoringSlot[] = providers.map((provider) => {
    const instances = instancesFor(input.scoringSurface, provider);
    const denom = denominatorFor(input.scoringSurface, provider);
    const excluded_not_applicable_count = instances.filter((item) => item.applicability === 'not_applicable').length;
    const excluded_out_of_scope_count = instances.filter((item) => item.applicability === 'out_of_scope').length;
    const providerRegistry = registryForProvider(input.pairRegistry, denom);
    const capabilityIds = [...new Set(denom.filter((item) => item.stream === 'capability').map((item) => item.criterion_id))];
    const antipatternIds = [...new Set(denom.filter((item) => item.stream === 'antipattern').map((item) => item.criterion_id))];
    const areaIds = [...new Set(denom.map((item) => item.design_area_id))];
    const attributed = singleProvider;
    const providerLogs = logsForIds(classFiltered.logs, capabilityIds, antipatternIds, !attributed);
    const scored = scoreLogs(
      providerLogs,
      providerRegistry.pairs.length > 0 ? providerRegistry : { ...providerRegistry, pairs: [] },
      areaIds.length > 0 ? areaIds : designAreaIds,
      evidencePacketReady,
      policy,
    );
    const slotPhase2 = attributed
      ? scored.phase2
      : withLabel({
        ...scored.phase2,
        crawl_walk_run: 'Insufficient evidence',
        metrics: {
          ...scored.phase2.metrics,
          adjusted_maturity: null,
          corroborated_maturity: null,
          observed_maturity: null,
          raw_finops_maturity_score: 0,
          finops_readiness: 0,
        },
      }, 'Insufficient evidence');
    return {
      provider,
      attribution: attributed ? 'estate_logs_single_provider' : 'unattributed_pending_provider_forensic',
      lz_maturity_label: slotPhase2.lz_maturity_label || mapLzMaturityLabel(slotPhase2.crawl_walk_run),
      crawl_walk_run: slotPhase2.crawl_walk_run,
      blended: false,
      denominator_instance_count: denom.length,
      excluded_not_applicable_count,
      excluded_out_of_scope_count,
      evidence_class_demotions: attributed ? classFiltered.demotions.length : 0,
      concealed_confirmed_antipattern_pairs: attributed ? scored.concealed_count : 0,
      phase_2: slotPhase2,
      ...(attributed ? {} : { publication_blocked_reason: UNATTRIBUTED_REASON }),
    };
  });

  const published_phase2 = singleProvider && provider_results[0]
    ? provider_results[0].phase_2
    : withholdBlendedHeadline(estateScored.phase2);

  return {
    schema_version: SCHEMA_VERSION,
    policy_version: policy.version,
    scoring_surface: 'provider_scoped_criterion_instance',
    provider_blending: 'forbidden',
    blended_headline_published: false,
    headline_maturity_label: published_phase2.lz_maturity_label || mapLzMaturityLabel(published_phase2.crawl_walk_run),
    headline_provider: singleProvider ? providers[0] : null,
    provider_results,
    evidence_class_demotions: classFiltered.demotions.length,
    estate_phase2: withLabel(estateScored.phase2, mapLzMaturityLabel(estateScored.phase2.crawl_walk_run)),
    published_phase2,
    pending_work: [...PENDING_WORK],
  };
};
