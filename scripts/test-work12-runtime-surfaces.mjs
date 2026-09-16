import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateOutputContractText, OUTPUT_CONTRACT_IDS } from '../lib/outputContracts.js';

const types = await readFile(new URL('../src/types.ts', import.meta.url), 'utf8');
assert.match(types, /export type PersonaId =\s*\n\s*\| 'ciso_leadership'/);
assert.match(types, /'platform_owner'/);
assert.match(types, /'security_owners'/);
assert.match(types, /'application_delivery'/);
assert.match(types, /finops_lead: 'ciso_leadership'/);
assert.match(types, /engineering_lead: 'platform_owner'/);
assert.doesNotMatch(types, /export type PersonaId = 'finops_lead'/);

const constants = await readFile(new URL('../src/constants.ts', import.meta.url), 'utf8');
assert.match(constants, /Landing Zone Forensic Auditor/);
assert.match(constants, /ciso_leadership, platform_owner, security_owners, application_delivery/);
assert.match(constants, /TAC-ORG-A1-01/);
assert.match(constants, /TAC-ORG-AP-A1-01/);
assert.match(constants, /TAC-IDENTITY-AP-B1-01/);
assert.match(constants, /Foundation \/ Pilot \/ Rollout \/ Operate/);
assert.match(constants, /treating workshop confidence as platform configuration/);
assert.match(constants, /A = Tenant, billing & organization construct/);
assert.match(constants, /H = Platform automation & DevOps/);
assert.doesNotMatch(constants, /FinOps Strategic Architect/);
assert.doesNotMatch(constants, /turnaround CFO\/CTO/);
assert.doesNotMatch(constants, /Spotify's success/);
assert.doesNotMatch(constants, /"finops_lead"/);

const prompts = await readFile(new URL('../src/prompts.ts', import.meta.url), 'utf8');
assert.match(prompts, /platform-owner function reporting to the CISO/);
assert.doesNotMatch(prompts, /FinOps function reporting directly to the CFO/);
assert.doesNotMatch(prompts, /FinOps analyst rightsizes EC2/);

const dashboard = await readFile(new URL('../src/components/DashboardComponents.tsx', import.meta.url), 'utf8');
assert.match(dashboard, /tacticIdCaptureRx/);
assert.match(dashboard, /Landing Zone Action Protocol/);
assert.match(dashboard, /Landing Zone Maturity Matrix/);
assert.doesNotMatch(dashboard, /FinOps Theater/);
assert.doesNotMatch(dashboard, /TAC-\[A-Z\]\+-\\d\{3\}/);

const exportSource = await readFile(new URL('../src/services/exportService.ts', import.meta.url), 'utf8');
assert.match(exportSource, /id="lz-assessment-data"/);
assert.doesNotMatch(exportSource, /FinOps Engine/);
assert.doesNotMatch(exportSource, /id="finops-data"/);

const valid = {
  phase_3_strategy: {
    executive_summaries: {
      ciso_leadership: 'CISO',
      platform_owner: 'Platform',
      security_owners: 'Security',
      application_delivery: 'Delivery',
    },
    evidence_summary: {
      headline: 'Walk', maturity_classification: 'Walk', key_metrics: [], confirmed_strengths: [],
      confirmed_gaps: [], confirmed_antipatterns: [], silent_or_missing_evidence: [],
    },
    diagnosis: {
      primary_bottleneck: 'Ownership', root_causes: [],
      domain_diagnosis: { A: 'A', B: 'B', C: 'C', D: 'D', E: 'E', F: 'F', G: 'G', H: 'H' },
      confidence: 'medium', confidence_rationale: 'Evidence is mixed.',
    },
    visual_scorecard: { headline: 'Walk', maturity_score: 'Medium', burden_score: 'Medium' },
  },
};
assert.deepEqual(validateOutputContractText(OUTPUT_CONTRACT_IDS.evidenceSynthesis, JSON.stringify(valid)), valid);

console.log('work 12 runtime surfaces passed');
