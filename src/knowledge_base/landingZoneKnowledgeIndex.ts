/**
 * Pack-local Landing Zone Knowledge Base index.
 * Catalogue BATCH_DEFINITIONS are not Knowledge Base content.
 * FinOps JSON under this folder is never a REFERENCE KB source.
 */
import type {
  AssessmentDomainPack,
  KnowledgeTopic,
  ProviderId,
} from "../domain-packs/assessment-domain-pack";
import type { RemoteKnowledgeBaseDocument, RemoteKnowledgeBaseIndex } from "../types";

export const LZ_KNOWLEDGE_PENDING_STATUS = "contract_defined_content_pending";
export const LZ_KNOWLEDGE_BLOB_PREFIX = "Landing Zone Knowledge Base/";

export const REJECTED_FINOPS_KNOWLEDGE_MARKERS = [
  "Cost Visibility & Allocation",
  "Rate & Usage Optimization",
  "Architecture & Engineering",
  "Culture & Organization",
  "GenAI & AI Cost Management",
  "GenAI / Token Cost Management",
  "Comprehensive Cost Allocation",
  "Tag Sprawl & Missing Tags",
  "Playground-to-Production Cost Drift",
  "Lift-and-Shift Without Optimization",
  "finops_criteria.json",
  "finops_antipatterns.json",
  "finops_tactics_database.json",
] as const;

const VALID_PROVIDERS = new Set<ProviderId>(["azure", "aws", "gcp"]);
const REQUIRED_PROHIBITED_USES = ["customer_current_state_claim", "source_evidence_quote"];

export interface LandingZoneKnowledgeIndexOptions {
  remoteFailures?: Array<{ pathname: string; reason: string }>;
}

const topicAreaIds = (topic: KnowledgeTopic): string[] =>
  topic.applicable_design_area_ids || topic.design_area_ids || [];

const topicCriterionIds = (topic: KnowledgeTopic): string[] =>
  topic.applicable_criterion_ids || topic.criterion_ids || [];

const haystackLooksLikeFinopsKnowledge = (value: string): boolean =>
  REJECTED_FINOPS_KNOWLEDGE_MARKERS.some((marker) => value.includes(marker));

export const textLooksLikeFinopsKnowledge = (...values: Array<string | undefined>): boolean =>
  haystackLooksLikeFinopsKnowledge(values.filter(Boolean).join(" "));

export const documentLooksLikeFinopsKnowledge = (doc: {
  pathname?: string;
  domain_name?: string;
  title?: string;
  body_excerpt?: string;
}): boolean =>
  textLooksLikeFinopsKnowledge(doc.pathname, doc.domain_name, doc.title, doc.body_excerpt);

export const indexContainsRejectedFinopsKnowledge = (
  index: Pick<RemoteKnowledgeBaseIndex, "documents">,
): boolean => (index.documents || []).some((doc) => documentLooksLikeFinopsKnowledge(doc));

export const landingZoneKnowledgePackMetadata = (pack: AssessmentDomainPack) => ({
  kb_pack_version: pack.knowledgeBase.version,
  kb_schema_version: pack.knowledgeBase.schemaVersion,
  kb_content_status: pack.knowledgeBase.status,
});

const topicProviderLabels = (topic: KnowledgeTopic): string[] => {
  const value = topic.provider_applicability;
  if (value === "all") return ["azure", "aws", "gcp"];
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.keys(value);
  return [];
};

export const validateLandingZoneKnowledgeTopics = (pack: AssessmentDomainPack): string[] => {
  const errors: string[] = [];
  const kb = pack.knowledgeBase;
  const knownIds = new Set(pack.criteria.map((item) => item.id));
  const areaIds = new Set(pack.designAreas.map((area) => area.id));
  const topics = kb.topics || [];

  if (kb.must_not_fallback_to_finops_content !== true) {
    errors.push("Knowledge Base must set must_not_fallback_to_finops_content=true");
  }

  if (
    kb.status !== LZ_KNOWLEDGE_PENDING_STATUS
    && kb.load_policy === "fail_visible_if_required_content_missing"
    && topics.length === 0
  ) {
    errors.push("REQUIRED_LZ_KNOWLEDGE_MISSING");
  }

  for (const topic of topics) {
    const topicId = topic.id || "(missing-id)";
    if (!topic.id) errors.push("Knowledge topic is missing id");
    const areas = topicAreaIds(topic);
    const criteria = topicCriterionIds(topic);
    if (areas.length === 0) errors.push(`Knowledge topic ${topicId} must declare applicable design areas`);
    if (criteria.length === 0) errors.push(`Knowledge topic ${topicId} must declare applicable criterion IDs`);
    for (const areaId of areas) {
      if (!areaIds.has(areaId)) errors.push(`Knowledge topic ${topicId} references unknown design area ${areaId}`);
    }
    for (const criterionId of criteria) {
      if (!knownIds.has(criterionId)) errors.push(`Knowledge topic ${topicId} references unknown criterion ${criterionId}`);
    }
    const providers = topicProviderLabels(topic);
    if (providers.length === 0) {
      errors.push(`Knowledge topic ${topicId} is missing provider applicability`);
    } else {
      for (const providerId of providers) {
        if (!VALID_PROVIDERS.has(providerId as ProviderId)) {
          errors.push(`Knowledge topic ${topicId} has unknown provider ${providerId}`);
        }
      }
    }
    if (!(topic.allowed_interpretation_use || []).length) {
      errors.push(`Knowledge topic ${topicId} must declare allowed interpretation use`);
    }
    const prohibited = [...(topic.prohibited_use || []), ...(kb.prohibited_use || [])];
    for (const use of REQUIRED_PROHIBITED_USES) {
      if (!prohibited.includes(use)) {
        errors.push(`Knowledge topic ${topicId} must prohibit ${use}`);
      }
    }
    if (!topic.citation?.source) errors.push(`Knowledge topic ${topicId} is missing citation.source`);
    if (!topic.provenance?.origin) errors.push(`Knowledge topic ${topicId} is missing provenance.origin`);
    if (textLooksLikeFinopsKnowledge(
      topic.id,
      topic.title,
      topic.body,
      topic.citation?.source,
      topic.provenance?.origin,
    )) {
      errors.push(`Knowledge topic ${topicId} contains rejected FinOps Knowledge Base content`);
    }
  }

  return errors;
};

const documentsFromTopics = (pack: AssessmentDomainPack): RemoteKnowledgeBaseDocument[] => {
  const criteriaById = new Map(pack.criteria.map((item) => [item.id, item]));
  const documents: RemoteKnowledgeBaseDocument[] = [];
  for (const topic of pack.knowledgeBase.topics || []) {
    const criterionId = topicCriterionIds(topic)[0];
    const criterion = criterionId ? criteriaById.get(criterionId) : undefined;
    const domainId = topicAreaIds(topic)[0] || criterion?.design_area_id || "";
    const domainName = pack.designAreas.find((area) => area.id === domainId)?.name || "";
    const stream = topic.stream
      || (criterion?.stream === "antipattern" ? "antipattern" : "maturity");
    const prohibited = [...new Set([
      ...(topic.prohibited_use || []),
      ...(pack.knowledgeBase.prohibited_use || []),
    ])];
    const allowed = [...(topic.allowed_interpretation_use || pack.knowledgeBase.allowed_interpretation_use || [])];
    const metaLines = [
      `Knowledge id: ${topic.id}`,
      `Citation: ${topic.citation?.source || ""}`,
      topic.citation?.locator ? `Locator: ${topic.citation.locator}` : "",
      `Provenance: ${topic.provenance?.origin || ""}`,
      `Provider applicability: ${topicProviderLabels(topic).join(", ")}`,
      `Allowed uses: ${allowed.join(", ")}`,
      `Forbidden uses: ${prohibited.join(", ")}`,
      "This Knowledge Base topic is rubric interpretation only. It is not customer-state evidence.",
      topic.body || "",
    ].filter(Boolean);
    documents.push({
      pathname: `${LZ_KNOWLEDGE_BLOB_PREFIX}${topic.id}`,
      url: "",
      downloadUrl: "",
      size: 0,
      uploadedAt: topic.provenance?.recorded_at || "",
      kb_id: topic.id,
      version: pack.knowledgeBase.version,
      domain_id: domainId,
      domain_name: domainName,
      stream,
      criterion_id: criterionId || topic.id,
      capability_id: (criterionId || topic.id).replace(/^AP-/, ""),
      title: topic.title || criterion?.title || topic.id,
      evidence_categories: [],
      allowed_uses: allowed,
      forbidden_uses: prohibited,
      legacy_ids: [],
      body_excerpt: metaLines.join("\n"),
    });
  }
  return documents;
};

export const mergeKnowledgeIndexFailures = (
  index: RemoteKnowledgeBaseIndex,
  failures: Array<{ pathname: string; reason: string }>,
): RemoteKnowledgeBaseIndex => {
  const mergedFailures = [...(index.failures || []), ...failures.filter((item) => item.reason)];
  return {
    ...index,
    failures: mergedFailures,
    status: {
      ...index.status,
      failure_count: mergedFailures.length,
    },
  };
};

export const annotateKnowledgeIndexWithPack = (
  index: RemoteKnowledgeBaseIndex,
  pack: AssessmentDomainPack,
): RemoteKnowledgeBaseIndex => ({
  ...index,
  status: {
    ...index.status,
    ...landingZoneKnowledgePackMetadata(pack),
  },
});

export const buildLandingZoneKnowledgeIndex = (
  pack: AssessmentDomainPack,
  options: LandingZoneKnowledgeIndexOptions = {},
): RemoteKnowledgeBaseIndex => {
  const topicErrors = validateLandingZoneKnowledgeTopics(pack);
  const requiredMissing = topicErrors.includes("REQUIRED_LZ_KNOWLEDGE_MISSING");
  const finopsRejected = topicErrors.some((error) => error.includes("rejected FinOps"));
  const documents = topicErrors.length === 0 ? documentsFromTopics(pack) : [];
  const pending = pack.knowledgeBase.status === LZ_KNOWLEDGE_PENDING_STATUS && documents.length === 0;
  const failures = [
    ...(options.remoteFailures || []),
    ...topicErrors.map((reason) => ({
      pathname: "src/domain-packs/landing-zone/knowledge-base-manifest.json",
      reason,
    })),
    ...(pending
      ? [{
        pathname: "src/domain-packs/landing-zone/knowledge-base-manifest.json",
        reason: "LZ_KNOWLEDGE_CONTENT_PENDING",
      }]
      : []),
  ];

  let source: RemoteKnowledgeBaseIndex["status"]["source"] = "lz_pack_index";
  if (finopsRejected) source = "unavailable";
  else if (requiredMissing) source = "unavailable";
  else if (pending) source = "lz_pack_pending";

  return {
    status: {
      source,
      prefix: LZ_KNOWLEDGE_BLOB_PREFIX,
      document_count: documents.length,
      failure_count: failures.length,
      ...landingZoneKnowledgePackMetadata(pack),
    },
    documents,
    failures,
  };
};
