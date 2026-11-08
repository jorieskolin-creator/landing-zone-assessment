---
document_id: LZA-ASSURANCE-VERIFY
title: Validation and Evidence Verification Plan
version: 0.1.0
prepared_on: 2026-11-08
status: SPECIFICATION ONLY - TEST EXECUTION NOT ATTESTED
---

# Verification Plan and Test Result Register

> **Result policy:** Every row below begins as **NOT_RUN** for this assurance-document creation. Listed test files exist in the GitHub repository, but their presence alone is not a claim they have passed or that a deployed configuration was validated.

## 1. Required baseline capture

| Property | Value required before execution |
|---|---|
| Source commit SHA | TBD — select the exact commit under test |
| Host / service environment | TBD; never expose secrets |
| Assessment domain-pack version | Landing Zone pack version + hash |
| Reference KB release | Exact canonical 80-document release identifier/hash |
| Tactic release | Approved v1.0.0 or later controlled version |
| Model policy | Actual roles, provider IDs, models, fallback and settings |
| Synthetic/approved fixture set | SHA-256 manifest; no customer identifiers |
| Operator and independent reviewer | Private identity record; roles shown here |
| Execution time and command | UTC and exact shell/CI invocation |
| Evidence storage | Restricted artifact URI + hash |

## 2. Repo test mappings

These are **entry points**, not a replacement for golden validation of end-to-end outputs. Execute in an approved non-production environment using synthetic inputs. Inspect failure and skipped states; do not promote a zero-exit test script if it bypasses a real integration or has dummy data.

| ID | Verification requirement | Relevant repository tests / module | Status |
|---|---|---|---|
| VT-01 | Frozen 80 criteria / 40 pairs / 240 subcriteria and references | scripts/test-landing-zone-pack.mjs; test-maturity-pair-registry.mjs | NOT_RUN |
| VT-02 | Step 0 provider/root/area locks and exclusion | scripts/test-step0-scope.mjs; src/components/Step0ScopeForm.tsx | NOT_RUN |
| VT-03 | Questionnaire 48 questions are Class 3, not scores | scripts/test-lz-questionnaire-ingestion.mjs; questionnaireIngestion.ts | NOT_RUN |
| VT-04 | File type and provenance/source classification | scripts/test-lz-source-classification.mjs; test-evidence-provenance.mjs | NOT_RUN |
| VT-05 | A–H routing, provider withhold, bounded source packets | scripts/test-lz-ah-routing-packets.mjs; test-bounded-retrieval.mjs | NOT_RUN |
| VT-06 | OCR, image, table, XLSX and missing/hidden data handling | scripts/test-visual-acquisition.mjs; test-xlsx-acquisition.mjs; test-table-cell-withhold.mjs | NOT_RUN |
| VT-07 | Sensitive data block/redaction on the *full* source and derived payload | scripts/test-dlp-distributed-sampling.mjs; test-privacy-service.mjs; test-evidence-stage-packet.mjs | NOT_RUN |
| VT-08 | External model destination/model/packet authorization | scripts/test-governance.mjs; test-provider-invocation.mjs; test-model-routing.mjs | NOT_RUN |
| VT-09 | Stage/attempt hash, lineage, retry and checkpoint recovery | scripts/test-checkpoint-recovery.mjs; test-execution-worker.mjs; test-run-trace-tactics.mjs | NOT_RUN |
| VT-10 | Class 1/2/3 authority, explicit contradiction and tested absence | scripts/test-lz-forensic-evaluation.mjs; test-antipattern-semantics.mjs | NOT_RUN |
| VT-11 | Unknown excluded from score, no cloud blending | scripts/test-lz-pair-scoring.mjs; test-maturity-model.mjs | NOT_RUN |
| VT-12 | Deterministic gate, fact-check and actionability separation | scripts/test-quality-gate-severity.mjs; test-fact-check-validation.mjs | NOT_RUN |
| VT-13 | 80-doc KB, no FinOps contamination, exact sources | scripts/test-lz-knowledge-index.mjs; test-lz-kb-blob-prefix.mjs; test-lz-source-classification.mjs | NOT_RUN |
| VT-14 | Exact approved TAC mapping and required disposition | scripts/test-lz-tactics.mjs; test-tactic-grounding.mjs; test-tactic-activity-playbook.mjs | NOT_RUN |
| VT-15 | Output/summary/report sanitation and provenance | scripts/test-lz-summary-report.mjs; test-lz-master-data-report.mjs; test-report-rendering.mjs | NOT_RUN |
| VT-16 | Operational log sensitive-field stripping | scripts/test-operational-logging.mjs; lib/operationalLogPolicy.js | NOT_RUN |
| VT-17 | Redis tombstone, state transitions and cleanup | scripts/test-run-lifecycle.mjs; test-control-plane.mjs | NOT_RUN |
| VT-18 | Source-code independence from upstream FinOps | scripts/check-independence.mjs; fresh clone build | NOT_RUN |
| VT-19 | Complete pipeline on each cloud + mixed scope | scripts/test-pipeline-integrity.mjs plus fresh expert Golden evidence runs | NOT_RUN |
| VT-20 | Adversarial prompt and data exfiltration tests | Dedicated synthetic fixture tests **TO ADD** | NOT_RUN |
| VT-21 | Storage S01–S12 and vendor/backup deletion | Runtime inspection and contract artifacts **TO ADD** | NOT_RUN |
| VT-22 | Human finding lock, correction, approval and remediation boundary | End-to-end operational exercise **TO ADD / VERIFY IMPLEMENTATION** | NOT_RUN |

## 3. Suggested commands

~~~bash
# From an approved clean clone; this is a proposed validation procedure,
# not a command executed during document creation.
npm ci
npm test

# Independent repository/source-copy check
node scripts/check-independence.mjs

# Selected targeted checks:
node scripts/test-step0-scope.mjs
node scripts/test-lz-forensic-evaluation.mjs
node scripts/test-lz-pair-scoring.mjs
node scripts/test-lz-tactics.mjs
node scripts/test-governance.mjs
node scripts/test-run-lifecycle.mjs
~~~

Never paste environment variable values, failed private requests, model payloads, raw cloud exports or keys into a public CI artifact.

## 4. Golden Standard acceptance protocol [PROPOSED]

For each synthetic scenario, independent experts specify beforehand: scope, source class/locator and freshness, expected criterion state, paired anti-pattern state, sufficient negative-test conditions, expected maturity/resolution, expected gate, applicable tactic ID or absence thereof, and forbidden inference.

Run the same sample across approved model route variants and repeated trials. Record full disagreement categories: evidence misclassification, missing reference, invented quote, mistaken absence, scope leakage, score mismatch, gate mismatch, tactic mismatch and report privacy leak. Preserve both **per-run and cohort-level** results. A non-deterministic model's narrative may vary, but source/finding/gate integrity cannot be excused as mere style variation.

**Stop conditions:** any confirmed secret egress, unauthorized provider, incorrect positive clearance from untested absence, invented source locator on a released material claim, unauthorized cloud action or retained deleted content blocks the affected release until remediation and re-execution.

## 5. Executed result template (not a fabricated result)

~~~yaml
test_id: VT-XX
result: NOT_RUN
timestamp_utc: null
commit_sha: null
test_command: null
runner_environment: null
fixture_id: null
fixture_sha256: null
expected: null
observed: null
status_reason: awaiting_execution
artifact_hash: null
reviewer_role: independent_qa
reviewed_at: null
~~~

## 6. Missing evidence before sign-off

- [ ] Dated, sanitized full suite run for the exact deployment commit.
- [ ] Golden cases for all A–H and provider-specific negative evidence.
- [ ] Direct validation of full-source/visual/derived-data egress.
- [ ] Actual Redis/Postgres and vendor retention/deletion exercise.
- [ ] Security review of authZ, prompt injection and support access.
- [ ] Human reviewer/customer decision and signed attestation, in restricted storage.

**Traceability:** [00 summary](../00-Assurance-Summary.md), [02 risk](../02-Risk-and-Impact.md), [04 storage](../04-Storage-Retention-Contract.md), [06 operations](../06-Operations-and-Change.md), [absence tests](absence-test-cases.md), [approval register](approval-register.md).
