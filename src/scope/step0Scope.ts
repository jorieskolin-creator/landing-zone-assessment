/**
 * Step 0 assessment scope.
 *
 * Landing Zone scoring starts only after a named estate, providers, and
 * design areas are locked. Out-of-scope providers are omitted from the
 * scoring surface; they are not scored as zero.
 */
import type { AssessmentDomainPack, ProviderId, ProviderKind } from "../domain-packs/assessment-domain-pack";
import { LANDING_ZONE_PACK } from "../domain-packs/loadLandingZonePack";

export const STEP0_SCOPE_SCHEMA_VERSION = "lz_step0_scope_v1" as const;

export type EstateRootKind =
  | "tenant"
  | "organization"
  | "management_account"
  | "billing_account"
  | "folder"
  | "other";

export interface NamedEstateRoot {
  provider: ProviderId;
  kind: EstateRootKind;
  reference: string;
  label?: string;
}

export interface AssessmentScopeExclusions {
  providers: ProviderId[];
  design_area_ids: string[];
  notes: string[];
}

export interface AssessmentScope {
  schema_version: typeof STEP0_SCOPE_SCHEMA_VERSION;
  pack_id: string;
  pack_version: string;
  estate_name: string;
  providers: ProviderId[];
  estate_roots: NamedEstateRoot[];
  design_area_ids: string[];
  inventory_exports_included: boolean;
  live_collection_permitted: false;
  exclusions: AssessmentScopeExclusions;
  locked_at: string;
}

export interface AssessmentScopeDraft {
  estate_name?: string;
  providers?: ProviderId[];
  estate_roots?: NamedEstateRoot[];
  design_area_ids?: string[];
  inventory_exports_included?: boolean;
  live_collection_permitted?: boolean;
  exclusion_notes?: string[];
}

export type ScopeValidationCode =
  | "UNNAMED_ESTATE"
  | "NO_PROVIDERS"
  | "UNKNOWN_PROVIDER"
  | "DUPLICATE_PROVIDER"
  | "NO_DESIGN_AREAS"
  | "UNKNOWN_DESIGN_AREA"
  | "DUPLICATE_DESIGN_AREA"
  | "MISSING_ESTATE_ROOT"
  | "UNKNOWN_ESTATE_ROOT_PROVIDER"
  | "LIVE_COLLECTION_NOT_AVAILABLE"
  | "PACK_MISMATCH";

export class Step0ScopeError extends Error {
  readonly code: ScopeValidationCode;
  readonly publication: "BLOCK";

  constructor(code: ScopeValidationCode, message: string) {
    super(`STEP0_SCOPE_INVALID: ${code}: ${message}`);
    this.name = "Step0ScopeError";
    this.code = code;
    this.publication = "BLOCK";
  }
}

export interface ScoringSurfaceInstance {
  provider: ProviderId;
  criterion_id: string;
  design_area_id: string;
  stream: "capability" | "antipattern";
  kind: ProviderKind;
  applicability: "applicable" | "not_applicable" | "out_of_scope";
}

export interface ScoringSurface {
  scope: AssessmentScope;
  providers: ProviderId[];
  design_area_ids: string[];
  excluded_providers: ProviderId[];
  excluded_design_area_ids: string[];
  instances: ScoringSurfaceInstance[];
  denominator_instances: ScoringSurfaceInstance[];
}

const PACK_PROVIDERS: ProviderId[] = ["azure", "aws", "gcp"];
const ROOT_KINDS = new Set<EstateRootKind>([
  "tenant",
  "organization",
  "management_account",
  "billing_account",
  "folder",
  "other",
]);

const unique = <T,>(values: T[]): T[] => [...new Set(values)];

const trim = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

export const packProviderIds = (pack: AssessmentDomainPack = LANDING_ZONE_PACK): ProviderId[] => {
  const fromPack = (pack.providers as { providers?: string[] }).providers;
  if (Array.isArray(fromPack) && fromPack.length > 0) {
    return fromPack.filter((id): id is ProviderId => PACK_PROVIDERS.includes(id as ProviderId));
  }
  return [...PACK_PROVIDERS];
};

export const packDesignAreaIds = (pack: AssessmentDomainPack = LANDING_ZONE_PACK): string[] =>
  pack.designAreas.map((area) => area.id);

export const defaultRootKind = (provider: ProviderId): EstateRootKind => {
  if (provider === "azure") return "tenant";
  if (provider === "aws") return "management_account";
  return "organization";
};

export const demoAssessmentScopeDraft = (): AssessmentScopeDraft => ({
  estate_name: "Northstar Retail Demo Pack",
  providers: ["azure", "aws", "gcp"],
  estate_roots: [
    { provider: "azure", kind: "tenant", reference: "contoso.onmicrosoft.com", label: "Contoso Entra tenant" },
    { provider: "aws", kind: "management_account", reference: "111122223333", label: "Northstar payer" },
    { provider: "gcp", kind: "organization", reference: "organizations/123456789012", label: "Northstar org" },
  ],
  design_area_ids: packDesignAreaIds(),
  inventory_exports_included: true,
  live_collection_permitted: false,
  exclusion_notes: [],
});

export const validateScopeDraft = (
  draft: AssessmentScopeDraft,
  pack: AssessmentDomainPack = LANDING_ZONE_PACK,
): ScopeValidationCode[] => {
  const codes: ScopeValidationCode[] = [];
  const knownProviders = new Set(packProviderIds(pack));
  const knownAreas = new Set(packDesignAreaIds(pack));
  const estateName = trim(draft.estate_name);
  if (!estateName) codes.push("UNNAMED_ESTATE");

  const providers = draft.providers || [];
  if (providers.length === 0) codes.push("NO_PROVIDERS");
  if (unique(providers).length !== providers.length) codes.push("DUPLICATE_PROVIDER");
  for (const provider of providers) {
    if (!knownProviders.has(provider)) codes.push("UNKNOWN_PROVIDER");
  }

  const areas = draft.design_area_ids || [];
  if (areas.length === 0) codes.push("NO_DESIGN_AREAS");
  if (unique(areas).length !== areas.length) codes.push("DUPLICATE_DESIGN_AREA");
  for (const areaId of areas) {
    if (!knownAreas.has(areaId)) codes.push("UNKNOWN_DESIGN_AREA");
  }

  const roots = draft.estate_roots || [];
  const selected = new Set(providers.filter((id) => knownProviders.has(id)));
  for (const provider of selected) {
    const root = roots.find((item) => item.provider === provider && trim(item.reference));
    if (!root) codes.push("MISSING_ESTATE_ROOT");
  }
  for (const root of roots) {
    if (root.provider && !knownProviders.has(root.provider)) codes.push("UNKNOWN_ESTATE_ROOT_PROVIDER");
    if (root.kind && !ROOT_KINDS.has(root.kind)) codes.push("UNKNOWN_ESTATE_ROOT_PROVIDER");
  }

  if (draft.live_collection_permitted === true) codes.push("LIVE_COLLECTION_NOT_AVAILABLE");
  return unique(codes);
};

export const assertScoringMayBegin = (
  draft: AssessmentScopeDraft | AssessmentScope | undefined | null,
  pack: AssessmentDomainPack = LANDING_ZONE_PACK,
): void => {
  if (!draft) {
    throw new Step0ScopeError("UNNAMED_ESTATE", "Scoring cannot begin without a locked Step 0 scope object.");
  }
  const codes = validateScopeDraft(draft, pack);
  if (codes.length > 0) {
    const code = codes[0];
    const message =
      code === "UNNAMED_ESTATE"
        ? "Scoring against an unnamed estate is a BLOCK."
        : `Step 0 scope is invalid (${codes.join(", ")}).`;
    throw new Step0ScopeError(code, message);
  }
};

export const lockScope = (
  draft: AssessmentScopeDraft,
  pack: AssessmentDomainPack = LANDING_ZONE_PACK,
  now = new Date(),
): AssessmentScope => {
  assertScoringMayBegin(draft, pack);
  const providers = unique(draft.providers || []);
  const designAreaIds = unique(draft.design_area_ids || []);
  const packProviders = packProviderIds(pack);
  const packAreas = packDesignAreaIds(pack);
  const roots = (draft.estate_roots || [])
    .filter((root) => providers.includes(root.provider) && trim(root.reference))
    .map((root) => ({
      provider: root.provider,
      kind: ROOT_KINDS.has(root.kind) ? root.kind : defaultRootKind(root.provider),
      reference: trim(root.reference),
      ...(trim(root.label) ? { label: trim(root.label) } : {}),
    }));
  const scope: AssessmentScope = {
    schema_version: STEP0_SCOPE_SCHEMA_VERSION,
    pack_id: pack.packId,
    pack_version: pack.version,
    estate_name: trim(draft.estate_name),
    providers,
    estate_roots: roots,
    design_area_ids: designAreaIds,
    inventory_exports_included: Boolean(draft.inventory_exports_included),
    live_collection_permitted: false,
    exclusions: {
      providers: packProviders.filter((id) => !providers.includes(id)),
      design_area_ids: packAreas.filter((id) => !designAreaIds.includes(id)),
      notes: (draft.exclusion_notes || []).map(trim).filter(Boolean),
    },
    locked_at: now.toISOString(),
  };
  return Object.freeze({
    ...scope,
    providers: Object.freeze([...scope.providers]),
    estate_roots: Object.freeze(scope.estate_roots.map((root) => Object.freeze({ ...root }))),
    design_area_ids: Object.freeze([...scope.design_area_ids]),
    exclusions: Object.freeze({
      providers: Object.freeze([...scope.exclusions.providers]),
      design_area_ids: Object.freeze([...scope.exclusions.design_area_ids]),
      notes: Object.freeze([...scope.exclusions.notes]),
    }),
  }) as AssessmentScope;
};

export const isProviderInScope = (scope: AssessmentScope, provider: string): boolean =>
  scope.providers.includes(provider as ProviderId);

export const isDesignAreaInScope = (scope: AssessmentScope, designAreaId: string): boolean =>
  scope.design_area_ids.includes(designAreaId);

export const loadScoringSurface = (
  scope: AssessmentScope,
  pack: AssessmentDomainPack = LANDING_ZONE_PACK,
): ScoringSurface => {
  assertScoringMayBegin(scope, pack);
  if (scope.pack_id !== pack.packId) {
    throw new Step0ScopeError("PACK_MISMATCH", `Scope pack ${scope.pack_id} does not match ${pack.packId}.`);
  }
  const records = pack.providers.records || [];
  const byId = new Map(records.map((record) => [record.id, record]));
  const instances: ScoringSurfaceInstance[] = [];
  for (const criterion of pack.criteria) {
    if (!isDesignAreaInScope(scope, criterion.design_area_id)) continue;
    const record = byId.get(criterion.id);
    for (const provider of scope.providers) {
      const mapping = record?.providers?.[provider];
      instances.push({
        provider,
        criterion_id: criterion.id,
        design_area_id: criterion.design_area_id,
        stream: criterion.stream,
        kind: mapping?.kind || "mapped",
        applicability: mapping?.applicability || "applicable",
      });
    }
  }
  return {
    scope,
    providers: [...scope.providers],
    design_area_ids: [...scope.design_area_ids],
    excluded_providers: [...scope.exclusions.providers],
    excluded_design_area_ids: [...scope.exclusions.design_area_ids],
    instances,
    denominator_instances: instances.filter((item) => item.applicability === "applicable"),
  };
};

export const scoringSurfaceSummary = (surface: ScoringSurface) => ({
  estate_name: surface.scope.estate_name,
  providers: surface.providers,
  design_area_ids: surface.design_area_ids,
  excluded_providers: surface.excluded_providers,
  excluded_design_area_ids: surface.excluded_design_area_ids,
  criterion_instance_count: surface.instances.length,
  denominator_instance_count: surface.denominator_instances.length,
  inventory_exports_included: surface.scope.inventory_exports_included,
  live_collection_permitted: surface.scope.live_collection_permitted,
});
