# Landing Zone Tactic Playbook — pack conversion

Human-readable source of truth (already on `main`):

`Landing_Zone_Assessment_Tactical_Playbook_v1.0.0_APPROVED.pdf`

Version **1.0.0**, status **APPROVED - ACTIVE**, snapshot **16 September 2026**. 80 tactic objects. Mapping is one-way: Tactical KB → assessment criteria. The engine must not parse this PDF at runtime and must not fall back to FinOps playbooks.

The catalogue index extract in `catalogue-index.json` is transcribed from pages 6–7. It is not yet loaded by the runtime pack (`tactics.json` / `tactic-bindings.json` stay empty until Work 11 conversion).

## Identity scheme

The empty pack guessed `TAC-ORG-001` (`TAC-[A-Z]+-\d{3}` with prefixes `TAC-IAM`, `TAC-VEN`, `TAC-POL`, `TAC-OBS`, `TAC-IAC`). The approved playbook does **not** use that pattern.

Actual IDs:

```
TAC-{NAMESPACE}-{CRITERION}-01
```

| Design area | Namespace | Example capability | Example anti-pattern |
|---|---|---|---|
| A | `ORG` | `TAC-ORG-A1-01` | `TAC-ORG-AP-A1-01` |
| B | `IDENTITY` | `TAC-IDENTITY-B1-01` | `TAC-IDENTITY-AP-B1-01` |
| C | `RESOURCE` | `TAC-RESOURCE-C1-01` | `TAC-RESOURCE-AP-C1-01` |
| D | `NETWORK` | `TAC-NETWORK-D1-01` | `TAC-NETWORK-AP-D1-01` |
| E | `SECURITY` | `TAC-SECURITY-E1-01` | `TAC-SECURITY-AP-E1-01` |
| F | `OPERATIONS` | `TAC-OPERATIONS-F1-01` | `TAC-OPERATIONS-AP-F1-01` |
| G | `GOVERNANCE` | `TAC-GOVERNANCE-G1-01` | `TAC-GOVERNANCE-AP-G1-01` |
| H | `AUTOMATION` | `TAC-AUTOMATION-H1-01` | `TAC-AUTOMATION-AP-H1-01` |

Every criterion and anti-pattern has exactly one PRIMARY tactic. Pair and supporting mappings are explicit approved reuse. No title or similarity fallback.

## How to add this to the pack

1. Transcribe each PDF object into `src/domain-packs/landing-zone/tactics.json` (identity, title, kind, owners, source IDs, trigger, purpose, activities, outputs, acceptance, verification, risks, do-not-use, reassessment). Do not invent fields the PDF does not contain.
2. Transcribe mappings into `tactic-bindings.json`:
   - PRIMARY → `primary_criterion_id`
   - pair criterion → reciprocal RELATED (or a dedicated `pair` field)
   - remaining index column → SUPPORTING
   - `mandatory_when_activated: true` only on anti-pattern PRIMARY bindings (activate when the finding is locked PRESENT or UNRESOLVED)
   - capability PRIMARY bindings are candidates when the capability is below target; they are not auto-required (ADR-003)
3. Replace `id_pattern` / `id_prefixes` and `validation-rules.json` `tactic_id_pattern` with the scheme above.
4. Stop hard-returning `[]` from `landingZoneTactics()` / `landingZoneTacticActivityPlaybook()`. Load pack JSON. Keep fail-visible if content is missing. Never import `finops_tactics_database.json` or `finops_tactic_activity_playbook.json` in production.
5. Adapt pack records onto the existing kernel types `StrategicTactic` and `TacticActivityPlaybookEntry`. Do not rewrite ADR-003 grounding. Do not enable FinOps-style “category expansion” similarity matching — supporting mappings are exact IDs only.
6. Record playbook version `1.0.0` on RunTrace (`playbook_version`, tactic DB hash from the LZ pack).
7. Treat playbook phrases such as “live control-plane inventory” and “provider-pack queries” as **file-set exports** against locked Step 0 scope, not live cloud APIs.

## Canonical object fields (from the PDF)

IDENTITY, MAPPING, TRIGGER, RATIONALE, SOURCE GROUNDING, ACTIVITIES, OWNERSHIP, OUTPUTS, ACCEPTANCE, VERIFICATION, RISK CONTROL, REASSESSMENT, CLOSURE.

Provider Azure / AWS / GCP rows stay under one tactic ID. They are implementation and verification contracts, not separate tactics.

## What this is not

- Not assessment evidence.
- Not a Knowledge Base topic.
- Not a finding closer, compliance proof, residual-risk acceptance, or lifecycle authorization.
- Not a Vercel Blob ingest. Blob remains for Knowledge Base PDFs only.
