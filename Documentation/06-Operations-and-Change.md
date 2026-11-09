---
document_id: LZA-ASSURANCE-06
title: Operations, Monitoring and Change
version: 0.2.0
reviewed_on: 2026-11-09
status: OPERATIONAL_EFFECTIVENESS_NOT_VERIFIED
matrix_step: 7
solution_assurance_mappings: [C5, D4, F5]
---

# 06 — Operations, Traceability, Change and Retirement (Step 7)

> `[CODE]` = source-defined behavior, not deployed verification; `[DOC]` = stated purpose/history, not implementation proof; `[GAP]` = necessary operational fact not provided. The attached matrix's C5/D4/F5 are **Solution Assurance** mappings, distinct from the Landing Zone A–H rubric. Source review commit: `b1010b75147a49af9e50db7d98ea95fcbf1fdf53`.

## Observed operational building blocks

The repository includes [ADR-001 evidence and execution lineage](../docs/architecture/ADR-001-execution-and-evidence-lineage.md), a [run control plane](../lib/controlPlaneRepository.js), [RunLifecycleService / CleanupWorker](../lib/runLifecycleService.js), [Redis execution plane](../lib/redisExecutionPlane.js), [RunTrace service](../src/services/runTraceService.ts), [client operational logging allowlists](../lib/operationalLogPolicy.js), [safe errors](../lib/safeErrors.js) and [test workflow](../.github/workflows/test.yml).

**No verified live operational dashboard, named on-call responder, security incident ticket, safe-shutdown/kill-switch drill, vendor exit procedure, human override telemetry or release decision** was supplied. A 2026-09-18 implementation-plan snapshot noted partial live runs and missing expert calibration; that does not establish the present deployment state.

## Minimum run reconstruction contract (specified, not yet proven end-to-end)

For each released material conclusion, trace: source artifact/locator, Step 0 locked scope, source authority class and hash, privacy decision, evidence packet and manifest hash, Knowledge Base version, model stage/attempt and provider/model, output schema validation, independent provenance/contradiction assessment, deterministic score and Quality Gate, tactic eligibility, human finding lock, release authority/recipient and correction record. Raw customer content should not be copied into a general audit ledger. The [sample run manifest](evidence/sample-sanitized-run-manifest.json) contains **null fields** pending a real, appropriately sanitized run.

## Monitoring demand and evidence state

| Signal (Step 7 matrix) | Available technical basis | Executed baseline / threshold evidence |
|---|---|---|
| Source coverage, evidence provenance, missing and contradictory claims | Score/gate/quality fields and evidence services in source | No actual monitored trend supplied |
| False acceptance, false blocking and abstention | Quality Gate status and source semantics; scripts exist | No approved confusion matrix, target rate or current series supplied |
| Human override and review effectiveness | Human role required by Playbook/design | No operational override event series |
| Model latency, fallback, timeout, tokens and expenditure | Operational event allowlist and model-routing metadata | No current metric dashboard or cost budget supplied |
| DLP, unauthorized retrieval and security anomalies | Privacy event types, log allowlist and governed dispatch logic | No executed egress/tenant isolation dashboard |
| Retention failures and cleanup retries | Cleanup attempt result and lifecycle worker logic | No current deletion propagation test or vendor attestation |
| Model/prompt/KB/source/config drift | Versioned sources, CI workflow and KB manifest | No evidence that every material change automatically invalidates approval |

**Do not invent operational SLOs, false-accept target percentages, response SLAs or a claim of “100% passed”.** Such values require policy approval and a measured baseline.

## Q1 — Design specification demands

| Attached requirement | Source-supported observation / status | Missing proof or repository trace |
|---|---|---|
| Traceability & Reconstruction Specification (D4) | [CODE/DOC] ADR-001 and run metadata link packet, attempt, stage and outputs; end-to-end report-to-human trace unverified | lib/controlPlaneRepository.js; src/services/runTraceService.ts |
| Operational & Governance Monitoring Plan (F5) | [DOC] Metrics listed above; exact alert policy/owner values missing | lib/operationalLogPolicy.js; no real dashboard |
| Incident Response & Safe Takeover (D5/F5) | [GAP] No approved on-call roster, escalation SLA or manual takeover proof | No incident rehearsal record |
| Material-Change Reassessment Triggers (C5/F5) | [DOC] Versioned KB/tactic and CI checks exist; automated approval expiry unverified | Playbook v1.0.0; .github/workflows/test.yml |
| Controlled Retirement & Decommissioning (A5/F5) | [GAP] No executable/approved full vendor+DB+Redis+backup retirement record | No signed exit/retirement evidence |


## Q2 — Technical and enterprise parameters

| Attached requirement | Source-supported observation / status | Missing proof or repository trace |
|---|---|---|
| Tamper-Evident Run Manifests & Audit Ledger (D4) | [CODE] Packet hashing, stage/attempt lineage and run states; human approval linkage unverified | lib/governance.js; ADR-001; sample-sanitized-run-manifest.json |
| Supply-Chain & Change-Control Gates (C5) | [CODE] CI performs install, independence, migrations, npm tests/build/integration; mandatory prompt/model change-specific reapproval not proven | github/workflows/test.yml; package-lock.json |
| Telemetry & Drift Dashboards (F5) | [CODE] Log and quality fields present; trend dashboard/override telemetry not attested | lib/operationalLogPolicy.js; src/services/metricsService.ts |
| Decommissioning & Purge Scripts (F5) | [CODE] Run-scoped cleanup; full enterprise decommissioning including provider/backups not established | lib/runLifecycleService.js |


## Q3 — Verifiable evidence artifacts

| Attached requirement | Source-supported observation / status | Missing proof or repository trace |
|---|---|---|
| End-to-End Run Reconstruction Proof (D4-Q3) | [GAP] No independently reproduced sanitized real run with human decision | evidence/sample-sanitized-run-manifest.json |
| Operational Monitoring & Override Telemetry (F5-Q3) | [GAP] No live/pilot export supplied | No measured rate series |
| Change-Gate & Regression Log (C5-Q3) | [CODE] CI workflow exists; no current result/status tied to release decision | github/workflows/test.yml |
| Incident / Decommissioning Drill (F5-Q3) | [GAP] No executed drill record | No test or approval artifact supplied |


## Incident and safe-continuation boundary

**Source-defined mechanisms:** code distinguishes active, recovery_required, ready_for_delivery, completed, failed, deletion_requested, deleted and expired run states; Redis tombstone/deadline logic and safe-error status exist. An operator-facing feature flag that halts **in-flight, queued and fallback** model dispatch has **not** been independently demonstrated by the reviewed evidence. Do not claim a complete kill-switch based on the existence of error handlers.

For actual incidents, **operational owner and escalation route must first be assigned**; intended actions would be to stop new unsafe processing, preserve minimal non-sensitive incident provenance, assess affected model/provider/log/backup surfaces, invalidate compromised credentials under approved procedures, notify authorized parties and only resume after controlled testing. These are **requirements from the attached matrix**, not an attested existing incident process.

## Reassessment triggers (specified, not verified as automated)

Any change to intended use, affected population, data class/rights, model/provider/region or fallback, prompt, retrieval/KB release, scoring/Quality Gate, deterministic validator, tool scope, security identity, retention, logging, architecture or relevant law/contract requires human review of risk, Q2 configuration and relevant Q3 test results. In particular, semantic revisions to the approved Tactical Playbook require controlled versioning, exact mapping checks and reapproval.

**Retirement controls still unverified:** revocation of deployment/model credentials, worker stop, approved erasure of browser/DB/Redis/reference backups, data-subject/customer obligations, contract/provider exit, audit disposition and final signed ledger. No purge or vendor-exit rehearsal record supplied.

## Human authority

A signed human release/withdrawal decision and residual risk acceptance are separate from code-owned Quality Gate. [Human-release-decision-record.md](evidence/human-release-decision-record.md) records **NOT APPROVED / NOT RECORDED** until authentic evidence exists. This document cannot authorize production deployment or a customer report.
