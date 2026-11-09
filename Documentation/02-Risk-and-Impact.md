---
document_id: LZA-ASSURANCE-02
title: Risk and Impact
version: 0.2.0
reviewed_on: 2026-11-09
status: RISK_CLASSIFICATION_PENDING
consequence_tier: UNASSIGNED
regulatory_classification: NOT_DETERMINED
matrix_step: 2
solution_assurance_mappings: [A4, E1, E2, F3]
---

# 02 — Consequence, Risk and Regulatory Role (Step 2)

> **Reading rule:** `[CODE]` = source definition identified, not executed assurance; `[DOC]` = project statement or design, not a runtime finding; `[GAP]` = unverified, absent from supplied evidence; `NOT_RUN` is not a pass. Source baseline: `b1010b75147a49af9e50db7d98ea95fcbf1fdf53`.

> **Namespace:** the A/B/C and A1–F5 mappings in the attached **Solution Assurance** matrix are distinct from Landing Zone's A–H capability/anti-pattern IDs.


## Risk is about the actual use and its consequences

The Engine's intended purpose is **diagnostic**, rather than direct modification of an estate. Nevertheless, false control assurance, missed security exposure or unsupported recommendations could influence later cloud changes; unauthorized disclosure of IAM/network/customer source material could have serious confidentiality and security consequences. The repository and project sources do **not** establish how many production cases will be processed, whether findings reach executives automatically, or which changes customers might implement. Therefore **no named risk owner has classified the solution as Lower, Elevated or High Consequence** in the supplied evidence.

The attached matrix says the highest credible consequence controls tier selection, taking account of detectability before impact, reversibility, time/batch size to first discovery, affected groups and propagation. These elements are assessed below as **scenario questions**, not demonstrated facts or numeric ratings.

## Credible consequence hypotheses (unscored)

| Failure / misuse | Consequence mechanism | Detectability before harm | Reversibility | Blast radius and Q3 status |
|---|---|---|---|---|
| False negative on security/identity weakness | Customer may miss important vulnerability | Depends on independent expert review; efficacy unverified | Finding can be corrected, but subsequent customer action may be difficult to undo | Number of affected customers/reports unknown; no measured false-accept rate |
| False positive from missing evidence | Incorrect remediation effort and distrust | Scoring policy separates unknown, but effectiveness not measured | Report may be corrected; later changes may not be reversible | Throughput/recipient count unknown |
| Anti-pattern falsely marked absent | Incorrect confidence in deployed control | Code requires tested absence; adversarial proof unexecuted | Withdrawal possible, later exposure not necessarily reversible | Critical provider/control scope unknown |
| Sensitive source or model packet disclosed | Security/contract/privacy breach | DLP code exists; untested all-layer leakage defenses | Disclosure may be irreversible | Provider contracts, regions, log/backups unknown |
| AI-influenced unauthorized action or release | Harmful decision despite advisory role | Output and Quality Gate controls in source; human release hook unverified | Depends on downstream usage | No verified downstream write-path/recipient inventory |
| Unfair effect on affected staff/teams | Distorted conclusions from identity/workshop data | Not tested for groups | Correction may not fully repair reputational impact | Real affected population and subgroup metrics unknown |

These are **plausible failure paths**, not allegations that any incident has occurred.

## Q1 — Design specification demands

| Attached matrix requirement | Current finding | Source / missing verification |
|---|---|---|
| Worst Credible Consequence Analysis (F3) | [DOC] Scenario hypotheses above, not quantitatively scored | Purpose, source classes and Quality Gate from repo; no independent risk workshop |
| Detectability, Reversibility & Blast Radius | [GAP] Exposure, batch throughput, downstream recipients and reversibility not measured | No live throughput or propagation data |
| Consequence Tier Assignment | [GAP] No authorized Lower/Elevated/High decision | Named risk owner and rationale absent |
| Regulatory & Legal Classification (A4) | [GAP] Provider/deployer role and high-risk/prohibited practice screening not performed in evidence | No signed legal record |
| Human & Fundamental Rights Impact (E1/E2) | [GAP] Employee/security export risks noted; group and fairness assessment not evidenced | No affected-group or subgroup register |


## Q2 — Technical and enterprise parameters

| Attached matrix requirement | Current finding | Source / missing verification |
|---|---|---|
| Blast-Radius & Throughput Caps | [GAP] No impact-calibrated per-user/customer batch/rate circuit breaker verified | Run timeouts exist, but not proof of consequence limits |
| Downstream Propagation Locks | [DOC] Initial Engine scope excludes cloud modifications; export/disclosure controls untested | Implementation Plan §5; reports UI |
| Consequence-Linked Quality Thresholds (D2) | [CODE] Deterministic evidence/Quality Gate parameters; precision/recall/false-accept thresholds tied to Step 2 not evidenced | src/domain-packs/landing-zone/quality-gate-policy.json; scripts/test-quality-gate-severity.mjs |
| Reversibility / Compensation Hooks | [CODE] Run-state cancellation/deletion and checkpoints; report withdrawal and customer-effect rollback not verified | api/run.js; lib/runLifecycleService.js; no downstream rollback test |


## Q3 — Verifiable evidence artifacts

| Attached matrix requirement | Current finding | Source / missing verification |
|---|---|---|
| Consequence & Solution Risk Record | [DOC] This unscored risk hypothesis document; formal classification pending | No approved risk tier or quantitative scoring |
| Legal / Regulatory Classification Sign-Off (A4-Q3) | [GAP] No attributable human legal decision | evidence/human-release-decision-record.md |
| Fairness & Subgroup Evaluation (E2-Q3) | [GAP] No dataset or subgroup error evaluation supplied | Affected-person relevance must first be established |


## Regulatory/legal determination boundary

The matrix requests EU AI Act role determination, prohibited-use screening, candidate high-risk classification, and sector/employee/privacy review. **No completed legal classification, jurisdiction-specific case facts, DPA, DPIA determination or signed high-risk screening was provided.** It would be inaccurate to classify the solution as compliant, prohibited, or high-risk under law solely because generative models are involved. GDPR role, employee-data impact, customer agreements, IP and potential transfer/sector restrictions must be assessed against the actual deployment and source data, by competent named authorities.

**Consequence tier:** **UNASSIGNED**; do not substitute a fabricated score or an unsupported probability. **Release approval:** **NOT RECORDED**. [Human release record](evidence/human-release-decision-record.md).
