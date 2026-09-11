/**
 * Work 5: classify user-supplied files into Landing Zone source kinds
 * and evidence classes. Authority follows the source, not the transport:
 * an uploaded control-plane export is Class 1; a design document is Class 2;
 * a workshop file is Class 3. Unclassified material is treated as Class 2
 * so it cannot be laundered into platform inventory.
 */
import type { EvidenceClass, ProviderId } from "../domain-packs/assessment-domain-pack";
import type { SourceRecord, StructuredTableData } from "../types";

export const LZ_SOURCE_CLASSIFICATION_SCHEMA = "lz_source_classification_v1" as const;

export const LZ_SOURCE_KINDS = [
  "hierarchy_organization",
  "inventory_accounts",
  "iam_bindings",
  "policy_guardrails",
  "network_topology",
  "logging_monitoring",
  "security_configuration",
  "iac_vending",
  "exception_waiver",
  "architecture_operating_model",
  "workshop_attestation",
  "unclassified",
] as const;

export type LzSourceKind = (typeof LZ_SOURCE_KINDS)[number];

export type LzObjectType =
  | "Inventory"
  | "Identity-binding"
  | "Policy-assignment"
  | "Network-path"
  | "Log-sink"
  | "Security-config"
  | "IaC"
  | "Exception-register"
  | "Architecture-document"
  | "Workshop"
  | "Unclassified";

export interface LzSourceClassification {
  schema_version: typeof LZ_SOURCE_CLASSIFICATION_SCHEMA;
  source_kind: LzSourceKind;
  evidence_class: EvidenceClass;
  evidence_class_number: 1 | 2 | 3;
  object_type: LzObjectType;
  status: "classified" | "unclassified";
  providers_detected: ProviderId[];
  out_of_locked_scope_providers: ProviderId[];
  structured_export: boolean;
  object_count: number;
  id_fields: string[];
  signals: string[];
}

export interface LzAcquisitionSummary {
  classified_source_count: number;
  unclassified_source_count: number;
  platform_source_count: number;
  document_source_count: number;
  workshop_source_count: number;
  source_kinds: LzSourceKind[];
  out_of_locked_scope_providers: ProviderId[];
}

export const LZ_SOURCE_KIND_LABELS: Record<LzSourceKind, string> = {
  hierarchy_organization: "Hierarchy / organization export",
  inventory_accounts: "Account / subscription / project inventory",
  iam_bindings: "IAM / privileged-access bindings",
  policy_guardrails: "Policy / guardrail assignments",
  network_topology: "Network topology / attachments",
  logging_monitoring: "Logging / monitoring destinations",
  security_configuration: "Security configuration",
  iac_vending: "IaC / vending pipeline",
  exception_waiver: "Exception / waiver register",
  architecture_operating_model: "Architecture / operating-model document",
  workshop_attestation: "Workshop / questionnaire",
  unclassified: "Unclassified source",
};

const CLASS_NUMBER: Record<EvidenceClass, 1 | 2 | 3> = {
  platform: 1,
  document: 2,
  workshop: 3,
};

const KIND_OBJECT_TYPE: Record<LzSourceKind, LzObjectType> = {
  hierarchy_organization: "Inventory",
  inventory_accounts: "Inventory",
  iam_bindings: "Identity-binding",
  policy_guardrails: "Policy-assignment",
  network_topology: "Network-path",
  logging_monitoring: "Log-sink",
  security_configuration: "Security-config",
  iac_vending: "IaC",
  exception_waiver: "Exception-register",
  architecture_operating_model: "Architecture-document",
  workshop_attestation: "Workshop",
  unclassified: "Unclassified",
};

const PLATFORM_KINDS = new Set<LzSourceKind>([
  "hierarchy_organization",
  "inventory_accounts",
  "iam_bindings",
  "policy_guardrails",
  "network_topology",
  "logging_monitoring",
  "security_configuration",
]);

type Rule = {
  kind: LzSourceKind;
  filename: RegExp[];
  headers: RegExp[];
  keys: RegExp[];
  body: RegExp[];
};

const RULES: Rule[] = [
  {
    kind: "workshop_attestation",
    filename: [/questionnaire/, /workshop/, /interview/, /attestation/],
    headers: [/question\s*id/, /evidence\s*lead/, /facilitator/, /participant/],
    keys: [/evidence_class/, /evidence_lead/, /facilitator/, /referenced_criterion/],
    body: [/\b[A-H]-Q\d+\b/, /evidence lead/, /workshop observation/, /facilitator/],
  },
  {
    kind: "hierarchy_organization",
    filename: [/management[-_ ]?group/, /organization/, /\bou\b/, /tenant[-_ ]?root/, /folder[-_ ]?tree/, /org[-_ ]?tree/, /hierarchy/],
    headers: [/managementgroup/, /parentid/, /organizationid/, /folderid/, /displayname/, /tenantid/],
    keys: [/managementgroups/, /organizationid/, /organizations/, /tenantroot/, /parentid/, /folders/],
    body: [/tenant root group/, /management group/, /organizational unit/, /cloud identity organization/],
  },
  {
    kind: "inventory_accounts",
    filename: [/subscription/, /account[-_ ]?list/, /project[-_ ]?list/, /inventory/, /resource[-_ ]?graph/],
    headers: [/subscriptionid/, /subscriptionname/, /accountid/, /projectid/, /project_id/, /billingaccount/],
    keys: [/subscriptionid/, /subscriptions/, /accountid/, /projectid/, /projects/],
    body: [/subscription id/, /management account/, /billing account linked/],
  },
  {
    kind: "iam_bindings",
    filename: [/role[-_ ]?assignment/, /\biam\b/, /pim/, /privileged/, /permission[-_ ]?set/, /identity[-_ ]?center/],
    headers: [/principalid/, /roledefinition/, /roleassignment/, /permissionset/, /member/],
    keys: [/roleassignments/, /roledefinitionid/, /principalid/, /bindings/, /permissionset/],
    body: [/role assignment/, /pim eligible/, /identity center/, /iam policy binding/],
  },
  {
    kind: "policy_guardrails",
    filename: [/policy[-_ ]?assignment/, /guardrail/, /\bscp\b/, /org[-_ ]?policy/, /policy[-_ ]?set/],
    headers: [/policyassignment/, /enforcementmode/, /policydefinition/, /constraint/],
    keys: [/policyassignments/, /enforcementmode/, /servicecontrolpolicy/, /orgpolicy/, /constraint/],
    body: [/policy assignment/, /enforcement mode/, /service control policy/, /organization policy/],
  },
  {
    kind: "network_topology",
    filename: [/network/, /vnet/, /\bvpc\b/, /peering/, /hub[-_ ]?spoke/, /connectivity/, /private[-_ ]?endpoint/],
    headers: [/vnet/, /vpcid/, /peering/, /subnet/, /privateendpoint/, /transitgateway/],
    keys: [/virtualnetworks/, /peerings/, /privateendpoints/, /sharedvpc/, /hubnetwork/],
    body: [/hub and spoke/, /vnet peering/, /shared vpc/, /transit gateway/, /private endpoint/],
  },
  {
    kind: "logging_monitoring",
    filename: [/diagnostic/, /log[-_ ]?sink/, /cloudtrail/, /activity[-_ ]?log/, /log[-_ ]?analytics/],
    headers: [/workspaceid/, /logsink/, /destination/, /diagnosticsetting/],
    keys: [/diagnosticsettings/, /logsinks/, /cloudtrail/, /loganalytics/, /destinations/],
    body: [/log sink/, /diagnostic settings/, /activity log destination/, /cloudtrail trail/],
  },
  {
    kind: "security_configuration",
    filename: [/defender/, /security[-_ ]?center/, /guardduty/, /security[-_ ]?hub/, /secure[-_ ]?score/],
    headers: [/securescore/, /assessmentid/, /securitycenter/],
    keys: [/securescore/, /securitycenter/, /guardduty/, /securityhub/, /securitycommandcenter/],
    body: [/microsoft defender/, /security command center/, /guardduty detector/, /security hub/],
  },
  {
    kind: "iac_vending",
    filename: [/bicep/, /terraform/, /pulumi/, /arm[-_ ]?template/, /vending/, /pipeline/, /alz/],
    headers: [/modulename/, /pipeline/, /template/],
    keys: [/\$schema/, /resources/, /provider/, /vending/],
    body: [/azurerm_/, /microsoft.resources\/deployments/, /terraform \{/, /resource "azurerm/, /subscription vending/, /landing zone accelerator/],
  },
  {
    kind: "exception_waiver",
    filename: [/exception/, /waiver/, /exemption/, /exception[-_ ]?register/],
    headers: [/exemption/, /waiver/, /exceptionid/, /expiry/],
    keys: [/policyexemptions/, /waiver/, /exceptionid/, /expireson/],
    body: [/policy exemption/, /permanent exception/, /waiver register/, /accepted risk/],
  },
  {
    kind: "architecture_operating_model",
    filename: [/architecture/, /operating[-_ ]?model/, /raci/, /design[-_ ]?decision/, /target[-_ ]?state/],
    headers: [/decision/, /owner/, /raci/],
    keys: [/operatingmodel/, /architecturedecision/, /raci/],
    body: [/this document describes/, /target architecture/, /operating model/, /design decision record/, /landing zone design/],
  },
];

const unique = <T,>(values: T[]): T[] => [...new Set(values)];

const haystackOf = (value: string): string => value.toLowerCase().replace(/[_./\\]+/g, " ");

const matchScore = (haystack: string, patterns: RegExp[], weight: number, hits: string[]): number => {
  let score = 0;
  for (const pattern of patterns) {
    if (pattern.test(haystack)) {
      score += weight;
      if (hits.length < 8) hits.push(pattern.source.replace(/\\b/g, "").slice(0, 48));
    }
  }
  return score;
};

const collectJsonKeys = (value: unknown, depth = 0, keys: string[] = []): string[] => {
  if (depth > 3 || value == null) return keys;
  if (Array.isArray(value)) {
    for (const item of value.slice(0, 8)) collectJsonKeys(item, depth + 1, keys);
    return keys;
  }
  if (typeof value === "object") {
    for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
      keys.push(key);
      collectJsonKeys(child, depth + 1, keys);
    }
  }
  return keys;
};

const parseJsonPayload = (text: string): unknown | null => {
  const trimmed = text.replace(/^Format:\s*JSON\s*/i, "").trim();
  if (!trimmed.startsWith("{") && !trimmed.startsWith("[")) return null;
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.search(/[\[{]/);
    const end = Math.max(trimmed.lastIndexOf("}"), trimmed.lastIndexOf("]"));
    if (start < 0 || end <= start) return null;
    try {
      return JSON.parse(trimmed.slice(start, end + 1));
    } catch {
      return null;
    }
  }
};

const countExportObjects = (payload: unknown): number => {
  if (!payload || typeof payload !== "object") return 0;
  if (Array.isArray(payload)) return payload.length;
  const record = payload as Record<string, unknown>;
  const listKeys = [
    "managementGroups", "subscriptions", "accounts", "projects", "folders",
    "roleAssignments", "bindings", "policyAssignments", "policyExemptions",
    "diagnosticSettings", "logSinks", "peerings", "virtualNetworks",
  ];
  for (const key of listKeys) {
    const value = record[key];
    if (Array.isArray(value)) return value.length;
    if (value && typeof value === "object") {
      const nested = Object.values(value as Record<string, unknown>).find((item) => Array.isArray(item));
      if (Array.isArray(nested)) return nested.length;
    }
  }
  if (Array.isArray(record.value)) return record.value.length;
  if (Array.isArray(record.resources)) return record.resources.length;
  return 0;
};

const idFieldsFrom = (headers: string[], keys: string[]): string[] => {
  const fields = [...headers, ...keys].filter((name) =>
    /(^|[_-])(id|name|objectid|principalid|subscriptionid|accountid|projectid|assignmentid)(_|$)/i.test(name),
  );
  return unique(fields).slice(0, 12);
};

const detectProviders = (haystack: string, keys: string[]): ProviderId[] => {
  const found: ProviderId[] = [];
  if (/\bazure\b|\bentra\b|management group|microsoft\.|tenant root|subscriptionid/.test(haystack)
    || keys.some((key) => /managementgroup|subscriptionid|entra/i.test(key))) {
    found.push("azure");
  }
  if (/\baws\b|organizations management|service control policy|\bpayer\b|ou id|permission set|cloudtrail/.test(haystack)
    || keys.some((key) => /awsaccount|organizationalunit|permissionset/i.test(key))) {
    found.push("aws");
  }
  if (/\bgcp\b|google cloud|org policy|folder id|project_id|security command center|shared vpc/.test(haystack)
    || keys.some((key) => /projectid|orgpolicy|cloudidentity/i.test(key))) {
    found.push("gcp");
  }
  return unique(found);
};

const looksLikeArmOrTerraform = (haystack: string, keys: string[]): boolean =>
  keys.some((key) => key === "$schema" || key === "resources" || key === "provider")
  && (/schema\.management\.azure\.com|deploymenttemplate|azurerm_|terraform \{|resource "azurerm/.test(haystack));

const looksLikeQuestionnaire = (payload: unknown, haystack: string): boolean => {
  if (/\b[A-H]-Q\d+\b/.test(haystack) && /evidence lead|workshop|facilitator|questionnaire/.test(haystack)) {
    return true;
  }
  if (!payload || typeof payload !== "object") return false;
  const record = payload as Record<string, unknown>;
  if (record.evidence_class === "workshop") return true;
  const questions = record.questions;
  if (!Array.isArray(questions) || questions.length === 0) return false;
  return questions.some((item) => {
    if (!item || typeof item !== "object") return false;
    const row = item as Record<string, unknown>;
    return row.evidence_class === "workshop"
      || typeof row.evidence_lead === "string"
      || (typeof row.id === "string" && /^[A-H]-Q\d+$/.test(row.id));
  });
};

const sourceBody = (input: {
  fileName?: string;
  kind?: SourceRecord["kind"];
  text?: string;
  pages?: Array<{ text: string }>;
  visualUnits?: Array<{ text: string }>;
  tables?: StructuredTableData[];
}): string => {
  const tables = input.tables || [];
  return [
    input.fileName || "",
    input.text || "",
    ...(input.pages || []).map((page) => page.text),
    ...(input.visualUnits || []).map((unit) => unit.text),
    ...tables.flatMap((table) => [
      table.sheet_name || "",
      ...(table.headers || []),
      ...(table.rows || []).slice(0, 20).flat(),
    ]),
  ].join("\n");
};

export const classifyLandingZoneSource = (
  input: {
    fileName?: string;
    kind?: SourceRecord["kind"];
    text?: string;
    pages?: Array<{ text: string }>;
    visualUnits?: Array<{ text: string }>;
    tables?: StructuredTableData[];
    lockedProviders?: ProviderId[];
  },
): LzSourceClassification => {
  const fileName = haystackOf(input.fileName || "");
  const tables = input.tables || [];
  const headers = haystackOf(tables.flatMap((table) => table.headers || []).join(" "));
  const body = haystackOf(sourceBody(input));
  const payload = input.kind === "json" || /^\s*format:\s*json/i.test(input.text || "")
    ? parseJsonPayload(input.text || "")
    : parseJsonPayload(input.text || "");
  const jsonKeys = collectJsonKeys(payload);
  const keyHaystack = haystackOf(jsonKeys.join(" "));
  const structuredExport = Boolean(
    payload && typeof payload === "object"
    || tables.some((table) => (table.headers || []).length >= 2 && (table.analysis_rows || table.rows || []).length > 0),
  );
  const objectCount = payload
    ? countExportObjects(payload)
    : tables.reduce((sum, table) => sum + (table.analysis_rows?.length || table.rows.length), 0);

  const scores = new Map<LzSourceKind, { score: number; signals: string[] }>();
  for (const rule of RULES) {
    const signals: string[] = [];
    const score = matchScore(fileName, rule.filename, 6, signals)
      + matchScore(headers, rule.headers, 5, signals)
      + matchScore(keyHaystack, rule.keys, 5, signals)
      + matchScore(body, rule.body, 2, signals);
    if (score > 0) scores.set(rule.kind, { score, signals: unique(signals) });
  }

  if (looksLikeQuestionnaire(payload, body)) {
    const current = scores.get("workshop_attestation") || { score: 0, signals: [] };
    scores.set("workshop_attestation", {
      score: current.score + 20,
      signals: unique([...current.signals, "questionnaire-shape"]),
    });
  }
  if (looksLikeArmOrTerraform(body, jsonKeys)) {
    const current = scores.get("iac_vending") || { score: 0, signals: [] };
    scores.set("iac_vending", {
      score: current.score + 12,
      signals: unique([...current.signals, "iac-template"]),
    });
  }

  const ranked = [...scores.entries()].sort((left, right) => right[1].score - left[1].score);
  const winner = ranked[0];
  const runnerUp = ranked[1];
  const strongEnough = winner && (
    winner[1].score >= 6
    || (winner[1].score >= 5 && structuredExport)
  ) && (!runnerUp || winner[1].score >= runnerUp[1].score || winner[0] === "workshop_attestation");

  let sourceKind: LzSourceKind = strongEnough ? winner[0] : "unclassified";
  const signals = strongEnough ? winner[1].signals : [];

  if (sourceKind !== "workshop_attestation" && sourceKind !== "unclassified" && PLATFORM_KINDS.has(sourceKind)) {
    const documentBias = (scores.get("architecture_operating_model")?.score || 0)
      + (scores.get("iac_vending")?.score || 0)
      + (scores.get("exception_waiver")?.score || 0);
    const controlPlaneShape = structuredExport && (jsonKeys.length > 0 || headers.length > 0);
    const exportFile = /\b(export|assignment|inventory|dump|graph)\b/.test(fileName);
    if (!controlPlaneShape && !exportFile && (documentBias >= 4 || input.kind === "pdf" || input.kind === "html" || input.kind === "text")) {
      sourceKind = scores.get("architecture_operating_model") && (scores.get("architecture_operating_model")?.score || 0) >= 4
        ? "architecture_operating_model"
        : scores.get("iac_vending") && (scores.get("iac_vending")?.score || 0) >= 6
          ? "iac_vending"
          : "architecture_operating_model";
      signals.push("document-not-control-plane-export");
    }
  }

  if (sourceKind === "policy_guardrails" && !/assignment|enforcement|scp|orgpolicy|org-policy/.test(`${fileName} ${keyHaystack} ${headers}`)) {
    if ((scores.get("architecture_operating_model")?.score || 0) >= 4) {
      sourceKind = "architecture_operating_model";
      signals.push("policy-catalogue-not-assignment");
    }
  }

  const evidenceClass: EvidenceClass = sourceKind === "workshop_attestation"
    ? "workshop"
    : PLATFORM_KINDS.has(sourceKind)
      ? "platform"
      : "document";

  const providersDetected = detectProviders(`${fileName} ${body} ${keyHaystack}`, jsonKeys);
  const locked = input.lockedProviders || [];
  const outOfScope = locked.length > 0
    ? providersDetected.filter((provider) => !locked.includes(provider))
    : [];

  return {
    schema_version: LZ_SOURCE_CLASSIFICATION_SCHEMA,
    source_kind: sourceKind,
    evidence_class: evidenceClass,
    evidence_class_number: CLASS_NUMBER[evidenceClass],
    object_type: KIND_OBJECT_TYPE[sourceKind],
    status: sourceKind === "unclassified" ? "unclassified" : "classified",
    providers_detected: providersDetected,
    out_of_locked_scope_providers: outOfScope,
    structured_export: structuredExport,
    object_count: objectCount,
    id_fields: idFieldsFrom(tables.flatMap((table) => table.headers || []), jsonKeys),
    signals,
  };
};

export const classifySourceRecord = (
  record: SourceRecord,
  lockedProviders?: ProviderId[],
): LzSourceClassification =>
  classifyLandingZoneSource({
    fileName: record.original_file_name || record.source_name,
    kind: record.kind,
    text: record.text,
    pages: record.pages,
    visualUnits: record.visual_units,
    tables: [...(record.structured_tables || []), ...(record.structured_table ? [record.structured_table] : [])],
    lockedProviders,
  });

export const applyLandingZoneSourceClassification = (
  records: SourceRecord[],
  lockedProviders?: ProviderId[],
): SourceRecord[] =>
  records.map((record) => ({
    ...record,
    lz_classification: classifySourceRecord(record, lockedProviders),
  }));

export const summarizeLzAcquisition = (records: SourceRecord[]): LzAcquisitionSummary => {
  const classifications = records.map((record) => record.lz_classification).filter(Boolean) as LzSourceClassification[];
  return {
    classified_source_count: classifications.filter((item) => item.status === "classified").length,
    unclassified_source_count: classifications.filter((item) => item.status === "unclassified").length
      + records.filter((record) => !record.lz_classification).length,
    platform_source_count: classifications.filter((item) => item.evidence_class === "platform").length,
    document_source_count: classifications.filter((item) => item.evidence_class === "document").length,
    workshop_source_count: classifications.filter((item) => item.evidence_class === "workshop").length,
    source_kinds: unique(classifications.map((item) => item.source_kind)),
    out_of_locked_scope_providers: unique(classifications.flatMap((item) => item.out_of_locked_scope_providers)),
  };
};
