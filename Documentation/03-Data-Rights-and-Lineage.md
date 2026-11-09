---
document_id: LZA-ASSURANCE-03
title: Data Rights and Lineage
version: 0.2.0
reviewed_on: 2026-11-09
status: DATA_RIGHTS_AND_PERMISSION_UNVERIFIED
matrix_step: 3
solution_assurance_mappings: [B1, B2, B3, B5]
---

# 03 — Processing Permission, Minimization, IP and Provenance (Step 3)

> **Reading rule:** `[CODE]` = source definition identified, not executed assurance; `[DOC]` = project statement or design, not a runtime finding; `[GAP]` = unverified, absent from supplied evidence; `NOT_RUN` is not a pass. Source baseline: `b1010b75147a49af9e50db7d98ea95fcbf1fdf53`.

> **Namespace:** the A/B/C and A1–F5 mappings in the attached **Solution Assurance** matrix are distinct from Landing Zone's A–H capability/anti-pattern IDs.


## Evidence and personal/confidential data boundaries

The [implementation plan](../Landing_Zone_Assessment_Implementation_Plan.md) defines customer-provided exports, policy/design records and a 48-question questionnaire. [Evidence taxonomy](../src/domain-packs/landing-zone/evidence-taxonomy.json) separates **Class 1 control-plane exports** from **Class 2 materials** (intent/documentation) and **Class 3 people/workshop statements** (leads and operating descriptions). A source being available as a file does not establish customer authorization, lawful basis, intellectual-property rights or permission to send its derived text to any AI model.

**Documented transformation path:** file format inspection → extraction (PDF, image/OCR, structured table, JSON, etc.) → Source Registry with source IDs/locators/provider → source classification → deterministic privacy screening → bounded packets → model attempt → validated output → provider-scoped findings. See [sourceRegistryService.ts](../src/services/sourceRegistryService.ts), [deterministicPrivacyService.ts](../src/services/deterministicPrivacyService.ts), [lib/governance.js](../lib/governance.js) and [ADR-001](../docs/architecture/ADR-001-execution-and-evidence-lineage.md).

## Input, source and derived-data inventory (design, not approved data contract)

| Category / fields observed in design | Processing need described by criterion | Real permission / data necessity status | Potential derived artifact |
|---|---|---|---|
| Step 0 root, provider, A–H scope, exclusion, export availability | Bind claims to locked estate and provider | Engagement authorization and exact identifiers **unknown** | Run scope, source bindings |
| Cloud organization/account/subscription/project hierarchy | Prove inventory boundary and governance structure | Minimization of tenant/account IDs not signed off | Provider-scope source packet and finding |
| IAM principal type/role/scope, identities and access configuration | Evaluate privileged/control-plane access | Person identifiers and credential redaction require testing | IAM observation and anti-pattern claim |
| Network paths, policy assignments, detection/logging settings | Evaluate control deployment/effectiveness | Sensitive topology and operational details not individually authorized | Derived control assertions |
| Billing/contract ownership linkages | Evaluate ownership boundary where relevant | Pricing, payer identifiers, contracts may be restricted; rights not evidenced | Summaries and quality outputs |
| IaC, platform workflow, exception records | Interpret planned controls and deployment process | Proprietary/third-party license and source rights unknown | Class 2 analysis, comparison to Class 1 |
| Workshop JSON responses, owner/contact information | Discovery leads, contradiction explanation | Names/emails should be minimized; actual notice/lawful basis unknown | Class 3 records, report phrases |
| Reference 80 PDF KB and Tactical Playbook | Criterion meaning/remediation; never customer current-state evidence | Approved source identities documented; reuse license and exact permitted quotation boundaries require review | KB retrieval context, tactic references |
| Outputs, checkpoints, prompts, model responses and potential embeddings | Diagnosis, recovery, source-grounded reports | May disclose restricted facts; classify based on content, not format | RunTrace, report, packet/hash |

**No source indicates an approved customer field-by-field necessity register, a signed processor agreement, or an enterprise AI model contract for actual customer inputs.** The table is an observed *type inventory*, **not authorization to process each field**.

## Q1 — Design specification demands

| Attached matrix requirement | Current finding | Source / missing verification |
|---|---|---|
| Purpose Permission & Lawful Basis (B3) | [GAP] No customer-specific basis/contract/notice presented | Engagement terms and GDPR role unresolved |
| Field-Level Necessity & Minimization (B2) | [DOC] Evidence types identified; exact fields, safe alternatives and approvals not established | Inventory above; not a signed schema |
| Source & Derived Data Classification (B1/B4) | [CODE] Source class + representation separate; classification of all prompts/checkpoints/embeddings not verified | evidence-taxonomy.json; source registry; no deployed derived store inventory |
| IP, Licensing & Usage Rights (B5) | [DOC] Approved Global Source Register exists; individual customer rights and reference reuse constraints need proof | Global Source Register v1.0.0; engagement documents missing |
| Data Quality, Provenance & Currency (B1) | [CODE] Source IDs, locators, provider scope and extraction diagnostics implemented; source owner/freshness acceptance unproven | src/services/sourceRegistryService.ts; ADR-001 |


## Q2 — Technical and enterprise parameters

| Attached matrix requirement | Current finding | Source / missing verification |
|---|---|---|
| Pre-Call DLP, Redaction & Tokenization (B2/B4) | [CODE] Deterministic block/redact paths present; external egress negative test not provided | src/services/deterministicPrivacyService.ts; lib/governance.js |
| Schema Allow-Listing (B1) | [CODE] Governed packet exact-key and schema validation | lib/governance.js; lib/outputContracts.js |
| Provenance & License Metadata Tagging (B1/B5) | [CODE] Source locators and KB version; per-chunk contractual license authorization not demonstrated | src/services/sourceRegistryService.ts; source register |
| Sandbox Data Restriction (A5/B2) | [GAP] No verified blocker for confidential customer data in dev/sandbox | No deployment environment restriction proof |


## Q3 — Verifiable evidence artifacts

| Attached matrix requirement | Current finding | Source / missing verification |
|---|---|---|
| Data Inventory, Rights & Necessity Record | [GAP] This inventory is not a completed legal/data-owner decision | No signed source-level permission or DPIA screening |
| Pre-Call Redaction & Minimization Test Log | [CODE] Tests exist, **execution not attested** | scripts/test-dlp-distributed-sampling.mjs; evidence/redaction-dlp-verification.json |
| Derived-Data / Embedding Leakage Assessment | [GAP] No executed inference-leakage assessment and no asserted vector-store use | Source KB retrieval exists; do not invent embedding deployment |


## DLP implementation and evidence limitation

[deterministicPrivacyService.ts](../src/services/deterministicPrivacyService.ts) defines block patterns for cloud/API/private keys and bearer credentials, with redaction patterns for email, phone, names in some contexts, IPs, billing/financial fields and other identifiers. Other components handle report scrubbing and governed packet schemas. Pattern matching alone cannot establish that **all** secret formats, ambiguous personal data, OCR regions, hidden spreadsheet cells, derived summaries and fallback dispatches are safe. The evidence file [redaction-dlp-verification.json](evidence/redaction-dlp-verification.json) intentionally records **NOT_RUN** until a reproducible outbound test exists.

## Decision boundaries / non-inference

- Platform evidence may establish configuration only within its verified scope/capture time; documentary intent and interviews cannot prove enforcement.
- **Unknown is not zero.** Absence is only accepted after explicit scope-complete negative testing.
- No customer file, credential, personal identifier, restricted reference text or unverifiable derived output belongs in the **public GitHub** repository.
- No claim of permission to ingest, index, embed, fine-tune, disclose or train on any customer's content has been supplied.
- Reference KB/tactic content is not customer evidence and must retain approved-source licensing limitations.

**Step 3 state:** technical data-flow controls have source-code evidence, while lawful basis, field necessity, IP/license permission, sandbox data isolation and executed DLP/derived-data tests remain unverified.
