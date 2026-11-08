---
document_id: LZA-ASSURANCE-04
title: Storage, Retention and Deletion Contract
version: 0.1.0
prepared_on: 2026-11-08
status: DRAFT - DEPLOYMENT AND VENDOR VERIFICATION REQUIRED
step: 4
storage_matrix_version: 12-surfaces-v1
---

# 04 — Storage, Retention and Deletion Contract

## 1. Coverage statement

This contract maps **twelve storage and processing surfaces**. It covers original files, intermediate text, OCR, generated packets, PostgreSQL content bodies, Redis data, browser persistence, logging, vendor systems, reference Knowledge Base and exported reports. Source-code retention parameters are **policy definitions, not proof of actual deletion**. No blanket deletion guarantee is supported until the deployment and its vendors have been checked.

## 2. Twelve-surface matrix

| ID | Surface | Information and boundary | Policy / required verification |
|---|---|---|---|
| **S01** | Browser file selection and runtime memory | Customer originals, previews, parsed local data and UI state | **[PROPOSED]** No persistent originals; release previews/object URLs on clear, close and logout. Inspect memory and crash recovery |
| **S02** | Browser persistent state | Questionnaire autosave, localStorage, IndexedDB, caches, download history | **[SOURCE]** Questionnaire supports local autosave. **[PROPOSED]** Never cache secrets or unredacted exports; inspect all storage on reset/reload |
| **S03** | Network, proxy, ingress | TLS requests, multipart/JSON bodies, reverse proxy and edge buffers | **[PROPOSED]** Encrypted transport, request-size bounds, disabled body logging, no edge caches; inspect hosting settings and failures |
| **S04** | Parsers, OCR and temporary processing | PDF renders, image crops, spreadsheet cells, temporary files, process memory | **[REPO]** File parsing services exist. **[VERIFY]** File-system, crash dumps, error logs and cleanup on failure |
| **S05** | Source Registry and intermediate analysis | Chunks, citations, derived table facts, redacted excerpts and in-memory stage context | **[PROPOSED]** Run-local and ephemeral, no unbounded serialization; inspect checkpoints and browser state |
| **S06** | Redis execution plane | Leases, fences, authorized-send markers, tombstones, recovery and checkpoints | **[REPO]** TTL/deadline and tombstone code. Verify every key class, index, Redis persistence/snapshot and expiry |
| **S07** | PostgreSQL content records | Governed canonical packet bytes in governed_packet_bodies | **[REPO]** Packet expiry is bounded by 30 min and absolute run deadline; pruning exists. Verify DB rows and replicas |
| **S08** | PostgreSQL control metadata | Run ledger, hashes, stage/model-attempt metadata, quality and gate measurements | **[REPO]** Metadata retention policy 90 days. Verify that every field is truly content-minimized and expiry works |
| **S09** | Vercel Blob reference KB | Controlled 80 PDF Landing Zone Knowledge Base objects; **reference**, not customer evidence | **[REPO]** Versioned KB lifecycle, separate from run TTL. Verify store separation, permissions, license and release IDs |
| **S10** | External AI/model providers | Sanitized prompt excerpt, visual/OCR manifest, completion and provider service metadata | **[PROPOSED]** Approved model/region/contract only. Verify training use, vendor-side retention, subprocessors and international transfers |
| **S11** | Operational logs, APM, platform backup | Event metadata, service errors, process diagnostics, DB/Redis backups and snapshots | **[REPO]** Log allowlist exists. Verify actual host/APM settings, snapshots, backup purge and restored-copy deletion |
| **S12** | Export, delivery and human review | HTML/PDF/other reports, RunTrace, Master Data, downloads, support email and approval records | **[PROPOSED]** Controlled copy/distribution, redacted report review, customer retention terms. Downloaded copies are user-held |

**No live tenant access in the initial implementation:** user-supplied exports are the input, not Azure/AWS/GCP API calls. Future live connectors create new surfaces and require new approval.

## 3. Source-code lifetimes — do not generalize these to all data

**[REPO]** lib/controlPlanePolicy.js specifies:

| Element | Current declared duration | Correct interpretation |
|---|---|---|
| Governed packet | **30 minutes** | Packet canonical content and validity window; deletion job must be demonstrated |
| Result recovery | **30 minutes** | Time-bounded result recovery, not external provider retention |
| Checkpoint | **24 hours** | May hold derived or resumable state longer than packets |
| Inactivity expiry | **2 hours** | Time since last activity |
| Absolute run lifetime | **24 hours** | Overall run ceiling |
| Metadata | **90 days** | Control/quality trace may outlive deleted transient content |

**A 30-minute packet TTL is not a universal 30-minute retention guarantee.** Redis and PostgreSQL, UI/local storage, provider processing, logs, replication and backups have different rules. A 90-day metadata lifetime is not automatically a legitimate or necessary personal-data retention period; it requires separate privacy review.

**[REPO]** lib/redisExecutionPlane.js provides TTL and tombstone operations; lib/runLifecycleService.js coordinates cleanup; lib/controlPlaneRepository.js prunes expired packet bodies and metadata. A DELETE request may put a run into **deletion_requested** before verified cleanup. Review the state transitions and actual execution worker, not just API responses.

## 4. Deletion workflow [PROPOSED acceptance contract]

1. **Authorize** the user/request, bind to run ID and data subject/customer contract.
2. **Fence** the run: no further AI dispatch, retry or read-after-delete; create a tombstone.
3. **Remove** Redis transient children, checkpoint/recovery material, server temporary data and canonical Postgres packet bodies.
4. **Verify** key sets, packet rows and permitted control metadata separately. Do not declare “deleted” while content deletion remains pending.
5. **Enumerate** reports and downloaded/exported copies; disclose which are no longer inside Engine control.
6. **Handle provider and backup residuals** according to contracts; maintain backup restore/re-deletion and support-access procedures.
7. **Record** non-sensitive evidence by surface: VERIFIED, PARTIAL_PENDING, FAILED or NOT_APPLICABLE, with timestamp and operator.
8. **Escalate** any failure as an incident; automatic retries may not recreate tombstoned content.

Delete-now semantics, backup lag, vendor exceptions and legally justified audit retention must be presented accurately to the user. This document does **not** claim those controls already work end-to-end.

## 5. Enterprise contract and deployment parameters

| Parameter | Proposed/current | Owner and proof |
|---|---|---|
| ALLOWED_DATA_CLASSES | **TBD** per customer/synthetic test | Customer, security; data inventory |
| ALLOWED_MODEL_PROVIDERS_AND_IDS | Role-based model routing code exists; actual approved deployment **TBD** | Architecture, privacy; configuration export |
| MODEL_REGION_AND_TRANSFER_BASIS | **TBD** | Privacy/legal; agreement |
| PROVIDER_TRAINING_AND_RETENTION | **TBD contract**; never assume zero retention | Procurement/legal; provider terms |
| SUBPROCESSOR_LIST | **TBD** | Privacy, procurement; dated list |
| SOURCE_AND_BACKUP_RESIDENCY | **TBD** | Platform; hosting contract |
| INPUT_FORMATS_AND_MAX_SIZE | Code lists PDF/HTML/CSV/TSV/JSON/XLSX/images; limits **TBD** | Engineering/security; abuse test |
| REDACTION_AND_EGRESS_POLICY | Code exists; accepted release and negative tests **TBD** | Security; packet traces |
| PACKET_TTL | **30 min** in code | Platform; TTL trace |
| CHECKPOINT_TTL | **24 h** in code | Privacy/platform; retention necessity |
| RUN_INACTIVITY/ABSOLUTE_TTL | **2 h / 24 h** in code | Platform; expiry trace |
| METADATA_RETENTION | **90 d** in code | Privacy/platform; field inventory |
| LOG/APM_RETENTION | **TBD**, metadata only | Ops/security; configured sinks |
| REPLICA_AND_BACKUP_RETENTION | **TBD** | Ops; snapshot/restore documentation |
| REPORT_DISTRIBUTION_RETENTION | **TBD** | Customer and engagement owner |
| DELETION_SLA_AND_EXCEPTIONS | **TBD** | Legal, platform; signed policy |
| ACCESS/EXPORT/SUPPORT_AUDIT | **TBD** | Ops/security; RBAC and sampling |
| INCIDENT_NOTIFICATIONS | **TBD** contractual and regulatory | Security/legal |

Do not commit actual secrets, tenant identifiers, customer evidence, negotiated commercial terms or vendor credentials to this public repository.

## 6. Validation cases required

| Case | Required check |
|---|---|
| ST-01 Browser reset | Original file, local/autosave and object URLs cleared or limitation disclosed |
| ST-02 Secret-bearing upload | No raw secret in model packet, error log, analytics or export |
| ST-03 Normal completion | Run and body states/timeouts recorded; report remains bounded |
| ST-04 Explicit delete | Run tombstoned and Redis/Postgres transient content verifiably removed |
| ST-05 Inactivity / absolute timeout | 2h / 24h expiry and race handling tested |
| ST-06 Worker crash/retry | Cannot resurrect deleted or expired content |
| ST-07 90-day metadata | Schema-minimized retained columns and purge test |
| ST-08 Vendor/backup | Signed and dated provider+backup deletion/retention proof |
| ST-09 KB isolation | Reference Blob never receives customer evidence |
| ST-10 Export path | User-visible retained copies, handling and access controls documented |

**Exit criteria:** every applicable S01–S12 row has a dated outcome in [evidence/verification-plan.md](evidence/verification-plan.md), and accepted service/customer parameters in [evidence/approval-register.md](evidence/approval-register.md).

**Sources:** lib/controlPlanePolicy.js; lib/redisExecutionPlane.js; lib/runLifecycleService.js; lib/controlPlaneRepository.js; lib/operationalLogPolicy.js; migrations/008_authoritative_packet_bodies.sql; ADR-001; docs/kb-authoring/README.md; questionnaire HTML.
