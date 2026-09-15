import React, { useMemo, useState } from "react";
import type { AssessmentDomainPack, ProviderId } from "../domain-packs/assessment-domain-pack";
import {
  defaultRootKind,
  lockScope,
  type AssessmentScope,
  type AssessmentScopeDraft,
  type NamedEstateRoot,
  validateScopeDraft,
} from "../scope/step0Scope";
import {
  LZ_ENGINE_WORKSHOP_SESSION_SCHEMA,
  inventoryExportsIncludedFromChoice,
  workshopSessionHasContent,
  type LzEngineWorkshopSession,
  type WorkshopInventoryChoice,
} from "../scope/workshopSession";

const PROVIDER_LABELS: Record<ProviderId, string> = {
  azure: "Azure",
  aws: "AWS",
  gcp: "Google Cloud",
};

const PROVIDER_ORDER: ProviderId[] = ["azure", "aws", "gcp"];

const INVENTORY_CHOICES: Array<{ id: WorkshopInventoryChoice; label: string }> = [
  { id: "yes", label: "Yes" },
  { id: "partial", label: "Partial" },
  { id: "no", label: "No" },
];

const emptyRoots = (): NamedEstateRoot[] =>
  PROVIDER_ORDER.map((provider) => ({
    provider,
    kind: defaultRootKind(provider),
    reference: "",
    label: "",
  }));

const Field: React.FC<{
  label: string;
  children: React.ReactNode;
  className?: string;
}> = ({ label, children, className }) => (
  <label className={`block ${className || ""}`}>
    <span className="lz-field-label">{label}</span>
    {children}
  </label>
);

export const Step0ScopeForm: React.FC<{
  pack: AssessmentDomainPack;
  locked: AssessmentScope | null;
  workshopSession: LzEngineWorkshopSession;
  onWorkshopSessionChange: (session: LzEngineWorkshopSession) => void;
  onLock: (scope: AssessmentScope) => void;
  onUnlock: () => void;
}> = ({ pack, locked, workshopSession, onWorkshopSessionChange, onLock, onUnlock }) => {
  const areas = pack.designAreas;
  const [estateName, setEstateName] = useState("");
  const [providers, setProviders] = useState<ProviderId[]>(["azure"]);
  const [areaIds, setAreaIds] = useState<string[]>(areas.map((area) => area.id));
  const [roots, setRoots] = useState<NamedEstateRoot[]>(emptyRoots);
  const [inventoryChoice, setInventoryChoice] = useState<WorkshopInventoryChoice>("yes");
  const [exclusionNotes, setExclusionNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const draft: AssessmentScopeDraft = useMemo(
    () => ({
      estate_name: estateName,
      providers,
      estate_roots: roots.filter((root) => providers.includes(root.provider)),
      design_area_ids: areaIds,
      inventory_exports_included: inventoryExportsIncludedFromChoice(inventoryChoice),
      live_collection_permitted: false,
      exclusion_notes: exclusionNotes
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    }),
    [areaIds, estateName, exclusionNotes, inventoryChoice, providers, roots],
  );

  const codes = validateScopeDraft(draft, pack);

  const patchSession = (patch: Partial<LzEngineWorkshopSession>) => {
    onWorkshopSessionChange({
      ...workshopSession,
      schema_version: LZ_ENGINE_WORKSHOP_SESSION_SCHEMA,
      ...patch,
    });
  };

  const toggleProvider = (provider: ProviderId) => {
    setProviders((current) =>
      current.includes(provider) ? current.filter((id) => id !== provider) : [...current, provider],
    );
  };

  const toggleArea = (areaId: string) => {
    setAreaIds((current) =>
      current.includes(areaId) ? current.filter((id) => id !== areaId) : [...current, areaId],
    );
  };

  const updateRoot = (provider: ProviderId, patch: Partial<NamedEstateRoot>) => {
    setRoots((current) => current.map((root) => (root.provider === provider ? { ...root, ...patch } : root)));
  };

  const handleLock = () => {
    try {
      onLock(lockScope(draft, pack));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Step 0 scope is invalid.");
    }
  };

  if (locked) {
    const sessionShown = workshopSessionHasContent(workshopSession);
    return (
      <section className="lz-meta" aria-labelledby="step0-locked-title">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <p className="lz-kicker mb-3">Step 0 locked</p>
            <h2 id="step0-locked-title">{locked.estate_name}</h2>
            <p className="lz-section-help mb-3">
              {locked.providers.map((id) => PROVIDER_LABELS[id]).join(", ")} · design areas {locked.design_area_ids.join(", ")}
            </p>
            <ul className="text-sm text-[var(--lz-ink2)] mt-2 space-y-1">
              {locked.estate_roots.map((root) => (
                <li key={root.provider}>
                  {PROVIDER_LABELS[root.provider]} {root.kind}: {root.reference}
                  {root.label ? ` (${root.label})` : ""}
                </li>
              ))}
            </ul>
            <p className="text-sm text-[var(--lz-muted)] mt-3">
              Live inventory: {inventoryChoice === "yes" ? "Yes" : inventoryChoice === "partial" ? "Partial" : "No"} (file-set exports). Live cloud collection is not available.
            </p>
            {locked.exclusions.providers.length > 0 && (
              <p className="text-sm text-[var(--lz-orange)] mt-2">
                Out of scope providers: {locked.exclusions.providers.map((id) => PROVIDER_LABELS[id]).join(", ")} — not scored as zero.
              </p>
            )}
            {sessionShown && (
              <dl className="mt-4 grid gap-2 text-sm text-[var(--lz-ink2)]">
                {workshopSession.date && (
                  <>
                    <dt className="lz-field-label mb-0">Date</dt>
                    <dd className="m-0">{workshopSession.date}</dd>
                  </>
                )}
                {(workshopSession.start_time || workshopSession.end_time) && (
                  <>
                    <dt className="lz-field-label mb-0">Session time</dt>
                    <dd className="m-0">
                      {[workshopSession.start_time, workshopSession.end_time].filter(Boolean).join(" – ")}
                    </dd>
                  </>
                )}
                {workshopSession.facilitator && (
                  <>
                    <dt className="lz-field-label mb-0">Facilitator</dt>
                    <dd className="m-0">{workshopSession.facilitator}</dd>
                  </>
                )}
                {workshopSession.reference && (
                  <>
                    <dt className="lz-field-label mb-0">Workshop / Assessment reference</dt>
                    <dd className="m-0">{workshopSession.reference}</dd>
                  </>
                )}
                {workshopSession.participants && (
                  <>
                    <dt className="lz-field-label mb-0">Participants</dt>
                    <dd className="m-0 whitespace-pre-wrap">{workshopSession.participants}</dd>
                  </>
                )}
              </dl>
            )}
          </div>
          <button type="button" onClick={onUnlock} className="lz-btn">
            Unlock scope
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="lz-meta" aria-labelledby="step0-title">
      <h2 id="step0-title">Workshop details</h2>
      <p className="lz-section-help">
        Customer, clouds, tenant and design areas lock the playing field from Step 0 — the same
        basic metadata as the Interview &amp; Evidence Discovery Questionnaire. Facilitator, date
        and participants are optional workshop session fields only; they are not scored.
      </p>

      <div className="grid gap-3.5 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <Field label="Customer / Organization">
          <input
            value={estateName}
            onChange={(event) => setEstateName(event.target.value)}
            placeholder="Organization name"
            className="lz-field-input"
          />
        </Field>
        <Field label="Date">
          <input
            type="date"
            value={workshopSession.date || ""}
            onChange={(event) => patchSession({ date: event.target.value })}
            className="lz-field-input"
          />
        </Field>
        <Field label="Start time">
          <input
            type="time"
            value={workshopSession.start_time || ""}
            onChange={(event) => patchSession({ start_time: event.target.value })}
            className="lz-field-input"
          />
        </Field>
        <Field label="End time">
          <input
            type="time"
            value={workshopSession.end_time || ""}
            onChange={(event) => patchSession({ end_time: event.target.value })}
            className="lz-field-input"
          />
        </Field>
      </div>

      <div className="grid gap-3.5 md:grid-cols-4 mt-3.5">
        <Field label="Facilitator">
          <input
            value={workshopSession.facilitator || ""}
            onChange={(event) => patchSession({ facilitator: event.target.value })}
            placeholder="Name"
            className="lz-field-input"
          />
        </Field>
        <Field label="Workshop / Assessment reference">
          <input
            value={workshopSession.reference || ""}
            onChange={(event) => patchSession({ reference: event.target.value })}
            placeholder="Optional reference"
            className="lz-field-input"
          />
        </Field>
        <fieldset className="min-w-0">
          <legend className="lz-field-label">Cloud(s) in scope</legend>
          <div className="flex flex-wrap gap-2">
            {PROVIDER_ORDER.map((provider) => (
              <label
                key={provider}
                className={`flex items-center gap-2 text-sm cursor-pointer rounded-[11px] border px-3 py-2 ${
                  providers.includes(provider)
                    ? "border-[var(--lz-blue2)] bg-[var(--lz-soft)] text-[var(--lz-ink)]"
                    : "border-[#cfd9df] bg-white text-[var(--lz-ink2)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={providers.includes(provider)}
                  onChange={() => toggleProvider(provider)}
                  className="accent-[var(--lz-blue)]"
                />
                {PROVIDER_LABELS[provider]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="lz-field-label">Live inventory</legend>
          <div className="flex flex-wrap gap-2">
            {INVENTORY_CHOICES.map((choice) => (
              <label
                key={choice.id}
                className={`flex items-center gap-2 text-sm cursor-pointer rounded-[11px] border px-3 py-2 ${
                  inventoryChoice === choice.id
                    ? "border-[var(--lz-blue2)] bg-[var(--lz-soft)] text-[var(--lz-ink)]"
                    : "border-[#cfd9df] bg-white text-[var(--lz-ink2)]"
                }`}
              >
                <input
                  type="radio"
                  name="lz-live-inventory"
                  checked={inventoryChoice === choice.id}
                  onChange={() => setInventoryChoice(choice.id)}
                  className="accent-[var(--lz-blue)]"
                />
                {choice.label}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <p className="text-xs text-[var(--lz-muted)] mt-2">
        Inventory exports are included in the file set when Live inventory is Yes or Partial.
        Live cloud collection is not available in this release. Step 0 will not pretend a live read occurred.
      </p>

      <fieldset className="mt-5">
        <legend className="lz-field-label">Tenant / org / management account</legend>
        <div className="grid gap-3 md:grid-cols-2">
          {PROVIDER_ORDER.filter((provider) => providers.includes(provider)).map((provider) => {
            const root = roots.find((item) => item.provider === provider);
            return (
              <Field key={provider} label={`${PROVIDER_LABELS[provider]} named root`}>
                <input
                  value={root?.reference || ""}
                  onChange={(event) => updateRoot(provider, { reference: event.target.value })}
                  placeholder="Named root in scope"
                  className="lz-field-input"
                />
              </Field>
            );
          })}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="lz-field-label">Design areas in scope</legend>
        <div className="flex flex-wrap gap-3 mb-3">
          <button type="button" className="lz-btn" onClick={() => setAreaIds(areas.map((area) => area.id))}>
            Select all
          </button>
          <button type="button" className="lz-btn" onClick={() => setAreaIds([])}>
            Clear
          </button>
        </div>
        <div className="grid gap-3">
          {areas.map((area) => {
            const selected = areaIds.includes(area.id);
            const subtitle = area.workshop_themes?.[0];
            return (
              <label
                key={area.id}
                className={`flex items-start gap-4 cursor-pointer rounded-[18px] border px-4 py-3 ${
                  selected ? "border-[var(--lz-blue2)] bg-[var(--lz-soft)]" : "border-[var(--lz-line)] bg-white"
                }`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleArea(area.id)}
                  className="sr-only"
                />
                <span className={`lz-letter ${selected ? "lz-letter-on" : ""}`} aria-hidden="true">
                  {area.id}
                </span>
                <span className="min-w-0">
                  <span className="block text-[18px] font-bold tracking-[-0.02em] text-[var(--lz-ink)]">
                    {area.id} — {area.name}
                  </span>
                  {subtitle && (
                    <span className="block text-sm text-[var(--lz-muted)] mt-0.5">{subtitle}</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <Field label="Additional exclusions" className="mt-5">
        <textarea
          value={exclusionNotes}
          onChange={(event) => setExclusionNotes(event.target.value)}
          rows={2}
          placeholder="Partner tenants, sandbox directories, or other named exclusions"
          className="lz-field-input min-h-[74px] resize-y"
        />
      </Field>

      <Field label="Participants" className="mt-3.5">
        <textarea
          value={workshopSession.participants || ""}
          onChange={(event) => patchSession({ participants: event.target.value })}
          placeholder="Names, roles and teams. One participant per line if useful."
          className="lz-field-input min-h-[74px] resize-y"
        />
      </Field>

      {error && <p className="text-sm text-rose-700 mt-4">{error}</p>}
      {codes.length > 0 && (
        <p className="text-xs text-[var(--lz-orange)] mt-4">Scope is not lockable yet: {codes.join(", ")}</p>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleLock}
          disabled={codes.length > 0}
          className="lz-btn lz-btn-primary px-6 py-3 rounded-[11px]"
        >
          Lock Step 0 scope
        </button>
      </div>
    </section>
  );
};
