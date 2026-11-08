---
document_id: LZA-ASSURANCE-05
title: Architecture and Control Contract
version: 0.1.0
prepared_on: 2026-11-08
status: ARCHITECTURE REVIEW DRAFT
step: 5
---

# 05 — Architecture and Control

## 1. Architectural decision [REPO]

The Landing Zone Assessment is an **independent solution** built and maintained in its own repository. It uses a locally owned source copy of a recorded FinOps Engine kernel; it must not use the FinOps deployment, package, repository, queue or database at build or runtime. The active diagnostic domain is src/domain-packs/landing-zone. Remaining FinOps data is characterization fixture material only.

The first implementation is **file and questionnaire based**. It does not directly connect to AWS, Azure or GCP tenants and does not have cloud administration credentials. Criteria follow the frozen A–H catalogue, 40 paired capability/anti-pattern constructs and provider-specific evidence contracts.

## 2. End-to-end cognitive/execution contract

~~~text
Customer and assessor agree purpose, permission and scope
                        |
                 Step 0 scope lock
      providers, roots, A-H, exports and exclusions
                        |
          Uploaded files + interview JSON
                        |
        Parsing / OCR / structured analysis
                        |
                  Source Registry
     authority class, scope, provenance, timestamp
                        |
        Deterministic privacy / DLP gate
         BLOCK | WITHHOLD | REDACT | PASS
                        |
        A-H evidence routing + coverage
                        |
     Approved KB release + criterion contract
                        |
 Governed model stages: discovery, audit, verification,
       rescan and bounded structured synthesis
                        |
   Provenance and contradiction / absence verification
                        |
 Deterministic pair scoring + Assessment Sufficiency
                        |
        Fact check + code-owned Quality Gate
                        |
         GO / WARN / BLOCK publication bounds
                        |
       Expert finding lock + customer decisions
                        |
           Approved exact TAC-* mapping
                        |
  Human-authorized implementation outside the Engine
                        |
         New evidence -> independent reassessment
~~~

This is the **logical contract**, not a claim that every component has passed an integrated production test. Actual deployment includes a browser UI, Node/Railway API, PostgreSQL control plane, Redis execution coordination/recovery, Vercel Blob reference Knowledge Base, and model provider gateways.

## 3. Proposed handling levels A/B/C

**[PROPOSED]** The repository does not establish a canonical Engine-specific “Level A/B/C” classification. The following is a **new local assurance profile** for this documentation test; it is **not** the design-area IDs A–H or a known legal risk taxonomy. Solution-owner approval is required before operational use.

| Level | Inputs | Hosting and models | Authorization |
|---|---|---|---|
| **A — Synthetic/documentary sandbox** | Public, fictional, synthetic and licensed materials | Test environment, governed hosted processing, no real customer secrets | Documentation/tool test only, not customer assurance |
| **B — Bounded customer assessment** | Approved, minimized/sanitized customer exports excluding restricted content | Contractually approved enterprise tenant, model providers, region and validated retention | Assessor + customer + security/privacy sign-off; no autonomous production action |
| **C — Restricted/critical estate** | Sensitive or regulated content only after explicit case approval | Isolated private/in-house processing where required, stronger access and network controls | Separate legal/security/risk and customer approvals, augmented validation |

**Selected default for this documentation exercise: Level A.** Higher levels may not be inferred from a successfully generated report.

## 4. Non-negotiable invariants

1. **Evidence, not publication, proves current state.** Customer Class 1 platform exports are strongest if complete, fresh and attributable. Class 2 design and Class 3 workshop statements cannot silently become proof of enforcement.
2. **Unknown is not failure or absence.** Unassessed providers, silent batches and incompletely searched estates are not zero and cannot support anti-pattern clearance.
3. **Providers stay separate.** A canonical criterion ID can exist across Azure/AWS/GCP while its actual evidence and score remain bound to the selected provider; an unqualified blended headline is prohibited.
4. **Model and source cannot modify the rules.** Source documents are untrusted data; scoring, gate decisions, scope, proof standards and tactic eligibility are code-controlled.
5. **Human accountability is explicit.** Legal applicability, evidence disputes, risk acceptance, finding locks and production authorization remain with named humans.
6. **Tactics follow diagnosis.** Approved Tactical KB IDs are matched only to exact locked findings. Remediation completion produces evidence but does not close a finding.

## 5. Trust and authorization boundaries

| Boundary | Allowed action | Not allowed without new design/approval |
|---|---|---|
| User → browser | Inspect criteria, select scope, upload approved material and view controlled report | Background collection, arbitrary persistence of originals |
| Browser → API | Authenticated scoped run/checkpoint/packet requests | Unauthenticated cross-run data, unbounded payload or arbitrary tool invocation |
| API → PostgreSQL | Versioned runs, content-bearing canonical packet body, minimal metadata and hashes | Long-lived raw source repository or unrestricted query to other tenants |
| API → Redis | Leases, fences, transient checkpoints, results and deletion tombstones | Never-expiring content or replay after deletion |
| Engine → Vercel Blob | Controlled Landing Zone **reference KB** only | Customer exports and FinOps KB fallback |
| Engine → external models | Exact authorized model/role/stage and **screened** governed packet | Raw original file, secrets, unrestricted tool calls, unapproved provider or destination |
| Engine → report | Supported claims, citations, uncertainty and gate status | Unqualified assurance, personnel grading or hidden false clearance |
| Assessment → tactics | Eligible, mapped implementation guidance after human lock | Autonomous cloud remediation or risk acceptance |

**[REPO]** lib/modelRoutingPolicy.js defines WORKHORSE, REASONER, QUALITY_CHECKER and primary/fallback policy selection. The values in .env.example are examples, **not evidence of currently deployed provider/model selection**. Different models require equivalent security, output and packet controls.

**[PROPOSED]** Production agent permission allowlist: read selected, in-scope, authorized files and controlled KB; generate criterion-bounded analyses; use approved model endpoints; write only versioned run results. Deny shell commands, repository writes, email sending, open web access, direct cloud APIs, access to credentials, arbitrary URL fetching and self-directed tool expansion. Software development agents are distinct from assessment runtime agents and require separate tool contracts.

## 6. Component-to-evidence obligations

**Acquisition.** evidenceFileService.ts supports PDF, HTML, CSV/TSV, JSON, XLSX and image formats; sourceRegistryService.ts holds source kinds, scoped routing and locators; questionnaireIngestion.ts converts 48 interview answers to Class 3 evidence leads. Test file-type spoofing, hidden spreadsheet data, missing pages, OCR errors, incomplete exports and out-of-scope provider signals.

**Privacy and packets.** deterministicPrivacyService.ts implements sensitive-pattern detection, while lib/governance.js binds canonical body bytes to hash, policy, run, stage, model and expiry. The effective contract must be tested at *every* LLM fallback and generated/derived payload. ADR-001 separates stage execution from model attempt so failed attempts never silently reuse an authorization.

**Knowledge.** Source Register identity and licensing constraints bound what reference text may be used. docs/kb-authoring/README.md describes Drive as authoring storage and Vercel Blob as runtime storage for 80 canonical PDF objects. Runtime must never use workshop text, playbook entries or public reference guidance as proof of a specific customer's controls.

**Diagnosis.** lzForensicEvaluation.ts enforces authority-sensitive interpretations; ADR-002 defines resolution-based maturity arithmetic (unknown excluded rather than forced to zero). The active Landing Zone labels are Foundation / Pilot / Rollout / Operate; provider scope remains explicit.

**Gates.** Assessment Sufficiency owns maturity publication, Quality Gate GO/WARN/BLOCK owns action/publication safety. Model outputs may propose narratives but must not determine or override gate states. A BLOCK is a request for evidence and a decision conversation, not a customer pass/fail verdict.

**Remediation.** Approved Tactical Playbook v1.0.0 transcribes 80 TAC-* IDs with exact mapping. ADR-003 defines required-tactic dispositions; a contraindication or excluded tactic must be traceable, not silently omitted. Human-authorized implementation occurs outside the Engine and leads to reassessment.

## 7. Traceability map

| Assurance control | Code / source | Validation |
|---|---|---|
| Step 0 lock | src/components/Step0ScopeForm.tsx | scripts/test-step0-scope.mjs |
| Evidence class | evidence-taxonomy.json, lzForensicEvaluation.ts | scripts/test-lz-forensic-evaluation.mjs |
| Safety/egress | deterministicPrivacyService.ts; lib/governance.js | scripts/test-governance.mjs, test-dlp-distributed-sampling.mjs |
| Provenance | ADR-001, sourceRegistryService.ts | scripts/test-evidence-provenance.mjs |
| KB independence | docs/kb-authoring/README.md; landingZoneKnowledgeIndex.ts | scripts/test-lz-knowledge-index.mjs, test-lz-kb-blob-prefix.mjs |
| Deterministic scoring | ADR-002, landingZoneScoringAdapter.ts | scripts/test-lz-pair-scoring.mjs |
| Gate safety | quality-gate-policy.json; qualityGateService.ts | scripts/test-quality-gate-severity.mjs |
| Tactical selection | playbook, tactic-bindings.json, ADR-003 | scripts/test-lz-tactics.mjs, test-tactic-grounding.mjs |
| Lifecycle and deletion | controlPlanePolicy.js; runLifecycleService.js | scripts/test-run-lifecycle.mjs |
| Solution isolation | Implementation Plan §6.1 | scripts/check-independence.mjs |

## 8. Remaining architecture decisions [VERIFY]

- **Multi-provider summary:** the September 2026 implementation plan withheld multi-provider headlines pending provider-keyed lineage. Verify latest implementation before permitting an aggregate.
- **Runtime readiness:** that historical plan recorded UI-only mode without Redis and subsequent analysis retries; get a new dated /readyz and governed end-to-end test before claiming ready.
- **Human calibration:** Work 13 was not started in the historical plan. Confirm current reviewer, customer decision and adjudication paths; never assume they exist.
- **Model/residency:** confirm actual infrastructure regions, vendors, retention, access and contracts as detailed in LZA-04.
- **A/B/C levels:** approve or replace the proposed classification before marking it active policy.

## 9. Architecture release gate

- [ ] Scope, release and deployment SHA recorded.
- [ ] Threat model reviewed for all trust boundaries and provider fallback.
- [ ] Security gate tested independently of model instructions.
- [ ] No unauthorized cloud administration tool/credential reachable.
- [ ] Provider-specific scores, unknowns, contradictions and absence test demonstrated.
- [ ] Human lock, TAC exact matching and independent reassessment demonstrated.
- [ ] Fail-visible behavior tested for missing KB, model failure, Redis loss, malformed input and report sanitation.

**Related:** [LZA-01](01-Intended-Use-and-Scope.md), [LZA-03](03-Data-Rights-and-Lineage.md), [LZA-04](04-Storage-Retention-Contract.md), [LZA-06](06-Operations-and-Change.md), [verification plan](evidence/verification-plan.md).

**Sources:** Landing_Zone_Assessment_Implementation_Plan.md; ADR-001/002/003; domain pack; approved Tactical Playbook; docs/kb-authoring/README.md; the named code and test modules.
