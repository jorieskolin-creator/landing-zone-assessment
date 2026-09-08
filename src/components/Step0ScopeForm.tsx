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

const PROVIDER_LABELS: Record<ProviderId, string> = {
  azure: "Azure",
  aws: "AWS",
  gcp: "Google Cloud",
};

const PROVIDER_ORDER: ProviderId[] = ["azure", "aws", "gcp"];

const emptyRoots = (): NamedEstateRoot[] =>
  PROVIDER_ORDER.map((provider) => ({
    provider,
    kind: defaultRootKind(provider),
    reference: "",
    label: "",
  }));

export const Step0ScopeForm: React.FC<{
  pack: AssessmentDomainPack;
  locked: AssessmentScope | null;
  onLock: (scope: AssessmentScope) => void;
  onUnlock: () => void;
}> = ({ pack, locked, onLock, onUnlock }) => {
  const areas = pack.designAreas;
  const [estateName, setEstateName] = useState("");
  const [providers, setProviders] = useState<ProviderId[]>(["azure"]);
  const [areaIds, setAreaIds] = useState<string[]>(areas.map((area) => area.id));
  const [roots, setRoots] = useState<NamedEstateRoot[]>(emptyRoots);
  const [inventoryExports, setInventoryExports] = useState(true);
  const [exclusionNotes, setExclusionNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const draft: AssessmentScopeDraft = useMemo(
    () => ({
      estate_name: estateName,
      providers,
      estate_roots: roots.filter((root) => providers.includes(root.provider)),
      design_area_ids: areaIds,
      inventory_exports_included: inventoryExports,
      live_collection_permitted: false,
      exclusion_notes: exclusionNotes
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    }),
    [areaIds, estateName, exclusionNotes, inventoryExports, providers, roots],
  );

  const codes = validateScopeDraft(draft, pack);

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
    return (
      <section className="glass-panel rounded-[2rem] border border-emerald-500/30 p-8 mb-8" aria-labelledby="step0-locked-title">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-emerald-400 mb-2">Step 0 locked</p>
            <h3 id="step0-locked-title" className="text-2xl font-display font-bold text-white">
              {locked.estate_name}
            </h3>
            <p className="text-sm text-slate-300 mt-2">
              {locked.providers.map((id) => PROVIDER_LABELS[id]).join(", ")} · design areas {locked.design_area_ids.join(", ")}
            </p>
            <ul className="text-xs text-slate-400 mt-2 space-y-1">
              {locked.estate_roots.map((root) => (
                <li key={root.provider}>
                  {PROVIDER_LABELS[root.provider]} {root.kind}: {root.reference}
                  {root.label ? ` (${root.label})` : ""}
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-400 mt-2">
              Inventory exports: {locked.inventory_exports_included ? "included" : "not included"}. Live collection is not available.
            </p>
            {locked.exclusions.providers.length > 0 && (
              <p className="text-xs text-amber-300 mt-2">
                Out of scope providers: {locked.exclusions.providers.map((id) => PROVIDER_LABELS[id]).join(", ")} — not scored as zero.
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onUnlock}
            className="text-xs font-bold uppercase tracking-widest text-slate-300 hover:text-white border border-slate-600 hover:border-white px-4 py-2 rounded-lg"
          >
            Unlock scope
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="glass-panel rounded-[2rem] border border-white/10 p-8 mb-8" aria-labelledby="step0-title">
      <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-cyan-400 mb-2">Step 0</p>
      <h3 id="step0-title" className="text-2xl font-display font-bold text-white mb-2">
        Name the estate before intake
      </h3>
      <p className="text-sm text-slate-300 mb-6 max-w-3xl">
        Scoring cannot begin against an unnamed estate. Select clouds, named roots, and design areas A–H. Unselected clouds are omitted, not scored as zero.
      </p>

      <div className="grid gap-6">
        <label className="block">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Named estate</span>
          <input
            value={estateName}
            onChange={(event) => setEstateName(event.target.value)}
            placeholder="Customer platform / tenant name"
            className="mt-2 w-full rounded-xl bg-slate-900/80 border border-slate-700 text-white px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none"
          />
        </label>

        <fieldset>
          <legend className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Providers in scope</legend>
          <div className="flex flex-wrap gap-3">
            {PROVIDER_ORDER.map((provider) => (
              <label key={provider} className="flex items-center gap-2 text-sm text-slate-200 bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={providers.includes(provider)}
                  onChange={() => toggleProvider(provider)}
                  className="accent-emerald-500"
                />
                {PROVIDER_LABELS[provider]}
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Named roots</legend>
          <div className="grid gap-3">
            {PROVIDER_ORDER.filter((provider) => providers.includes(provider)).map((provider) => {
              const root = roots.find((item) => item.provider === provider);
              return (
                <label key={provider} className="block">
                  <span className="text-xs text-slate-400">{PROVIDER_LABELS[provider]} tenant / org / management account</span>
                  <input
                    value={root?.reference || ""}
                    onChange={(event) => updateRoot(provider, { reference: event.target.value })}
                    placeholder="User-supplied ID or name"
                    className="mt-1 w-full rounded-xl bg-slate-900/80 border border-slate-700 text-white px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none"
                  />
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-3">Design areas</legend>
          <div className="flex flex-wrap gap-2 mb-3">
            <button type="button" className="text-[10px] uppercase tracking-widest text-emerald-300" onClick={() => setAreaIds(areas.map((area) => area.id))}>
              Select all
            </button>
            <button type="button" className="text-[10px] uppercase tracking-widest text-slate-400" onClick={() => setAreaIds([])}>
              Clear
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {areas.map((area) => (
              <label key={area.id} className="flex items-start gap-2 text-sm text-slate-200 bg-slate-900/60 border border-slate-700 rounded-lg px-3 py-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={areaIds.includes(area.id)}
                  onChange={() => toggleArea(area.id)}
                  className="accent-emerald-500 mt-1"
                />
                <span><span className="font-bold text-emerald-300">{area.id}</span> {area.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <label className="flex items-center gap-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={inventoryExports}
            onChange={(event) => setInventoryExports(event.target.checked)}
            className="accent-emerald-500"
          />
          Inventory exports are included in the file set
        </label>
        <p className="text-xs text-slate-500 -mt-3">Live cloud collection is not available in this release. Step 0 will not pretend a live read occurred.</p>

        <label className="block">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-400">Additional exclusions</span>
          <textarea
            value={exclusionNotes}
            onChange={(event) => setExclusionNotes(event.target.value)}
            rows={2}
            placeholder="Partner tenants, sandbox directories, or other named exclusions"
            className="mt-2 w-full rounded-xl bg-slate-900/80 border border-slate-700 text-white px-4 py-3 text-sm focus:border-emerald-400 focus:outline-none"
          />
        </label>
      </div>

      {error && <p className="text-sm text-rose-400 mt-4">{error}</p>}
      {codes.length > 0 && (
        <p className="text-xs text-amber-300 mt-4">Scope is not lockable yet: {codes.join(", ")}</p>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={handleLock}
          disabled={codes.length > 0}
          className={`px-6 py-3 rounded-xl font-bold border ${
            codes.length > 0
              ? "bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed"
              : "bg-white text-slate-900 border-white hover:bg-emerald-400 hover:border-emerald-400"
          }`}
        >
          Lock Step 0 scope
        </button>
      </div>
    </section>
  );
};
