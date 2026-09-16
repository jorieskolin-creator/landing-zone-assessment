import React from "react";

export const IntakeHero: React.FC<{
  loading: boolean;
  onSimulate: () => void;
}> = ({ loading, onSimulate }) => (
  <section className="mb-10 pb-10 border-b border-[var(--lz-line)]">
    <div className="lz-kicker">Landing Zone Engine · Forensic assessment</div>
    <h2 className="text-[clamp(36px,5vw,64px)] leading-[1.02] tracking-[-0.045em] font-bold max-w-[980px] m-0 mb-6 text-[var(--lz-ink)]">
      Landing Zone Assessment Engine
    </h2>
    <p className="max-w-[880px] text-lg text-[var(--lz-ink2)] m-0 mb-7">
      Forensic assessment of a named landing-zone estate against design areas A–H.
      Use it as a standalone tool, or after the Interview &amp; Evidence Discovery Questionnaire —
      workshop details below match that questionnaire so customer, clouds, tenant and design areas
      describe the same playing field either way.
    </p>
    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-8">
      <a
        href="/Landing_Zone_Assessment_Summary_Report.html"
        target="_blank"
        rel="noopener noreferrer"
        className="lz-btn inline-flex items-center gap-2"
      >
        <span>Assessment Summary</span>
      </a>
      <a
        href="/Landing_Zone_Assessment_Master_Data_Report.html"
        target="_blank"
        rel="noopener noreferrer"
        className="lz-btn inline-flex items-center gap-2"
      >
        <span>Master Data</span>
      </a>
      <button
        type="button"
        onClick={onSimulate}
        disabled={loading}
        className="lz-btn lz-btn-primary inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Run the real engine against a bundled synthetic demo pack"
      >
        <span>Engine - Simulation</span>
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-[18px]">
      <div className="lz-info-card">
        <strong>How to use this engine</strong>
        Lock Step 0 with the same basic metadata as the questionnaire, then upload inventory
        exports, documents and optional workshop JSON. Scoring cannot start against an unnamed estate.
      </div>
      <div className="lz-info-card">
        <strong>Evidence path</strong>
        <div className="lz-flow">Interview observation → Evidence lead → Evidence acquisition → Landing Zone Engine verification</div>
      </div>
      <div className="lz-info-card discipline">
        <strong>Workshop does not replace inventory</strong>
        Live inventory here means file-set exports (Yes / Partial / No), not a live cloud API read.
        Prefer hierarchy exports, role assignments, policy, logs and IaC over recollection.
      </div>
    </div>
  </section>
);
