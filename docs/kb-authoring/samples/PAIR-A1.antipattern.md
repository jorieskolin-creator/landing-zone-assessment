{
  "kb_id": "lz-kb-AP-A1-v1",
  "kb_type": "reference",
  "version": "1.0.0",
  "domain_id": "A",
  "domain_name": "Tenant, billing & organization construct",
  "stream": "antipattern",
  "criterion_id": "AP-A1",
  "capability_id": "A1",
  "pair_id": "PAIR-A1",
  "intent_id": "shadow-tenants",
  "antipattern_name": "Shadow tenants and unmanaged orgs",
  "evidence_categories": ["Policy", "Operational", "Accountability"],
  "allowed_uses": [
    "rubric_context",
    "antipattern_examples",
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
This document interprets verified customer evidence for anti-pattern AP-A1 (PAIR-A1, inverse of capability A1). It is reference rubric context only. It must not be quoted as the customer's current estate, as a source-evidence quote, or as an audited finding.

Purpose
Define when production lives in extra directories, organizations or personal accounts that the platform team cannot inventory or govern — the direct inverse of an authoritative organization root.

Applies To
Design area A — Tenant, billing & organization construct. Azure extra Entra tenants, AWS accounts outside the organization, GCP no-organization projects. Extra providers in the file set do not expand Step 0 scope.

Canonical Definition
Production lives in extra directories, organizations or personal accounts that the platform team cannot inventory or govern. The three sub-criteria are: production exists outside the declared root; there is no maintained inventory of extra directories or billing relationships; mergers, partners or “temporary” clouds still run production without a landing-zone owner.

Primary Assessment Questions
- Do production workloads exist in tenants, organizations or accounts outside the declared root?
- Is there no maintained inventory of extra directories or billing relationships?
- Are mergers, partners or 'temporary' clouds still running production without a landing-zone owner?

Anti-Pattern State Interpretation
Confirmed present: control-plane or billing evidence shows production isolation units outside the Step 0 named root.
Partial: extra directories exist but ownership/expiry is claimed, or inventory of extras is incomplete.
Tested absent: a current inventory/export of billed isolation units matches the declared root, and extras are named exclusions or empty.
Unknown: no inventory; do not treat silence as clearance.

Detailed Anti-Pattern Interpretation
Shadow tenants are an inventory failure, not a naming failure. A second tenant used only for identity lab work is not this anti-pattern unless production or billed spend lives there. Partner clouds that Step 0 explicitly excluded are out of scope, not AP-A1.

Evidence Requirements
Class 1: hierarchy vs billing mismatch, extra tenant/org/account with resources, Resource Graph / Organizations / Asset Inventory dated this week. Class 2 may describe known leftovers. Class 3 workshop answers (“finance would be surprised”) are leads, not findings.

Strong Evidence Examples
- Extra Entra tenant, AWS account outside the org, or GCP no-organization project with production resources.
- Invoice or billing export for a cloud with no landing-zone owner.
- Hierarchy export that omits billed subscriptions/accounts/projects still running.

Moderate Evidence Examples
- Named leftover EA / personal tenant / acquisition cloud with unclear production status.
- Inventory older than the assessment window that already listed extras.

Weak Evidence Examples
- Rumour of “someone’s MSDN tenant”.
- Workshop memory without an invoice, export or object ID.

Contradictory Evidence Examples
- Customer claims one root (A1 narrative) while billing or inventory lists unmanaged production units.
- Step 0 exclusions name the extra estate, so it must not be scored as AP-A1 inside the locked scope.

Accepted Evidence Types
Billing export, extra tenant/org/account inventory, hierarchy vs invoice diff, named leftover with owner. Not accepted as proof of absence: this article, a workshop “I think that’s all”, or a framework diagram.

Provider Mapping
Azure: second Entra tenant with subscriptions; MSDN / personal tenants used for prod.
AWS: member accounts not in the org; root-less standalone prod accounts.
GCP: no-organization projects; billing on a user account.

Relationship to Maturity Capabilities
PAIR-A1 inverse of A1 Authoritative organization root. Also related to A3 (billing split), A4 (unnamed partner/guest estates), F2 (no current inventory). Confirmed AP-A1 blocks A1 excellence narration.

False Positive Guards
Do not call a declared, owned sandbox directory AP-A1 if Step 0 excluded it. Do not treat a second directory used only for break-glass identity as shadow production. Do not mark AP-A1 tested-absent because the workshop named one root.

Validation Questions
- If finance forwarded last month’s invoices, which estates would surprise platform?
- Show this week’s list of tenants/orgs/management accounts; which are missing from Step 0?
- Which leftover merger or partner cloud still has production?

Detection Heuristics
Invoice identifiers not in the hierarchy export; additional Entra tenants with subscriptions; AWS accounts with no organization; GCP projects with user billing and no org.

Operational Indicators
Orphaned subscriptions; “temporary” acquisition tenants still billed; platform team cannot list directories without asking finance.

Risk Notes
Uninventoried production cannot be guarded by landing-zone policy, logging or identity. Later design-area scores describe a subset of reality.

Remediation / Tactic Notes
Do not propose tactic IDs until the Landing Zone Tactic Playbook is loaded. Interpretation may say: inventory extras, attach or exclude them in Step 0, assign an owner. That is not a playbook activation.

Prohibited Inference Rules
Do not infer extra tenants from missing documentation. Do not infer tested absence from an unnamed estate. Do not treat workshop confidence as clearance. Do not use this Knowledge Base text as a quote of customer state.

Scoring Guidance Notes
Unknown is not zero and is not tested-absent. Anti-pattern clearance requires a valid tested-absence result on inventory, not recollection. Confirmed AP-A1 and high A1 in the same estate is a contradiction; capability cannot conceal the pair.

Canonical Source Foundations
Pack records: criterion AP-A1, pair PAIR-A1, provider-evidence contracts for AP-A1. Questionnaire leads: A-Q2, A-Q6. Not a source of customer state.
