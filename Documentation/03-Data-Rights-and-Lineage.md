---
document_id: LZA-ASSURANCE-03
title: Data Rights and Lineage Contract
version: 0.1.0
prepared_on: 2026-11-08
status: DRAFT - VALIDATION AND CONTRACT REVIEW REQUIRED
step: 3
---

# 03 — Data Rights and Lineage

## 1. Prime rule

**Customer evidence is the only source of truth about the assessed customer's current estate.** External reference publications specify desired controls, evidence contracts and interpretation. The Knowledge Base and Tactical Playbook are not customer evidence. A workshop is a valuable discovery channel, not a platform inspection.

**[REPO]** Source lineage vocabulary is defined in [ADR-001](../docs/architecture/ADR-001-execution-and-evidence-lineage.md): source artifact → evidence-lane packet → knowledge release / analysis context revision → stage execution → model attempt → governed dispatch packet → validated output. Hashes and revision IDs bind the selected content to the resulting claim. Never collapse these distinct entities into a generic “packet”.

## 2. Data classes and handling dispositions

| Category | Examples | Default disposition | Justification and caveat |
|---|---|---|---|
| Public / approved references | Provider architecture guidance and registered publications | ALLOW by exact approved source IDs, authority and licensing restrictions | Cannot prove customer state |
| Customer control-plane export | Hierarchy, MG/OU/folder, roles, policy assignment, network peerings, logs | CONDITIONAL, scope-restricted and screened | Often necessary; may disclose security posture and names |
| Customer architecture/process material | IaC, topology diagrams, operating instructions, exception register | CONDITIONAL; only relevant excerpt or derived facts | Does not prove configuration |
| Questionnaire answers | Named facilitators, owners, comments, interview observations | MINIMIZE / PSEUDONYMIZE before model dispatch | Class 3 evidence leads |
| Secret / credential | Passwords, PEM keys, bearer tokens, API keys, cloud access keys | BLOCK external dispatch; quarantine or reject affected source | Never put credentials in Git, logs or prompts |
| Personal information | Names, emails, phone numbers, employee IDs, login records, IPs | REDACT or replace with functional role/opaque identifier unless approved necessary | Person names rarely needed for a control assessment |
| Commercially sensitive | Billing account IDs, invoice IDs, negotiated rates, contract values | MINIMIZE and REDACT; BLOCK if consent/contract absent | Billing organizational mapping may be necessary, amounts often are not |
| Security-sensitive configuration | Public endpoint lists, admin memberships, network paths, finding details | STRICTLY BOUNDED; customer profile authorization required | Sensitive even when no personal data appears |
| Highly restricted / regulated | Critical infrastructure, defence, health or special-category personal data | BLOCK until explicit enterprise/legal permission | May require isolated processing or non-public models |
| Generated assessment | Raw trace, issue narratives, citations, report export, roadmap | CONFIDENTIAL; filtered output and limited access | May reproduce sensitive input facts |
| System telemetry | Run IDs, dates, durations, error codes, token counts and gate states | MINIMUM NECESSARY; sanitize and time-bound | Avoid filenames, raw prompts, customer identifiers |

**[REPO]** deterministicPrivacyService.ts contains explicit redaction/block signatures for private keys, cloud keys, API credentials, bearer tokens, government IDs, personal financial identifiers, addresses, names, email, phone, IPs, billing identifiers and sensitive financial values. This confirms **implemented pattern classes**, not complete detection of every sensitive item. Structured tables, OCR/images, base64 strings and derived values require targeted tests.

### Significant trade-off to test

Blindly removing **all IP addresses** or tenancy identifiers may also destroy the ability to verify network topology, public endpoints, policy assignment or scope. The approved approach is **purpose-bound, pseudonymous preservation of testable relationships** (for example stable within-run aliases for CIDR/tenant/account IDs) where feasible; expose exact addresses to a model only under an expressly approved sensitive-data profile. **[PROPOSED]** Verify that transformations do not turn decisive evidence into misleading statements.

## 3. Field-level necessity [PROPOSED register]

| Field or group | Need | Preferred representation outside approved local processing | Owner / retention note |
|---|---|---|---|
| run_id, stage_id, packet hash, schema version | Required for integrity and rollback | Random opaque ID / digest | Control metadata |
| customer organization name | Helpful for customer-facing delivery, not scoring | Customer alias | Customer instruction |
| environment/provider name | Required | azure/aws/gcp enum | Step 0 locked |
| tenant / org / account reference | Required for evidence-bound scope | Consistent pseudonym or keyed digest; mapping held in restricted context | Not a credential |
| criterion ID, pair ID, source class | Required | Canonical ID + enum | Version controlled |
| document filename | Helpful to assessor, not to LLM | Source ID or sanitized generic label | Suppress raw in telemetry |
| capture timestamp and export window | Required when assessing freshness | ISO timestamp / range | Disclose timezone if relevant |
| source locator and page/row/object ID | Required for reproducible proof | Non-sensitive stable locator | Do not substitute unsupported quote |
| account/billing ID | Sometimes required for mapping | Stable alias | Do not send invoice totals unless authorized |
| role assignment, group name | Required for B/A/G checks | Role and anonymized principal reference | Treat access paths as confidential |
| actor email, personal name | Usually not required | Functional role or stable pseudonym | Minimize/redact |
| source IP, network CIDR, endpoint | Often required for D/E control verification | Topology-preserving anonymization or restricted local view | Test false conclusions after redaction |
| private key, client secret, token | Not necessary | **No value retained or dispatched** | Block, security incident if exposed |
| architecture text / policy statement | Conditional | Small relevant sanitized excerpt | Class 2, not enforcement |
| interview answer | Conditional | Claim summary + evidence lead, remove participant identity | Class 3 |
| numeric metric / structured table | Conditional | Deterministically derived aggregate and provenance | No unnecessary raw rows to LLM |
| reference source text | Conditional on license | Source ID + authorized locator / short excerpt | License boundary |
| model completion / generated rationale | Conditional | Validated structured finding + permitted explanation | Consider customer confidentiality |

The **field register is a proposal**, not a claim about the current complete database schema. Verify every field at each surface listed in [04](04-Storage-Retention-Contract.md).

## 4. Required evidence record

Every imported evidence unit should preserve at least:

- **Identity:** run, source ID, content hash, immutable extraction/derivation identifier and locator (page/row/cell/object path).
- **Authority:** Class 1 platform, Class 2 document or Class 3 workshop, separately from text/image/derived representation.
- **Scope:** provider, root, account/project/subscription, A–H criterion candidates, capture period and declared exclusions.
- **Quality:** detection method, extraction completeness, OCR/visual limitations, missing pages/rows/objects, freshness.
- **Security:** privacy classification, sanitization outcome, approved recipient and allowed uses.
- **Inference:** original observed statement, interpreted finding, supported claim, conflicting evidence, reviewed/unknown/absent status.
- **Version:** domain pack, criterion, knowledge release, tactical catalogue, model routing policy, scoring formula, gate decision and software commit.
- **Decision:** immutable automated result and any subsequent human disagreement or customer confirmation as separate records.

No citation may be produced by inventing an export, line number, API response, named source object or test result.

## 5. Source identity, authority and intellectual property

The **Global Source Register v1.0.0** holds stable publisher identities, classifications and allowed uses. The repository implementation plan states its controlled approval effective **2026-09-16**; older HTML copies may still label the same register preliminary, so edition/status must be checked with the owner. The approved **Tactical Playbook v1.0.0** is separate from the assessment KB. Its **80 TAC-* IDs** and mappings are release-controlled.

The source hierarchy is:

1. **Tier 1 normative:** legislation only where geography, dates, actor, role and material scope apply. Never infer legal applicability solely from registration.
2. **Tier 2 authoritative:** official hyperscaler, government and consensus guidance. Useful for evidence contracts, not direct proof of customer controls.
3. **Tier 3 supporting:** benchmarks and accelerators; not independently sufficient for legal compliance or maturity.

For licensed ISO/CIS/CSA or third-party copyrighted works, retain **metadata and approved locators**, not protected full text, unless the rights holder and actual license permit the intended storage, transformation and model transmission. Do not assume public discoverability equals a right to reproduce. **[VERIFY]** Obtain an explicit rights inventory for customer material, model processing and external service terms.

## 6. Egress and transformation contract [PROPOSED unless referenced as code]

**Trust boundary T0: user-supplied file or interview → local extraction.** Obtain authorization, classify file and detect content types. Reject unsupported format or unsafe payload; no provider or root expansion based on file contents.

**T1: extraction / source registry → privacy-screened candidate.** Perform deterministic full-source and representative table/visual checks, block known secrets and sensitive classes, redact unnecessary identifiers, validate that derived values preserve relationships. Track what is withheld.

**T2: candidate → governed model dispatch packet.** Include only approved fields and criteria-related excerpts; bind run, stage, source, policy/version, provider/model destination, content hash, expiry and purpose. Never pass full original file merely because a summary or OCR transform exists.

**T3: model response → validation and publication.** Reconcile citations against the Source Registry and scope, reject fabricated source locators, re-run provenance/absence tests, apply code-owned gates and sanitize exported reports.

**T4: report / remediation → human decision.** Keep automatic finding, reviewer annotation and customer decision distinct. Tactic IDs become eligible only from approved exact mappings on locked findings; tactic implementation provides evidence for later reassessment, not automatic clearance.

**[REPO]** Implementations to inspect: lib/governance.js, src/services/deterministicPrivacyService.ts, sourceRegistryService.ts, evidenceStagePacketService.ts, lzForensicEvaluation.ts, tacticGroundingService.ts, pipelineIntegrityService.ts and lib/operationalLogPolicy.js.

## 7. Rights and role approval checklist

- [ ] Customer agrees allowed purpose, file provenance and authority to share each data category.
- [ ] Document what is forbidden under NDA, commercial terms or intellectual-property licenses.
- [ ] Establish relevant GDPR processing roles and purpose-specific lawful basis.
- [ ] Approve exact subprocessors, hosting regions, transfers, retention and support-access policy.
- [ ] Validate secret and regulated-content exclusion, including intermediate summaries, OCR and report exports.
- [ ] Confirm the customer's ability to inspect, correct, contest and delete their submitted material.
- [ ] Preserve a data mapping to the twelve surfaces and test explicit deletion.
- [ ] Require reviewers to attest that public GitHub contains **sanitized documentation/test fixtures only**.

**References:** [01 scope](01-Intended-Use-and-Scope.md); [04 storage](04-Storage-Retention-Contract.md); [05 architecture](05-Architecture-and-Control.md); evidence-taxonomy.json; approved Source Register and Tactical Playbook; ADR-001; GDPR/privacy role review pending.
