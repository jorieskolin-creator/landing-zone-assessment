import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { renderMasterDataHtml } from './lz-master-data-html.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const criteria = JSON.parse(await readFile(new URL('../src/domain-packs/landing-zone/criteria.json', import.meta.url), 'utf8'));
const antipatterns = JSON.parse(await readFile(new URL('../src/domain-packs/landing-zone/antipatterns.json', import.meta.url), 'utf8'));
const taxonomy = JSON.parse(await readFile(new URL('../src/domain-packs/landing-zone/taxonomy.json', import.meta.url), 'utf8'));

const areaName = Object.fromEntries(taxonomy.design_areas.map(area => [area.id, area.name]));

const capState = {
  A1: 'gap', A2: 'partial', A3: 'good', A4: 'good', A5: 'partial',
  B1: 'gap', B2: 'partial', B3: 'good', B4: 'good', B5: 'partial',
  C1: 'good', C2: 'good', C3: 'partial', C4: 'gap', C5: 'good',
  D1: 'good', D2: 'good', D3: 'good', D4: 'partial', D5: 'partial',
  E1: 'good', E2: 'partial', E3: 'good', E4: 'good', E5: 'good',
  F1: 'good', F2: 'partial', F3: 'good', F4: 'good', F5: 'good',
  G1: 'good', G2: 'partial', G3: 'gap', G4: 'good', G5: 'good',
  H1: 'partial', H2: 'gap', H3: 'partial', H4: 'good', H5: 'partial',
};

const apState = {
  'AP-A1': 'gap', 'AP-A2': 'partial', 'AP-A3': 'tested-absent', 'AP-A4': 'tested-absent', 'AP-A5': 'tested-absent',
  'AP-B1': 'gap', 'AP-B2': 'partial', 'AP-B3': 'tested-absent', 'AP-B4': 'tested-absent', 'AP-B5': 'partial',
  'AP-C1': 'tested-absent', 'AP-C2': 'tested-absent', 'AP-C3': 'partial', 'AP-C4': 'gap', 'AP-C5': 'tested-absent',
  'AP-D1': 'tested-absent', 'AP-D2': 'tested-absent', 'AP-D3': 'tested-absent', 'AP-D4': 'partial', 'AP-D5': 'partial',
  'AP-E1': 'tested-absent', 'AP-E2': 'partial', 'AP-E3': 'tested-absent', 'AP-E4': 'tested-absent', 'AP-E5': 'tested-absent',
  'AP-F1': 'tested-absent', 'AP-F2': 'partial', 'AP-F3': 'tested-absent', 'AP-F4': 'tested-absent', 'AP-F5': 'tested-absent',
  'AP-G1': 'tested-absent', 'AP-G2': 'partial', 'AP-G3': 'gap', 'AP-G4': 'tested-absent', 'AP-G5': 'tested-absent',
  'AP-H1': 'partial', 'AP-H2': 'gap', 'AP-H3': 'partial', 'AP-H4': 'tested-absent', 'AP-H5': 'partial',
};

const capNote = {
  gap: 'Below target on locked evidence.',
  partial: 'Present with unsatisfied sub-criteria.',
  good: 'Locked evidence satisfies the three tests.',
};

const apNote = {
  gap: 'Locked PRESENT in the in-scope estate.',
  partial: 'Locked PARTIAL; residual instances remain.',
  'tested-absent': 'Tested absent on the supplied exports.',
};

const label = {
  gap: 'Gap',
  partial: 'Partial',
  good: 'Met',
  'tested-absent': 'Absent',
};

const heatClass = {
  gap: 'heat-gap',
  partial: 'heat-partial',
  good: 'heat-good',
  'tested-absent': 'heat-tested-absent',
};

const escape = value => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const gauge = (value, title, color, description, trend, denominator) => {
  const w = 180;
  const r = 56;
  const stroke = 8;
  const cx = w / 2;
  const cy = r + stroke;
  const svgH = cy + 24;
  const arcLen = Math.PI * r;
  const filled = (value / 100) * arcLen;
  const empty = arcLen - filled;
  return `
  <div class="gauge-card">
    <svg viewBox="0 0 ${w} ${svgH}" class="gauge-svg" preserveAspectRatio="xMidYMid meet">
      <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="#e2e8f0" stroke-width="${stroke}" stroke-linecap="round" />
      <path d="M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}" fill="none" stroke="${color}" stroke-width="${stroke}" stroke-linecap="round" stroke-dasharray="${filled.toFixed(2)} ${empty.toFixed(2)}" />
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" font-family="system-ui, -apple-system, sans-serif" font-weight="800" font-size="28" fill="#0f172a">${value}<tspan font-size="14" font-weight="500" fill="#64748b" dx="2">%</tspan></text>
    </svg>
    <h3 class="gauge-label">${escape(title)}</h3>
    <p class="gauge-desc">${escape(description)}</p>
    <p class="gauge-denominator">${escape(denominator)}</p>
    <div class="gauge-trend">${trend}</div>
  </div>`;
};

const cell = (id, title, state, notes) => `
          <div class="compact-heat-cell ${heatClass[state]}">
            <div class="compact-heat-head">
              <strong>${escape(id)}</strong>
              <span>${escape(label[state])}</span>
            </div>
            <h4>${escape(title)}</h4>
            <p>${escape(notes[state])}</p>
          </div>`;

const rowsFor = (items, stateMap, notes) => ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(area => {
  const rowItems = items.filter(item => item.design_area_id === area);
  return `
        <div class="compact-heatmap-row">
          <div class="compact-heatmap-batch"><strong>${area}</strong><span>${escape(areaName[area])}</span></div>
          <div class="compact-heatmap-cells">
            ${rowItems.map(item => cell(item.id, item.title, stateMap[item.id], notes)).join('')}
          </div>
        </div>`;
}).join('');

const signalTone = (maturity, finding) => {
  if (finding === 'gap') return { cls: 'signal-red', maturityLabel: 'Below target', findingLabel: 'Confirmed finding' };
  if (finding === 'partial' || maturity === 'partial') return { cls: 'signal-yellow', maturityLabel: maturity === 'good' ? 'On target' : 'Mixed', findingLabel: finding === 'tested-absent' ? 'Tested absent' : 'Partial finding' };
  if (maturity === 'good' && finding === 'tested-absent') return { cls: 'signal-green', maturityLabel: 'On target', findingLabel: 'Tested absent' };
  return { cls: 'signal-yellow', maturityLabel: 'Mixed', findingLabel: 'Review' };
};

const areaMaturity = area => {
  const states = criteria.criteria.filter(item => item.design_area_id === area).map(item => capState[item.id]);
  if (states.includes('gap')) return 'gap';
  if (states.includes('partial')) return 'partial';
  return 'good';
};

const areaFinding = area => {
  const states = antipatterns.criteria.filter(item => item.design_area_id === area).map(item => apState[item.id]);
  if (states.includes('gap')) return 'gap';
  if (states.includes('partial')) return 'partial';
  return 'tested-absent';
};

const domainCards = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(area => {
  const maturity = areaMaturity(area);
  const finding = areaFinding(area);
  const tone = signalTone(maturity, finding);
  const capScore = { good: '3/3', partial: '2/3', gap: '1/3' }[maturity];
  const apScore = { 'tested-absent': '0', partial: '1', gap: '2' }[finding];
  return `
      <article class="domain-signal-card">
        <div class="domain-signal-head">
          <div>
            <span class="domain-signal-id">${area}</span>
            <h3>${escape(areaName[area])}</h3>
          </div>
          <span class="domain-signal-chip">${finding === 'gap' ? 'Action required' : maturity === 'good' ? 'Stable' : 'Watch'}</span>
        </div>
        <div class="domain-signal-metrics">
          <div class="domain-signal-metric">
            <div class="signal-label ${tone.cls}"><i class="${tone.cls}"></i> Maturity signal</div>
            <strong>${capScore}</strong>
            <p>${tone.maturityLabel} across the five capabilities.</p>
          </div>
          <div class="domain-signal-metric">
            <div class="signal-label ${tone.cls}"><i class="${tone.cls}"></i> Anti-pattern finding rate</div>
            <strong>${apScore}</strong>
            <p>${tone.findingLabel} on locked in-scope evidence.</p>
          </div>
        </div>
      </article>`;
}).join('');

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Landing Zone Assessment Summary</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: #f8fafc; color: #0f172a; line-height: 1.55; }
    .page { max-width: 1120px; margin: 0 auto; padding: 48px 28px 64px; }
    .hero { background: #0f172a; color: #fff; border-radius: 24px; padding: 36px; margin-bottom: 28px; }
    .hero h1 { margin: 0 0 10px; font-size: clamp(2rem, 5vw, 4.25rem); letter-spacing: -0.04em; line-height: 0.95; }
    .hero p { color: #cbd5e1; margin: 0; max-width: 760px; }
    .hero-meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 24px; }
    .pill { display: inline-flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 999px; background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.12); font-size: 0.82rem; font-weight: 700; color: #e2e8f0; }
    .pill-warn { color: #fde68a; }
    h2 { font-size: 1.55rem; margin: 2.5rem 0 1rem; letter-spacing: -0.02em; }
    h3 { margin: 0 0 0.55rem; font-size: 1rem; }
    ul { margin: 0; padding-left: 1.2rem; }
    li { margin: 0.35rem 0; }
    .section-lead { margin-top: -0.5rem; color: #64748b; }
    .actionability { display: grid; grid-template-columns: minmax(160px, 0.35fr) 1fr; gap: 18px 28px; align-items: center; background: #fff; border: 1px solid #e2e8f0; border-left: 5px solid #f59e0b; border-radius: 16px; padding: 22px; margin: 28px 0; box-shadow: 0 12px 35px rgba(15,23,42,0.05); }
    .actionability-primary span { display: block; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.68rem; font-weight: 800; }
    .actionability-primary strong { display: block; font-size: 2.4rem; line-height: 1; margin-top: 5px; }
    .actionability p { margin: 0; color: #334155; }
    .actionability-facts { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 8px; }
    .actionability-facts span { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 999px; padding: 6px 10px; color: #64748b; font-size: 0.76rem; }
    .sufficiency { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 22px; margin: 20px 0; box-shadow: 0 12px 35px rgba(15,23,42,0.05); }
    .gauge-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.25rem; align-items: stretch; }
    .gauge-card { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 1.5rem 1rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; }
    .gauge-svg { width: 100%; height: auto; max-width: 240px; }
    .gauge-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #475569; margin-top: 0.75rem; }
    .gauge-desc { font-size: 0.7rem; color: #64748b; margin-top: 0.5rem; line-height: 1.45; max-width: 18rem; }
    .gauge-denominator { color: #334155; font-size: 0.76rem; font-weight: 700; margin-top: 8px; }
    .gauge-trend { display: inline-block; margin-top: 0.75rem; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; background: #f1f5f9; padding: 0.25rem 0.6rem; border-radius: 999px; }
    .domain-signal-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; }
    .domain-signal-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; box-shadow: 0 12px 35px rgba(15,23,42,0.05); }
    .domain-signal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
    .domain-signal-id { display: block; color: #94a3b8; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.75rem; font-weight: 800; }
    .domain-signal-chip { border-radius: 999px; background: #f1f5f9; color: #64748b; padding: 4px 8px; font-size: 0.62rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap; }
    .domain-signal-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 10px; }
    .domain-signal-metric { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; }
    .signal-label { display: flex; align-items: center; gap: 7px; color: #64748b; font-size: 0.68rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; }
    .signal-label i { width: 11px; height: 11px; border-radius: 999px; display: inline-block; }
    .domain-signal-metric strong { display: block; font-size: 1.75rem; line-height: 1; margin-top: 9px; }
    .domain-signal-metric p { margin: 6px 0 0; color: #64748b; font-size: 0.78rem; }
    .signal-green { color: #047857; }
    .signal-yellow { color: #b45309; }
    .signal-red { color: #be123c; }
    .signal-label i.signal-green { background: #10b981; }
    .signal-label i.signal-yellow { background: #f59e0b; }
    .signal-label i.signal-red { background: #f43f5e; }
    .heatmap-explainer { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; margin: 14px 0 16px; }
    .heatmap-explainer div { background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; }
    .heatmap-explainer strong { display: block; color: #0f172a; }
    .heatmap-explainer span { display: block; color: #64748b; font-size: 0.86rem; margin-top: 3px; }
    .heatmap-legend { display: flex; flex-wrap: wrap; gap: 12px; margin: 0 0 16px; color: #475569; font-size: 0.82rem; }
    .heatmap-legend i { display: inline-block; width: 12px; height: 12px; border-radius: 4px; margin-right: 5px; vertical-align: -1px; }
    .compact-heatmap-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
    .compact-heatmap-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 18px; box-shadow: 0 12px 35px rgba(15,23,42,0.05); }
    .compact-heatmap-panel h3 { margin-bottom: 12px; }
    .compact-heatmap-row { display: grid; grid-template-columns: 150px 1fr; gap: 10px; align-items: stretch; padding: 8px 0; border-top: 1px solid #eef2f7; }
    .compact-heatmap-row:first-of-type { border-top: 0; }
    .compact-heatmap-batch strong { display: block; font-size: 1rem; }
    .compact-heatmap-batch span { color: #64748b; font-size: 0.74rem; }
    .compact-heatmap-cells { display: grid; grid-template-columns: repeat(5, minmax(84px, 1fr)); gap: 7px; }
    .compact-heat-cell { min-height: 172px; border-radius: 12px; padding: 12px; border: 1px solid; }
    .compact-heat-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
    .compact-heat-head strong { display: block; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.76rem; }
    .compact-heat-head span { display: inline-flex; align-items: center; justify-content: center; min-height: 22px; padding: 3px 7px; border-radius: 999px; background: rgba(255,255,255,0.55); border: 1px solid currentColor; font-size: 0.62rem; font-weight: 900; text-transform: uppercase; }
    .compact-heat-cell h4 { margin: 0 0 8px; color: #0f172a; font-size: 0.88rem; line-height: 1.18; }
    .compact-heat-cell p { margin: 0; color: #334155; font-size: 0.74rem; line-height: 1.38; }
    .heat-good { background: #d1fae5; border-color: #a7f3d0; color: #065f46; }
    .heat-tested-absent { background: #ecfdf5; border-color: #86efac; color: #166534; }
    .heat-partial { background: #fef3c7; border-color: #fde68a; color: #92400e; }
    .heat-gap { background: #ffe4e6; border-color: #fecdd3; color: #9f1239; }
    .exec-grid { display: grid; grid-template-columns: 1fr; gap: 18px; }
    .exec-lens { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 22px; box-shadow: 0 12px 35px rgba(15,23,42,0.05); }
    .exec-lens h3 { color: #047857; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.78rem; }
    .diagnosis-lead { border-left: 3px solid #10b981; padding-left: 14px; margin-bottom: 18px; }
    .diagnosis-lead span, .decision-card span, .roadmap-context span, .how-list span, .phase-kicker { display: block; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.68rem; font-weight: 800; }
    .diagnosis-lead p { margin: 4px 0 0; color: #334155; }
    .confidence-line { margin-top: 18px; padding-top: 14px; border-top: 1px solid #e2e8f0; color: #475569; font-size: 0.9rem; }
    .decision-card { background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; border-radius: 16px; padding: 22px; box-shadow: 0 12px 35px rgba(15,23,42,0.05); }
    .decision-card > div:first-child strong { display: block; font-size: 1.8rem; letter-spacing: -0.03em; }
    .roadmap-list { display: grid; gap: 18px; }
    .summary-roadmap-phase { background: #fff; border: 1px solid #e2e8f0; border-left: 4px solid #10b981; border-radius: 16px; padding: 22px; box-shadow: 0 12px 35px rgba(15,23,42,0.05); }
    .summary-roadmap-phase h3 { font-size: 1.2rem; }
    .roadmap-context { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; margin: 14px 0; }
    .roadmap-context div { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; }
    .roadmap-context p, .how-list p { margin: 4px 0 0; color: #334155; }
    .how-list { margin-top: 12px; }
    .footer { text-align: center; color: #94a3b8; font-size: 0.85rem; padding: 34px 0 10px; }
    .footer-disclaimer { max-width: 760px; margin: 12px auto 0; text-align: left; line-height: 1.55; color: #64748b; font-size: 0.78rem; }
    @media (max-width: 760px) {
      .page { padding: 24px 16px 44px; }
      .hero { padding: 26px; border-radius: 18px; }
      .actionability { grid-template-columns: 1fr; }
      .actionability-facts { grid-column: 1; }
      .gauge-grid { grid-template-columns: 1fr; }
      .compact-heatmap-row { grid-template-columns: 1fr; }
      .compact-heatmap-cells { grid-template-columns: repeat(2, minmax(120px, 1fr)); }
    }
    @media print {
      body { background: #fff; }
      .page { max-width: none; padding: 24px; }
      .summary-roadmap-phase, .gauge-card, .domain-signal-card { page-break-inside: avoid; box-shadow: none; }
    }
  </style>
</head>
<body>
  <main class="page">
    <header class="hero">
      <h1>Landing Zone Assessment Summary</h1>
      <p>A shareable view of the validated assessment: executive interpretation, evidence-gated maturity, diagnosis, planning decision, roadmap, and heatmap. Detailed forensic evidence remains in the Master Data report.</p>
      <div class="hero-meta">
        <span class="pill">Generated 16 September 2026, 08:42 UTC</span>
        <span class="pill pill-warn">Maturity band Pilot</span>
        <span class="pill pill-warn">Quality Gate WARN</span>
        <span class="pill">Evidence 74%</span>
        <span class="pill">Azure + AWS · design areas A–H</span>
        <span class="pill">Pack v1.0.0 · Playbook v1.0.0</span>
      </div>
    </header>

    <section class="actionability">
      <div class="actionability-primary">
        <span>Roadmap actionability</span>
        <strong>WARN</strong>
      </div>
      <p>The assessment is usable with the listed evidence and strategy limitations. Confirmed anti-patterns in organization construct, identity, resource vending and platform automation require controlled remediation before a production transition is authorized.</p>
      <div class="actionability-facts">
        <span>Planning decision CONDITIONAL_GO</span>
        <span>Assessment sufficiency PASS</span>
        <span>Providers not blended</span>
        <span>Unknowns retained, not scored as zero</span>
      </div>
    </section>

    <section class="sufficiency">
      <h2>Assessment Sufficiency</h2>
      <p class="section-lead">Scoring authority is retained. Knowledge Base completeness is excluded from this gate.</p>
      <p>Criterion evidence density is 74% and overall pair resolution is 81%. No silent design area fell below the 10% density floor. Provenance integrity is 100%. Verification-unresolved count is 0.</p>
    </section>

    <section>
      <h2>Assessment Metrics</h2>
      <div class="gauge-grid">
        ${gauge(61, 'Corroborated maturity', '#047857', 'Pair-resolved capability health after anti-pattern corroboration.', 'High = Good', 'Resolution-based formula v1')}
        ${gauge(67, 'Observed maturity', '#0f766e', 'Direct capability signal before corroboration discount.', 'High = Good', '40 capabilities · A–H')}
        ${gauge(74, 'Evidence density', '#1d4ed8', 'Share of the scoring surface with provenance-bound quotes.', 'High = Good', 'Locked Step 0 estate')}
      </div>
    </section>

    <section>
      <h2>Domain Signal Overview</h2>
      <p class="section-lead">Traffic lights are per design area. Azure and AWS were scored on separate provider surfaces; headline figures use the Azure surface where both providers were in scope.</p>
      <div class="domain-signal-grid">${domainCards}</div>
    </section>

    <section>
      <h2>Criterion heatmap</h2>
      <p class="section-lead">Each cell is a frozen catalogue criterion. Framework text is not treated as customer evidence.</p>
      <div class="heatmap-explainer">
        <div><strong>Capability tests</strong><span>Met / Partial / Gap against the three sub-criteria.</span></div>
        <div><strong>Anti-pattern tests</strong><span>Present, partial, or tested absent on the same locked scope.</span></div>
      </div>
      <div class="heatmap-legend">
        <span><i style="background:#d1fae5;border:1px solid #a7f3d0"></i> Met / tested absent</span>
        <span><i style="background:#fef3c7;border:1px solid #fde68a"></i> Partial</span>
        <span><i style="background:#ffe4e6;border:1px solid #fecdd3"></i> Gap / present</span>
      </div>
      <div class="compact-heatmap-grid">
        <div class="compact-heatmap-panel">
          <h3>Capability stream</h3>
          ${rowsFor(criteria.criteria, capState, capNote)}
        </div>
        <div class="compact-heatmap-panel">
          <h3>Anti-pattern stream</h3>
          ${rowsFor(antipatterns.criteria, apState, apNote)}
        </div>
      </div>
    </section>

    <section>
      <h2>Executive interpretation</h2>
      <div class="exec-grid">
        <article class="exec-lens">
          <h3>CISO and leadership</h3>
          <p>The in-scope estate has a declared Azure management group and AWS organization, but production still exists outside that root, and standing privileged human roles remain on both providers. Those two findings dominate residual risk. Network inspection, central DNS and the preventive security baseline are in place. Exemptions without expiry and ClickOps vending are the next decision items; they are not yet a production-authorization path.</p>
        </article>
        <article class="exec-lens">
          <h3>Platform Owner and Cloud Foundation</h3>
          <p>Hierarchy exports name mg-platform and o-7n4k as roots. Application landing zones exist, but a new subscription or account is still born from a portal path in two teams. Drift detection is partial. Guardrailed self-service works for the standard product path. Rebuild from code is not yet true for identity assignments or the AWS account factory exceptions.</p>
        </article>
        <article class="exec-lens">
          <h3>Identity, Network, Security, and SOC owners</h3>
          <p>Workforce federation is configured. Privileged access is eligible in Azure PIM for the platform group and standing in AWS IAM for three break-glass aliases that are not time-bound. Forced-path inspection is present on the hub. Defender and GuardDuty are centralized. Activity logs land in the platform log archive; triage ownership is named.</p>
        </article>
        <article class="exec-lens">
          <h3>Application and delivery teams</h3>
          <p>Teams can request a landing zone through the service catalogue. The birth baseline includes tags, private endpoints and the deny-for-insecure-defaults policy set. Owner rights at subscription scope are still granted to two product groups. Exceptions exist; three of them have no expiry.</p>
        </article>
      </div>
    </section>

    <section>
      <h2>Diagnosis</h2>
      <div class="diagnosis-lead">
        <span>Primary bottleneck</span>
        <p>Production outside the declared organization root, combined with standing privileged human access, prevents a clean control plane and a trustworthy identity boundary.</p>
      </div>
      <ul>
        <li>Azure: resource graph shows production resource groups in a second directory not listed in the Step 0 root set. [AP-A1]</li>
        <li>AWS: three IAM users in the management account hold AdministratorAccess without a duration or ticket. [AP-B1]</li>
        <li>Account vending still includes a documented portal exception path used in the last 30 days. [C4] [AP-H2]</li>
        <li>Policy exemptions for storage public access have owners but no expiry on either provider. [G3]</li>
      </ul>
      <p class="confidence-line">Confidence: medium. Exports are current and attributable. The second Azure directory was confirmed by hierarchy export, not by workshop recollection.</p>
    </section>

    <section>
      <h2>Planning decision</h2>
      <div class="decision-card">
        <div>
          <span>Decision</span>
          <strong>CONDITIONAL_GO</strong>
        </div>
        <p>Proceed with the contained remediation sequence. Do not authorize a production landing-zone transition, residual-risk acceptance, or a legal-compliance claim on the basis of this report.</p>
        <p><strong>Safe to act on:</strong> inventory and contain stray production; convert standing privileged roles to eligible time-bound access; close the portal vending exception; put expiry on public-access exemptions.</p>
        <p><strong>Evidence needed before further action:</strong> post-change hierarchy export for the second directory; AWS IAM credential report after break-glass conversion; vending pipeline run evidence for one new account.</p>
      </div>
    </section>

    <section>
      <h2>Remediation roadmap</h2>
      <p class="section-lead">Tactics are permissioned responses to locked findings. Completion creates evidence only; it does not change a score or clear a gate.</p>
      <div class="roadmap-list">
        <article class="summary-roadmap-phase">
          <span class="phase-kicker">Phase 1 · Contain</span>
          <h3>Close the unmanaged production estate</h3>
          <div class="roadmap-context">
            <div><span>Why</span><p>Locked finding AP-A1: production workloads exist outside the declared Azure and AWS roots.</p></div>
            <div><span>What</span><p>Inventory, contain and disposition every production object in the extra directory and unmanaged accounts. [TAC-ORG-AP-A1-01] [AP-A1]</p></div>
          </div>
          <div class="how-list">
            <span>How</span>
            <ul>
              <li>Freeze new deployment into the extra Azure directory and unmanaged AWS accounts.</li>
              <li>Export the full object inventory against the locked Step 0 scope.</li>
              <li>Migrate or retire production objects; record residual exceptions with owner and expiry.</li>
            </ul>
          </div>
        </article>
        <article class="summary-roadmap-phase">
          <span class="phase-kicker">Phase 1 · Contain</span>
          <h3>Remove standing privileged human access</h3>
          <div class="roadmap-context">
            <div><span>Why</span><p>Locked finding AP-B1: AdministratorAccess is standing on humans in the AWS management account; Azure PIM coverage is incomplete for equivalent roles.</p></div>
            <div><span>What</span><p>Convert privileged access to eligible, time-bound, logged elevation. [TAC-IDENTITY-AP-B1-01] [AP-B1]</p></div>
          </div>
          <div class="how-list">
            <span>How</span>
            <ul>
              <li>Disable the three standing AWS IAM users after a named break-glass path exists.</li>
              <li>Make the equivalent Azure roles PIM-eligible with approval and MFA.</li>
              <li>Retain the access review export as reassessment evidence.</li>
            </ul>
          </div>
        </article>
        <article class="summary-roadmap-phase">
          <span class="phase-kicker">Phase 2 · Replace</span>
          <h3>Birth every account from the vending pipeline</h3>
          <div class="roadmap-context">
            <div><span>Why</span><p>C4 is below target and AP-H2 is present: a portal exception path still creates accounts.</p></div>
            <div><span>What</span><p>Make the pipeline the only production birth path. [TAC-RESOURCE-C4-01] [TAC-AUTOMATION-AP-H2-01] [C4]</p></div>
          </div>
          <div class="how-list">
            <span>How</span>
            <ul>
              <li>Revoke the documented portal exception after a successful pipeline birth of a replacement account.</li>
              <li>Record the pipeline run, policy baseline at birth, and rollback test.</li>
            </ul>
          </div>
        </article>
        <article class="summary-roadmap-phase">
          <span class="phase-kicker">Phase 2 · Replace</span>
          <h3>Expiry-bound exemptions</h3>
          <div class="roadmap-context">
            <div><span>Why</span><p>G3 is unsatisfied: storage public-access exemptions have owners and no expiry.</p></div>
            <div><span>What</span><p>Require owner, rationale, expiry and compensating control on every exemption. [TAC-GOVERNANCE-G3-01] [G3]</p></div>
          </div>
          <div class="how-list">
            <span>How</span>
            <ul>
              <li>Attach expiry and review dates to the three open exemptions.</li>
              <li>Deny new exemptions without those fields in the policy pipeline.</li>
            </ul>
          </div>
        </article>
      </div>
    </section>

    <footer class="footer">
      <p>Landing Zone Engine v.2.0.0 · Summary Report</p>
      <p class="footer-disclaimer">This summary reports locked findings from supplied file-set exports. It does not read live cloud APIs, does not treat framework guidance as customer evidence, and does not authorize a production transition, residual-risk acceptance, or a legal-compliance claim. Reassessment requires new attributable evidence.</p>
      <p>Full audit details are available in the Master Data report.</p>
    </footer>
  </main>
</body>
</html>
`;

const outPath = `${root}/public/Landing_Zone_Assessment_Summary_Report.html`;
const masterPath = `${root}/public/Landing_Zone_Assessment_Master_Data_Report.html`;
await mkdir(`${root}/public`, { recursive: true });
await writeFile(outPath, html, 'utf8');
const masterHtml = renderMasterDataHtml({
  criteria,
  antipatterns,
  areaName,
  capState,
  apState,
  escape,
  gauge,
  rowsFor,
  domainCards,
  capNote,
  apNote,
});
await writeFile(masterPath, masterHtml, 'utf8');
console.log(`wrote ${outPath}`);
console.log(`wrote ${masterPath}`);
