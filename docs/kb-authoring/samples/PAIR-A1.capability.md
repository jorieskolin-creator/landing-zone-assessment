{
  "kb_id": "lz-kb-A1-v1",
  "kb_type": "reference",
  "version": "1.0.0",
  "domain_id": "A",
  "domain_name": "Tenant, billing & organization construct",
  "stream": "maturity",
  "criterion_id": "A1",
  "capability_id": "A1",
  "pair_id": "PAIR-A1",
  "intent_id": "authoritative-org-root",
  "capability_name": "Authoritative organization root",
  "evidence_categories": ["Policy", "Operational", "Accountability"],
  "allowed_uses": [
    "rubric_context",
    "maturity_examples",
    "evidence_requirements",
    "validation_questions"
  ],
  "forbidden_uses": [
    "customer_current_state_claim",
    "source_evidence_quote",
    "audited_finding"
  ],
  "legacy_ids": []
}

Engine Usage Note
This document interprets verified customer evidence for capability A1 (PAIR-A1, inverse of AP-A1). It is reference rubric context only. It must not be quoted as the customer's current estate, as a source-evidence quote, or as an audited finding.

Purpose
Define when a named tenant, organization or management account is a landing-zone root that can be inventoried, owned, and used as the Step 0 playing field.

Applies To
Design area A — Tenant, billing & organization construct. Azure Entra tenant / Tenant Root Group, AWS Organizations management account, GCP Organization resource. Out-of-scope roots named in Step 0 are omitted, not scored as zero.

Canonical Definition
A single declared tenant, organization or management account is the landing-zone root. Production resources do not live in unmanaged side-tenants. The root is inventoryable. The three sub-criteria are: a single declared root exists; that root can be exported as a hierarchy with a named owner; production workloads are forbidden from existing outside that root.

Primary Assessment Questions
- Is there a single declared tenant, organization or management account that is the landing-zone root?
- Can that root be exported as a hierarchy (management groups, OUs or folders) with a named owner?
- Are production workloads forbidden from existing outside that root?

Maturity State Interpretation
High: one named root, current hierarchy export, named owner, and an explicit rule that production outside the root is forbidden.
Partial: a declared root exists but inventory is stale, ownership is tribal, or production-outside-root is a guideline only.
Low or absent: multiple candidate roots, no export, or production known to live outside the declared map.

Detailed Maturity Interpretation
Treat the declared root as a control-plane object, not a slide. Commercial payer, technical organization and assessment scope must describe the same estate. A workshop pointing-gesture is a lead, not maturity.

Evidence Requirements
Prefer Class 1 control-plane exports dated for this assessment: tenant/org/management-account identifier, hierarchy export, billing-account mapping, named platform owner. Class 2 architecture notes may support naming; they cannot replace inventory. Class 3 workshop answers are leads.

Strong Evidence Examples
- Hierarchy export (management groups / OUs / folders) dated this week, rooted at the named object, with a named owner.
- Tenant / organization / management-account identifier that matches Step 0 named roots.
- Billing-account or enrollment mapping that attaches commercial spend to that same root.

Moderate Evidence Examples
- Named root in a current platform standard, corroborated by a partial hierarchy export.
- Owner named in RACI plus an older (but still attributable) inventory.

Weak Evidence Examples
- Workshop recollection of “we use one tenant” with no export.
- Architecture diagram without object IDs.
- Last year’s landing-zone deck.

Contradictory Evidence Examples
- Step 0 names one root, while invoices, extra directories or unmanaged accounts show production elsewhere (see AP-A1).
- Hierarchy export that does not contain subscriptions/accounts/projects the customer treats as in-scope.

Accepted Evidence Types
Hierarchy export, tenant/org/management-account identifier, billing mapping, named owner record, Step 0 locked roots. Not accepted as proof: interview confidence, framework CAF/AWS/GCP diagrams, or this Knowledge Base article.

Provider Mapping
Azure: Entra tenant ID, Tenant Root Group, MCA/EA billing account attached to the tenant.
AWS: Organizations management account, Root, ALL_FEATURES enabled; no extra orgs holding prod accounts.
GCP: Organization resource + Cloud Identity; billing account linked to the org, not to a lone project.

Relationship to Maturity Capabilities
PAIR-A1 is the direct inverse of AP-A1 Shadow tenants and unmanaged orgs. Capability credit cannot conceal a confirmed paired anti-pattern. Related: A3 billing/contract alignment, A4 administrative boundary, F2 inventory as landing-zone truth.

False Positive Guards
Do not score A1 high because a CAF/AWS/GCP landing-zone diagram exists. Do not treat a billing account alone as the technical root. Do not treat Step 0 naming, without an export, as inventory. Do not expand scope from extra providers found in files.

Validation Questions
- What object would you export this week as the root, and who owns it?
- If finance forwarded last month’s invoices, would any estate surprise the platform team?
- Which production subscriptions, accounts or projects sit outside that export?

Detection Heuristics
Look for more than one directory/organization/management account holding production; hierarchy exports that omit billed isolation units; owners who can name a deck but not an ID.

Operational Indicators
New isolation units first appearing on an invoice; leftover EA enrollments; personal or MSDN tenants running production; merged-company clouds with no landing-zone owner.

Risk Notes
An unnamed or unowned root makes every later design-area score a claim about an unknown estate. Scoring against an unnamed estate is a BLOCK.

Remediation / Tactic Notes
Do not propose tactic IDs until the Landing Zone Tactic Playbook is loaded. Interpretation may say: declare one root, export it, name an owner, and bring stray production into inventory or into an explicit Step 0 exclusion. That is not a playbook activation.

Prohibited Inference Rules
Do not infer a single root from the absence of a second name in a workshop. Do not infer production-outside-root is forbidden because a standard says so. Do not treat this article as evidence that the customer’s estate is complete.

Scoring Guidance Notes
Unknown is not zero. Missing inventory is unresolved evidence, not proof of absence of extra tenants. A confirmed AP-A1 finding (production outside the declared root) prevents narrating A1 excellence. Out-of-scope providers named in Step 0 exclusions are omitted.

Canonical Source Foundations
Pack records: criterion A1, pair PAIR-A1, provider-evidence contracts for A1. Questionnaire leads: A-Q1, A-Q2, A-Q6. Not a source of customer state.
