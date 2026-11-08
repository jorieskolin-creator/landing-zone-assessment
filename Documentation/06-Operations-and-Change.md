---
document_id: LZA-ASSURANCE-06
title: Operations, Monitoring and Change
version: 0.1.0
prepared_on: 2026-11-08
status: OPERATING MODEL PROPOSAL - NOT AN OPERATING ATTESTATION
step: 7
---

# 06 — Operations and Change

## 1. Operations principle

The Engine's reliability is not established by a persuasive report or an apparently valid maturity score. It must be demonstrated through **reproducible evidence, deterministic gates, human review, failure handling and longitudinal monitoring**.

This document distinguishes **[REPO] available code/tests** from **[PROPOSED] operating policy**. No current on-call owner, production reliability target, vendor retention, executed Golden Standard baseline or signed production authorization is assumed.

## 2. Operational ownership [PROPOSED]

| Role | Responsibility | Approval boundary |
|---|---|---|
| Solution Owner | Intended use, architecture, allowed deployment levels, roadmap, overall risk | Authorizes product lifecycle progression |
| Assessment Method Owner | Criterion interpretation, pair resolution, provider contracts and evidence sufficiency | Approves scoring/rubric changes |
| Security Owner | Threat model, DLP, authZ, tool access, prompt-injection resilience, incident containment | May suspend intake/model egress |
| Privacy / Legal | Processing roles, permitted data, subprocessors, provider contracts, retention and rights | Required for expanded data profiles |
| Platform / Operations Owner | Hosting, Postgres, Redis, Blob, deployment, backups, logs and kill switch | Owns operational incident response |
| Knowledge and Tactic Owner | 80 KB pair documents, source register, 80 tactical objects and exact mapping | Controls release/version/approval |
| Customer / engagement authority | Assessment boundary, disputed findings, risk treatment and remediation | Retains final customer decisions |
| Independent quality reviewer | Golden corpus, drift monitoring, false-clearance and security validation | May block a release |

Set named primary, deputy, escalation and out-of-hours contacts **outside the public repository**, with a sanitized reference in the approval register.

## 3. Monitoring measurement contract

The following are **proposed candidate measures**, not observed baselines. Record numerator, denominator, confidence interval if relevant, run SHA, model version, dataset revision, date and scope. Track both total and A–H/provider slices where feasible.

| Metric | Definition | Proposed alert / action |
|---|---|---|
| **G01 Gate accuracy** | Exact match of GO/WARN/BLOCK and Assessment Sufficiency to expert Golden Standard | Any critical false-GO / false-clearance = BLOCK and investigate; monitor overall agreement |
| **G02 Citation integrity** | Valid, in-scope source+locator matches / all material claims | Target **100%** for published material claims |
| **G03 False absence clearance** | Clearances where no sufficiently complete negative test exists | Target **zero**; any confirmed violation suspends affected criterion |
| **G04 Privacy egress violations** | Unauthorized sensitive values present in outbound packet or operational log | Target **zero**; immediate kill/incident |
| **G05 Scope isolation** | Batches, providers, roots and source objects correctly withheld | Target **100%** on adversarial scope fixtures |
| **G06 Repeatability** | Same reference sample repeated across model/provider routing with stable findings, score and gate | Establish baseline, e.g. 10 repeated runs per scenario; do not set numerical passing threshold before calibration |
| **G07 Extraction / evidence quality** | Extraction completeness, weak source packet fraction, evidence density and provenance | Compare against control limits per format/batch; rising missing coverage triggers WARN |
| **G08 KB / mapping integrity** | Canonical 80 KB docs, 80 TAC IDs and exact referential mapping | Any unexpected missing/duplicate object = fail closed |
| **G09 Execution health** | Stage success, retries, fallback, timeouts, worker availability, 409/state-binding conflicts | Alert on elevated rates; no partial result promoted to complete |
| **G10 Lifecycle / deletion** | TTL expiry, tombstone correctness, cleanup verified and backup residuals | Any confirmed resurrection or unauthorized retention = incident |
| **G11 Human override trail** | Share of material finding revisions with role, reason, source and timestamp | Target **100%** traceability, not zero overrides |
| **G12 Source drift** | Provider rules, legal/source editions, rubric and evidence pack versions diverge | Review prior to model/KB/source/criteria changes |

For process improvement, **[PROPOSED]** maintain an internal controlled run database and weekly Golden Standard execution (also at every material release). Use run/control charts for gate and repeatability, Pareto for failure causes and subgroup views by provider, batch, evidence class and input format. Record control-limit methodology and sample sizes; do not mistake a red/green UI badge for statistical proof.

## 4. Golden Standard suite and release gate

The Golden corpus must contain **synthetic** but realistic configuration exports and contradictory documents, with expert expected outcomes for all eight design areas. Required dimensions: Azure/AWS/GCP; positive control; confirmed anti-pattern; verified absence; unverified silence; missing/incomplete export; stale inventory; workshop-only claim; Class 2 vs Class 1 contradiction; out-of-scope provider; not-applicable control; licensed-source boundary; malicious prompt injection; malformed/hidden spreadsheet material; visual/OCR failure; model/provider fallback; and deletion/recovery.

Each test record should include: sample ID, purpose, classification, provider, design area/criterion, minimum source set, expected finding, expected gate, expected rationale, expected missing-evidence request, prohibited inference, exact source hash, code commit, KB/tactic versions, model routing, date, actual result and reviewer.

**[REPO]** A substantial automated test suite exists under scripts/test-*.mjs. **[VERIFY]** The existence of a test file is not evidence that tests were run or passed on the latest deployment. [evidence/verification-plan.md](evidence/verification-plan.md) is the execution register for this assurance test; [evidence/absence-test-cases.md](evidence/absence-test-cases.md) gives negative-evidence scenarios.

## 5. Incident and kill-switch plan [PROPOSED]

**Triggers to stop model dispatch immediately:** secret in outbound packet/log; authentication/authorization bypass; uncontrolled source expansion; unapproved provider invocation; output claiming unsupported absence/compliance; deletion resurrection; exposed customer artifact; prompt injection commanding actions outside the fixed assessment contract; or known provider compromise.

Incident response sequence:

1. **Detect** via privacy gate, log alert, test/analyst report or customer complaint.
2. **Contain** by disabling new intake and external model dispatch, invalidating affected credentials/sessions, fencing affected run IDs, freezing potentially altered KB release and restricting reports. **No automatic production cloud remediation.**
3. **Preserve sanitized facts**: timestamp, run ID, commit, service version, packet hash, policy version, affected provider, count and nature of suspected content; keep raw sensitive incident material in a secured incident store rather than this repository.
4. **Investigate** source, derived payload, OCR/table path, provider fallback, logs, database bodies, browser cache, access, backups and customer copies.
5. **Assess notifications** with privacy/legal and the customer. Apply applicable statutory/contractual clocks once a reportable event is identified.
6. **Repair, validate and recover** with a reproduced failure, regression tests, independent review, retention/deletion evidence and a **named** go/no-go decision.
7. **Reassess affected reports** if a detection/gate/scoring defect may have changed findings.

**[REPO]** Runtime code includes run states, deletion requests, Redis tombstones and execution leases. **[VERIFY]** A single documented operational “kill switch” command/procedure and on-call response exercise have not been established by this documentation review. Define the actual control points in the operating environment and test them.

## 6. Change, regression and reassessment triggers

A controlled change record is mandatory for:

- Frozen criterion/sub-criterion wording, pair semantics, provider evidence contract or scoring math.
- Evidence authority, absence test, citation/provenance, DLP or egress policy.
- Global Source Register authority, source edition, permitted licensing usage or exact locator.
- Knowledge Base PDF identity, release/content, or approved TAC ID trigger, mapping, mechanism, acceptance or verification.
- Primary/fallback model, prompt, temperature/output schema, model provider, location or retention terms.
- Parser/OCR/structured table handling, browser persistence, storage lifetime or backup settings.
- Authentication, authorization, hosting, infrastructure, Redis/Postgres schema or export workflow.
- Material target customer population, use case, region, restricted data category or transition from file-based to live-cloud collection.
- Incident, confirmed false clearance, severe model drift or new regulation affecting the service.

**Change workflow:** proposal → impact/risk analysis → bounded diff → affected tests and Golden corpus → security/privacy review when applicable → version bump / explicit dependency update → independent reviewer acceptance → deployment → post-release sampled monitoring. A tactical implementation cannot authorize itself or change the assessment KB diagnosis.

## 7. Minimum records per release

| Record | Minimum fields |
|---|---|
| Build | Git commit SHA, dependency lock hash, deployment ID, timestamp |
| Knowledge | Pack v1.0.0 or later, KB release/hash, Source Register edition, Playbook edition |
| Models | Role/profile, actual provider/model ID, fallback, approved destination and policy version |
| Tests | Suite command, environment, pass/fail, failure classes, redacted outputs and fixture hashes |
| Golden sample | Scenario, expected/observed result, gate agreement, failure mode and independent reviewer |
| Security | Egress/absence/injection/regression tests, access and deletion exercise |
| Decision | Approver identity stored securely, role, scope, evidence hash, date and exceptions |
| Operational | Incident list, open defects, last cleanup check, restoration exercise, next review date |

No signed authority can be manufactured by an LLM; use [evidence/approval-register.md](evidence/approval-register.md) as a *non-sensitive index* into real signatures.

## 8. Current review limitations

The repository's implementation plan v1.22 documents live analysis issues in September 2026 and marks expert calibration Work 13 as not started in that historical snapshot. It also records a KB integration milestone and a Redis-dependent runtime. Those are **historical facts**, not proof of present readiness or unreadiness. This documentation exercise did **not** execute a live customer assessment, deploy a new build or conduct penetration testing.

## 9. Readiness checklist

- [ ] On-call/security/privacy/knowledge and customer decision owners identified.
- [ ] Kill-switch runbook and restoration rehearsed using synthetic data.
- [ ] Golden suite executed repeatedly across A–H and all provider packs.
- [ ] Gate errors, repeatability and false-absence metrics have dated baselines.
- [ ] S01–S12 deletion/storage evidence checked including cloud providers, backups and reports.
- [ ] Every material change and acceptance has an immutable reference.
- [ ] Signed go/no-go and next review date recorded.

**References:** Implementation Plan §§9–13; ADR-001/002/003; approved Tactical Playbook; lib/controlPlanePolicy.js; lib/runLifecycleService.js; lib/operationalLogPolicy.js; src/domain-packs/landing-zone/quality-gate-policy.json; scripts/test-*.mjs.
