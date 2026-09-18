# Landing Zone Assessment — Implementation Plan

| Document property | Value |
|---|---|
| Status | Living implementation plan |
| Initial version | 1.0 |
| Current version | 1.19 |
| Last updated | 2026-09-16 |
| Target | Fully independent Landing Zone Assessment using a source copy of the FinOps Engine kernel as its baseline |
| Initial input model | User-supplied files and questionnaire material; no live cloud connection |

## 1. Purpose

This document defines how to build the Landing Zone Assessment solution described by the repository documentation. It is intended to remain in the repository as the shared plan for implementation, review, verification, and later adjustment.

The solution will reuse selected governed execution-kernel source from the [FinOps Engine](https://github.com/jorieskolin-creator/finops-engine-2026) by copying it into this repository as a versioned implementation baseline, then adapting and maintaining that copy for Landing Zone assessment.

The Landing Zone Assessment is a fully independent solution. It must build, test, deploy, run, and evolve without access to the FinOps Engine repository or a running FinOps Engine service. It must not import, call, package, mount, synchronize, or otherwise depend on FinOps Engine code or infrastructure at runtime or during build and deployment.

The FinOps Engine repository remains unchanged by this project. Kernel reuse is one-way source reuse: record the selected upstream revision, copy the required source into this repository, and make all Landing Zone adaptations here. This project must not open branches or pull requests against, or push commits to, the FinOps Engine repository.

Where the source documents describe one shared kernel with FinOps and Landing Zone packs, or instruct the implementation not to copy the repository, this plan supersedes that guidance. “Reuse the kernel” in this plan always means “reuse by source copy into the independent Landing Zone Assessment repository.”

## 2. Source documents

The plan is based on these repository documents:

1. `Landing_Zone_Assessment_Architecture_Plan.html`
2. `Landing_Zone_Assessment_Engine_Criteria_Batch_Definitions.html`
3. `Evidence_Driven_Landing_Zone_Assessment_Proposal.html`
4. `Landing_Zone_Assessment_Interview_Evidence_Discovery_Questionnaire.html`
5. `Landing_Zone_Assessment_Global_Source_Register_v1.0.0.html`
6. `Landing_Zone_Assessment_Tactical_Playbook_v1.0.0_APPROVED.pdf`

The architecture plan and criteria definitions specify the engine and domain model. The proposal and questionnaire describe how the assessment is prepared, performed, reviewed, and used with customers. The Source Register owns publisher identity. The Tactical Playbook owns approved remediation identities and criterion mappings.

## 3. Fixed project assumptions

The following assumptions are authoritative for this implementation:

1. **The criteria catalogue is frozen.** The eight design areas, 80 criteria, 40 capability/anti-pattern pairs, and 240 sub-criteria are the implementation baseline.
2. **The first complete solution uses files supplied by the user.** It will not connect directly to Azure, AWS, or Google Cloud.
3. **A later live-collection capability is outside this plan.** The file-ingestion boundary should remain reusable, but no collector APIs, cloud authentication, or live inventory services need to be designed or implemented now.
4. **The Landing Zone Knowledge Base and Tactic Playbook will be created during this project.** Their technical contracts are defined early, while their content can be added in parallel. They will be integrated before full pipeline verification and before the first real assessment test cases are used.
5. **Testing and verification occur throughout implementation.** There is no separate experimental version of the solution with weaker criteria or quality expectations.
6. **The existing FinOps Engine is a source baseline, not a dependency or modification target.** The required kernel source is copied into this repository at a recorded upstream revision. Kernel behavior is preserved unless a local change is required to remove a FinOps-only assumption or support a documented Landing Zone requirement.
7. **The completed solution is operationally and developmentally independent.** A fresh clone of this repository must be sufficient to install, test, build, deploy, and run the Landing Zone Assessment without repository access, packages, services, APIs, credentials, or deployment resources from FinOps Engine.
8. **Reuse is one-way and locally owned.** No Git submodule, subtree with an active synchronization process, remote source import, Git dependency, build-time download, shared deployment, or runtime call may connect this solution to FinOps Engine. A future upstream review, if explicitly approved, is a manual source comparison followed by reviewed commits only in this repository.

## 4. Target outcome

The completed solution allows a user to:

1. Create and scope a Landing Zone assessment.
2. Select Azure, AWS, Google Cloud, or a supported combination.
3. Select the in-scope Landing Zone design areas.
4. Add documents, exported configuration material, structured files, images, and questionnaire responses.
5. Parse, sanitize, classify, and register the supplied evidence.
6. Run the selected A–H assessment batches.
7. Evaluate capabilities and anti-patterns against provider-specific evidence contracts.
8. Verify every material finding against traceable source locations.
9. Distinguish configured facts, declared intent, contradictions, tested absence, and unknowns.
10. Produce provider-specific scoring without blending cloud providers.
11. Apply the Landing Zone Knowledge Base and Tactic Playbook without treating either as customer evidence.
12. Support expert calibration and customer decisions.
13. Export a traceable Master Data Summary.

## 5. Scope

### Included

- Eight design areas, A–H
- 40 capabilities and 40 paired anti-patterns
- Three sub-criteria for every criterion
- Azure, AWS, and Google Cloud provider mappings
- Step 0 assessment scope
- File-based source acquisition
- Questionnaire JSON ingestion
- Evidence classification and provenance
- A–H packet routing
- Dual-stream forensic analysis
- Independent evidence verification
- Bounded evidence rescans
- Deterministic pair scoring
- Assessment Sufficiency and Quality Gate controls
- Landing Zone Knowledge Base integration
- Landing Zone Tactic Playbook integration
- Landing Zone prompts, personas, terminology, and reports
- Expert calibration
- Customer decision capture
- Master Data Summary and RunTrace output

### Not included

- Live cloud API connections
- Cloud credentials or delegated authorization
- Automatic tenant, organization, account, subscription, project, or resource discovery
- Continuously synchronized cloud inventory
- Any live, build-time, deployment-time, package, source-control, API, database, queue, cache, or infrastructure dependency on FinOps Engine
- Changes, branches, commits, pushes, or pull requests in the FinOps Engine repository
- The separate Implementation Model that selects accelerators or service options after findings are locked

## 6. Governing principles

### 6.1 Copy the kernel baseline; own the Landing Zone implementation

The following capabilities should be retained from the copied FinOps Engine baseline and maintained as Landing Zone Assessment source in this repository:

- source parsing and deterministic privacy controls
- source registry and stable locators
- governed evidence packets
- model-role routing
- scanner and verifier separation
- bounded retrieval and targeted rescans
- explicit capability/anti-pattern pair resolution
- deterministic scoring
- tactic grounding
- fact checking
- code-owned Quality Gate
- checkpoints and RunTrace
- PostgreSQL and Redis execution controls

The following content must become Landing Zone-specific:

- criteria and anti-patterns
- A–H taxonomy
- provider evidence contracts
- routing vocabulary
- prompts and validation guardrails
- personas
- Knowledge Base
- tactics and tactic bindings
- maturity terminology
- report language and visual structure

The source-copy boundary is governed:

1. Record the exact FinOps Engine commit used as the baseline and retain source/license attribution.
2. Copy only the source, tests, configuration, and assets required by the Landing Zone solution.
3. Commit the copied files to this repository; they become locally owned implementation files.
4. Remove FinOps production content and assumptions rather than loading them from the upstream repository.
5. Prohibit Git submodules, Git/package dependencies, remote imports, build-time downloads, shared data stores, and runtime calls to FinOps Engine.
6. Apply all parameterization, Landing Zone behavior, fixes, tests, and releases only in this repository.
7. Treat any future upstream comparison as an explicit manual review. It must never create automatic or bidirectional synchronization.

### 6.2 Evidence authority is independent of file transport

All initial evidence reaches the Landing Zone Assessment engine through file upload or questionnaire import, but its authority still depends on its source:

| Evidence class | Meaning | Examples |
|---|---|---|
| Class 1 — Platform | Exported control-plane state | Hierarchy export, role assignments, policy assignments, network attachments, log destinations |
| Class 2 — Material | Intent, design, process, or infrastructure definition | Architecture documents, IaC, policy catalogues, exception registers |
| Class 3 — People | Operating-model knowledge and evidence leads | Questionnaire answers, workshop observations, ownership explanations |

An uploaded control-plane export remains Class 1 evidence even though it was not collected through a live connection. A design document remains Class 2 evidence and cannot, by itself, prove that a control is currently enforced. A workshop response remains Class 3 evidence and cannot replace platform evidence.

### 6.3 Unknown is not zero

- Missing evidence does not mean failure.
- Out-of-scope providers and design areas are excluded.
- Provider-native controls may be marked not applicable for other providers.
- A silent design area produces an evidence gap, not an invented negative score.
- Anti-pattern absence is confirmed only when the supplied material supports a complete and explicit absence test.

### 6.4 Providers remain separate

The Landing Zone Assessment engine can share canonical intent IDs and pair definitions across providers, but evaluation and reporting remain provider-specific. For example, the output may show `Azure Identity: GO` and `AWS Identity: WARN`; it must not create a blended cross-cloud maturity score.

### 6.5 Knowledge and tactics are not evidence

The Knowledge Base explains how to interpret verified customer evidence. The Tactic Playbook determines which actions may be proposed from verified findings. Neither may be cited as proof of the customer's current platform state.

## 7. Target architecture

```text
Browser / Vercel UI
  ├── Step 0 scope
  ├── File and questionnaire intake
  ├── Local parsing and deterministic sanitization
  └── Assessment and report views
                │
                ▼
Railway assessment control plane
  ├── Landing Zone assessment kernel
  │     └── Landing Zone domain pack
  ├── Governed model dispatch
  ├── Evidence verification and rescans
  ├── Pair scoring and Quality Gate
  ├── Knowledge Base and tactic grounding
  └── Report and RunTrace generation
                │
                ├── PostgreSQL: run ledger, packets, checkpoints
                └── Redis: leases, fences, dispatch state
```

Every component shown above belongs to the Landing Zone Assessment solution and is built and deployed from this repository. No component calls or loads a FinOps Engine deployment, repository, package, data store, queue, cache, or domain pack.

Only changes to the copied kernel required to support domain parameterization, provider context, evidence authority, scope, or documented human checkpoints should be introduced in this repository.

## 8. Core data contracts

### 8.1 Assessment domain pack

The copied and locally maintained kernel should load a typed `AssessmentDomainPack` rather than import FinOps constants directly.

```ts
interface AssessmentDomainPack {
  packId: string;
  version: string;
  schemaVersion: string;
  designAreas: DesignAreaDefinition[];
  criteria: CriterionDefinition[];
  pairs: PairDefinition[];
  providers: Record<ProviderId, ProviderPack>;
  evidenceTaxonomy: EvidenceTaxonomy;
  routingPolicy: RoutingPolicy;
  validationRules: ValidationRule[];
  personas: PersonaDefinition[];
  knowledgeBase: KnowledgeBaseDescriptor;
  tactics: TacticDefinition[];
  tacticBindings: TacticBinding[];
  scoringPolicy: ScoringPolicy;
  qualityGatePolicy: QualityGatePolicy;
  reportVocabulary: ReportVocabulary;
}
```

### 8.2 Assessment scope

`AssessmentScope` is created before evidence is processed or criteria are evaluated. It records:

- assessment and customer identifiers
- selected providers
- tenant, organization, or management-account references supplied by the user
- selected design areas
- inventory/export availability
- explicit exclusions
- scope owner and timestamp
- domain-pack version

Workshop session notes that overlap the interview questionnaire (date, start/end, facilitator, assessment reference, participants) are optional and are not part of `AssessmentScope`. They must not affect scoring. Inventory Yes/Partial/No records whether file-set exports are included; it is not a live cloud API.

### 8.3 Evidence record

Every evidence unit must carry:

- source and locator IDs
- evidence class
- media or derivation type
- provider
- scope binding
- object or document type
- capture/export date when known
- extraction quality
- sanitization status
- integrity hash
- permitted and prohibited uses

Evidence authority such as `platform`, `document`, or `workshop` must remain separate from representation such as `text`, `image`, or `derived`.

### 8.4 Evaluation and review records

The implementation requires explicit records for:

- provider-scoped criterion instance
- sub-criterion result
- evidence citations
- anti-pattern absence-test status
- pair resolution
- contradiction
- assessment sufficiency
- finding and permitted tactics
- expert calibration event
- customer decision

The original automated Landing Zone assessment result and later expert annotation must remain separately visible in lineage.

## 9. Implementation work plan

The work is ordered by technical dependency, not by separate release classifications.

Verified against `origin/main` at `2a4990c` on 2026-09-16. Plan history rows 1.10 and 1.11 are unchanged.

| Work | Status on main | Verified gap |
|---|---|---|
| 1 Copied kernel | Done | Independence checks pass; no FinOps Engine runtime or build link |
| 2 Pack-driven taxonomy | Done | A–H iteration comes from the local pack |
| 3 Domain pack | Done | Frozen catalogue JSON is validated. Tactic pack JSON is loaded. Knowledge Base `topics: []` remains an empty contract |
| 4 Step 0 scope | Done | Named estate, providers, roots, A–H, inventory-export flag, exclusions. Scoring cannot start without a locked scope. Live collection stays `false` |
| 5 File acquisition | Done | Class 1/2/3 source kinds. Extra providers found in files do not expand Step 0 |
| 6 Questionnaire ingestion | Done | 48-question JSON becomes Class 3 records. The engine does not rebuild the interview UI |
| 7 A–H routing and packets | Done | Kind priors, criterion-token boosts, exclusive out-of-scope withhold, G/H expansion terms, and acquisition diagnostics. Out-of-scope provider evidence is withheld from packets |
| 8 Forensic evaluation | Done | Dual-stream kernel plus Landing Zone authority overlay (`lzForensicEvaluation`). Quote `evidence_class`, Class 2/3 Count 3 caps, non-platform tested-absence → unknown, class contradictions. Work 12 replaced remaining FinOps synthesis/report prose |
| 9 Pair scoring and gates | Done | Adapter scores after provenance and the Work 8 overlay. Single-provider results use Foundation/Pilot/Rollout/Operate. Multi-provider headlines stay withheld because Phase 1 logs are still criterion-keyed, not provider-keyed |
| 10 Knowledge Base | Contract done; 80 Blob PDFs ingested | Pack-local index, version metadata, FinOps rejection, fail-closed loading. Authoring schemas exist. Authoring folder is `GOOGLE_DRIVE_KB` (Drive letter folders A–H). Runtime ingest is Vercel Blob under `Landing Zone Knowledge Base/`. All 80 pair PDFs are in Blob and pass ingest plus authoring-schema checks (`shadow_ready` from a direct Blob read). Railway still runs `ui_only` until Redis is attached. Do not add `GOOGLE_DRIVE_KB` to Railway. Do not set `LANDING_ZONE_KB_PREFIX` |
| 11 Tactic Playbook | Pack conversion done, KB still pending | Approved PDF v1.0.0 transcribed into 80 pack tactics and 240 bindings. Runtime loaders adapt onto kernel types. No FinOps fallback. Mapping is exact IDs only. Work 12 switched the dashboard/export highlighter to `tacticIdCaptureRx`. Silent-domain coverage against the transcribed playbook can still use characterization IDs in copied-kernel tests |
| 12 Prompts, personas, reports | Done | Runtime personas are the four pack IDs. Synthesis prompts, fact-check, Quality Gate, exports, and dashboard copy use Landing Zone vocabulary and transcribed `TAC-{NAMESPACE}-{CRITERION}-01` IDs. Kernel Crawl-Walk-Run math is unchanged; published labels remain Foundation/Pilot/Rollout/Operate. The Criteria catalogue keeps a dark forensic panel on light paper intake. Knowledge Base topic bodies were not invented |
| 13 Expert calibration | Not started | No calibration events or customer disposition model |

Supporting work already on main, outside the numbered Works:

- Step 0 and landing hero follow the questionnaire paper visual language. Overlapping metadata maps onto `AssessmentScope`. Facilitator, date, times, assessment reference, and participants are optional workshop-session notes and do not affect scoring. Intake may be light paper; forensic results stay dark.
- Model routing authorizes Gemini, Spark, Astra, and GPT-5.4, with a `TEST_MODE` cheap chain. This does not change assessment criteria.
- Knowledge Base pair-document schemas live in `docs/kb-authoring/` so authors can write two documents per pair in the form the indexer already consumes. `GOOGLE_DRIVE_KB` is the Drive folder ID for that authoring tree. The engine does not read Drive at runtime.
- HTTP UI boots when Postgres or Redis is missing (`mode: ui_only`). Analysis still needs Redis. Shareable Summary and Master Data HTML exist as static reports. View Criteria heading is Landing Zone Forensic Lens.

Parallel content track: 80 Knowledge Base PDFs are in Vercel Blob under `Landing Zone Knowledge Base/` and pass ingest plus authoring-schema checks. Pack manifest `topics: []` remains the empty contract; runtime uses Blob, not pack topic bodies. The Tactic Playbook v1.0.0 PDF and pack JSON are on main (APPROVED - ACTIVE). The Global Source Register v1.0.0 is the Source Register for Engine composition (APPROVED, effective 2026-09-16). Leftover “Source Register is Preliminary” phrasing in some pair documents is author cleanup and is not an engine gate.

Recommended next implementation order:

1. Remove FinOps Tier 1 fixture dropdown from the live UI (this change). Do not start Engine-Simulation; that button still uses FinOps demo text and should be removed or replaced after Redis is live.
2. Attach Redis on Railway **Landing Zone Assessment** (`REDIS_URL`). Postgres and model routing (`TEST_MODE=true`) are already present. After Redis, `/readyz` should report `mode=full` and analysis workers start. Missing Redis is why `/api/run` returns `VERCEL_GOVERNED_DISPATCH_UNSUPPORTED`.
3. Confirm signed-in `GET /api/kb-index`: `document_count=80`, `failure_count=0`, `delivery.shadow_ready=true`. Restart/redeploy after Redis so the in-process KB cache reloads.
4. First fluent run uses uploaded Landing Zone evidence and a locked Step 0 scope. Do not use Engine-Simulation or FinOps fixtures. Keep `TEST_MODE=true` for the first run.
5. Work 13 follows after a real local analysis path can use the Knowledge Base.
6. Rename leftover `VERCEL_GOVERNED_DISPATCH_UNSUPPORTED` to `INFRASTRUCTURE_UNAVAILABLE` once Redis is attached, so a missing execution plane no longer looks like a Vercel problem. Anthropic `/api/anthropic-generate` is a copied-kernel mount; TEST_MODE does not call it.

These remain unwise:

- Adding `GOOGLE_DRIVE_KB` to Railway, or setting `LANDING_ZONE_KB_PREFIX`.
- Inventing remaining topic bodies.
- Work 13 expert calibration before a working analysis run.
- Changing scoring maths, criteria, or live-cloud collection.
- Triggering Engine-Simulation as a demo.

### Railway runtime findings (2026-09-18)

Login/unlock uses `SECRET_KEY`, not `ADMIN_SECRET`. After `SECRET_KEY` was set, `/api/login` works. That is not sufficient for analysis.

`/readyz` is `ui_only` because `initializeInfrastructure()` requires `REDIS_URL`. Without Redis, `getInfrastructure()` throws and `/api/run`, `/api/checkpoint`, `/api/governed-packet`, and `/api/model-result` return `503 VERCEL_GOVERNED_DISPATCH_UNSUPPORTED`. That code name is leftover from the Vercel serverless kernel. The host is Railway. The failure is missing Redis, not Vercel.

Railway logs that mention Anthropic are `[server] Mounted /api/anthropic-generate`. `server.js` mounts every `api/*.js` file. TEST_MODE routes WORKHORSE/REASONER/QUALITY_CHECKER through Google, xAI, and Meta. There is no `ANTHROPIC_API_KEY`. Anthropic was not invoked.

The header “Tier 1 Fixture…” dropdown injected FinOps policy/CoE/RI documents into `runAnalyze`. It is removed from the UI. `test/tier1-*.txt` files may remain as characterization fixtures; they are no longer operator-reachable.

Standing constraints for later chats:

- Do not rebuild the 48-question questionnaire inside the engine.
- Do not treat workshop “Live inventory: Yes” as a live cloud API. It records whether file-set exports are included. Playbook phrases such as “live control-plane inventory” and “provider-pack queries” mean file-set exports against locked Step 0 scope, not live cloud APIs.
- Do not invent Knowledge Base topic bodies or Tactic Playbook content. Transcribe playbook objects from the approved PDF only.
- Do not fall back to FinOps knowledge, tactics, or prompts.
- Keep forensic dashboard and results dark. Intake presentation may stay light paper.

### Work 1 — Establish the independent copied kernel and domain boundary

1. Record the exact FinOps Engine source commit selected as the baseline and review source/license attribution.
2. Inventory the kernel files, local tests, configuration, and assets required by Landing Zone Assessment.
3. Copy those files into this repository without a Git, package, build, deployment, or runtime link to FinOps Engine.
4. Integrate the existing `AssessmentDomainPack` loader and registry with the copied kernel.
5. Replace direct FinOps knowledge-base and domain-content imports with local Landing Zone pack access.
6. Remove FinOps production content that is not required by the independent Landing Zone solution.
7. Preserve domain-neutral kernel behavior with characterization tests stored and executed in this repository.
8. Add an independence check proving that a fresh clone can install, test, build, and run without access to FinOps Engine.

### Work 2 — Remove FinOps structural assumptions

Inside the copied kernel in this repository, replace:

- `A–F` type unions
- `[A-F]` criterion regular expressions
- fixed six-domain loops
- fixed five-criterion generation
- hard-coded expected output keys
- hard-coded batch titles
- FinOps-only routing terms
- FinOps-only report and persistence prefixes where they cross the domain boundary

Domain and criterion iteration must come from the local pack registry. The Landing Zone catalogue remains fixed at five pairs per design area, but the kernel should not infer this from string patterns. No Work 2 change is made in the FinOps Engine repository.

### Work 3 — Build the Landing Zone domain pack

Create a versioned directory such as:

```text
src/domain-packs/landing-zone/
  pack.json
  taxonomy.json
  criteria.json
  antipatterns.json
  pair-registry.json
  provider-evidence.json
  evidence-taxonomy.json
  routing-keywords.json
  validation-rules.json
  personas.json
  knowledge-base-manifest.json
  tactics.json
  tactic-bindings.json
  scoring-policy.json
  quality-gate-policy.json
  report-vocabulary.json
  questionnaire-mapping.json
  prompts.json
```

Normalize the frozen HTML criteria into these machine-readable records. Conversion to JSON is an implementation task, not another criteria-definition activity. Knowledge Base topics and tactic playbook bodies stay empty until later work; missing content must fail visibly and must not fall back to FinOps content.

Automated pack validation must confirm:

- all 80 criterion IDs are present and unique
- all 40 pairs are reciprocal
- every criterion has three sub-criteria
- all design areas A–H are represented
- provider mappings use valid provider and applicability values
- references from questionnaire, Knowledge Base, tactics, prompts, and reports resolve to valid IDs

### Work 4 — Implement Step 0 scope

Add the Landing Zone front door before source intake:

1. Select providers.
2. identify the named estate using user-supplied references.
3. Select all or a subset of A–H.
4. Record whether inventory exports are included.
5. Record exclusions.
6. Load only the applicable provider and criterion surface.

Scoring must not begin without a valid scope object.

`live_collection_permitted` remains false for this plan. Questionnaire fields that overlap Step 0 map onto the existing scope object: customer to `estate_name`, clouds to `providers`, tenant or roots to `estate_roots`, design areas A–H to `design_area_ids`, and Live inventory Yes/Partial/No to `inventory_exports_included` (Yes and Partial are both true). Date, start/end, facilitator, assessment reference, and participants stay on the optional workshop session record and are not scoring inputs. The 48-question interview remains a JSON Class 3 import; it is not an in-engine questionnaire.

### Work 5 — Adapt file-based acquisition

Reuse the copied baseline implementations for these supported inputs:

- PDF
- HTML
- CSV and TSV
- XLSX
- JSON
- PNG, JPEG, and WebP

Add Landing Zone source classification and normalization for:

- hierarchy and organization exports
- account, subscription, and project inventories
- IAM bindings and privileged-access material
- policy and guardrail assignments
- network topology and attachments
- logging and monitoring destinations
- security configuration
- IaC and vending pipelines
- exception and waiver records
- architecture and operating-model documents

Original material remains outside generative model input. Only sanitized, bounded, traceable evidence packets cross the model boundary.

### Work 6 — Add questionnaire ingestion

Import the 48-question questionnaire export as typed Class 3 records. Preserve:

- question ID
- referenced criterion IDs
- interview observation
- evidence lead
- facilitator and participant context
- source locator

Questionnaire observations support operating-model interpretation. Evidence leads identify additional material to request; they do not become findings.

### Work 7 — Route and packetize A–H evidence

1. Replace the copied baseline's FinOps `DOMAIN_TERMS` with Landing Zone routing vocabulary.
2. Route sources by provider, design area, criterion, and evidence class.
3. Build one bounded packet for each applicable assessment batch.
4. Preserve weak-coverage and expansion behavior.
5. Record packet manifests and integrity hashes.
6. Make withheld or unusable material visible to acquisition diagnostics.

Work 7 is rebased onto current main. Pack `DOMAIN_ROUTING_TERMS`, kind priors, frozen-catalogue criterion tokens, exclusive out-of-scope withhold, Landing Zone G/H expansion terms, and acquisition diagnostics are in the kernel. Extra providers found in files still do not expand Step 0.

### Work 8 — Adapt the forensic evaluation flow

For every applicable A–H batch:

1. Evaluate the five capabilities.
2. Evaluate the five anti-patterns.
3. Produce three sub-criterion results per criterion.
4. Bind every evidence claim to a source locator or approved deterministic result.
5. Run independent evidence verification.
6. Expand or rescan only affected criteria when support is weak.
7. Apply evidence-authority limits.
8. flag document/platform/workshop contradictions.
9. Preserve unresolved results as unknown.

Models may explain approved evidence and metrics; they may not invent provider checks or control-plane facts.

Work 8 is rebased onto Work 7. The dual-stream loop, verification, and targeted rescan remain. The Landing Zone authority overlay stamps quote `evidence_class`, caps document/workshop Count 3, converts non-platform `tested_absent` to unknown, and flags class contradictions. Phase 1 logs stay criterion-keyed; they are not split per provider.

### Work 9 — Adapt pair scoring and gates

Retain the copied ADR-002 resolution-based pair model, including:

- explicit pair registry
- unknown values represented as unresolved rather than zero
- partial resolution credit
- separate observed and resolution-adjusted maturity
- silent-domain handling
- separation between Assessment Sufficiency and roadmap actionability

Adapt it so:

- provider-scoped criterion instances are the scoring surface
- out-of-scope and not-applicable instances are excluded
- anti-pattern clearance requires a valid tested-absence result
- evidence-class policy controls whether a sub-criterion may resolve positively
- capability strength cannot conceal a confirmed paired anti-pattern
- results are calculated and displayed separately for each provider
- Landing Zone labels use Foundation, Pilot, Rollout, and Operate

Work 9 is rebased onto Works 7 and 8. Pack `scoring-policy.json` and `quality-gate-policy.json` remain the policy source. Runtime scoring goes through `scoreLandingZoneAssessment` after provenance and the Work 8 overlay. Kernel Crawl/Walk/Run math stays for characterization tests. Single-provider results display Foundation/Pilot/Rollout/Operate. Multi-provider headlines stay withheld because Phase 1 logs are still criterion-keyed, not provider-keyed.

### Work 10 — Integrate the Knowledge Base

The Knowledge Base content is developed in parallel with adaptation of the locally copied kernel.

Define its contract early:

- version and schema version
- topics and stable knowledge IDs
- applicable design areas and criterion IDs
- provider applicability
- allowed interpretation use
- citation and provenance metadata
- prohibited use as customer-state evidence

The contract, pack-local index, packet/RunTrace version metadata, FinOps rejection, and fail-closed load policy are on main. Topic bodies remain empty (`contract_defined_content_pending`). Catalogue batch definitions are not an integrated Knowledge Base.

Authoring form is defined in `docs/kb-authoring/`: JSON front matter, canonical heading order, and two documents per pack pair. Engine keys are `maturity:A1`…`maturity:H5` and `antipattern:AP-A1`…`antipattern:AP-H5`. `stream` is `maturity` or `antipattern`, never `capability`. PAIR-A1 samples exist. Authoring continues in the Drive folder named by `GOOGLE_DRIVE_KB` (letter folders A–H, canonical PDF filenames, optional `PAIR-*.md` companions). As of 2026-09-16 Drive holds PAIR markdown for A1–A5, B1–B5, C1–C5, D1–D5, and E1–E4; E5 and F–H are still missing, and some A/C PDFs are duplicated. Validate a snapshot with `node scripts/validate-lz-kb-authoring.mjs`. Blob ingest uses design-area folder names under `LZ_KB_BLOB_PREFIX`, not the Drive letter folders. Do not invent topic prose in implementation work. Do not copy a partial A–E snapshot into Blob as the production Knowledge Base. The Source Register is already the composition source; leftover PRELIMINARY phrasing in Canonical Source Foundations is author cleanup and does not fail the authoring validator.

When content becomes available:

1. Validate every reference.
2. Build the Landing Zone knowledge index from the 80 documents.
3. Include the selected Knowledge Base version in governed packets and RunTrace.
4. Test retrieval relevance and clean-room separation.
5. Fail visibly if required Landing Zone knowledge content cannot be loaded; do not substitute any non-Landing Zone content, including material retained from the copied FinOps baseline.

### Work 11 — Integrate the Tactic Playbook

The approved playbook is in the repository: `Landing_Zone_Assessment_Tactical_Playbook_v1.0.0_APPROVED.pdf` (v1.0.0, APPROVED - ACTIVE, 16 September 2026). It is the human-readable controlled catalogue. Runtime must not parse the PDF. Conversion notes and the 80-ID index live in `docs/tactics-authoring/`.

The PDF contains **80 tactic objects**: one PRIMARY mapping per criterion (40 capability + 40 anti-pattern). IDs are `TAC-{NAMESPACE}-{CRITERION}-01`. Namespaces are ORG, IDENTITY, RESOURCE, NETWORK, SECURITY, OPERATIONS, GOVERNANCE, AUTOMATION. The empty pack’s guessed pattern `TAC-[A-Z]+-\d{3}` and prefixes `TAC-IAM` / `TAC-VEN` / `TAC-POL` / `TAC-OBS` / `TAC-IAC` are placeholders and must be replaced during conversion.

Capability objects activate when a locked finding shows the capability below target, a sub-criterion unsatisfied, or the paired anti-pattern requires the capability as the replacement control. Anti-pattern objects activate only when the finding is locked PRESENT or UNRESOLVED; no locked finding means no mandatory tactic. Supporting mappings are exact approved reuse. Title or similarity matching is forbidden.

How to add it to the codebase:

1. Transcribe each PDF object into `src/domain-packs/landing-zone/tactics.json`. Do not invent titles, activities, owners, or source IDs.
2. Transcribe mappings into `tactic-bindings.json`. PRIMARY is the exact primary criterion. The pair criterion is reciprocal. Remaining index mappings are SUPPORTING. `mandatory_when_activated` is true only on anti-pattern PRIMARY bindings (ADR-003). Capability PRIMARY bindings stay candidates, not auto-required.
3. Expand pack `TacticDefinition` / `TacticBinding` to hold playbook fields (trigger, activities, outputs, acceptance, verification, do-not-use, reassessment, source IDs, owners).
4. Stop hard-returning `[]` from `landingZoneTactics()` and `landingZoneTacticActivityPlaybook()`. Load pack JSON. Fail visible if content is missing. Never import FinOps tactic JSON in production.
5. Adapt pack records onto existing kernel types `StrategicTactic` and `TacticActivityPlaybookEntry`. Keep ADR-003 grounding. Do not enable FinOps-style category-expansion similarity matching.
6. Replace `validation-rules.json` `tactic_id_pattern` with the approved ID scheme.
7. Record playbook version `1.0.0` on RunTrace.
8. Validate: 80 unique IDs; every A–H criterion and anti-pattern has exactly one PRIMARY; mapped IDs exist in the pack catalogue; source IDs resolve to the Source Register; silent/unsupported areas suppress tactics; frameworks and accelerators never become customer evidence.

`landingZoneTactics()` and `landingZoneTacticActivityPlaybook()` load the transcribed pack. They fail visible if the arrays are empty and never import FinOps tactic JSON.

The Tactic Playbook pack is integrated. The full Knowledge Base must still be integrated before full pipeline verification and the first real assessment test cases. Knowledge Base topics remain empty.

### Work 12 — Replace prompts, personas, and reports

Prompts must use Landing Zone language and explicitly prevent:

- treating framework guidance as proof
- treating workshop confidence as platform configuration
- inferring absence from missing documentation
- blending providers
- scoring excluded or not-applicable criteria
- narrating excellence over a confirmed anti-pattern
- producing tactics without sufficient evidence

Replace FinOps-origin personas retained in the copied baseline with:

- CISO and leadership
- Platform Owner and Cloud Foundation
- Identity, Network, Security, and SOC owners
- Application and delivery teams

The report must present:

- assessment scope and pack versions
- provider-by-design-area results
- configured facts
- declared intent
- contradictions
- unknowns and evidence gaps
- capability maturity and anti-pattern burden
- evidence citations
- permitted tactics
- expert annotations
- customer decisions
- Assessment Sufficiency and Quality Gate outcomes
- RunTrace and methodology appendices

Pack `personas.json`, `prompts.json` (template contracts), and `report-vocabulary.json` already used Landing Zone names and forbidden behaviors. Work 12 replaced the runtime surfaces: `PersonaId` is the four pack IDs (`ciso_leadership`, `platform_owner`, `security_owners`, `application_delivery`) with a legacy map from `finops_lead` / `cfo` / `engineering_lead`; `src/constants.ts` and `src/prompts.ts` use Landing Zone Forensic Auditor language, Foundation/Pilot/Rollout/Operate publication, A–H design-area labels, forbidden behaviors, and transcribed tactic IDs such as `TAC-ORG-A1-01` and `TAC-IDENTITY-AP-B1-01`; exports and the dashboard use Landing Zone Assessment Engine titles, `#lz-assessment-data`, and the kernel tactic-ID highlighter. Kernel Crawl-Walk-Run math and characterization FinOps fixtures are unchanged. Knowledge Base topic bodies were not invented.

### Work 13 — Add expert calibration and customer decisions

After local Landing Zone engine analysis and deterministic gates:

1. Present verified findings, contradictions, and unknowns.
2. Allow an expert to confirm, annotate, or return a finding for evidence review.
3. Preserve the original automated assessment output.
4. Record the reason and actor for each calibration event.
5. Re-run publication checks after calibration.
6. Record customer disposition such as action approved, more evidence required, accepted exception, deferred, no action, or out of scope.
7. Publish the Master Data Summary from the locked result.

Not started on main. Report vocabulary lists expert annotations and customer decisions as required section names only. Closest existing kernel surface is tactic disposition, which is not expert calibration.

## 10. Verification strategy

Verification is performed continuously as each relevant component changes.

### 10.1 Copied-kernel regression

- Domain-neutral characterization tests copied or recreated in this repository continue to pass.
- Packet, governance, scoring, Quality Gate, and RunTrace behavior remains stable unless deliberately adapted for Landing Zone.
- Landing Zone tests use only local source, fixtures, domain content, and services.
- FinOps-shaped fixtures may verify that the kernel does not infer A–H, but no production FinOps pack or live FinOps dependency is required.

### 10.2 Domain-pack validation

- All catalogue counts and IDs match the frozen source.
- Pair and questionnaire references are complete.
- Provider evidence definitions are structurally valid.
- Knowledge and tactic references resolve when their content is added.

### 10.3 Golden evidence sets

Create synthetic and representative file sets for every provider and design area. They must cover:

- positive capability evidence
- confirmed anti-patterns
- tested absence
- incomplete evidence
- document-only declarations
- workshop-only claims
- platform/document contradictions
- platform/workshop contradictions
- out-of-scope providers
- provider-native not-applicable controls
- mixed-provider assessments

### 10.4 Security and provenance

- Raw evidence never reaches generative processing.
- Complete sources are deterministically scanned.
- Exact outgoing payloads are re-scanned.
- Every published evidence claim resolves to a source locator.
- Integrity and lineage checks fail closed.
- Reports do not leak blocked or redacted values.

### 10.5 End-to-end pipeline

Before using the first real assessment test cases, verify this complete path:

```text
Step 0 scope
→ file and questionnaire intake
→ sanitization and source registry
→ A–H routing and governed packets
→ capability and anti-pattern analysis
→ independent verification and rescans
→ pair resolution and provider-specific scoring
→ Knowledge Base interpretation
→ tactic permissioning
→ fact check and Quality Gate
→ expert calibration
→ customer decision
→ Master Data Summary and RunTrace
```

The real test cases then validate the same flow with representative customer material; they do not introduce a different execution path.

### 10.6 Repository and runtime independence

Automated and release verification must confirm:

- no Git submodule, Git dependency, package dependency, remote import, or source path references the FinOps Engine repository
- install, test, build, and deployment scripts do not clone, fetch, download, or mount FinOps Engine
- the deployed solution does not call a FinOps Engine API or share its PostgreSQL database, Redis instance, queues, storage, credentials, or deployment
- all required kernel source, tests, configuration, assets, Landing Zone content, and migrations are versioned in this repository
- a fresh clone succeeds when network access to the FinOps Engine repository and services is unavailable
- source provenance records the copied baseline revision without creating an executable link
- this project creates no branch, commit, push, or pull request in the FinOps Engine repository

## 11. Completion criteria

The Landing Zone Assessment implementation is complete when:

1. The frozen A–H catalogue is represented in a validated, versioned domain pack.
2. The kernel obtains domains, criteria, pairs, providers, prompts, and output vocabulary from the selected pack.
3. The required kernel source is copied, attributed, adapted, tested, and maintained entirely in this repository.
4. Step 0 prevents assessment of an unnamed or incorrectly scoped estate.
5. User-supplied files and questionnaire exports can be parsed, sanitized, classified, and traced.
6. Every selected criterion is evaluated for every applicable selected provider.
7. Evidence-class authority is enforced.
8. Tested absence, contradiction, unknown, not-applicable, and out-of-scope states behave correctly.
9. Multi-cloud results remain provider-specific.
10. Knowledge Base interpretation and tactic activation are grounded only in verified evidence.
11. The complete Knowledge Base and Tactic Playbook are integrated and version-traced.
12. Expert calibration and customer decisions are preserved in the assessment lineage.
13. The exported Master Data Summary contains traceable findings, uncertainties, tactics, decisions, and Quality Gate information.
14. Copied-kernel regression, domain validation, golden evidence, security, independence, and end-to-end tests pass.
15. A fresh clone can install, test, build, deploy, and run without access to FinOps Engine, and no FinOps Engine repository or deployment was changed.

## 12. Maintaining this plan

This is a living plan. Update it when:

- a source document changes an architectural or behavioral requirement
- a copied-kernel constraint changes the implementation approach
- the Knowledge Base or Tactic Playbook introduces a new contract requirement
- testing identifies a missing reliability control
- report or workflow behavior is deliberately changed
- a numbered Work lands on main, or a status review finds the board out of date

Material changes should update the date and append a short entry below.

## 13. Change history

| Date | Version | Change |
|---|---|---|
| 2026-09-06 | 1.0 | Initial repository plan. Treats criteria as frozen, defines file-based first implementation, and schedules Knowledge Base and Tactic Playbook integration before full pipeline and real-case verification. |
| 2026-09-06 | 1.1 | Started the domain boundary and Work 3: pack contract, loader/registry, frozen A–H JSON catalogue, and pack validation. Applying the boundary to a complete copied kernel remains pending. |
| 2026-09-06 | 1.2 | Added Work 2 pack-driven taxonomy helpers and tests for A–F unions, `[A-F][1-5]` regular expressions, fixed domain loops, and five-wide criterion generation. Applying them to the complete copied kernel remains pending. |
| 2026-09-07 | 1.4 | Work 1: copied FinOps Engine kernel baseline `d671a38723d76398f683ee7362acf12343a796bd` into this repository, wired production knowledge access to the Landing Zone pack, retained FinOps JSON as characterization fixtures only, and added independence checks. Missing Landing Zone Knowledge Base and Tactic Playbook content fails visibly and does not fall back to FinOps content. |
| 2026-09-07 | 1.5 | Work 2: applied pack-driven taxonomy to the copied kernel in this repository. Replaced A–F unions, `[A-F][1-5]` regular expressions, fixed six-domain loops, five-wide criterion generation, hard-coded expected keys and batch titles, FinOps-only routing fallbacks, and FinOps persistence prefixes. Characterization tests keep FinOps-shaped stubs and aliases. |
| 2026-09-08 | 1.6 | Work 3: completed the Landing Zone domain pack. Frozen HTML catalogue converts to versioned JSON with 80 unique IDs, 40 reciprocal pairs, three sub-criteria each, A–H coverage, and valid provider mappings. Questionnaire, Knowledge Base, tactics, prompt, and report references resolve to pack IDs or remain empty pending-content contracts. |
| 2026-09-08 | 1.7 | Work 4: implemented Step 0 scope. Named estate, providers, user-supplied roots, A–H selection, inventory-export recording, and exclusions lock before intake. Scoring is blocked without a valid scope object. The scoring surface loads only in-scope providers and design areas; live collection remains false. |
| 2026-09-11 | 1.8 | Work 5: reused copied file parsers and added Landing Zone source classification. Hierarchy, inventory, IAM, policy, network, logging, security, IaC, exception, architecture, and workshop files receive evidence class and source kind. Unclassified material is Class 2. Extra providers found later do not expand Step 0. |
| 2026-09-15 | 1.9 | Work 6: ingested the 48-question interview export as typed Class 3 records. Pack mapping supplies criterion refs. Interview observations remain operating-model interpretation. Evidence leads are acquisition requests, not findings. Solo questionnaire JSON is no longer rejected as a failed report import. |
| 2026-09-15 | 1.10 | Work 10: integrated the Landing Zone Knowledge Base contract without inventing topic prose. Pack topics stay empty and pending. The kernel now builds a pack-local index, records KB version metadata on packets and RunTrace, rejects FinOps titles/aliases/blob prefixes, and fails visibly if required Landing Zone knowledge is missing. Catalogue BATCH_DEFINITIONS are not treated as an integrated Knowledge Base. |
| 2026-09-15 | 1.11 | Status review against `origin/main` `02cfbca`. Works 1–6 and the Work 10 contract are on main. Works 7–9 exist as unmerged kernel adaptations that currently conflict with main and must rebase without rewriting 1.10–1.11 history. Work 10 content, Work 11 playbook bodies, Work 12 runtime prompts/reports, and Work 13 remain open. Records Step 0 workshop-session mapping, questionnaire visual intake, pair-document authoring schemas, TEST_MODE routing, and the constraint that engine work must not invent KB or tactic prose. |
| 2026-09-16 | 1.12 | Rebased and stacked Works 7, 8, then 9 onto current main without rewriting 1.10–1.11 history. Runtime path is packet routing → forensic authority overlay → pair scoring. Multi-provider headlines remain withheld because Phase 1 logs are still criterion-keyed. Next engine work is Work 12. |
| 2026-09-16 | 1.13 | Record that Global Source Register v1.0.0 is approved and finalized. Remove PRELIMINARY / draft-register wording from the register document and stop treating the Source Register as pending authoring content. Work 11 still waits only on the Tactic Playbook. |
| 2026-09-16 | 1.14 | Record `GOOGLE_DRIVE_KB` as the LZ Assessment KB authoring folder (A–H letter folders). Runtime ingest stays Vercel Blob. Add `scripts/validate-lz-kb-authoring.mjs` so Drive snapshots can be checked against the indexer without inventing remaining topic prose. |
| 2026-09-16 | 1.15 | Record the repository Source Register upload as the Engine composition source (APPROVED, effective 2026-09-16). Stop treating leftover “Source Register is Preliminary” wording in Drive KB documents as an engine blocker; that cleanup is author-owned and already started. |
| 2026-09-16 | 1.16 | Record Tactic Playbook v1.0.0 APPROVED PDF on main. Work 11 is pack conversion and kernel wiring, not inventing prose. Capture the real ID scheme `TAC-{NAMESPACE}-{CRITERION}-01`, 80 PRIMARY mappings, and fail-visible empty pack until transcription. |
| 2026-09-16 | 1.17 | Transcribe the approved Tactical Playbook PDF into pack JSON (80 tactics, 240 bindings) and load them through `landingZoneTactics()` / activity playbook accessors. Exact mappings only. No FinOps fallback. Runtime does not parse the PDF. |
| 2026-09-16 | 1.18 | Status review against `origin/main` `2a4990c`. Works 1–9 and 11 pack conversion are on main. Work 10 contract is on main; Drive authoring has reached A–D plus E1–E4 and is not engine-ready. Next engine work is Work 12. Do not ingest a partial KB. Work 13, full pipeline verification, and real cases wait on complete Knowledge Base content. |
| 2026-09-16 | 1.19 | Work 12: replace leftover FinOps runtime prompts, personas, and reports with Landing Zone pack vocabulary. Cite transcribed `TAC-{NAMESPACE}-{CRITERION}-01` IDs. Keep kernel Crawl-Walk-Run math. Do not invent Knowledge Base topic bodies. |
| 2026-09-18 | 1.20 | Record that all 80 Blob PDFs ingest and are authoring-schema valid. Railway remains `ui_only` without Redis; `/api/run` therefore returns leftover `VERCEL_GOVERNED_DISPATCH_UNSUPPORTED`. Remove the FinOps Tier 1 fixture dropdown. Do not start Engine-Simulation. Next enablement is Redis, then a real uploaded-evidence run with `TEST_MODE=true`. |
