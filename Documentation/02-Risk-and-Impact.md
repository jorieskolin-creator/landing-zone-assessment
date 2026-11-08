---
document_id: LZA-ASSURANCE-02
title: Risk and Impact Assessment
version: 0.1.0
prepared_on: 2026-11-08
status: PRELIMINARY RISK HYPOTHESES - NOT A LEGAL DETERMINATION
step: 2
risk_owner: TO CONFIRM
---

# 02 — Risk and Impact

## 1. Risk statement and methodology

The Engine assists humans in judging the quality of evidence about a customer's **cloud organization, identity, network, security, operations, governance and automation foundation**. The principal hazards are (a) a false assurance or missed exposure, (b) a false accusation or inappropriate remediation, (c) disclosure of high-value configuration/identity information, and (d) misleading claims about regulatory compliance or data processing.

The baseline is an **expert-supervised, file-based decision-support use**, not autonomous control of customer infrastructure. If direct cloud access, autonomous changes, personnel scoring or regulated decisions are later added, this analysis must be repeated.

**This table is a scenario catalogue, not measured likelihood.** Use five-level impact and likelihood scales only once operational data is available. Do not turn the provisional priorities into an actuarial, regulatory “high-risk AI” or security certification label.

| Priority for validation | Hazard and affected interests | Initiating mechanism | Required control / detection | Residual risk to verify |
|---|---|---|---|---|
| Critical | Unredacted tokens, secrets, security maps, network and IAM exports leave the approved trust boundary | File parsing, OCR, derived tables, source packets, LLM fallback, debug logs | Default-deny egress, full-source scan, redaction/classification, per-stage packet hash, sanitized logs, provider allowlist | Provider receipt and onward retention need contractual/test proof |
| Critical | Engine reports an absent anti-pattern as cleared without a complete test | Silent source, incomplete API export, stale inventory, unsupported provider object | Distinct unknown/absent/confirmed states, completeness metadata, explicit tested-absence evidence, provenance gate | Golden absence tests must show zero false clearances |
| High | Incorrect GO, maturity or roadmap gives false confidence and delays essential controls | Weak supporting evidence, schema drift, hallucinated citation, blended cloud result | Deterministic pair scoring, code-owned gates, provider-specific boundaries, expert approval | Calibration and post-release monitoring needed |
| High | False serious finding causes unnecessary expense, operational disruption or reputational harm | Document-only claim given platform authority; unsupported contradiction | Class 1/2/3 hierarchy, precise locators, expert challenge and customer confirmation | Human adjudication UX and audit trail unverified |
| High | Tactic misapplied to wrong scope/provider or automatically implemented | Similarity matching, model action, wrong ID or scope revision | Approved exact TAC ID maps; no production permissions; explicit change authorization | Reassessment and rollback evidence needed |
| High | Incomplete or incorrect scope hides a tenant/subscription/account | Wrong root, unowned side tenant, late provider in document, invoice discrepancy | Locked Step 0 scope and scope-completeness warnings | False confidence where unreachable estate remains undiscovered |
| High | Prompt injection or malicious document manipulates evidence, tool use or output | Untrusted file containing instructions; adversarial PDF/HTML | Treat sources as data, fixed system policies, schema validation, no arbitrary model tools, output fact check | Red-team cases must be run against exact models |
| High | Data kept longer than promised or survives deletion | Browser cache, Postgres body, Redis checkpoint, logs, vendor backups | Twelve-surface matrix, TTL validation, tombstone and deletion evidence, backup contract | Vendor backup and LLM retention still require signed proof |
| Medium–High | Commercial/IP or licensed-standard rights breach | Copyrighted reference text or unpermitted customer exports copied to repository/provider | Source Register licensing tiers, purpose-bound processing, minimal permitted excerpts, data/rights sign-off | Contracts and actual prompt contents need inspection |
| Medium–High | Incorrect processor/controller assumption causes unlawful handling | Contractor/customer roles confused; HR-related personal data in exports | Processing-role mapping, purpose/necessity assessment, agreement, DPIA screening where indicated | Legal decision pending |
| Medium | Model/protocol outage yields truncated report or partial result appearing complete | Missing Redis, timeout, provider 404/409, schema mismatch | Fail-visible errors, immutable stage/attempt lineage, no silent partial-to-GO conversion | Historical September 2026 run issues; latest runtime not verified |
| Medium | Drift in rubric, sources, models or provider API semantics changes conclusions | KB refresh, prompt change, model fallback, parser upgrade | Version-pinned packs, golden samples, traceable approvals and statistical monitoring | Repeatability baseline yet to be recorded here |

## 2. Consequences by stakeholder

**Customer organization:** false confidence can leave standing privileged access, uncontrolled public endpoints, nonfunctional logging, undeclared estates or vulnerable platform automation in place. Conversely, a false positive can encourage expensive or disruptive changes. A client must have the right to challenge an evidence reference and prohibit automatic remediation.

**Individual employees and contractors:** IAM records and workshop answers may identify people. A false statement can affect attribution of responsibility, reputation or workload. Minimize person identifiers, avoid automated personnel judgements and provide correction paths.

**Assessor and service provider:** foreseeable incidents include confidentiality breaches, wrong-scope reports, unlicensed reference reproduction, uncontrolled subprocessors and absence of auditability. Named security, privacy, domain and operational owners must accept the appropriate controls.

**Wider third parties:** compromised access maps and exposed cloud administration details can affect suppliers, connected networks, contractual counterparties and the public where the assessed infrastructure supports essential services.

## 3. Assessment-specific epistemic risks

Three independent questions must be answered before a maturity statement is published:

1. **Evidence reliability:** Is it attributable, current, unaltered, complete enough, in-scope and correctly classed?
2. **Assessment validity:** Does the exact criterion / provider contract support the inference, including exceptions and absence tests?
3. **Decision authority:** Is the gate satisfied, and has the necessary expert/customer reviewed and confirmed the intended use?

A strong paper design is not equivalent to a deployed control. “Not observed” is not “absent”. A failed gate is an invitation to acquire evidence or hold a decision, not a verdict that the customer's landing zone failed. Both **Assessment Sufficiency** and **Quality Gate** must remain visible; neither may be overwritten by a model narrative.

## 4. Legal and regulatory relevance: applicability questions, not conclusions

**[VERIFY: qualified legal/privacy review]** Actual applicability depends on jurisdiction, actors, processing purpose, the assessed customer's sector, environment and contracts.

| Instrument / regime | Why it may matter | Required determination |
|---|---|---|
| GDPR and national data-protection rules | User identity, role assignments, access logs, interviews, metadata may contain personal data | Controller/processor roles for each purpose, lawful basis, transparency, necessity, minimization, processor agreements, transfers, security, retention, DPIA screening |
| EU AI Act | Whether deployed functionality is within its scope, provider/deployer obligations, transparency and any Annex III use case | Do **not** presume “high-risk” or “not high-risk” merely because cloud security is assessed; assess the actual intended use |
| NIS2 and national cybersecurity legislation | Customer or service-provider cyber risk and incident duties may intersect with findings | Covered entity/sector, responsibility, obligations and interaction with service terms |
| Contract and confidentiality law | Customer-owned architecture, credentials, supplier information and findings | NDA, processing instructions, permitted cloud/AI providers, access and deletion obligations |
| IP/copyright/standards licensing | Official materials, licensed benchmarks and customer artefacts | Authorized reproduction, excerpt limits, metadata-only use where needed |
| Cloud shared-responsibility and provider policies | Claimed controls may be organization-level or provider-managed | Identify who operates the control and what evidence can be obtained |
| Sector-specific requirements | Public sector, health, defence, critical infrastructure may have stronger data locality/assurance demands | Additional customer-specific review; restricted deployment where necessary |

**Data role caveat:** a customer commissioning an assessment will often determine the business purpose of its materials, while the supplier may process some personal data on its behalf; this is **not a universal controller/processor assignment**. Operations/security logging, service-account access and product improvement may have separately defined purposes or roles. Determine each flow and contract.

## 5. Existing protections, limitations and proposed safeguards

**[REPO]** The implementation includes a privacy scanner, governance packet schema, sanitized operational-log policy, versioned domain pack, criterion/pair evaluation and deterministic gate policy. The Tactical Playbook expressly gives final authority to humans. These are relevant safeguards but source code alone does not prove that a particular deployment is secure or that deletion, residency and provider terms are satisfied.

**[PROPOSED]** Additional requirements before broad customer use:

- Strict customer evidence intake policy, including scan before every external model dispatch and every derived/visual payload.
- Block on ambiguous high-sensitivity content; do not rely on the absence of a regex match as clearance.
- Separate customer datasets and runs, scope-bound authorization, least privilege and denial of arbitrary external tool invocation.
- Independent reviewer sign-off for high-impact findings and remediation recommendations.
- Prohibit live financial, identity, secrets and critical infrastructure detail unless the exact approved profile allows them.
- Provider-retention, support-access, backup/deletion and subprocessors contract evidence.
- Golden tests plus security tests with signed version, commit, run date and input fixture hash.

## 6. Risk disposition model [PROPOSED]

| Result | Conditions | Action |
|---|---|---|
| ACCEPT FOR LIMITED SYNTHETIC TESTS | Synthetic data, approved test environment, no customer identifiers, security gate active | Authorized test operator only |
| ACCEPT FOR BOUNDED CUSTOMER TEST | Approved agreement, data inventory, provider contracts, validated security/retention, signed risk acceptance | Named customer/solution authority with restricted inputs |
| HOLD / WARN | Missing secondary evidence, unsigned noncritical workflow or ambiguous minor control | Do not promote risk-sensitive decisions; acquire evidence |
| BLOCK / SUSPEND | Secret egress risk, scope violation, absent key approval, unresolved severe incident, deletion or access failure | Kill dispatch / stop intake, contain, investigate and reauthorize |

**Do not automatically derive an operational “approved” status from this model.** The record must include who accepted which residual risk and the exact date, service revision, data profile, run type and expiry.

## 7. Tests and sign-offs

- [ ] All critical cases in [evidence/verification-plan.md](evidence/verification-plan.md) have an executed, dated result.
- [ ] High-severity false-clearance tests cover incomplete evidence and every provider pack.
- [ ] Independent security/privacy reviewer has validated provider and retention facts.
- [ ] Customer-facing report explicitly distinguishes observed fact, inferred concern, uncertainty and unverified absence.
- [ ] Risk owner signs acceptance for the permitted assessment profile in [evidence/approval-register.md](evidence/approval-register.md).

**Sources:** Implementation Plan §§3–10; approved Tactical Playbook pp. 1–4; src/domain-packs/landing-zone/evidence-taxonomy.json, quality-gate-policy.json, scoring-policy.json; lib/governance.js; src/services/deterministicPrivacyService.ts; ADR-001/002/003.
