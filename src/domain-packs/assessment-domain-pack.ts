/**
 * Assessment domain-pack contract (Work 1).
 * The kernel must load this shape instead of importing FinOps constants.
 * Python loader in src/domain_packs is the runnable implementation in this repository.
 */

export type ProviderId = "azure" | "aws" | "gcp";
export type EvidenceClass = "platform" | "document" | "workshop";
export type ProviderKind = "mapped" | "native" | "not_applicable";

export interface DesignAreaDefinition {
  id: string;
  name: string;
  slug: string;
  capabilities: string[];
  antipatterns: string[];
  workshop_themes: string[];
}

export interface CriterionDefinition {
  id: string;
  intent_id: string;
  batch: string;
  design_area_id: string;
  design_area: string;
  stream: "capability" | "antipattern";
  pair: string;
  title: string;
  description: string;
  sub_criteria: [string, string, string];
}

export interface PairDefinition {
  pair_id: string;
  capability_id: string;
  antipattern_id: string;
  design_area_id: string;
  intent_id: string;
  relationship_type: "DIRECT_INVERSE";
}

export interface ProviderEvidenceMapping {
  kind: ProviderKind;
  applicability: "applicable" | "not_applicable" | "out_of_scope";
  contract: string;
}

export interface ProviderPack {
  records: Array<{
    id: string;
    intent_id: string;
    stream: CriterionDefinition["stream"];
    design_area_id: string;
    providers: Record<ProviderId, ProviderEvidenceMapping>;
  }>;
}

export interface EvidenceTaxonomy {
  evidence_classes: Record<EvidenceClass, { id: EvidenceClass; class_number: 1 | 2 | 3; meaning: string }>;
  representations: Array<"text" | "image" | "derived">;
}

export interface RoutingPolicy {
  categories: Record<string, { design_area_id: string; keywords: string[] }>;
}

export interface PersonaDefinition {
  id: string;
  title: string;
  priority: number;
  description: string;
}

export interface KnowledgeBaseDescriptor {
  version: string;
  schemaVersion: string;
  status: string;
  topics: unknown[];
  prohibited_use: string[];
  must_not_fallback_to_finops_content: boolean;
}

export interface TacticDefinition {
  id: string;
  title?: string;
  criterion_ids?: string[];
}

export interface TacticBinding {
  tactic_id: string;
  relationship?: "PRIMARY" | "SUPPORTING" | "RELATED";
  criterion_ids?: string[];
  antipattern_ids?: string[];
}

export interface ScoringPolicy {
  model: string;
  unknown_is_not_zero: true;
  provider_blending: "forbidden";
  maturity_labels: string[];
}

export interface QualityGatePolicy {
  publication_states: Array<"GO" | "WARN" | "BLOCK">;
  models_cannot_change_the_decision: boolean;
}

export interface ReportVocabulary {
  product_name: string;
  maturity_labels: string[];
  required_report_sections: string[];
}

export interface AssessmentDomainPack {
  packId: string;
  version: string;
  schemaVersion: string;
  designAreas: DesignAreaDefinition[];
  criteria: CriterionDefinition[];
  pairs: PairDefinition[];
  providers: ProviderPack;
  evidenceTaxonomy: EvidenceTaxonomy;
  routingPolicy: RoutingPolicy;
  validationRules: Record<string, unknown>;
  personas: Record<string, PersonaDefinition>;
  knowledgeBase: KnowledgeBaseDescriptor;
  tactics: TacticDefinition[];
  tacticBindings: TacticBinding[];
  scoringPolicy: ScoringPolicy;
  qualityGatePolicy: QualityGatePolicy;
  reportVocabulary: ReportVocabulary;
}
