/**
 * Load the Landing Zone domain pack from committed JSON.
 * This is the production pack for the independent assessment kernel.
 */
import type { AssessmentDomainPack } from "./assessment-domain-pack";
import packManifest from "./landing-zone/pack.json";
import taxonomy from "./landing-zone/taxonomy.json";
import criteria from "./landing-zone/criteria.json";
import antipatterns from "./landing-zone/antipatterns.json";
import pairs from "./landing-zone/pair-registry.json";
import providers from "./landing-zone/provider-evidence.json";
import evidenceTaxonomy from "./landing-zone/evidence-taxonomy.json";
import routingPolicy from "./landing-zone/routing-keywords.json";
import validationRules from "./landing-zone/validation-rules.json";
import personas from "./landing-zone/personas.json";
import knowledgeBase from "./landing-zone/knowledge-base-manifest.json";
import tactics from "./landing-zone/tactics.json";
import tacticBindings from "./landing-zone/tactic-bindings.json";
import scoringPolicy from "./landing-zone/scoring-policy.json";
import qualityGatePolicy from "./landing-zone/quality-gate-policy.json";
import reportVocabulary from "./landing-zone/report-vocabulary.json";
import questionnaire from "./landing-zone/questionnaire-mapping.json";

export const LANDING_ZONE_PACK_ID = "landing-zone";

export const loadLandingZonePack = (): AssessmentDomainPack => ({
  packId: packManifest.packId,
  version: packManifest.version,
  schemaVersion: packManifest.schemaVersion,
  designAreas: taxonomy.design_areas,
  criteria: [...criteria.criteria, ...antipatterns.criteria],
  pairs: pairs.pairs,
  providers,
  evidenceTaxonomy,
  routingPolicy,
  validationRules,
  personas,
  knowledgeBase,
  tactics: tactics.tactics,
  tacticBindings: tacticBindings.bindings,
  scoringPolicy,
  qualityGatePolicy,
  reportVocabulary,
});

export const LANDING_ZONE_QUESTIONNAIRE = questionnaire.questions;

export const LANDING_ZONE_PACK = loadLandingZonePack();
