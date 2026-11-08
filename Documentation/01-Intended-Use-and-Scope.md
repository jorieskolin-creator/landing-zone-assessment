---
document_id: LZA-ASSURANCE-01
title: Intended Use and Scope
version: 0.1.0
prepared_on: 2026-11-08
status: DRAFT - HUMAN CONFIRMATION REQUIRED
step: 1
---

# 01 — Intended Use and Scope

## 1. Intended purpose [REPO/SOURCE]

**The Landing Zone Assessment Engine is a decision-support tool for expert-led, evidence-driven review of the cloud foundation, not a cloud administration robot or a compliance certifier.** It analyzes an explicitly bounded set of customer-provided evidence against a controlled A–H rubric for Azure, AWS and GCP. Its principal value is to improve consistency, evidence coverage, transparency, discovery of missing controls and the quality of discussions concerning remediation.

The specific supported tasks are: lock assessment scope; acquire uploaded exports/documents/images/structured files and questionnaire JSON; classify and sanitize sources; route evidence to relevant criteria; assess paired capability and anti-pattern conditions; perform corroboration and absence checks; issue confidence-bound, provider-specific findings; report insufficiency/unknowns; recommend approved tactics against locked findings; and retain traceable human decision points.

**Success is not a numerical score alone:** a defensible assessment can result in GO, WARN or BLOCK, or identify that more evidence is necessary. This is a statement of assessment sufficiency and decision safety, not a blanket cloud certification.

## 2. Users, affected parties and decision rights

| Group | Authorized role | Boundaries |
|---|---|---|
| Assessment expert / facilitator | Scope review, interviews, evidence requests, analysis initiation and draft interpretation | Cannot turn unknown into supported fact without evidence; must review model errors |
| Platform Owner / cloud foundation specialists | Validate tenant roots, IAM, policy, networking, operations and IaC findings | Do not grant production access to Engine by implication |
| CISO / risk and security stakeholders | Interpret impact, authorize risk treatment, challenge disputed evidence | Formal risk acceptance outside the automated Engine |
| Application / delivery teams | Review applicability and remediation practicality | No direct right to alter published findings or bypass the gate |
| Customer decision maker | Confirm assessment scope, contest findings, accept/reject priorities and authorize follow-up | Final customer authority must be documented |
| Privacy, legal and compliance reviewers | Approve permitted data, contractual role and processing safeguards | Automated output is not a legal opinion |
| Internal operations / maintainers | Deploy, monitor, test, respond to incidents and change controlled KB | No discretionary reading of sensitive customer content |

**Affected people** may include employees, contractors, privileged administrators, incident responders and customer contacts whose names, identifiers, assignments or security activities appear in exports or workshop notes. Although the Engine is not designed to decide employment matters, inaccurate identification of responsibility, access or control maturity could affect reputations and workload; person-level conclusions are not an authorized outcome.

## 3. Mandatory Step 0 scope contract

The scope is fixed **before analysis**, and later documents cannot silently expand it.

| Field | Minimum content | Enforcement expectation |
|---|---|---|
| Assessment identifier | Non-sensitive opaque ID; separate human-readable customer label if permitted | Run is uniquely addressable |
| Customer / organization | Name only if necessary; prefer a pseudonymous reference | Do not transmit customer identity to LLM by default |
| Cloud providers | Explicit subset of azure / aws / gcp | Never introduce another provider based on uploaded text |
| Root identifiers | Declared tenant, organization or management account IDs | Used only as scoped evidence keys; avoid secrets |
| Areas | Explicit subset of A–H | Exclude unselected batches and denominators |
| Inventory status | Yes / Partial / No for uploaded current inventory exports | Does **not** mean live tenant API access |
| Exclusions | Explicit provider, business-unit, environment, account and period boundaries | Report exclusions beside findings |
| Owner and lock event | Person or role, time, assessment pack version | Require recorded acknowledgement before scoring |
| Workshop metadata | Optional date, facilitator, participants, interview reference | Interview context only; not scoring authority |

**[REPO]** Scope implementation is reflected in src/components/Step0ScopeForm.tsx and the Landing Zone pack. **[VERIFY]** Exercise bypass, mixed-provider, export-time and scope-change attempts and retain test results.

When a scope changes: create a new revision, invalidate affected routing, cache and evaluation results, identify the old and new scope in lineage, and require fresh human confirmation **[PROPOSED operational contract]**.

## 4. What the Engine is authorized to conclude

- Supported: criterion-specific observations linked to an attributable file/export, bounded inference, known contradictions, documented uncertainty, tested anti-pattern presence or absence where the evidence is sufficient.
- Supported: provider-scoped maturity, resolution and assessment sufficiency calculated from versioned rules, and remediation options that are triggered by locked findings and exact IDs.
- Supported: a request for further evidence where the dossier contains only declarations or workshop claims.
- **Not** supported: proof of actual configuration from a reference architecture or a policy PDF alone.
- **Not** supported: declaring anti-pattern absence because a search found nothing in an incomplete export.
- **Not** supported: blending Azure, AWS and GCP into an unqualified single maturity score.
- **Not** supported: legal compliance assurance, legal applicability determination or accepted residual risk without a qualified human decision.
- **Not** supported: changing production configuration, granting access, deploying tactics or invoking provider administration APIs.

## 5. Explicitly prohibited or out-of-scope uses

1. Automatic decisions about an individual's employment, performance, discipline, access entitlement or trustworthiness.
2. Using questionnaire answers as control-plane proof, or scoring a silent area as zero.
3. Presenting prototype, synthetic, stale or unrelated exports as evidence of a real customer's current estate.
4. Sending raw files, secrets, keys, unredacted identity data or irrelevant commercial information to a generative model.
5. Uploading customer confidential content without agreement, authorization, approved environment and privacy controls.
6. Releasing highly sensitive vulnerability, incident, network or administrative access maps into public GitHub, general-purpose logs or unrestricted model sessions.
7. Direct tenant/account administration, persistent cloud credentials, autonomous remediation, vulnerability exploitation or unsupervised incident response.
8. Treating an implementation accelerator, official provider documentation or registered publication as evidence a customer has implemented that control.
9. Auto-activating a tactic without an exact locked finding or auto-clearing an assessment because an implementation task is marked complete.
10. Using the Engine for regulated, critical or highly sensitive deployments without a separately approved risk, legal and hosting profile.

## 6. Evidence sources and confidence

Three evidence classes are **not interchangeable**:

| Class | Examples | Primary permitted claim | Not permitted |
|---|---|---|---|
| 1 — Platform | Azure Resource Graph exports, AWS Organizations/CloudTrail exports, GCP Cloud Asset Inventory, current role and policy assignments | Current configuration, when provenance/completeness/freshness are sufficient | Unsupported coverage beyond the named snapshot |
| 2 — Material | IaC, design diagrams, ownership charters, logging standards, exception registries | Declared control design, expected implementation or a lead to verification | Saying a control is enforced without platform corroboration |
| 3 — People | 48-question interview/session export, workshop answers, evidence leads | Tacit operating practice, contradictions and follow-up requests | Direct pass/fail on platform preventive controls |

An exported platform snapshot does not cease to be Class 1 merely because it arrives via file upload. A model's generated text, Tactical Playbook and Global Source Register are *not* Class 1 customer evidence.

## 7. Intended operating sequence

1. Customer and assessor agree the purpose, scope, allowed data and assessment reference.
2. Assessor locks Step 0 with cloud roots, providers, A–H, inventory/export availability and exclusions.
3. Assessors conduct discovery interviews and obtain dated, authorized exports. The questionnaire's 48 responses are evidence leads, not scores.
4. Local parsing, classification, provenance and privacy checks accept, withhold or redact each unit.
5. Evidence and KB packets cross a controlled boundary to authorized models only when allowed by security policy.
6. Deterministic validation/reconciliation, paired scoring, Assessment Sufficiency and Quality Gate govern interpretation and release.
7. Expert reviews findings and obtains customer confirmation or records unresolved disputes.
8. Approved exact-mapping tactics support a WHY/WHAT/HOW remediation discussion; implementation requires separate authorization.
9. New implementation evidence is independently reacquired and reassessed against the same (or explicitly revised) scope.

## 8. Negative use-case examples for testing

| Scenario | Required system response |
|---|---|
| Workshop asserts “all privileged access is temporary”; no access export | Unknown / evidence request, not GO |
| Only an approved network diagram exists | Declared design; enforcement not verified |
| An Azure-only scope receives AWS inventory | AWS material withheld from scoring and source packets |
| A source contains an AWS access key, private key or live token | Block sensitive egress; flag incident where appropriate |
| A provider-native control lacks a corresponding object | Mark not applicable, not failing zero |
| No public endpoint found in incomplete inventory | Absence unverified; no anti-pattern clearance |
| A model proposes an unlisted TAC-* ID | Reject or withhold; exact mapping required |
| A customer asks the Engine to deploy a suggested fix | Refuse automation; route to human-controlled change |

## 9. Acceptance and open decisions

- [ ] Actual intended audiences, customer contract and current deployment contexts confirmed.
- [ ] Named scope owner and human finding-lock process demonstrated.
- [ ] Customer source-permission and upload acknowledgment approved.
- [ ] Prohibited uses technically reinforced and reflected in interface/help.
- [ ] No cloud-API credentials or autonomous change permissions in the deployed implementation.
- [ ] Evidence handling and retention in LZA-03 and LZA-04 signed.

**Related:** [Risk and Impact](02-Risk-and-Impact.md), [Data Rights and Lineage](03-Data-Rights-and-Lineage.md), [Architecture and Control](05-Architecture-and-Control.md).

**Trace sources:** Landing_Zone_Assessment_Implementation_Plan.md §3–8; src/domain-packs/landing-zone/pack.json, evidence-taxonomy.json, scoring-policy.json, quality-gate-policy.json; approved Tactical Playbook pp. 2–4; Interview & Evidence Discovery Questionnaire introduction.
