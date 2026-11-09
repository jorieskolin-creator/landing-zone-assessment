---
document_id: LZA-ASSURANCE-01
title: Intended Use and Scope
version: 0.2.0
reviewed_on: 2026-11-09
status: DRAFT_HUMAN_CONFIRMATION_REQUIRED
matrix_step: 1
solution_assurance_mappings: [A1, A2, A3, A5]
---

# 01 — Intended Use, Scope and Output Role (Step 1)

> **Assurance evidence convention (2026-11-09):** **[CODE]** means a code/configuration definition observed in the repository—not a live test. **[DOC]** means stated in controlled project material—not deployment proof. **[GAP]** means required information or independent proof has not been supplied. **[NOT APPLICABLE]** requires a scoped reason. `NOT_RUN` never means `PASS`.

> **Namespace warning:** A1, B2, D3, etc. in the attached **Solution Assurance 7-Step Information Demand Matrix** refer to Solution Assurance controls. The Landing Zone Assessment Engine's own A1–H5 capability/anti-pattern identifiers are different objects; do not merge their meanings.


## Observed solution definition

**[DOC]** The solution supports evidence-driven assessment of landing-zone foundations across Azure, AWS and Google Cloud. Step 0 locks provider, organizational root, relevant A–H areas, inventory-export availability and exclusions before analysis. Initial intake is **customer-supplied files and structured interview JSON**, not live cloud API access. [Implementation Plan](../Landing_Zone_Assessment_Implementation_Plan.md), [scope](../src/components/Step0ScopeForm.tsx).

**Output classification:** **Diagnostic report / summary / recommendation** (not an authorized autonomous decision or production action). Capability and anti-pattern findings, tested absence, evidence sufficiency, deterministic scoring and mapped tactics are proposed to an expert. The separate Tactical Playbook states that adjudication, finding lock, legal applicability, risk acceptance and production authorization are reserved for humans. [Playbook](../Landing_Zone_Assessment_Tactical_Playbook_v1.0.0_APPROVED.pdf); [quality-gate-policy](../src/domain-packs/landing-zone/quality-gate-policy.json).

**Intended recipients** in the pack include cloud platform owner, CISO/leadership, identity/network/security/SOC owners and application delivery stakeholders. Identity exports can also contain personal information about staff/contractors. Actual engagement-specific affected groups, accountable persons and downstream report recipients are **unknown**. [Personas](../src/domain-packs/landing-zone/personas.json).

**Not supported by documented initial scope:** autonomous cloud provisioning or correction, live cloud credential discovery, employee grading, AI-only legal/compliance certification, auto-acceptance of risk, inventing negative results from absent material, silent provider expansion or blended multi-cloud headline maturity. The expected benefits (governed baseline and better evidence-led platform decisions) are **hypotheses**, not measured performance improvements.

## Q1 — Design specification demands

| Matrix information demand | Current verified status / observation | Traceable basis or missing proof |
|---|---|---|
| Problem & Value Hypothesis (A2) | [DOC] Claimed value and domain purpose; no non-AI baseline measurement | Implementation Plan §§1–5; proposal; comparator trial not provided |
| Output Role & Autonomy (A1) | [CODE/DOC] Evidence-bound assessment/recommendation, not automatic cloud action | Quality Gate policy; approved Tactical Playbook |
| Users & Affected Parties (A1, E1) | [DOC] Report persona roles; specific individuals/affected groups not identified | src/domain-packs/landing-zone/personas.json |
| Permitted vs. Prohibited Uses (A1) | [DOC] File-only scope; no cloud-write; scope authority | Implementation Plan; explicit production enforcement test missing |
| Accountable Ownership (A3, F1) | [GAP] Named Solution Owner, Business Process Owner and final decision owner not evidenced | Human release record is unapproved |
| Lifecycle Stage & Boundary (A5) | [DOC] Historical partial live attempts 2026-09-18; present sandbox/pre-prod/prod status unknown | Implementation Plan v1.22 |


## Q2 — Technical and enterprise parameters

| Matrix information demand | Current verified status / observation | Traceable basis or missing proof |
|---|---|---|
| Environment Isolation (A5, D1) | [GAP] No verified split for credentials/DB/network among environment tiers | No deployment/infra snapshots provided |
| Workflow Scope Enforcement (A1) | [CODE] Step 0 provider/root/design-area lock, typed inputs and explicit exclusions | src/components/Step0ScopeForm.tsx; scripts/test-step0-scope.mjs |
| System Boundary Definition (A3) | [CODE/DOC] Browser, API, PostgreSQL, Redis, KB Blob and external model providers identified; deployed perimeter not confirmed | server.js; api/; lib/; Implementation Plan §7 |
| Centralized Identity Binding (D1) | [CODE] HMAC cookie using shared SECRET_KEY password; enterprise SSO/RBAC not evidenced | lib/auth.js; api/login.js |


## Q3 — Verifiable evidence artifacts

| Matrix information demand | Current verified status / observation | Traceable basis or missing proof |
|---|---|---|
| Approved Intended-Use Dossier | [GAP] No named signed charter | evidence/human-release-decision-record.md |
| Non-AI Baseline Trial Record | [GAP] No comparator experiment or stop criteria supplied | No baseline trial result in repository sources |
| Environment Boundary Snapshot | [GAP] No deployed separation proof | Example .env file is not a deployment snapshot |
| Out-of-Scope Rejection Test | [CODE] Test scripts exist; not executed/attested for this dossier | scripts/test-step0-scope.mjs; scripts/test-lz-ah-routing-packets.mjs |


## Human confirmation required

A Solution Owner, Business Process Owner and report-release authority must approve the actual intended use, customer population, current deployment lifecycle, allowed inputs and recipients. The current shared-password session is **not** evidence of enterprise SSO. The September 2026 plan described expert calibration/customer decisions as unfinished (Work 13), and no more recent signed completion was supplied.

**Step 1 assurance state:** **partly documented; not independently approved.** Any change to task scope or autonomous action requires reassessment.
