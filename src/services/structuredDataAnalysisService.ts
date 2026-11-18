import type { DataSignalCoverageReport, DerivedAnalyticalEvidence, SourceRecord, StructuredTableData } from '../types';
import { LANDING_ZONE_PACK } from '../domain-packs/loadLandingZonePack';
import { normalizeRetrievalText } from '../domain-packs/landing-zone/coverage';
import { LZ_EVIDENCE_REGISTRY_VERSION, LZ_RETRIEVAL_COVERAGE_ANALYZER_ID, type CoverageScope } from './derivedEvidence/coverageAnalyzer';
import { hashString } from './runTraceService';

export const DATA_SIGNAL_REGISTRY_VERSION = 'lz_data_signal_registry_v1' as const;
export const MANAGEMENT_GROUP_ANALYZER_ID = 'lz_azure_management_group_membership_v1' as const;
const VERSION = '1.0.0';
const TARGET = { stream: 'maturity', criterion_id: 'C1' } as const;
const CALCULATION = 'explicit_subscription_parent_membership';
const TABLE_KINDS = new Set(['csv', 'tsv', 'xlsx']);
const SENTENCE = 'The Azure inventory lists a management group parent for every subscription in the export.';
const GROUP_ID = /^\/providers\/Microsoft\.Management\/managementGroups\/[a-z0-9_.()-]+$/i;
const SUBSCRIPTION_ID = /^(?:\/subscriptions\/)?[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;

export const isDerivedEvidenceAcquisitionDiagnostic = (evidence: DerivedAnalyticalEvidence): boolean =>
  evidence.derivation.analyzer_id === LZ_RETRIEVAL_COVERAGE_ANALYZER_ID;

export const isDerivedEvidenceApprovedForPacket = (evidence: DerivedAnalyticalEvidence): boolean =>
  evidence.schema_version === 'derived_analytical_evidence_v1'
  && evidence.derivation.analyzer_id === MANAGEMENT_GROUP_ANALYZER_ID
  && evidence.derivation.analyzer_version === VERSION
  && evidence.derivation.registry_version === LZ_EVIDENCE_REGISTRY_VERSION
  && evidence.derivation.method === 'lz_management_group_membership'
  && evidence.derivation.calculation_ids.length === 1
  && evidence.derivation.calculation_ids[0] === CALCULATION
  && evidence.mode === 'authoritative'
  && evidence.report_eligible
  && evidence.raw_value_exposure === false
  && evidence.result.status === 'OBSERVED'
  && evidence.result.row_scope === 'full_table'
  && !evidence.result.row_truncated
  && evidence.result.withheld_source_row_count === 0
  && evidence.result.withheld_source_column_count === 0
  && evidence.eligibility.state === 'ELIGIBLE'
  && evidence.eligibility.reasons.length === 0
  && evidence.summary_lines.length === 1
  && evidence.summary_lines[0] === SENTENCE
  && evidence.targets.length === 1
  && evidence.targets[0].stream === TARGET.stream
  && evidence.targets[0].criterion_id === TARGET.criterion_id
  && /^[a-f0-9]{8}$/.test(evidence.unit_fingerprint);

export const buildDataSignalCoverageReport = (scope: CoverageScope = {}): DataSignalCoverageReport => {
  const objects = LANDING_ZONE_PACK.criteria.filter(criterion =>
    !scope.designAreaIds || scope.designAreaIds.includes(criterion.design_area_id)
  ).map(criterion => {
    const enabled = criterion.id === TARGET.criterion_id && (!scope.providers || scope.providers.includes('azure'));
    return {
      domain_id: criterion.design_area_id,
      stream: criterion.stream === 'capability' ? 'maturity' as const : 'antipattern' as const,
      criterion_id: criterion.id,
      status: enabled ? 'AUTHORITATIVE_ANALYZER_AVAILABLE' as const : 'NO_AUTHORITATIVE_ANALYZER_SEMANTICS' as const,
      analyzer_ids: enabled ? [MANAGEMENT_GROUP_ANALYZER_ID] : [],
    };
  });
  const available = objects.filter(object => object.analyzer_ids.length > 0).length;
  return {
    schema_version: 'data_signal_coverage_v1',
    registry_version: DATA_SIGNAL_REGISTRY_VERSION,
    mode: 'active',
    total_object_count: objects.length,
    analyzer_available_count: available,
    unsupported_count: objects.length - available,
    objects,
  };
};

const membershipFact = (source: SourceRecord, table: StructuredTableData): DerivedAnalyticalEvidence | undefined => {
  const rows = table.analysis_rows || table.rows;
  if (table.model_eligible === false || (table.sheet_visibility && table.sheet_visibility !== 'visible')
    || table.hidden_row_count || table.hidden_column_count || table.active_filter_range || table.merged_range_count
    || table.formula_cell_count || table.unsupported_objects?.length
    || table.analysis_complete === false || (table.truncated && table.analysis_complete !== true)
    || rows.length === 0 || rows.length !== table.total_row_count
    || (table.source_total_row_count !== undefined && rows.length !== table.source_total_row_count)) return;
  const columns = table.headers.map(normalizeRetrievalText);
  const subscription = columns.indexOf('subscription id');
  const parent = columns.indexOf('parent management group id');
  if (subscription < 0 || parent < 0 || subscription !== columns.lastIndexOf('subscription id')
    || parent !== columns.lastIndexOf('parent management group id')) return;

  const subscriptions = new Set<string>();
  for (const row of rows) {
    const id = row[subscription]?.trim().toLowerCase().replace(/^\/subscriptions\//, '');
    if (!id || !SUBSCRIPTION_ID.test(id) || !GROUP_ID.test(row[parent]?.trim() || '') || subscriptions.has(id)) return;
    subscriptions.add(id);
  }
  const fingerprint = hashString(JSON.stringify([source.source_id, table.sheet_name, table.source_range, MANAGEMENT_GROUP_ANALYZER_ID, rows])).replace(/^fnv1a_/, '');
  return {
    schema_version: 'derived_analytical_evidence_v1',
    mode: 'authoritative',
    evidence_id: `EVID-DER-${fingerprint}`,
    evidence_type: 'deterministic_analytical',
    source_id: source.source_id,
    targets: [TARGET],
    derivation: {
      analyzer_id: MANAGEMENT_GROUP_ANALYZER_ID,
      analyzer_version: VERSION,
      registry_version: LZ_EVIDENCE_REGISTRY_VERSION,
      method: 'lz_management_group_membership',
      calculation_ids: [CALCULATION],
    },
    result: {
      status: 'OBSERVED', source_row_count: rows.length, analyzed_row_count: rows.length, eligible_row_count: rows.length,
      withheld_source_row_count: 0, withheld_source_column_count: 0, excluded_total_row_count: 0,
      row_scope: 'full_table', row_truncated: false, detected_signal_count: 1, field_coverage: [],
      mapping_population_coverage: null, tagging_population_coverage: null, allocation_population_coverage: null,
      cost_basis: { state: 'NOT_PRESENT', column_index: null, source_column_number: null, currencies: [], excluded_row_count: 0 },
      reconciliation: { state: 'NOT_AVAILABLE' },
    },
    summary_lines: [SENTENCE],
    locator: { sheet: table.sheet_name, range: table.source_range, header_row: table.header_row_number },
    eligibility: { state: 'ELIGIBLE', reasons: [] },
    unit_fingerprint: fingerprint,
    report_eligible: true,
    raw_value_exposure: false,
    quality: { population_coverage: 'HIGH', confidence: 'HIGH', limitation: 'Limited to this Azure export. The export alone cannot establish inventory completeness, policy inheritance or workload move effects.' },
    llm_policy: { may_use_as_evidence: true, may_recalculate: false, may_infer_exact_values: false, causal_authority: 'NONE' },
  };
};

export const analyzeStructuredSources = (sources: SourceRecord[], scope: CoverageScope = {}): DerivedAnalyticalEvidence[] => {
  if (scope.providers && !scope.providers.includes('azure') || scope.designAreaIds && !scope.designAreaIds.includes('C')) return [];
  return sources.flatMap(source => {
    const classification = source.lz_classification;
    if (!TABLE_KINDS.has(source.kind) || source.extraction?.truncated
      || classification?.status !== 'classified' || classification.evidence_class !== 'platform'
      || !classification.structured_export
      || !['inventory_accounts', 'hierarchy_organization'].includes(classification.source_kind)
      || classification.providers_detected.length !== 1 || classification.providers_detected[0] !== 'azure'
      || classification.out_of_locked_scope_providers.length > 0) return [];
    const tables = source.structured_tables || (source.structured_table ? [source.structured_table] : []);
    return tables.flatMap(table => {
      const fact = membershipFact(source, table);
      return fact ? [fact] : [];
    });
  });
};
