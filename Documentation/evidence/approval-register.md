---
document_id: LZA-ASSURANCE-APPROVALS
title: Human Approval and Evidence Decision Register
version: 0.1.0
prepared_on: 2026-11-08
status: NO APPROVALS ATTESTED
---

# Approval Register — Human Authority Only

> **No signed approvals are claimed by this document.** All rows below are explicit pending decisions for the documentation-support test case. An AI draft, automated test, source repository commit or positive model answer cannot approve the Engine.

## 1. Required decisions

| Decision ID | Review authority | Scope of decision | Evidence prerequisite | Current decision |
|---|---|---|---|---|
| **DEC-01** | Solution Owner | Intended use, prohibited uses, stakeholder roles and initial data profile | LZA-00/01, architecture review | **PENDING** |
| **DEC-02** | Security Owner | Threat model, privacy egress, identity/access, model permissions and severity gate | LZA-02/03/05, VT-07/08/20 | **PENDING** |
| **DEC-03** | Privacy / Legal | Controller/processor roles, allowed data, contracts, subprocessors, transfers, DPIA screening | LZA-02/03/04 and signed agreements | **PENDING** |
| **DEC-04** | Platform / Operations Owner | Hosting, data residence, logs, backups, S01–S12 deletion, kill-switch and resilience | LZA-04/06, VT-17/21 | **PENDING** |
| **DEC-05** | Assessment Method Owner | Criteria freeze, provider evidence contracts, unknown/absence, maturity and gates | VT-01/02/10/11/12; Golden Standard | **PENDING** |
| **DEC-06** | Knowledge & Tactic Owner | Approved KB release/source register and exact 80 tactic identities | VT-13/14, controlled source records | **PENDING** |
| **DEC-07** | Independent QA | Golden Standard correctness, repeated-run variability, source provenance and output quality | VT-01–22 and negative test seeds | **PENDING** |
| **DEC-08** | Customer engagement authority | Specific customer scope, data processing permissions, disputed findings and risk treatment | Per-assessment signed review and evidence | **NOT APPLICABLE UNTIL A CUSTOMER CASE** |
| **DEC-09** | Release authority | Authorization for a specified environment, use, version, data profile and expiry | DEC-01–07 as applicable; run/incident evidence | **PENDING** |

**Current permissible description:** Documentation prepared for **Level A synthetic/documentary tool testing** as a **proposal**. It is not a formal Level A authorization or permission to process customer confidential data.

## 2. Approval record template

Create one immutable record per decision and scope. Human identity and signature evidence must reside in restricted storage, **not in this public GitHub repository**.

~~~yaml
approval_id: APR-LZA-YYYYMMDD-001
decision_id: DEC-XX
product: landing-zone-assessment
environment: pending
intended_use_scope: pending
allowed_data_classes: []
handling_level: proposed_A_or_B_or_C
repository_commit_sha: pending
knowledge_release: pending
tactic_release: pending
model_profile: pending
risk_register_revision: LZA-ASSURANCE-02/0.1.0
evidence_references: []
decision: PENDING # APPROVED | APPROVED_WITH_CONDITIONS | REJECTED | SUSPENDED
approved_by_role: pending
approval_record_location: restricted-system-reference-only
signature_or_attestation_hash: null
decision_date_utc: null
expiry_utc: null
conditions_and_exceptions: []
next_review: pending
~~~

The **record must be an actual human act**. Never enter synthetic approver names, signatures, fake hashes or fabricated timestamps to populate this template.

## 3. Per-customer finding lock [PROPOSED]

A product release decision is separate from each assessment's finding lock. Per customer assessment, require:

- Locked Step 0 provider/root/area scope and evidence list, with excluded estate.
- Automated result and gate stored as immutable revision; expert must not silently rewrite it.
- Expert-reviewed evidence citations, contradictory facts, tested-absence status and unresolved unknowns.
- Customer disagreement, acceptance, non-acceptance or request for correction as separate decision records.
- Exact approved TAC IDs only for locked finding states; no mandatory tactic without the matching finding.
- Authorized production implementation is **external to Engine**, followed by independent reassessment.

## 4. Pre-approval blockers

Any condition below prevents converting PENDING to APPROVED for the corresponding scope:

1. Unknown actual storage/provider residency, retention, support access or contractual permissions for real customer data.
2. Missing or unsuccessful redaction/secret leakage and malicious document tests.
3. Incomplete Golden Standard provider coverage, particularly false anti-pattern clearance.
4. Failure to show scope isolation, independent scorer and gate authority.
5. Unresolved lifecycle deletion, backup/redis resurrected-content issue or material incident.
6. Missing human finding lock, dispute handling or customer decision trace for the proposed service.
7. No signed evidence for a claimed exception or residual-risk acceptance.

## 5. Change and revocation

An approval expires or is suspended when an unapproved change affects processing purpose, data category, service architecture, hosting location, model provider, retention, scoring rules, evidence authority, published KB/tactics, human oversight, legal environment or critical security posture. Document the reason, affected releases/assessments, required regression, reapproval date and restoration conditions. Do not let an older signed record automatically authorize a new context.

**References:** [00 summary](../00-Assurance-Summary.md), [risk](../02-Risk-and-Impact.md), [storage](../04-Storage-Retention-Contract.md), [operations](../06-Operations-and-Change.md), [verification plan](verification-plan.md).
