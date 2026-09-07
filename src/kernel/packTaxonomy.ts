/**
 * Pack-driven kernel taxonomy (Work 2).
 *
 * Replace FinOps A–F unions, [A-F][1-5] regexes, Array.from({ length: 5 }),
 * and hardcoded BATCH_TITLES / domain_diagnosis keys with these helpers.
 *
 * Engine adoption points:
 * - src/types.ts DomainId / CapabilityId
 * - src/orchestrator.ts expected batch output ids and unavailable evidence items
 * - src/services/pipelineIntegrityService.ts expectedIds
 * - src/services/tacticGroundingService.ts CRITERION_REFERENCE_RX
 * - src/services/runTraceService.ts criterionRx
 * - src/services/maturityModelService.ts ['A'..'F'] loops
 * - src/knowledge_base/index.ts BATCH_TITLES and expectedDocumentKeys
 * - src/services/sourceRegistryService.ts DOMAIN_TERMS
 * - lib/outputContracts.js domain_diagnosis and finops_* contract ids
 * - src/components/DashboardComponents.tsx ALL_CRITERIA_IDS
 */

import type { AssessmentDomainPack } from "../domain-packs/assessment-domain-pack";

export const ASSESSMENT_OUTPUT_CONTRACT_IDS = Object.freeze({
  evidenceGapQuery: "assessment_evidence_gap_query_v1",
  evidenceSynthesis: "assessment_evidence_synthesis_v1",
  roadmapSynthesis: "assessment_roadmap_synthesis_v1",
  findingsSynthesis: "assessment_findings_synthesis_v1",
  summaryFactCheck: "assessment_summary_fact_check_v1",
  roadmapFactCheck: "assessment_roadmap_fact_check_v2",
});

export const FINOPS_OUTPUT_CONTRACT_ALIASES: Record<string, string> = {
  finops_evidence_gap_query_v1: ASSESSMENT_OUTPUT_CONTRACT_IDS.evidenceGapQuery,
  finops_evidence_synthesis_v1: ASSESSMENT_OUTPUT_CONTRACT_IDS.evidenceSynthesis,
  finops_roadmap_synthesis_v1: ASSESSMENT_OUTPUT_CONTRACT_IDS.roadmapSynthesis,
  finops_findings_synthesis_v1: ASSESSMENT_OUTPUT_CONTRACT_IDS.findingsSynthesis,
  finops_summary_fact_check_v1: ASSESSMENT_OUTPUT_CONTRACT_IDS.summaryFactCheck,
  finops_roadmap_fact_check_v2: ASSESSMENT_OUTPUT_CONTRACT_IDS.roadmapFactCheck,
};

export type DomainId = string;
export type CriterionId = string;
export type EngineStream = "maturity" | "antipattern";

const byStream = (pack: AssessmentDomainPack, stream: "capability" | "antipattern", domainId?: string) =>
  pack.criteria.filter(
    (item) => item.stream === stream && (domainId === undefined || item.design_area_id === domainId)
  );

export const domainIds = (pack: AssessmentDomainPack): DomainId[] =>
  pack.designAreas.map((area) => area.id);

export const batchTitles = (pack: AssessmentDomainPack): Record<string, string> =>
  Object.fromEntries(pack.designAreas.map((area) => [area.id, area.name]));

export const isDomainId = (pack: AssessmentDomainPack, value: string): value is DomainId =>
  domainIds(pack).includes(value);

export const criterionIds = (
  pack: AssessmentDomainPack,
  stream: EngineStream,
  domainId?: string
): CriterionId[] => {
  const packStream = stream === "maturity" ? "capability" : "antipattern";
  return byStream(pack, packStream, domainId).map((item) => item.id);
};

export const expectedBatchOutputIds = (
  pack: AssessmentDomainPack,
  batchId: string
): { maturity: CriterionId[]; antipattern: CriterionId[] } => ({
  maturity: criterionIds(pack, "maturity", batchId),
  antipattern: criterionIds(pack, "antipattern", batchId),
});

export const expectedPhase1Ids = (pack: AssessmentDomainPack, stream: EngineStream): CriterionId[] =>
  criterionIds(pack, stream);

export const expectedKnowledgeDocumentKeys = (
  pack: AssessmentDomainPack,
  batchId?: string
): string[] =>
  pack.criteria
    .filter((item) => !batchId || item.design_area_id === batchId)
    .map((item) => `${item.stream === "capability" ? "maturity" : "antipattern"}:${item.id}`);

export const domainDiagnosisKeys = (pack: AssessmentDomainPack): DomainId[] => domainIds(pack);

export const routingTerms = (pack: AssessmentDomainPack, domainId: string): string[] =>
  pack.routingPolicy.categories[domainId]?.keywords ?? [];

export const personaIds = (pack: AssessmentDomainPack): string[] => {
  const nested = (pack.personas as unknown as { personas?: Record<string, unknown> }).personas;
  if (nested && typeof nested === "object") return Object.keys(nested);
  return Object.keys(pack.personas);
};

export const persistencePrefix = (pack: AssessmentDomainPack): string =>
  pack.packId.replace(/-/g, "_");

export const resolveOutputContractId = (contractId: string): string =>
  FINOPS_OUTPUT_CONTRACT_ALIASES[contractId] ?? contractId;

export const criterionReferenceRegexFromIds = (ids: string[]): RegExp => {
  const unique = [...new Set(ids.filter(Boolean))].sort((a, b) => b.length - a.length)
    .map((id) => id.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  if (unique.length === 0) return /$^/;
  const alt = unique.join("|");
  return new RegExp(`\\[(?:${alt})(?:\\s*-\\s*(?:${alt}))?\\]`);
};

export const criterionReferenceRegex = (pack: AssessmentDomainPack): RegExp =>
  criterionReferenceRegexFromIds(pack.criteria.map((item) => item.id));

export const domainIdFromCriterionId = (criterionId: string, pack?: AssessmentDomainPack): string => {
  if (pack) {
    const bare = criterionId.replace(/^AP-/, "");
    const hit = pack.criteria.find((item) =>
      item.id === criterionId || item.id === bare || item.id === `AP-${bare}`
    );
    if (hit) return hit.design_area_id;
  }
  const stripped = criterionId.replace(/^AP-/, "");
  return stripped.match(/^([A-Za-z]+)/)?.[1] || stripped;
};

export const unavailableEvidenceCheckItems = (
  pack: AssessmentDomainPack,
  batchId: string,
): Array<{ stream: EngineStream; id: string; status: "missing" }> => {
  const expected = expectedBatchOutputIds(pack, batchId);
  return [
    ...expected.maturity.map((id) => ({ stream: "maturity" as const, id, status: "missing" as const })),
    ...expected.antipattern.map((id) => ({ stream: "antipattern" as const, id, status: "missing" as const })),
  ];
};
