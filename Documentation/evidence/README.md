---
document_id: LZA-ASSURANCE-EVIDENCE
title: Assurance Evidence Index
version: 0.1.0
prepared_on: 2026-11-08
status: EVIDENCE COLLECTION OPEN
---

# Evidence — validation, negative cases and approvals

## 1. Purpose

This directory is the evidence register for the solution-level assurance documentation. **It does not contain invented test results or fabricated approvals**. Its initial files are templates and test specifications grounded in the repository's source code and approved controlled references.

**Current evidence status:** the repository includes relevant test implementations and architecture decisions, but **no complete fresh execution result, customer-approved data-processing agreement, vendor-retention attestation, reviewer signature or production authorization was supplied for this documentation exercise**. Their absence from this folder means **not evidenced here**, not necessarily absent in other controlled systems.

## 2. Files in this folder

| File | Role | Current status |
|---|---|---|
| [verification-plan.md](verification-plan.md) | Test IDs, repo test mapping, expected results, execution and pass/fail recording contract | Test specifications only; **NOT RUN IN THIS EXERCISE** |
| [absence-test-cases.md](absence-test-cases.md) | High-risk negative-evidence and contradiction scenarios for all clouds and A–H | Proposed Golden Standard seeds; **NOT EXECUTED** |
| [approval-register.md](approval-register.md) | Required decisions, evidence links, redacted signed-attestation index | Human decisions **PENDING** |

## 3. Evidence types that may be attached later

- **Automated validation result:** dated sanitized CI log with command, commit SHA, environment, exit status, test-name totals and artifact hash.
- **Golden Standard result:** input fixture hash, independent expert expected outcome, actual deterministic score/gate, model routing and variance over repeated runs.
- **Negative/absence result:** completeness predicate, verified-negative outcome, missing-evidence reason and proof the Engine did not invent clearance.
- **Security result:** secret exfiltration prevention, redaction across OCR/table/derived data, prompt-injection isolation, cross-run authorization and model fallback tests.
- **Storage/deletion result:** S01–S12 attestations with TTL measurements, Redis/Postgres queries, backup/provider contract checks and failure/retry behavior.
- **Approval:** a cryptographically verifiable or otherwise auditable human approval held in restricted storage with only an opaque ID/hash and scope described here.

Do **not** commit source customer documents, live cloud exports, account names, session transcripts, keys, access logs with personal identifiers, confidential provider agreements or signed documents containing personal data.

## 4. Standard evidence naming and schema [PROPOSED]

~~~yaml
evidence_id: EV-LZA-YYYYMMDD-001
category: golden_test | security_test | storage_test | architecture_review | approval
source: CI | assessment_expert | security | privacy | operations | customer
status: PASS | FAIL | BLOCKED | NOT_RUN | NOT_APPLICABLE
execution_timestamp_utc: null
repository_commit_sha: null
assessment_pack_version: null
kb_release_hash: null
tactic_catalogue_version: null
model_profile: null
input_fixture_sha256: null
expected_outcome_reference: null
actual_outcome_reference: null
sanitized_artifact_uri: null
artifact_sha256: null
reviewer_role: null
reviewer_confirmation: pending
exceptions: []
~~~

When possible keep sensitive artifacts in restricted, access-controlled storage and reference only a non-identifying ID here. An empty or null field is not evidence.

## 5. Promotion rule

An approval may cite evidence only when:

1. The test or inspection was executed and has an immutable artifact and release/environment identity.
2. The result corresponds to the **same software, KB, model policy and allowed data profile** being authorized.
3. Critical failures are fixed or formally dispositioned by the correct owner; regulatory duties cannot be waived by a rubric.
4. Independent reviewer confirms provenance, completeness, privacy, falsification attempts and the scope of the claim.
5. The approver records date, role, scope, decision and expiry in [approval-register.md](approval-register.md).

**Start here:** [00-Assurance-Summary.md](../00-Assurance-Summary.md), [04-Storage-Retention-Contract.md](../04-Storage-Retention-Contract.md), [06-Operations-and-Change.md](../06-Operations-and-Change.md).
