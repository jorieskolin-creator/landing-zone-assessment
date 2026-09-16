const capCount = { good: 3, partial: 2, gap: 0 };
const capBadge = { good: 'badge-ok', partial: 'badge-partial', gap: 'badge-nok' };
const apLabel = { gap: 'Finding', partial: 'Partial finding', 'tested-absent': 'Tested absent' };
const apBadge = { gap: 'badge-nok', partial: 'badge-partial', 'tested-absent': 'badge-ok' };

const weakIds = new Set(['A2', 'A5', 'C3', 'D5', 'G2', 'H1', 'AP-B5', 'AP-D5', 'AP-F2', 'AP-H1', 'AP-H3', 'AP-H5']);
const unsupportedIds = new Set(['D4', 'H3', 'AP-C3', 'AP-G2']);
const rescannedIds = new Set(['A5', 'C3', 'D5', 'H1', 'AP-B5', 'AP-H3']);
const downgraded = {
  A5: { original: 3, verified: 2 },
  H1: { original: 3, verified: 2 },
  D5: { original: 3, verified: 2 },
  'AP-H3': { original: 0, verified: 1 },
};

const azureObject = {
  A: 'managementGroups / billingAccounts',
  B: 'roleEligibilityScheduleInstances / directoryRoles',
  C: 'subscriptions / managementGroups.children',
  D: 'azureFirewalls / privateDnsZones / virtualHubs',
  E: 'pricings / securityContacts / vaults',
  F: 'diagnosticSettings / resourceGraph inventory',
  G: 'policyAssignments / policyExemptions',
  H: 'templateSpecs / serviceCatalog / deploymentScripts',
};

const awsObject = {
  A: 'organizations / accounts',
  B: 'iam / identitystore / sso-admin',
  C: 'organizations / controltower Account Factory',
  D: 'network-firewall / route53 / transit-gateway',
  E: 'guardduty / kms / secretsmanager',
  F: 'cloudtrail / config / backup',
  G: 'organizations SCP / config rules',
  H: 'servicecatalog / codepipeline / cloudformation',
};

const specialQuotes = {
  A1: [
    ['Azure Resource Graph', 'resources | where tags["env"]=="prod" | distinct tenantId returns two directories; Step 0 locked root is the directory that owns mg-platform'],
    ['AWS Organizations', 'ListAccounts with tag env=prod includes member accounts whose Arn is not under o-7n4k'],
  ],
  'AP-A1': [
    ['Azure Resource Graph', 'production resource groups exist in a second directory that is absent from the Step 0 root set'],
    ['AWS Organizations', 'unmanaged accounts with env=prod are not children of o-7n4k'],
  ],
  B1: [
    ['Entra ID', 'workforce federation to Azure is configured for the platform group; AWS console logins still include IAM user passwords'],
    ['AWS IAM', 'CredentialReport: three IAM users in the management account have PasswordEnabled=true and MFAActive=false'],
  ],
  'AP-B1': [
    ['AWS IAM', 'users break-glass-1, break-glass-2, break-glass-3 hold AdministratorAccess with no DurationSeconds and no ticket attribute'],
    ['Azure PIM', 'equivalent Owner assignments at MG scope for two human principals are standing (endDateTime=null) outside the platform PIM group'],
  ],
  C4: [
    ['Azure portal activity', 'Microsoft.Subscription/aliases/write succeeded from a portal session in the last 30 days'],
    ['AWS Control Tower', 'Account Factory product is published; CreateManagedAccount events are mixed with console Organizations.CreateAccount'],
  ],
  'AP-C4': [
    ['Azure Activity', 'subscription birth via portal exception path named in the vending runbook, used after the pipeline was declared mandatory'],
    ['AWS CloudTrail', 'CreateAccount from console identity, not from the Service Catalog provisioned product'],
  ],
  G3: [
    ['Azure Policy', 'policyExemptions for storage public access: expiresOn is null on three assignments that have an owner'],
    ['AWS Organizations', 'SCP exemption tags include owner but no expiry on s3-public-read exceptions'],
  ],
  'AP-G3': [
    ['Azure Policy', 'exemptionCategory=Waiver, expiresOn=null, displayName=allow-public-blob for three storage accounts'],
    ['AWS Config', 'rule s3-bucket-public-read-prohibited is NON_COMPLIANT with no automaticRemediation expiry'],
  ],
  H2: [
    ['Service catalogue', 'standard product path provisions a landing zone; documented portal exception remains enabled'],
    ['AWS Service Catalog', 'Account Factory provisioned product exists; two accounts in the last 30 days have no corresponding provisioned-product record'],
  ],
  'AP-H2': [
    ['Vending runbook', 'exception path: request by email, create in portal, notify platform after the fact'],
    ['Azure Activity', 'Microsoft.Subscription/aliases/write from a human portal session after the pipeline mandate date'],
  ],
};

const reasoningFor = (item, state, stream) => {
  if (item.id === 'A1' || item.id === 'AP-A1') {
    return 'Hierarchy exports name mg-platform and o-7n4k as roots. Production objects also exist in a second Azure directory and in unmanaged AWS accounts. The three tests for an authoritative organization root fail on that split.';
  }
  if (item.id === 'B1' || item.id === 'AP-B1') {
    return 'Azure PIM covers the platform group. AWS management-account humans still hold standing AdministratorAccess. Workforce federation is not the only human login path.';
  }
  if (item.id === 'C4' || item.id === 'AP-C4' || item.id === 'H2' || item.id === 'AP-H2') {
    return 'The catalogue path can birth a landing zone. A portal and email exception path still created accounts in the last 30 days, so vending is not the only production birth path.';
  }
  if (item.id === 'G3' || item.id === 'AP-G3') {
    return 'Public-access exemptions have owners and no expiry on both providers. The exemption tests fail until expiry and review dates are locked.';
  }
  if (stream === 'capability') {
    if (state === 'good') return `Locked Azure and AWS exports satisfy the three sub-criteria for ${item.title}.`;
    if (state === 'partial') return `Two of three sub-criteria for ${item.title} are satisfied. Residual exceptions remain on the locked exports.`;
    return `The three tests for ${item.title} are unsatisfied on the locked Azure and AWS exports.`;
  }
  if (state === 'tested-absent') {
    return `Relevant hierarchy, identity, policy, network and vending exports were reviewed. ${item.title} was not found on the in-scope estate.`;
  }
  if (state === 'partial') {
    return `Instances of ${item.title} remain on a subset of the locked estate after the exports were reviewed.`;
  }
  return `${item.title} is locked present on the in-scope Azure and AWS surfaces.`;
};

const synthesizeQuotes = (item, state, stream) => {
  const area = item.design_area_id;
  const azure = azureObject[area];
  const aws = awsObject[area];
  if (stream === 'capability') {
    if (state === 'gap') {
      return [
        ['Azure control plane', `${azure}: ${item.title} is below target. Required control is missing or contradicted on the locked mg-platform surface.`],
        ['AWS control plane', `${aws}: equivalent control is missing or contradicted on the locked o-7n4k surface.`],
      ];
    }
    if (state === 'partial') {
      return [
        ['Azure control plane', `${azure}: ${item.title} is present for the standard product path; residual exceptions remain.`],
        ['AWS control plane', `${aws}: the same control is partial on member accounts outside the standard factory path.`],
      ];
    }
    const useAzure = item.id.charCodeAt(1) % 2 === 1;
    return [useAzure
      ? ['Azure control plane', `${azure}: ${item.title} meets the three tests under mg-platform.`]
      : ['AWS control plane', `${aws}: ${item.title} meets the three tests under o-7n4k.`]];
  }
  if (state === 'gap') {
    return [
      ['Azure control plane', `${azure}: ${item.title} is present on the locked estate.`],
      ['AWS control plane', `${aws}: matching instances are present under o-7n4k or unmanaged accounts.`],
    ];
  }
  if (state === 'partial') {
    return [
      ['Azure control plane', `${azure}: residual instances of ${item.title} remain after review.`],
      ['AWS control plane', `${aws}: residual instances remain on a subset of member accounts.`],
    ];
  }
  const useAzure = item.id.charCodeAt(4) % 2 === 0;
  return [useAzure
    ? ['Azure control plane', `${azure}: ${item.title} was tested against the locked exports and was not found.`]
    : ['AWS control plane', `${aws}: ${item.title} was tested against the locked exports and was not found.`]];
};

const quotesFor = (item, state, stream) => specialQuotes[item.id] || synthesizeQuotes(item, state, stream);

const ecStatus = id => {
  if (unsupportedIds.has(id)) return 'unsupported';
  if (weakIds.has(id)) return 'weak';
  return 'supported';
};

const forensicCard = (item, state, stream, escape) => {
  const count = stream === 'capability' ? capCount[state] : null;
  const badge = stream === 'capability' ? capBadge[state] : apBadge[state];
  const badgeText = stream === 'capability' ? `${count}/3` : apLabel[state];
  const status = ecStatus(item.id);
  const adjusted = downgraded[item.id];
  const quotes = quotesFor(item, state, stream);
  const coverage = stream === 'antipattern'
    ? (state === 'tested-absent'
      ? 'Relevant source coverage was reviewed and the anti-pattern was not found.'
      : state === 'partial'
        ? 'Evidence shows a partial or weak anti-pattern signal.'
        : 'Evidence shows the anti-pattern is present.')
    : '';
  return `
    <div class="forensic-card">
      <div class="forensic-head">
        <div>
          <span class="forensic-id">${escape(item.id)}</span>
          <h4>${escape(item.title)}</h4>
        </div>
        <span class="badge ${badge}">${escape(badgeText)}</span>
      </div>
      <p class="forensic-desc">${escape(item.description)}</p>
      ${coverage ? `<div class="gate-rationale">${escape(coverage)}</div>` : ''}
      <div class="forensic-block">
        <span class="evidence-check-badge ec-${status}">Evidence-check: ${escape(status)}</span>
        ${adjusted ? `<div class="gate-rationale">score ${adjusted.original}/3→${adjusted.verified}/3${rescannedIds.has(item.id) ? ' · targeted rescan' : ''}</div>` : rescannedIds.has(item.id) ? `<div class="gate-rationale">targeted rescan</div>` : ''}
      </div>
      <div class="forensic-block">
        <div class="forensic-label">AI Reasoning</div>
        <p class="forensic-reasoning">${escape(reasoningFor(item, state, stream))}</p>
      </div>
      <div class="forensic-block">
        <div class="forensic-label">Evidence</div>
        <ul class="forensic-quotes">
          ${quotes.map(([section, quote]) => `<li>&ldquo;${escape(quote)}&rdquo;<span class="forensic-section"> — ${escape(section)}</span></li>`).join('')}
        </ul>
      </div>
    </div>`;
};

const forensicSection = (title, stream, items, stateMap, escape) => {
  const batches = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
  const body = batches.map(batchId => {
    const row = items.filter(item => item.design_area_id === batchId);
    const area = row[0]?.design_area || batchId;
    return `
    <div class="forensic-batch">
      <h3 class="forensic-batch-title">${batchId} · ${escape(area)}</h3>
      ${row.map(item => forensicCard(item, stateMap[item.id], stream, escape)).join('')}
    </div>`;
  }).join('');
  return `
  <h2>${escape(title)}</h2>
  ${body}`;
};

const testedAbsences = (antipatterns, apState) =>
  antipatterns.criteria
    .filter(item => apState[item.id] === 'tested-absent')
    .map(item => `[${item.id}] Tested absent: ${item.title} was not found on the locked mg-platform / o-7n4k exports.`);

const packetRows = [
  ['A', 'Tenant, billing & organization construct', 18, 22, false, 41280],
  ['B', 'Identity & access', 16, 20, false, 38910],
  ['C', 'Resource organization', 14, 18, false, 35120],
  ['D', 'Network topology & connectivity', 12, 14, false, 30440],
  ['E', 'Security baseline', 15, 16, false, 33670],
  ['F', 'Management & observability', 13, 15, false, 29880],
  ['G', 'Governance & policy', 11, 16, true, 27450],
  ['H', 'Platform automation & DevOps', 10, 14, true, 26110],
];

export const renderMasterDataHtml = ({
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
}) => {
  const supported = 80 - weakIds.size - unsupportedIds.size;
  const tested = testedAbsences(antipatterns, apState);
  const capGaps = criteria.criteria.filter(item => capState[item.id] === 'gap');
  const evidenceGaps = capGaps.flatMap(item =>
    (item.sub_criteria || []).map(question => `[${item.id}] ${question}`)
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Landing Zone Assessment Master Data</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; background: #ffffff; color: #0f172a; padding: 48px 32px; max-width: 1100px; margin: 0 auto; line-height: 1.55; }
    h1 { font-size: 2.25rem; font-weight: 800; color: #0f172a; letter-spacing: -0.02em; margin-bottom: 0.5rem; }
    h2 { font-size: 1.5rem; font-weight: 700; color: #0f172a; margin: 3rem 0 1.25rem; padding-bottom: 0.6rem; border-bottom: 1px solid #e2e8f0; }
    h3 { font-size: 1.1rem; font-weight: 700; color: #0f172a; }
    p { color: #334155; }
    ul { margin: 0; padding-left: 1.2rem; }
    li { margin: 0.35rem 0; }
    .meta { color: #64748b; font-size: 0.875rem; margin-bottom: 2rem; }
    .meta p { color: #64748b; }
    .classification-panel { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 1.25rem; padding: 2rem; margin: 1rem 0 2rem; }
    .classification-row { display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; }
    .classification { font-size: 1rem; font-weight: 700; padding: 0.5rem 1rem; border-radius: 0.5rem; display: inline-block; }
    .classification.walk { background: #fef3c7; color: #b45309; }
    .classification-pipe { color: #cbd5e1; }
    .classification-meta { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.85rem; color: #64748b; }
    .metric-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 1.5rem; }
    .metric { display: flex; flex-direction: column; }
    .metric-label { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 0.25rem; }
    .metric-value { font-size: 2rem; font-weight: 800; line-height: 1; }
    .metric-value.emerald { color: #059669; }
    .metric-value.teal { color: #0d9488; }
    .metric-value.violet { color: #7c3aed; }
    .metric-desc { font-size: 0.8rem; color: #64748b; margin-top: 0.5rem; line-height: 1.45; }
    .gauge-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 1.25rem; margin: 1.5rem 0 2rem; align-items: stretch; }
    .gauge-card { display: flex; flex-direction: column; align-items: center; text-align: center; padding: 1.5rem 1rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; }
    .gauge-svg { width: 100%; height: auto; max-width: 240px; }
    .gauge-label { font-size: 0.7rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #475569; margin-top: 0.75rem; }
    .gauge-desc { font-size: 0.7rem; color: #64748b; margin-top: 0.5rem; line-height: 1.45; max-width: 18rem; }
    .gauge-denominator { color: #334155; font-size: 0.76rem; font-weight: 700; margin-top: 0.5rem; }
    .gauge-trend { display: inline-block; margin-top: 0.75rem; font-size: 0.65rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; background: #f1f5f9; padding: 0.25rem 0.6rem; border-radius: 999px; }
    .actionability { display: grid; grid-template-columns: minmax(160px, 0.35fr) 1fr; gap: 1rem 1.5rem; align-items: center; background: #fff; border: 1px solid #e2e8f0; border-left: 5px solid #f59e0b; border-radius: 1rem; padding: 1.4rem; margin: 1.5rem 0 2rem; }
    .actionability-primary span, .actionability-label { display: block; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.68rem; font-weight: 800; }
    .actionability-primary strong { display: block; font-size: 2.4rem; line-height: 1; margin-top: 0.3rem; }
    .actionability p { margin: 0; color: #334155; }
    .actionability-facts { grid-column: 1 / -1; display: flex; flex-wrap: wrap; gap: 0.5rem; }
    .actionability-facts span { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 999px; padding: 0.35rem 0.65rem; color: #64748b; font-size: 0.75rem; }
    .evidence-findings { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.4rem; margin: 1.25rem 0; }
    .domain-signal-section { margin: 2rem 0; }
    .domain-signal-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; }
    .domain-signal-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.1rem; }
    .domain-signal-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem; margin-bottom: 0.85rem; }
    .domain-signal-id { display: block; color: #94a3b8; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.72rem; font-weight: 800; }
    .domain-signal-chip { border-radius: 999px; background: #f1f5f9; color: #64748b; padding: 0.25rem 0.5rem; font-size: 0.6rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; white-space: nowrap; }
    .domain-signal-metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.65rem; }
    .domain-signal-metric { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.75rem; }
    .signal-label { display: flex; align-items: center; gap: 0.45rem; color: #64748b; font-size: 0.65rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; }
    .signal-label i { width: 0.68rem; height: 0.68rem; border-radius: 999px; display: inline-block; }
    .domain-signal-metric strong { display: block; font-size: 1.65rem; line-height: 1; margin-top: 0.55rem; }
    .domain-signal-metric p { margin: 0.4rem 0 0; color: #64748b; font-size: 0.76rem; }
    .signal-green { color: #047857; }
    .signal-yellow { color: #b45309; }
    .signal-red { color: #be123c; }
    .signal-label i.signal-green { background: #10b981; }
    .signal-label i.signal-yellow { background: #f59e0b; }
    .signal-label i.signal-red { background: #f43f5e; }
    .section-lead { color: #64748b; margin-top: -0.75rem; }
    .heatmap-explainer { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 0.75rem; margin: 1rem 0; }
    .heatmap-explainer div { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.8rem; }
    .heatmap-explainer strong, .heatmap-explainer span { display: block; }
    .heatmap-explainer span { color: #64748b; font-size: 0.8rem; }
    .heatmap-legend { display: flex; flex-wrap: wrap; gap: 0.75rem; margin: 0 0 1rem; color: #475569; font-size: 0.78rem; }
    .heatmap-legend i { display: inline-block; width: 0.75rem; height: 0.75rem; border-radius: 0.2rem; margin-right: 0.3rem; vertical-align: -0.05rem; }
    .compact-heatmap-grid { display: grid; gap: 1rem; }
    .compact-heatmap-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1rem; }
    .compact-heatmap-row { display: grid; grid-template-columns: 150px 1fr; gap: 0.6rem; padding: 0.5rem 0; border-top: 1px solid #eef2f7; }
    .compact-heatmap-row:first-of-type { border-top: 0; }
    .compact-heatmap-batch strong, .compact-heatmap-batch span { display: block; }
    .compact-heatmap-batch span { color: #64748b; font-size: 0.7rem; }
    .compact-heatmap-cells { display: grid; grid-template-columns: repeat(5, minmax(84px, 1fr)); gap: 0.45rem; }
    .compact-heat-cell { min-height: 150px; border-radius: 0.7rem; padding: 0.7rem; border: 1px solid; }
    .compact-heat-head { display: flex; justify-content: space-between; gap: 0.4rem; margin-bottom: 0.6rem; }
    .compact-heat-head strong { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.72rem; }
    .compact-heat-head span { font-size: 0.58rem; font-weight: 800; text-transform: uppercase; }
    .compact-heat-cell h4 { margin: 0 0 0.4rem; font-size: 0.8rem; line-height: 1.2; }
    .compact-heat-cell p { margin: 0; color: #334155; font-size: 0.68rem; line-height: 1.35; }
    .heat-good { background: #d1fae5; border-color: #a7f3d0; color: #065f46; }
    .heat-tested-absent { background: #ecfdf5; border-color: #86efac; color: #166534; }
    .heat-partial { background: #fef3c7; border-color: #fde68a; color: #92400e; }
    .heat-gap { background: #ffe4e6; border-color: #fecdd3; color: #9f1239; }
    .summary { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 2rem; line-height: 1.75; color: #334155; margin-bottom: 1.5rem; }
    .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1rem; margin-top: 1rem; }
    .summary-sub h3 { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin: 0 0 0.5rem 0; }
    .summary-sub ul { margin: 0; padding-left: 1.25rem; }
    .summary-sub li { font-size: 0.875rem; margin-bottom: 0.35rem; }
    .persona-heading { font-size: 0.875rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #047857; margin: 0.5rem 0 0.75rem 0; }
    .summary-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.4rem; }
    .roadmap-phase { background: #ffffff; border: 1px solid #e2e8f0; border-left: 3px solid #10b981; padding: 1.25rem 1.5rem; margin: 1rem 0; border-radius: 0 0.75rem 0.75rem 0; }
    .roadmap-phase h3 { color: #0f172a; margin-bottom: 0.75rem; font-size: 1rem; }
    .roadmap-context { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.75rem; margin-bottom: 1rem; }
    .roadmap-context-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.65rem; padding: 0.8rem; }
    .roadmap-context-label { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin-bottom: 0.35rem; }
    .roadmap-context-block p { font-size: 0.85rem; color: #334155; margin: 0; }
    .roadmap-how-label { font-size: 0.65rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; margin: 0.75rem 0 0.4rem; }
    .roadmap-phase ul { list-style: none; padding: 0; margin: 0; }
    .roadmap-phase li { display: flex; gap: 0.6rem; padding: 0.35rem 0; font-size: 0.9rem; color: #334155; }
    .roadmap-phase li:before { content: ""; flex-shrink: 0; width: 6px; height: 6px; border-radius: 50%; background: #10b981; margin-top: 0.55rem; }
    .forensic-batch { margin: 2rem 0; }
    .forensic-batch-title { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.15em; color: #64748b; font-weight: 700; margin: 1.5rem 0 0.75rem; }
    .forensic-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 0.875rem; padding: 1.25rem; margin: 0.75rem 0; }
    .forensic-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.5rem; }
    .forensic-head h4 { font-size: 1rem; color: #0f172a; line-height: 1.3; margin-top: 0.125rem; font-weight: 700; }
    .forensic-id { font-family: ui-monospace, SFMono-Regular, monospace; font-size: 0.75rem; color: #94a3b8; }
    .badge { padding: 0.25rem 0.55rem; border-radius: 0.4rem; font-size: 0.7rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; flex-shrink: 0; }
    .badge-ok { background: #d1fae5; color: #047857; }
    .badge-partial { background: #fef3c7; color: #b45309; }
    .badge-nok { background: #ffe4e6; color: #be123c; }
    .evidence-check-summary { background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.5rem; margin: 1.5rem 0 2rem; }
    .qg-status { display: flex; justify-content: space-between; align-items: center; gap: 1rem; border-radius: 0.75rem; padding: 1rem; margin-bottom: 1rem; border: 1px solid; }
    .qg-status p { margin: 0.2rem 0 0 0; font-size: 0.85rem; }
    .qg-status-label { display: block; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.1em; }
    .qg-status-meta { font-size: 0.75rem; font-weight: 700; white-space: nowrap; }
    .qg-status-warn { background: #fffbeb; border-color: #fde68a; color: #92400e; }
    .evidence-check-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.75rem; margin: 1rem 0; }
    .evidence-check-stat { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 0.75rem; padding: 0.8rem; }
    .evidence-check-stat span { display: block; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #64748b; }
    .evidence-check-stat strong { display: block; font-size: 1.5rem; margin-top: 0.15rem; }
    .evidence-check-item { font-size: 0.85rem; color: #334155; padding-left: 0.75rem; border-left: 2px solid #cbd5e1; margin: 0.45rem 0; }
    .evidence-check-badge { display: inline-block; margin: 0.35rem 0 0.25rem; padding: 0.25rem 0.5rem; border-radius: 0.4rem; font-size: 0.68rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
    .ec-supported { background: #d1fae5; color: #047857; }
    .ec-weak { background: #fef3c7; color: #b45309; }
    .ec-unsupported { background: #ffe4e6; color: #be123c; }
    .forensic-desc { font-size: 0.875rem; color: #64748b; margin: 0.5rem 0 0.75rem; }
    .forensic-block { margin-top: 0.75rem; }
    .forensic-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; font-weight: 700; margin-bottom: 0.4rem; }
    .forensic-reasoning { font-size: 0.875rem; color: #334155; white-space: pre-line; }
    .forensic-quotes { list-style: none; padding: 0; margin: 0; }
    .forensic-quotes li { font-size: 0.875rem; font-style: italic; color: #475569; border-left: 2px solid #cbd5e1; padding-left: 0.75rem; margin: 0.5rem 0; }
    .forensic-section { font-size: 0.75rem; color: #94a3b8; font-style: normal; }
    .appendix-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.25rem; }
    .appendix-note { font-size: 0.875rem; color: #64748b; margin: 0.4rem 0 1rem; }
    .appendix-list { padding-left: 1.25rem; color: #334155; }
    .appendix-list li { margin: 0.6rem 0; font-size: 0.875rem; }
    .source-packet-section { margin: 2rem 0; }
    .source-packet-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 1rem; padding: 1.25rem; }
    .source-packet-note { margin: 0 0 1rem; color: #64748b; font-size: 0.875rem; }
    .source-packet-tables { display: grid; gap: 1rem; }
    .source-packet-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; background: #fff; }
    .source-packet-table th { background: #f1f5f9; color: #475569; text-align: left; text-transform: uppercase; letter-spacing: 0.08em; font-size: 0.65rem; }
    .source-packet-table th, .source-packet-table td { border: 1px solid #e2e8f0; padding: 0.65rem 0.75rem; vertical-align: top; }
    .source-packet-table td:first-child span { display: block; color: #64748b; font-size: 0.72rem; margin-top: 0.1rem; }
    .source-packet-metrics-table { max-width: 620px; }
    .source-packet-metrics-table td:last-child { font-weight: 800; color: #0f172a; }
    .packet-coverage { display: inline-flex; align-items: center; min-height: 1.5rem; border-radius: 999px; padding: 0.15rem 0.5rem; font-size: 0.68rem; font-weight: 800; }
    .packet-coverage-ok { background: #d1fae5; color: #065f46; }
    .packet-coverage-weak { background: #fef3c7; color: #92400e; }
    .source-packet-notes { margin: 1rem 0 0; padding-left: 1.15rem; color: #475569; font-size: 0.82rem; }
    .gate-label { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; margin: 0.75rem 0 0.5rem; opacity: 0.85; }
    .gate-rationale { font-size: 0.75rem; opacity: 0.75; font-style: normal; }
    .gate-summary { margin: 0.75rem 0; padding: 0.75rem; background: rgba(255,255,255,0.6); border: 1px solid rgba(0,0,0,0.08); border-radius: 6px; }
    .gate-summary p { margin: 0; font-size: 0.875rem; }
    .gate-explanation { font-size: 0.78rem; opacity: 0.8; margin-top: 0.25rem; }
    .footer { text-align: center; padding: 2rem 0; margin-top: 3rem; border-top: 1px solid #e2e8f0; font-size: 0.85rem; color: #94a3b8; }
    .footer-disclaimer { max-width: 760px; margin: 12px auto 0; text-align: left; line-height: 1.55; color: #64748b; font-size: 0.78rem; }
    @media (max-width: 760px) {
      body { padding: 24px 16px; }
      .actionability { grid-template-columns: 1fr; }
      .actionability-facts { grid-column: 1; }
      .gauge-grid { grid-template-columns: 1fr; }
      .metric-grid { grid-template-columns: 1fr; }
      .compact-heatmap-row { grid-template-columns: 1fr; }
      .compact-heatmap-cells { grid-template-columns: repeat(2, minmax(120px, 1fr)); }
    }
    @media print {
      body { padding: 24px; max-width: none; }
      h2 { page-break-after: avoid; }
      .forensic-card, .roadmap-phase, .gauge-card { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>Landing Zone Assessment Master Data</h1>
  <div class="meta">
    <p>Generated 16 September 2026, 08:42 UTC · Landing Zone Engine v.2.0.0</p>
    <p>Knowledge Base: Landing Zone pack catalogue 80/80 criteria · Playbook 80 tactics</p>
    <p>Scope: Azure mg-platform + AWS o-7n4k · design areas A–H · Pack v1.0.0 · Playbook v1.0.0</p>
  </div>

  <div class="classification-panel">
    <div class="classification-row">
      <span class="classification walk">Pilot</span>
      <span class="classification-pipe">|</span>
      <span class="classification walk">WARN</span>
      <span class="classification-meta">lz-2026-09-16-0842</span>
    </div>
    <div class="metric-grid">
      <div class="metric">
        <span class="metric-label">Corroborated maturity</span>
        <span class="metric-value emerald">61%</span>
        <p class="metric-desc">Pair-resolved capability health after anti-pattern corroboration.</p>
      </div>
      <div class="metric">
        <span class="metric-label">Observed maturity</span>
        <span class="metric-value teal">67%</span>
        <p class="metric-desc">Direct capability signal before corroboration discount.</p>
      </div>
      <div class="metric">
        <span class="metric-label">Evidence density</span>
        <span class="metric-value violet">74%</span>
        <p class="metric-desc">Share of the scoring surface with provenance-bound quotes.</p>
      </div>
      <div class="metric">
        <span class="metric-label">Pair resolution</span>
        <span class="metric-value emerald">81%</span>
        <p class="metric-desc">Overall pair resolution on the locked Step 0 estate.</p>
      </div>
    </div>
  </div>

  <section class="actionability">
    <div class="actionability-primary">
      <span>Actionability</span>
      <strong>WARN</strong>
    </div>
    <p>The assessment is usable with the listed evidence and strategy limitations. Confirmed anti-patterns in organization construct, identity, resource vending and platform automation require controlled remediation before a production transition is authorized.</p>
    <div class="actionability-facts">
      <span><strong>CONDITIONAL GO</strong> planning decision</span>
      <span><strong>MEDIUM</strong> confidence</span>
      <span><strong>0</strong> blocking conditions</span>
    </div>
  </section>

  <section class="actionability" style="border-left-color:#10b981">
    <div class="actionability-primary">
      <span class="actionability-label">Assessment Sufficiency</span>
      <strong>PASS</strong>
    </div>
    <p>Scoring authority is retained. Knowledge Base completeness is excluded from this gate. Criterion evidence density is 74% and overall pair resolution is 81%. No silent design area fell below the 10% density floor. Provenance integrity is 100%. Verification-unresolved count is 0.</p>
  </section>

  <h2>Assessment Metrics</h2>
  <div class="gauge-grid">
    ${gauge(61, 'Corroborated maturity', '#047857', 'Pair-resolved capability health after anti-pattern corroboration.', 'High = Good', 'Resolution-based formula v1')}
    ${gauge(67, 'Observed maturity', '#0f766e', 'Direct capability signal before corroboration discount.', 'High = Good', '40 capabilities · A–H')}
    ${gauge(74, 'Evidence density', '#1d4ed8', 'Share of the scoring surface with provenance-bound quotes.', 'High = Good', 'Locked Step 0 estate')}
  </div>

  <section class="domain-signal-section">
    <h2>Domain Signal Overview</h2>
    <p class="section-lead">Traffic lights are per design area. Azure and AWS were scored on separate provider surfaces; headline figures use the Azure surface where both providers were in scope.</p>
    <div class="domain-signal-grid">${domainCards}</div>
  </section>

  <section>
    <h2>Assessment Heatmap Summary</h2>
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
        <h3>Maturity coverage</h3>
        ${rowsFor(criteria.criteria, capState, capNote)}
      </div>
      <div class="compact-heatmap-panel">
        <h3>Anti-pattern semantics</h3>
        ${rowsFor(antipatterns.criteria, apState, apNote)}
      </div>
    </div>
  </section>

  <section>
    <h2>Evidence needed to interpret maturity</h2>
    <div class="summary-card">
      <p>These criteria contribute zero because they were not demonstrated by the supplied material. They are follow-up questions, not proof that capabilities are absent or anti-patterns are present.</p>
      <ul>${evidenceGaps.map(gap => `<li>${escape(gap)}</li>`).join('')}</ul>
    </div>
  </section>

  <h2>Evidence-Backed Findings</h2>
  <section class="evidence-findings">
    <p class="persona-heading">Fact-only current state · Pilot</p>
    <h3>Declared Azure and AWS roots exist; production still sits outside them, and standing privileged humans remain.</h3>
    <div class="summary-grid">
      <div class="summary-sub">
        <h3>Confirmed strengths</h3>
        <ul>
          <li>Hub topology with forced-path inspection is present on the Azure hub. [D1]</li>
          <li>Central DNS is configured for the in-scope private zones. [D3]</li>
          <li>Preventive security baseline is assigned from the root. [E1]</li>
          <li>Activity logs land in the platform log archive with named triage ownership. [F1]</li>
          <li>Policy inheritance from mg-platform and o-7n4k is in force. [G1]</li>
          <li>Platform versus application landing zones are separated. [C2]</li>
          <li>Guardrailed self-service works for the standard product path. [H4]</li>
        </ul>
      </div>
      <div class="summary-sub">
        <h3>Confirmed gaps</h3>
        <ul>
          <li>Authoritative organization root does not contain all production. [A1]</li>
          <li>Federated workforce identity is not the only human login path. [B1]</li>
          <li>Subscription and account vending is not the only birth path. [C4]</li>
          <li>Exemptions lack expiry. [G3]</li>
          <li>Vending pipeline is not mandatory. [H2]</li>
        </ul>
      </div>
      <div class="summary-sub">
        <h3>Confirmed anti-patterns</h3>
        <ul>
          <li>Shadow tenants and unmanaged orgs. [AP-A1]</li>
          <li>Standing root-equivalent access. [AP-B1]</li>
          <li>ClickOps birth of isolation units. [AP-C4]</li>
          <li>Permanent exemptions. [AP-G3]</li>
          <li>Email-request vending. [AP-H2]</li>
        </ul>
      </div>
      <div class="summary-sub">
        <h3>Tested anti-pattern absences</h3>
        <ul>${tested.map(item => `<li>${escape(item)}</li>`).join('')}</ul>
      </div>
      <div class="summary-sub">
        <h3>Silent / missing evidence</h3>
        <ul>
          <li>Owner of the second Azure directory is not named in the hierarchy export.</li>
          <li>AWS account-factory exception tickets lack pipeline run identifiers.</li>
          <li>Drift coverage includes Azure Policy; two AWS OUs have no Config recorder in the export.</li>
        </ul>
      </div>
    </div>
  </section>

  <h2>Diagnosis</h2>
  <div class="summary diagnosis">
    <p class="persona-heading">Interpretation of evidence — not the implementation plan</p>
    <h3>Primary bottleneck</h3>
    <p>Production outside the declared organization root, combined with standing privileged human access, prevents a clean control plane and a trustworthy identity boundary.</p>
    <div class="summary-grid">
      <div class="summary-sub">
        <h3>Root causes</h3>
        <ul>
          <li>Azure: resource graph shows production resource groups in a second directory not listed in the Step 0 root set. [AP-A1]</li>
          <li>AWS: three IAM users in the management account hold AdministratorAccess without a duration or ticket. [AP-B1]</li>
          <li>Account vending still includes a documented portal exception path used in the last 30 days. [C4] [AP-H2]</li>
          <li>Policy exemptions for storage public access have owners but no expiry on either provider. [G3]</li>
        </ul>
      </div>
      <div class="summary-sub">
        <h3>Domain diagnosis</h3>
        <ul>
          ${['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(area => {
            const line = {
              A: 'Below target — production exists outside mg-platform / o-7n4k.',
              B: 'Below target — standing privileged humans remain on AWS; Azure PIM is incomplete.',
              C: 'Mixed — hierarchy encodes policy, but portal vending still births accounts.',
              D: 'On target — hub inspection and central DNS hold; private-by-default is partial.',
              E: 'On target — preventive baseline holds; central detection is partial.',
              F: 'On target — platform logs and backup hold; inventory freshness is partial.',
              G: 'Below target — inheritance holds; exemptions have no expiry.',
              H: 'Below target — self-service works; pipeline is not the only birth path.',
            }[area];
            return `<li><strong>${area} · ${escape(areaName[area])}:</strong> ${escape(line)}</li>`;
          }).join('')}
        </ul>
      </div>
    </div>
    <p><strong>Confidence (medium):</strong> Exports are current and attributable. The second Azure directory was confirmed by hierarchy export, not by workshop recollection.</p>
  </div>

  <h2>Planning Decision: CONDITIONAL GO</h2>
  <div class="summary planning-decision">
    <p>Proceed with the contained remediation sequence. Do not authorize a production landing-zone transition, residual-risk acceptance, or a legal-compliance claim on the basis of this report.</p>
    <div class="summary-grid">
      <div class="summary-sub">
        <h3>Safe to act on</h3>
        <ul>
          <li>Inventory and contain stray production.</li>
          <li>Convert standing privileged roles to eligible time-bound access.</li>
          <li>Close the portal vending exception.</li>
          <li>Put expiry on public-access exemptions.</li>
        </ul>
      </div>
      <div class="summary-sub">
        <h3>Evidence needed before action</h3>
        <ul>
          <li>Post-change hierarchy export for the second directory.</li>
          <li>AWS IAM credential report after break-glass conversion.</li>
          <li>Vending pipeline run evidence for one new account.</li>
        </ul>
      </div>
    </div>
  </div>

  <h2>Remediation Roadmap</h2>
  <div class="roadmap-phase">
    <h3>Phase 1 · Contain — Close the unmanaged production estate</h3>
    <div class="roadmap-context">
      <div class="roadmap-context-block"><div class="roadmap-context-label">Why</div><p>Locked finding AP-A1: production workloads exist outside the declared Azure and AWS roots.</p></div>
      <div class="roadmap-context-block"><div class="roadmap-context-label">What</div><p>Inventory, contain and disposition every production object in the extra directory and unmanaged accounts. [TAC-ORG-AP-A1-01] [AP-A1]</p></div>
    </div>
    <div class="roadmap-how-label">How</div>
    <ul>
      <li><span>Freeze new deployment into the extra Azure directory and unmanaged AWS accounts.</span></li>
      <li><span>Export the full object inventory against the locked Step 0 scope.</span></li>
      <li><span>Migrate or retire production objects; record residual exceptions with owner and expiry.</span></li>
    </ul>
  </div>
  <div class="roadmap-phase">
    <h3>Phase 1 · Contain — Remove standing privileged human access</h3>
    <div class="roadmap-context">
      <div class="roadmap-context-block"><div class="roadmap-context-label">Why</div><p>Locked finding AP-B1: AdministratorAccess is standing on humans in the AWS management account; Azure PIM coverage is incomplete for equivalent roles.</p></div>
      <div class="roadmap-context-block"><div class="roadmap-context-label">What</div><p>Convert privileged access to eligible, time-bound, logged elevation. [TAC-IDENTITY-AP-B1-01] [AP-B1]</p></div>
    </div>
    <div class="roadmap-how-label">How</div>
    <ul>
      <li><span>Disable the three standing AWS IAM users after a named break-glass path exists.</span></li>
      <li><span>Make the equivalent Azure roles PIM-eligible with approval and MFA.</span></li>
      <li><span>Retain the access review export as reassessment evidence.</span></li>
    </ul>
  </div>
  <div class="roadmap-phase">
    <h3>Phase 2 · Replace — Birth every account from the vending pipeline</h3>
    <div class="roadmap-context">
      <div class="roadmap-context-block"><div class="roadmap-context-label">Why</div><p>C4 is below target and AP-H2 is present: a portal exception path still creates accounts.</p></div>
      <div class="roadmap-context-block"><div class="roadmap-context-label">What</div><p>Make the pipeline the only production birth path. [TAC-RESOURCE-C4-01] [TAC-AUTOMATION-AP-H2-01] [C4]</p></div>
    </div>
    <div class="roadmap-how-label">How</div>
    <ul>
      <li><span>Revoke the documented portal exception after a successful pipeline birth of a replacement account.</span></li>
      <li><span>Record the pipeline run, policy baseline at birth, and rollback test.</span></li>
    </ul>
  </div>
  <div class="roadmap-phase">
    <h3>Phase 2 · Replace — Expiry-bound exemptions</h3>
    <div class="roadmap-context">
      <div class="roadmap-context-block"><div class="roadmap-context-label">Why</div><p>G3 is unsatisfied: storage public-access exemptions have owners and no expiry.</p></div>
      <div class="roadmap-context-block"><div class="roadmap-context-label">What</div><p>Require owner, rationale, expiry and compensating control on every exemption. [TAC-GOVERNANCE-G3-01] [G3]</p></div>
    </div>
    <div class="roadmap-how-label">How</div>
    <ul>
      <li><span>Attach expiry and review dates to the three open exemptions.</span></li>
      <li><span>Deny new exemptions without those fields in the policy pipeline.</span></li>
    </ul>
  </div>

  <h2>Evidence Check</h2>
  <div class="evidence-check-summary">
    <div class="qg-status qg-status-warn">
      <div>
        <span class="qg-status-label">Quality Gate Status: WARN</span>
        <p>Assessment score remains valid. WARN-level strategy hygiene notes are included in the appendix for traceability.</p>
      </div>
      <span class="qg-status-meta">18/21 claims supported</span>
    </div>
    <p>Phase 1 findings were verified against the raw material before Phase 2 metrics were calculated.</p>
    <div class="evidence-check-grid">
      <div class="evidence-check-stat"><span>Supported</span><strong>${supported}</strong></div>
      <div class="evidence-check-stat"><span>Weak</span><strong>${weakIds.size}</strong></div>
      <div class="evidence-check-stat"><span>Unsupported</span><strong>${unsupportedIds.size}</strong></div>
      <div class="evidence-check-stat"><span>Missing</span><strong>0</strong></div>
      <div class="evidence-check-stat"><span>Downgraded</span><strong>4</strong></div>
      <div class="evidence-check-stat"><span>Rescanned</span><strong>6</strong></div>
    </div>
    <div>
      <div class="gate-label">Adjusted criteria</div>
      <div class="evidence-check-item"><strong>maturity.A5</strong> · 3→2 · weak · rescanned<div class="gate-rationale">Emergency-access evidence named owners but not the dual-control test.</div></div>
      <div class="evidence-check-item"><strong>maturity.H1</strong> · 3→2 · weak · rescanned<div class="gate-rationale">Platform as code covers the hub; identity assignments remain portal-written.</div></div>
      <div class="evidence-check-item"><strong>maturity.D5</strong> · 3→2 · weak · rescanned<div class="gate-rationale">Segmentation exists; two application landing zones still share a spoke.</div></div>
      <div class="evidence-check-item"><strong>antipattern.AP-H3</strong> · 0→1 · weak · rescanned<div class="gate-rationale">Drift accepted on two AWS OUs without Config recorder.</div></div>
    </div>
  </div>

  ${forensicSection('Forensic Audit: Landing Zone Maturity', 'capability', criteria.criteria, capState, escape)}
  ${forensicSection('Forensic Audit: Anti-Patterns', 'antipattern', antipatterns.criteria, apState, escape)}

  <h2>Quality &amp; Strategy Hygiene Appendix</h2>
  <div class="appendix-card">
    <p class="appendix-note">Quality Gate detail is retained here for traceability. WARN-level strategy hygiene notes do not invalidate the assessment score.</p>
    <div class="gate-summary"><div class="gate-label">Reviewer Summary</div><p>The locked file-set supports a CONDITIONAL_GO. Strategy wording that implied a production-authorization path was removed. Tactic IDs are grounded to present findings.</p></div>
    <div class="gate-label">Sanitized strategy items</div>
    <ul class="appendix-list">
      <li><strong>removed · planning decision</strong>: <em>&ldquo;Authorize production landing-zone transition on the current estate.&rdquo;</em><div class="gate-rationale">Contradicted by AP-A1 and AP-B1. Planning decision retained as CONDITIONAL_GO.</div></li>
    </ul>
    <div class="gate-label">Evidence-check adjustments</div>
    <ul class="appendix-list">
      <li><strong>Evidence-check downgraded 4 criteria</strong><div class="gate-explanation">A5, H1, D5 and AP-H3 were reduced after quote verification.</div></li>
    </ul>
    <div class="gate-label">Strategy hygiene notes</div>
    <ul class="appendix-list">
      <li><strong>Do not treat this report as residual-risk acceptance</strong><div class="gate-explanation">WARN retains scoring authority and withholds a production-authorization claim.</div></li>
    </ul>
    <div class="gate-label">Tactic grounding notes</div>
    <ul class="appendix-list">
      <li><strong>Five permissioned tactics grounded to locked findings</strong><div class="gate-explanation">TAC-ORG-AP-A1-01, TAC-IDENTITY-AP-B1-01, TAC-RESOURCE-C4-01, TAC-AUTOMATION-AP-H2-01, TAC-GOVERNANCE-G3-01.</div></li>
    </ul>
    <div class="gate-label">Fact-check trajectory</div>
    <ul class="appendix-list">
      <li><strong>pass 1</strong>: 16/21 supported, 5 unsupported</li>
      <li><strong>pass 2</strong>: 18/21 supported, 3 unsupported</li>
    </ul>
    <div class="gate-label">Remaining fact-check notes</div>
    <ul class="appendix-list">
      <li><strong>diagnosis</strong>: <em>&ldquo;Rebuild from code is complete for identity assignments.&rdquo;</em><div class="gate-rationale">Contradicted by H1 partial. Claim removed from the published diagnosis.</div></li>
    </ul>
  </div>

  <section class="source-packet-section">
    <h2>Acquisition Quality &amp; Readiness</h2>
    <div class="source-packet-card">
      <p class="source-packet-note">Versioned acquisition telemetry (acquisition-quality.v1). Evidence coverage measures how much of the assessment surface was tested; evidence density separately combines verified strength (60%), per-object source diversity (20%), and evidence-category diversity (20%). These readiness values are observability-only and do not alter scores or the Quality Gate.</p>
      <div class="source-packet-tables">
        <table class="source-packet-table source-packet-metrics-table">
          <thead><tr><th>Quality measure</th><th>Value</th></tr></thead>
          <tbody>
            <tr><td>Extraction completeness</td><td>96% · READY</td></tr>
            <tr><td>Evidence coverage</td><td>81% · 65/80 objects</td></tr>
            <tr><td>Evidence density</td><td>74%</td></tr>
            <tr><td>Verified evidence strength</td><td>71%</td></tr>
            <tr><td>Source diversity</td><td>68%</td></tr>
            <tr><td>Evidence-category diversity</td><td>80%</td></tr>
            <tr><td>Provenance integrity</td><td>100% · 48 direct / 17 derived / 0 unresolved</td></tr>
            <tr><td>KB completeness</td><td>100% · 80/80 catalogue objects</td></tr>
            <tr><td>Security gate</td><td>PASS · 0 caution / 0 high-risk hit(s)</td></tr>
          </tbody>
        </table>
        <table class="source-packet-table">
          <thead><tr><th>Readiness</th><th>Status</th></tr></thead>
          <tbody>
            <tr><td>Evidence Packet</td><td><span class="packet-coverage packet-coverage-ok">READY</span></td></tr>
            <tr><td>Knowledge Packet</td><td><span class="packet-coverage packet-coverage-ok">READY</span></td></tr>
            <tr><td>Evidence Acquisition</td><td><span class="packet-coverage packet-coverage-ok">READY</span></td></tr>
          </tbody>
        </table>
        <table class="source-packet-table">
          <thead><tr><th>Domain</th><th>Covered objects</th><th>Expected objects</th><th>Coverage</th></tr></thead>
          <tbody>
            ${['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map(area => {
              const covered = { A: 8, B: 8, C: 8, D: 9, E: 9, F: 9, G: 7, H: 7 }[area];
              return `<tr><td><strong>${area}</strong><span>${escape(areaName[area])}</span></td><td>${covered}</td><td>10</td><td>${covered * 10}%</td></tr>`;
            }).join('')}
          </tbody>
        </table>
        <table class="source-packet-table">
          <thead><tr><th>Source extraction</th><th>Processed</th><th>Completeness</th><th>Warnings</th></tr></thead>
          <tbody>
            <tr><td><strong>azure-hierarchy</strong><span>structured export</span></td><td>14/14 object(s)</td><td>100% · READY</td><td>0</td></tr>
            <tr><td><strong>aws-organizations</strong><span>structured export</span></td><td>11/11 object(s)</td><td>100% · READY</td><td>0</td></tr>
            <tr><td><strong>identity-exports</strong><span>structured export</span></td><td>9/10 object(s)</td><td>90% · READY</td><td>1 · PARTIAL_SHEET</td></tr>
            <tr><td><strong>policy-exemptions</strong><span>structured export</span></td><td>6/6 object(s)</td><td>100% · READY</td><td>0</td></tr>
            <tr><td><strong>network-hub</strong><span>structured export</span></td><td>8/8 object(s)</td><td>100% · READY</td><td>0</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  </section>

  <section class="source-packet-section">
    <h2>Source Registry &amp; Context Packets</h2>
    <div class="source-packet-card">
      <p class="source-packet-note">This snapshot shows how parsed source material was chunked, sampled for DLP review, and routed into A–H context packets before model audit. Included/candidate ratios measure retrieval candidate inclusion, not evidence coverage. A packet can include every routed candidate and still have weak substantive evidence. Findings still require verified source evidence.</p>
      <div class="source-packet-tables">
        <table class="source-packet-table source-packet-metrics-table">
          <thead><tr><th>Metric</th><th>Value</th></tr></thead>
          <tbody>
            <tr><td>Source documents</td><td>14</td></tr>
            <tr><td>Parsed chunks</td><td>186</td></tr>
            <tr><td>DLP review chunks</td><td>42</td></tr>
            <tr><td>High-risk DLP hits</td><td>0</td></tr>
            <tr><td>Caution DLP hits</td><td>0</td></tr>
          </tbody>
        </table>
        <table class="source-packet-table">
          <thead><tr><th>Packet</th><th>Included chunks</th><th>Candidate chunks</th><th>Evidence sufficiency</th><th>Characters</th></tr></thead>
          <tbody>
            ${packetRows.map(([domain, title, included, candidates, weak, chars]) => `
              <tr>
                <td><strong>${domain}</strong><span>${escape(title)}</span></td>
                <td>${included}</td>
                <td>${candidates}</td>
                <td><span class="packet-coverage ${weak ? 'packet-coverage-weak' : 'packet-coverage-ok'}">${weak ? 'Weak coverage' : 'OK'}</span></td>
                <td>${chars.toLocaleString('en-US')}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
      <ul class="source-packet-notes">
        <li><strong>G:</strong> Exemption objects are present; expiry fields are null, so sufficiency is weak for G3.</li>
        <li><strong>H:</strong> Pipeline run records cover the standard path; the portal exception path has no provisioned-product identifier.</li>
      </ul>
    </div>
  </section>

  <h2>RunTrace Provenance</h2>
  <div class="appendix-card">
    <p class="appendix-note">RunTrace is a client-side provenance artifact. It records source/chunk references, hashes, model-stage metadata, evidence paths, score paths, tactic paths, and Quality Gate decisions without embedding full raw source documents or full prompts.</p>
    <div class="evidence-check-grid">
      <div class="evidence-check-stat"><span>Run ID</span><strong style="font-size:0.95rem">lz-2026-09-16-0842</strong></div>
      <div class="evidence-check-stat"><span>Sources</span><strong>14</strong></div>
      <div class="evidence-check-stat"><span>Chunks</span><strong>186</strong></div>
      <div class="evidence-check-stat"><span>Model Stages</span><strong>8</strong></div>
      <div class="evidence-check-stat"><span>Evidence Paths</span><strong>80</strong></div>
      <div class="evidence-check-stat"><span>Score Paths</span><strong>80</strong></div>
      <div class="evidence-check-stat"><span>Tactic Paths</span><strong>5</strong></div>
      <div class="evidence-check-stat"><span>Derived Evidence</span><strong>4</strong></div>
      <div class="evidence-check-stat"><span>Signal Analyzers</span><strong>6/8</strong></div>
      <div class="evidence-check-stat"><span>Retrieval Passes</span><strong>16</strong></div>
      <div class="evidence-check-stat"><span>DLP Chunks</span><strong>42</strong></div>
      <div class="evidence-check-stat"><span>Gate</span><strong>WARN</strong></div>
    </div>
    <div class="gate-label">Trace boundaries</div>
    <ul class="appendix-list">
      <li><strong>Raw source included:</strong> false</li>
      <li><strong>Full prompts included:</strong> false</li>
      <li><strong>API keys included:</strong> false</li>
      <li>RunTrace stores references and hashes, not raw customer files and not full prompts.</li>
    </ul>
    <div class="gate-label">Shadow deterministic observations</div>
    <ul class="appendix-list">
      <li><strong>lz-A1-hierarchy</strong> · present · acquired-corpus analyzed-row coverage (142/142 rows; input truncated: false): extra directory detected · analyzer hierarchy-v1 · raw values exposed: false</li>
      <li><strong>lz-AP-B1-iam</strong> · present · acquired-corpus analyzed-row coverage (3/3 rows; input truncated: false): standing AdministratorAccess · analyzer iam-credential-v1 · raw values exposed: false</li>
    </ul>
    <div class="gate-label">Shadow bounded retrieval diagnostics</div>
    <p class="appendix-note">Candidate inclusion measures how much of the eligible routed candidate set was selected. It is not a measure of evidence sufficiency; a domain can include 100% of routed candidates and still have weak evidence.</p>
    <ul class="appendix-list">
      ${packetRows.map(([domain, , included, candidates, weak]) => {
        const baseline = Math.max(40, Math.round((included / candidates) * 80));
        const final = Math.round((included / candidates) * 100);
        return `<li><strong>Domain ${domain}</strong> · routed candidate inclusion ${baseline}%→${final}% · evidence sufficiency ${weak ? 'weak' : 'sufficient'} · passes 2/2 · stop saturation</li>`;
      }).join('')}
    </ul>
    <div class="gate-label">Data Signal Registry coverage</div>
    <p class="appendix-note">6 of 8 design areas have an authoritative analyzer mapping from the live theme-binding catalog; 2 remain explicitly NO_AUTHORITATIVE_ANALYZER_SEMANTICS. Analyzer mappings are not invented where none exist.</p>
  </div>

  <div class="footer">
    <p>Landing Zone Engine v.2.0.0 · Master Data Report</p>
    <p class="footer-disclaimer">This report records locked findings from supplied file-set exports. It does not read live cloud APIs, does not treat framework guidance as customer evidence, and does not authorize a production transition, residual-risk acceptance, or a legal-compliance claim. Reassessment requires new attributable evidence.</p>
  </div>
</body>
</html>`;
};
