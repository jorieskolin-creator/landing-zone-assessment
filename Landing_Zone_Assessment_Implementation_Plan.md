# Landing Zone Assessment — Implementation Plan

| Document property | Value |
|---|---|
| Status | Living implementation plan |
| Initial version | 1.0 |
| Current version | 1.8 |
| Last updated | 2026-09-11 |
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

The architecture plan and criteria definitions specify the engine and domain model. The proposal and questionnaire describe how the assessment is prepared, performed, reviewed, and used with customers.

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

Current implementation status at version 1.8:

- Work 5 reused the copied parsers for PDF, HTML, CSV/TSV, XLSX, JSON, and PNG/JPEG/WebP, and classified those files into Landing Zone source kinds with evidence classes. Control-plane exports are Class 1, documents and IaC are Class 2, and workshop files are Class 3. Unclassified material is treated as Class 2. Extra providers found in files do not expand Step 0. Questionnaire typed ingestion remains Work 6.
- Work 4 added Step 0 scope: named estate, providers, user-supplied roots, A–H selection, inventory-export flag, and exclusions. Scoring cannot start without a locked scope object. Out-of-scope providers and design areas are omitted from the scoring surface and are not scored as zero. Live collection stays unavailable.
- Work 3 built the versioned Landing Zone domain pack from the frozen HTML catalogue: 8 design areas A–H, 80 unique criteria, 40 reciprocal pairs, 240 sub-criteria, provider evidence contracts, questionnaire mapping, prompt/report vocabulary contracts, and automated ID-reference validation. Knowledge Base and Tactic Playbook files remain empty contracts and must not fall back to FinOps content.
- Work 1 copied the FinOps Engine kernel baseline into this repository and wired production knowledge access to the Landing Zone pack.
- Work 2 applied those pack-taxonomy helpers to the copied kernel: domain and criterion iteration, output-contract IDs, routing terms, Knowledge Base expected keys, and persistence prefixes come from the local pack rather than A–F / five-wide FinOps literals.
- The current repository has no live or build-time dependency on FinOps Engine.
- Exploratory kernel changes made in any external working copy are not part of this solution and must not be pushed to FinOps Engine.

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

When content becomes available:

1. Validate every reference.
2. Build the Landing Zone knowledge index.
3. Include the selected Knowledge Base version in governed packets and RunTrace.
4. Test retrieval relevance and clean-room separation.
5. Fail visibly if required Landing Zone knowledge content cannot be loaded; do not substitute any non-Landing Zone content, including material retained from the copied FinOps baseline.

### Work 11 — Integrate the Tactic Playbook

Define the tactic contract before content completion:

- stable tactic ID
- title and objective
- applicable criterion and anti-pattern IDs
- PRIMARY, SUPPORTING, or RELATED relationship
- activation conditions
- prerequisites and dependencies
- owners
- acceptance evidence
- risks and usage boundaries
- `mandatory_when_activated` behavior

When the playbook is ready:

1. Validate all tactic and criterion references.
2. Add Landing Zone tactic bindings.
3. Permit tactics only from verified and sufficiently resolved findings.
4. Suppress tactics for silent or unsupported areas.
5. Verify that reference frameworks and accelerators never become customer evidence.
6. Include tactic and playbook versions in RunTrace.

The full Knowledge Base and Tactic Playbook must be integrated before full pipeline verification and the first real assessment test cases.

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

### Work 13 — Add expert calibration and customer decisions

After local Landing Zone engine analysis and deterministic gates:

1. Present verified findings, contradictions, and unknowns.
2. Allow an expert to confirm, annotate, or return a finding for evidence review.
3. Preserve the original automated assessment output.
4. Record the reason and actor for each calibration event.
5. Re-run publication checks after calibration.
6. Record customer disposition such as action approved, more evidence required, accepted exception, deferred, no action, or out of scope.
7. Publish the Master Data Summary from the locked result.

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
