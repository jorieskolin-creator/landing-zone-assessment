---
document_id: LZA-ASSURANCE-05
title: Architecture, Cognitive Model and Control
version: 0.2.0
reviewed_on: 2026-11-09
status: LEVEL_C_CANDIDATE_NOT_APPROVED
matrix_step: 5
solution_assurance_mappings: [C3, D3, E3, E4, E5]
---

# 05 — Architecture, Authority and Cognitive Contract (Step 5)

> Status notation: **[CODE]** inspected implementation/constant, not runtime proof; **[DOC]** documented design or historical account; **[GAP]** not established by supplied code, configuration, run evidence or contract. Missing status is not evidence that a control is absent. Reference commit: `b1010b75147a49af9e50db7d98ea95fcbf1fdf53`.
> Solution Assurance matrix mappings (A1, B2, C3, etc.) are distinct from Landing Zone Assessment criterion IDs (A1–H5).


## Architectural level — use the definitions in the attached matrix

| Level | Meaning in reference | Relationship to this solution |
|---|---|---|
| **A — Generate** | Direct request → draft; human owns acceptance | Too narrow to describe the Engine's intended *evidence-based scored conclusions*; appropriate for independent text-drafting support only |
| **B — Ground** | Retrieval/source support and citations; retrieval is not conclusive validation | Engine has source registry, bounded retrieval and citation mechanisms |
| **C — Govern** | Defined evidence and decision criteria, independent deterministic verification, `UNKNOWN` / `BLOCK` and human authority | **Candidate** architectural classification: code contains provenance, scoring, gate and tactic safeguards; full effectiveness and human approval not demonstrated |

**Classification status:** **Candidate Level C, NOT human selected or certified.** The matrix's Level C is **not equivalent to an autonomous agent**. The Engine's design uses bounded AI reasoning without cloud action tools. The separate *consequence tier* remains **unassigned** in [02 Risk and Impact](02-Risk-and-Impact.md). A synthetic demonstration dataset is **not** a Level A architectural classification.

## Current architecture and six-element cognitive model

| Element from attached matrix | Present code/design evidence | Missing to establish effective contract |
|---|---|---|
| 1. Purpose & decision criteria | [Pack](../src/domain-packs/landing-zone/pack.json), fixed A–H criteria and [Step 0](../src/components/Step0ScopeForm.tsx) | Owner-approved use case and explicit outcome authorization |
| 2. Evidence requirements (coverage, currency, provenance) | [Source Registry](../src/services/sourceRegistryService.ts), [lzForensicEvaluation](../src/services/lzForensicEvaluation.ts), [evidence policy](../src/domain-packs/landing-zone/evidence-taxonomy.json) | Measured source freshness/completeness/quote accuracy on representative runs |
| 3. Access & context rules | Scoped A–H/provider packets, governed schema, HMAC session; reference KB separated | Per-user/tenant authorization, enterprise IAM, independent RAG/RBAC test |
| 4. Inference & deterministic tool rules | Model-role routing, governed packet hashes and deterministic [scoring](../src/services/landingZoneScoringAdapter.ts) | Provider/config attestation and proven prompt-injection/tool permission tests |
| 5. Permitted outputs, schemas & recipients | Output-contract validation, forensic report, [Quality Gate](../src/domain-packs/landing-zone/quality-gate-policy.json) | Recipient RBAC and actual external-release enforcement |
| 6. Exceptions, `UNKNOWN`, `BLOCK` & release rules | Anti-pattern unknown semantics, code-owned gate and exact tactical matching | Working human override/customer decision audit and stop/release proof |

## Implementation/trust path (documented)

1. Human records **Step 0 scope** and supplies evidence files/interview JSON; no initial direct cloud provider connectors.
2. Browser/client parses files and creates source registry/locators; privacy screening precedes governed model packets.
3. Provider/criterion-specific packets and Knowledge Base context are used for bounded generative forensic work; the KB is reference knowledge, **not customer evidence**.
4. Reconcile statements to attributable source and evidence class; independent code applies provider-scoped pair scoring, Assessment Sufficiency and GO/WARN/BLOCK Quality Gate. Unknown or unsupported absence is **not silently cleared**.
5. Human finding lock is required before an exact-ID Tactical Playbook remediation suggestion can become mandatory. Completion of a tactic produces evidence; does not update scoring or authorize cloud change.
6. Expert/customer release and residual-risk acceptance are **documented authority requirements**, but dated Implementation Plan says Work 13 expert calibration/customer disposition not started; no newer validated completion provided.

Sources: [ADR-001](../docs/architecture/ADR-001-execution-and-evidence-lineage.md), [ADR-002](../docs/architecture/ADR-002-resolution-based-maturity-model.md), [ADR-003](../docs/architecture/ADR-003-required-tactic-contract.md), [Implementation Plan](../Landing_Zone_Assessment_Implementation_Plan.md).

## Model/tool permission and write-path inventory

| Execution participant | Demonstrated scope | Denied/unsupported activity | Validation gap |
|---|---|---|---|
| User/browser | Select scope/files and view results; session cookie | Cannot infer enterprise role/tenant privilege from shared cookie | Independent authorization tests |
| Server governance / model router | Approved packet staging, stage/model routing, output schema | No evidence of arbitrary agent-hosted shell/cloud write tools | Provider allowlist/timeout and bypass tests |
| Reference Knowledge Base | Reads controlled Landing Zone KB in Vercel Blob | Cannot attest customer implementation or silently switch to FinOps KB | Deployed KB release/version and licence check |
| Scoring/Quality Gate code | Validates evidence and determines publication/actionability | Model self-approval of gate | End-to-end bypass/exception negative tests |
| Human assessment/release owner | Required by playbook and design, identity unknown | AI must not sign or accept risk for owner | Human release/override test and signed record |

## Q1 — Design specification demands

| Matrix demand | Current reading | Source / absent verification |
|---|---|---|
| Requirement Level A/B/C Selection | [DOC] Level C **candidate**, not authorized; epistemic distance is material | Derived maturity and findings from multiple evidence classes; Step 2 tier missing |
| Six-Element Cognitive Model Specification | [CODE/DOC] Six elements traced above; no single approved signed contract | A–H pack, governance, ADRs, output schemas |
| Agent Autonomy & Write-Path Inventory (C3) | [DOC] No cloud-write capability in initial scope; no approved complete tool register | Implementation Plan; source gateway and API inventory |
| Transparency, Oversight & Recourse (E3–E5) | [DOC] Expert/customer authority intended; approved UI review/recourse workflow unverified | Playbook, personas; Work 13 pending in dated plan |


## Q2 — Technical and enterprise parameters

| Matrix demand | Current reading | Source / absent verification |
|---|---|---|
| Context Contract Enforcement (D1/D3) | [CODE] Provider-scoped inputs and privacy gating; user identity/tenant entitlement binding unproven | Step 0, sourceRegistryService, lib/auth.js |
| Instruction vs Untrusted Evidence Separation (D3) | [CODE] Governed system_instruction and source parts; injection resistance not independently proven | lib/governance.js; lib/outputContracts.js |
| Least-Privilege Agent Tool Gates (C3) | [DOC/CODE] No cloud action tools in documented scope; agent-tool authorization and abort tests absent | Initial scope; model router; no agentic tool runner demonstrated |
| Verification Contract & State Machine (Level C) | [CODE] Checkpoint/attempt states, provenance, unknown semantics, scoring/gates | lib/controlPlaneRepository.js; scoring adapter; Quality Gate |
| Human Review & Override Interface (E4) | [GAP] No signed proof of working reviewed override and onward release gate | Historical plan Work 13 not started |


## Q3 — Verifiable evidence artifacts

| Matrix demand | Current reading | Source / absent verification |
|---|---|---|
| Architecture & Cognitive Contract Specification | [DOC/CODE] This record + implementation source trace; no signed Level C decision | Architecture Plan; this file |
| Write-Path & Tool Authorization Test (C3-Q3) | [GAP] No executed valid/missing/expired/replayed/bypass test evidence | No runtime execution of agent write paths shown |
| Human Oversight & Override Effectiveness (E4-Q3) | [GAP] No reviewed approve/reject/halt test | evidence/human-release-decision-record.md |
| Transparency & Recourse Verification (E3/E5-Q3) | [GAP] No UI screenshot/test confirming disclosure, correction/appeal propagation | Report UI code exists; no captured Q3 result |


## Truthful release boundary

No customer action may be justified simply by a model recommendation, a code comment or this document. An actual **Level C acceptance** requires completed independent tests, transparent UI and meaningful human control, approved endpoint/identity boundaries, signed risk decision and system behavior observed at the relevant deployed version. Reference [human release record](evidence/human-release-decision-record.md).
