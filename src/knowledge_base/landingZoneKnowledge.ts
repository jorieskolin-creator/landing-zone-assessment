/**
 * Production knowledge access for Landing Zone Assessment.
 * FinOps JSON under this folder is characterization fixtures only.
 */
import type { AssessmentDomainPack } from "../domain-packs/assessment-domain-pack";
import tacticsManifest from "../domain-packs/landing-zone/tactics.json";
import pairRegistryData from "../domain-packs/landing-zone/pair-registry.json";
import { LANDING_ZONE_PACK } from "../domain-packs/loadLandingZonePack";
import type {
  KnowledgeTaxonomyRegistry,
  MaturityPairRegistry,
  StrategicTactic,
  TacticActivityPlaybookEntry,
} from "../types";
import {
  batchTitles,
  criterionIds,
  criterionReferenceRegex,
  domainIds,
  expectedBatchOutputIds,
  expectedKnowledgeDocumentKeys,
  expectedPhase1Ids,
  routingTerms,
} from "../kernel/packTaxonomy";

export const getActivePack = (): AssessmentDomainPack => LANDING_ZONE_PACK;

export const landingZoneBatchIds = (): string[] => domainIds(LANDING_ZONE_PACK);

export const landingZoneBatchTitles = (): Record<string, string> => batchTitles(LANDING_ZONE_PACK);

export const landingZoneCapabilities = () =>
  LANDING_ZONE_PACK.criteria.filter((item) => item.stream === "capability");

export const landingZoneAntipatterns = () =>
  LANDING_ZONE_PACK.criteria.filter((item) => item.stream === "antipattern");

export const landingZoneCriterionReferenceRegex = (): RegExp =>
  criterionReferenceRegex(LANDING_ZONE_PACK);

export const expectedPhase1IdsForStream = (stream: "maturity" | "antipattern"): string[] =>
  expectedPhase1Ids(LANDING_ZONE_PACK, stream);

export const expectedBatchOutputIdsFor = (batchId: string) =>
  expectedBatchOutputIds(LANDING_ZONE_PACK, batchId);

export const expectedKnowledgeKeysFor = (batchId?: string): string[] =>
  expectedKnowledgeDocumentKeys(LANDING_ZONE_PACK, batchId);

export const DOMAIN_ROUTING_TERMS: Record<string, string[]> = Object.fromEntries(
  landingZoneBatchIds().map((id) => [id, routingTerms(LANDING_ZONE_PACK, id)]),
);

export const landingZonePairRegistry = (): MaturityPairRegistry => {
  const rawPairs = pairRegistryData.pairs as Array<Record<string, unknown>>;
  return {
    schema_version: String(pairRegistryData.schema_version || "lz_maturity_pair_registry_v1"),
    registry_version: String(pairRegistryData.registry_version || LANDING_ZONE_PACK.version),
    status: "ACTIVE",
    description: String(pairRegistryData.description || LANDING_ZONE_PACK.schemaVersion),
    pairs: rawPairs.map((pair) => ({
      pair_id: String(pair.pair_id),
      capability_id: String(pair.capability_id),
      antipattern_id: String(pair.antipattern_id),
      domain_id: String(pair.design_area_id),
      relationship_type: (pair.relationship_type as MaturityPairRegistry["pairs"][number]["relationship_type"]) || "DIRECT_INVERSE",
      interaction_strength: Number(pair.interaction_strength ?? 1),
      weight: Number(pair.weight ?? 1),
      rationale: String(pair.rationale || ""),
    })),
  };
};

export const landingZoneTaxonomyRegistry = (): KnowledgeTaxonomyRegistry => ({
  version: LANDING_ZONE_PACK.version,
  description: "Landing Zone Assessment taxonomy. Domain and criterion iteration come from the local pack.",
  domains: LANDING_ZONE_PACK.designAreas.map((area) => ({
    id: area.id as KnowledgeTaxonomyRegistry["domains"][number]["id"],
    name: area.name,
    capabilities: area.capabilities as KnowledgeTaxonomyRegistry["domains"][number]["capabilities"],
  })),
  streams: ["maturity", "antipattern"],
  evidence_categories: [
    "Policy",
    "Process",
    "Operational",
    "Automation",
    "Accountability",
    "Financial-Integration",
    "Cultural",
  ],
  kb_document_naming: {
    pattern: "<Design Area ID> - <Design Area Name> - <Criterion IDs> - <Short Title>",
    examples: LANDING_ZONE_PACK.designAreas.slice(0, 3).map((area) =>
      `${area.id} - ${area.name} - ${area.capabilities.join(" ")} - ${area.slug}`
    ),
    required_front_matter: {
      forbidden_uses: LANDING_ZONE_PACK.knowledgeBase.prohibited_use.length
        ? LANDING_ZONE_PACK.knowledgeBase.prohibited_use
        : ["customer_current_state_claim", "source_evidence_quote"],
    },
  },
  usage_boundaries: {
    reference_kb_allowed_uses: [
      "rubric_context",
      "maturity_examples",
      "antipattern_examples",
      "evidence_requirements",
      "validation_questions",
    ],
    reference_kb_forbidden_uses: LANDING_ZONE_PACK.knowledgeBase.prohibited_use,
  },
});

export const landingZoneValidationRules = () => {
  const capabilityIds = criterionIds(LANDING_ZONE_PACK, "maturity");
  const antipatternIds = criterionIds(LANDING_ZONE_PACK, "antipattern");
  const packRules = LANDING_ZONE_PACK.validationRules as Record<string, any>;
  return {
    version: LANDING_ZONE_PACK.version,
    description: "Landing Zone pack validation rules. Criterion iteration comes from the pack registry.",
    phase1: {
      ...(packRules.phase1 || {}),
      required_streams: packRules.phase1?.required_streams || ["maturity", "antipattern"],
      criteria_ids_per_batch: Object.fromEntries(
        landingZoneBatchIds().map((id) => [id, criterionIds(LANDING_ZONE_PACK, "maturity", id)]),
      ),
      antipattern_ids_per_batch: Object.fromEntries(
        landingZoneBatchIds().map((id) => [id, criterionIds(LANDING_ZONE_PACK, "antipattern", id)]),
      ),
      total_criteria_per_stream: capabilityIds.length,
      total_antipatterns_per_stream: antipatternIds.length,
    },
    phase3: packRules.phase3 || {},
  };
};

export const landingZonePreflightKeywords = () => {
  const routingKeywords = [...new Set(landingZoneBatchIds().flatMap((id) => DOMAIN_ROUTING_TERMS[id] || []))];
  return {
    version: LANDING_ZONE_PACK.version,
    description: "Landing Zone routing keywords derived from the frozen catalogue",
    categories: {
      landing_zone_routing: {
        weight: 3,
        description: "Landing Zone catalogue and architecture routing terms",
        keywords: routingKeywords,
      },
      standards_frameworks: {
        weight: 2,
        description: "Cloud foundation and landing-zone framework terms",
        keywords: [
          "landing zone",
          "cloud foundation",
          "control plane",
          "management group",
          "organizational unit",
          "folder hierarchy",
          "policy assignment",
          "guardrail",
        ],
      },
      emerging_scope: {
        weight: 1,
        description: "Adjacent platform-engineering terms",
        keywords: ["platform engineering", "vending", "subscription vending", "account factory"],
      },
    },
    structural_headers: LANDING_ZONE_PACK.designAreas.map((area) => area.name.toLowerCase()),
  };
};

export const landingZoneTactics = (): StrategicTactic[] => [];

export const landingZoneTacticActivityPlaybook = (): TacticActivityPlaybookEntry[] => [];

export const landingZoneTacticsStatus = (): string =>
  String((tacticsManifest as { status?: string }).status || LANDING_ZONE_PACK.knowledgeBase.status);

export const mustNotFallbackToFinopsContent = (): boolean =>
  Boolean(LANDING_ZONE_PACK.knowledgeBase.must_not_fallback_to_finops_content);

export const landingZoneContentPendingMessage = (kind: "tactics" | "knowledge_base"): string =>
  `Landing Zone ${kind} content is not available (status=${kind === "tactics" ? landingZoneTacticsStatus() : LANDING_ZONE_PACK.knowledgeBase.status}). This assessment must not fall back to FinOps Engine knowledge or tactics.`;
