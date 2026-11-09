---
document_id: LZA-ASSURANCE-04
title: Storage, Retention and Enterprise AI Contract
version: 0.2.0
reviewed_on: 2026-11-09
status: PARTIAL_CODE_EVIDENCE_DEPLOYMENT_CONTRACT_UNVERIFIED
matrix_step: 4
solution_assurance_mappings: [B2, B3, B4, C1, C2, C4, D1]
---

# 04 — Twelve-Layer Data, Retention, Deletion and Access Contract (Step 4)

> Status notation: **[CODE]** inspected implementation/constant, not runtime proof; **[DOC]** documented design or historical account; **[GAP]** not established by supplied code, configuration, run evidence or contract. Missing status is not evidence that a control is absent. Reference commit: `b1010b75147a49af9e50db7d98ea95fcbf1fdf53`.
> Solution Assurance matrix mappings (A1, B2, C3, etc.) are distinct from Landing Zone Assessment criterion IDs (A1–H5).


## Twelve-layer storage matrix (exact attached Information Demand Matrix taxonomy)

Each row requires **data, exact region, TTL, deletion method and access entitlement**. The table distinguishes *source-controlled code* from unverifiable hosted configuration. It is not an attestation that a layer currently stores customer data.

| # | Mandatory layer (exact attachment) | Stored / state | Location | Retention | Deletion | Access |
|---|---|---|---|---|---|---|
| 1 | Browser / Client Memory | [DOC] File selection, local extraction; standalone interview HTML has autosave behavior | Not confirmed | Not confirmed | Browser clear/logout and questionnaire localStorage purge not audited | Actual user/browser permissions unverified |
| 2 | Application Memory & State | [CODE] Server worker/gateway state and analysis context; concrete sizes/dumps unverified | Not confirmed | No independent post-run memory purge measurement | Worker restarts and memory sanitation test required | Process operator/admin privileges unknown |
| 3 | Prompts & Model Inputs | [CODE] Governed, hashed stage packet; canonical bytes also stored in PostgreSQL | Destination depends on configured provider | Code packet lifetime 30 min; provider memory independent | Packet-body TTL/pruning code; egress capture and downstream copies not tested | Configured stage/router access; operational privileges unverified |
| 4 | AI Provider Endpoint & Memory | [CODE] Model routing supports listed providers and fallbacks; actual contracted endpoint not provided | Unknown actual region | Unknown vendor input/output/abuse retention and training terms | Unknown provider erase/exit contract | Supplier/support access not evidenced |
| 5 | Primary Application Database | [CODE] PostgreSQL packet canonical body and run metadata/checkpoints | Unknown deployed DB region | Packet 30 min; checkpoint policy 24 h; metadata 90 d; code values | PruneExpiredPacketBodies / pruneMetadata and terminal lifecycle exist; not runtime verified | DB admin/application access policies not supplied |
| 6 | Vector Stores & RAG Indexes | [DOC/CODE] KB Blob retrieval/indexing exists; deployed vector store or embedding persistence not established | Unknown / not established | Unknown / not evidenced | No vector-index source-delete propagation proven | No per-user vector ACL evidence |
| 7 | Caches, Queues & Temp Files | [CODE] Redis transient state, leases, checkpoints/recovery, tombstones; parser temporary surfaces uncertain | Unknown Redis/tmp region | Result recovery 30 min, checkpoint 24 h; Redis tombstone 24 h | Redis tombstone cleanup and TTL code; complete propagation not tested | Redis service/admin permissions unknown |
| 8 | Application & Error Logs | [CODE] Event/field allowlist and safe-error code logic | Unknown log host/region | Unknown hosting log TTL | Log redaction and deletion not runtime inspected | Log reader roles unknown |
| 9 | Platform & APM Telemetry | [GAP] No authoritative deployed APM/proxy trace configuration | Unknown | Unknown | Unknown deletion/redaction policy | Unknown |
| 10 | Backups & Snapshots | [GAP] No DB/Redis/storage backup or WAL/AOF/residency agreement supplied | Unknown | Unknown residual window | Restore/purge proof missing | Unknown recovery/admin access |
| 11 | Exports & Downstream Channels | [CODE] Client report and HTML/Master Data export paths; actual distribution/recipient restrictions unverified | User machine or chosen destination unknown | Under recipient/user or contractual policy, not server TTL | User-held downloads not erased by server DELETE; no downstream purge test | Recipient authorization unknown |
| 12 | Governance Audit Ledger | [CODE] Runs, packet hashes, quality snapshots, stage/attempt lineage; real signed approval ledger not shown | PostgreSQL location unknown | Code metadata 90 days; approval retention not established | PruneMetadata in cleanup worker; human decision purge/access unverified | DB/auth and audit-reader roles not demonstrated |


## Concrete code-owned lifetimes

[lib/controlPlanePolicy.js](../lib/controlPlanePolicy.js) specifies `packet=30 minutes`, `resultRecovery=30 minutes`, `checkpoint=24 hours`, `inactivity=2 hours`, `absoluteRun=24 hours`, `metadata=90 days`. [lib/redisExecutionPlane.js](../lib/redisExecutionPlane.js) uses a separate 24-hour tombstone. [lib/runLifecycleService.js](../lib/runLifecycleService.js) attempts Redis tombstone cleanup and records verified/retryable-failure codes; the worker prunes packet bodies and metadata. The [api/run.js](../api/run.js) `DELETE` route requests a lifecycle transition. **Those facts do not establish deletion from vendor memory, backup, logs, client downloads, all checkpoints or replicas.** In particular, a universal “everything deleted in 30 minutes” statement is contradicted by the code's distinct lifetimes.

## Four-layer responsibility matrix — ownership not supplied

| Layer | Responsibility suggested by attached matrix | Named person / signed RACI |
|---|---|---|
| AI Provider | Endpoint, training/abuse retention terms, subcontractors, provider-side deletion | **Unknown** |
| Shared enterprise platform | Central identity, network/security baseline, hosting/backup/log contract | **Unknown** |
| Landing Zone solution | Payload minimization, API access, packet hash, app/Redis/DB cleanup and output safeguards | **Role described; named owner unknown** |
| Business process/customer | Intended use, legal rights, field necessity, recipient release, human override, customer decisions | **Unknown** |

## Q1 — Design and contract information demands

| Matrix demand | Current reading | Source / absent verification |
|---|---|---|
| 12-Layer Storage & Retention Policy (B2/B3) | [DOC/CODE] All layers above listed; actual regions/TTL/access largely unknown | lib/controlPlanePolicy.js; lib/runLifecycleService.js |
| Enterprise AI Contract Baseline (C2/C4) | [GAP] No executed no-training/retention/subprocessor/region/SLA/exit contract supplied | Model gateway support is not contractual proof |
| Access & Tenant Isolation (B4/D1) | [CODE] Shared secret session; no verified enterprise SSO, tenant-scoped RBAC or retrieval trimming | lib/auth.js; no independent access test result |
| Four-Layer Responsibility Matrix (A3/F1) | [GAP] Roles segmented above; named RACI not provided | Provider/platform/solution/business process decision absent |


## Q2 — Runtime and enterprise parameter information demands

| Matrix demand | Current reading | Source / absent verification |
|---|---|---|
| Contract-Matched Endpoint Config (C1/C4) | [CODE] Model role and fallback routing; contract/region match unverified | lib/modelRoutingPolicy.js; .env.example |
| Automated TTL & Deletion Propagation (B2/B3) | [CODE] DB expiry/worker/Redis tombstone path; 12-layer cascade not demonstrated | lib/controlPlanePolicy.js, lib/runLifecycleService.js |
| Identity-Bound Retrieval Filtering (B4/D1) | [GAP] No executed user A/user B unauthorized retrieval proof; enterprise IAM not present in source auth | src/services/boundedRetrievalService.ts; lib/auth.js |
| Structured Log Sanitization (B4/D4) | [CODE] Client event allowlist; deployed stdout/APM/raw-body log absence unverified | lib/operationalLogPolicy.js |


## Q3 — Verifiable evidence artifacts

| Matrix demand | Current reading | Source / absent verification |
|---|---|---|
| Component & Provider BOM (C1-Q3) | [DOC/CODE] Repo manifests exist; complete current deployed provider/infra manifest absent | package.json; .env.example; server.js |
| Contract-to-Config Reconciliation (C4-Q3) | [GAP] No redacted deployed endpoint/region/no-training snapshot | No enterprise contract/config attestation |
| End-to-End Deletion Propagation (B2/B3-Q3) | [GAP] No executed 12-layer deletion report | evidence/deletion-propagation-test.json |
| Log & Browser Inspection Sample (B4-Q3) | [GAP] No captured stdout/browser-clearing evidence | operational log allowlist is design only |
| Cross-Tenant Unauthorized Access (D1-Q3) | [GAP] No independent cross-tenant or retrieval isolation test evidence | evidence/rag-rbac-isolation-test.json |


## Contract-to-configuration reconciliation (open, not fabricated)

| Contract field | Evidence-backed value |
|---|---|
| Executed enterprise agreement / provider or processor role | **Unknown** |
| Actual deployed endpoint, model ID and provider fallback | **Unknown** (`.env.example` is illustrative) |
| Legal/service region for each deployed vendor, database, log and backup | **Unknown** |
| Provider zero-training, output/abuse monitoring retention, subprocessors | **Unknown** |
| SLA, breach notification, audit rights, vendor exit and retention exception | **Unknown** |
| IAM/SSO, per-assessment RBAC, tenant-scoped retrieval, DB and log access | **Enterprise SSO and cross-tenant authorization not demonstrated** |
| Real API log/body retention, browser persistent state, deletion propagation | **Runtime verification not supplied** |

**No approval is inferred** from the fact that Model Routing accepts a provider. Employer/customer production allowlists and contracts require separate evidence.

## Step 4 acceptance

To advance beyond a source-code inventory, attach the [deletion propagation test](evidence/deletion-propagation-test.json), [RAG/RBAC isolation test](evidence/rag-rbac-isolation-test.json), sanitized browser/log inspection, region/endpoint snapshots and human-reviewed contract mappings. They have **not been attested** in the provided sources. Current status: **PARTIAL IMPLEMENTATION TRACE; Q3 INCOMPLETE**.
