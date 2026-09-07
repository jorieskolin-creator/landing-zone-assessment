/**
 * Copied FinOps Engine JSON retained only for kernel characterization tests.
 * Production knowledge access is `landingZoneKnowledge.ts` / `LANDING_ZONE_PACK`.
 */
import criteriaData from "./finops_criteria.json";
import antipatternData from "./finops_antipatterns.json";
import maturityPairRegistryData from "./finops_maturity_pair_registry.json";
import keywordsData from "./finops_preflight_keywords.json";
import taxonomyData from "./finops_evidence_taxonomy.json";
import personasData from "./finops_personas.json";
import tacticsData from "./finops_tactics_database.json";
import tacticActivityPlaybookData from "./finops_tactic_activity_playbook.json";
import validationData from "./finops_validation_rules.json";
import taxonomyRegistryData from "./finops_taxonomy_registry.json";

export const CHARACTERIZATION_FINOPS_CRITERIA = criteriaData.criteria;
export const CHARACTERIZATION_FINOPS_ANTIPATTERNS = antipatternData.criteria;
export const CHARACTERIZATION_FINOPS_KEYWORDS = keywordsData;
export const CHARACTERIZATION_FINOPS_EVIDENCE_TAXONOMY = taxonomyData;
export const CHARACTERIZATION_FINOPS_PERSONAS = personasData;
export const CHARACTERIZATION_FINOPS_TACTICS = tacticsData;
export const CHARACTERIZATION_FINOPS_TACTIC_ACTIVITY_PLAYBOOK = tacticActivityPlaybookData;
export const CHARACTERIZATION_FINOPS_VALIDATION_RULES = validationData;
export const CHARACTERIZATION_FINOPS_TAXONOMY_REGISTRY = taxonomyRegistryData;
export const CHARACTERIZATION_FINOPS_MATURITY_PAIR_REGISTRY = maturityPairRegistryData;
