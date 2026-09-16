# Landing Zone Tactic Playbook — pack conversion

Human-readable source of truth (already on `main`):

`Landing_Zone_Assessment_Tactical_Playbook_v1.0.0_APPROVED.pdf`

Version **1.0.0**, status **APPROVED - ACTIVE**, snapshot **16 September 2026**. 80 tactic objects. Mapping is one-way: Tactical KB → assessment criteria. The engine must not parse this PDF at runtime and must not fall back to FinOps playbooks.

The catalogue index extract in `catalogue-index.json` is transcribed from pages 6–7. Runtime pack JSON is produced by `scripts/transcribe-lz-tactical-playbook.py` and loaded by `landingZoneTactics()` / `landingZoneTacticActivityPlaybook()`.

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

Conversion is implemented:

1. `scripts/transcribe-lz-tactical-playbook.py` transcribes each PDF object into `src/domain-packs/landing-zone/tactics.json` and mappings into `tactic-bindings.json`.
2. PRIMARY is the exact primary criterion. Pair is RELATED. Remaining index mappings are SUPPORTING. `mandatory_when_activated` is true only on anti-pattern PRIMARY bindings.
3. `landingZoneTactics()` and `landingZoneTacticActivityPlaybook()` load pack JSON and adapt it onto kernel `StrategicTactic` / `TacticActivityPlaybookEntry`. Missing content still fails visible. FinOps tactic JSON is never imported in production.
4. `src/kernel/tacticIds.ts` captures both LZ IDs (`TAC-ORG-A1-01`) and characterization stubs (`TAC-GOV-001`).
5. Playbook phrases such as “live control-plane inventory” and “provider-pack queries” mean file-set exports against locked Step 0 scope, not live cloud APIs.

Re-run transcription after a new approved PDF:

```
python3 scripts/transcribe-lz-tactical-playbook.py
npm run test:lz-tactics
```

## Canonical object fields (from the PDF)

IDENTITY, MAPPING, TRIGGER, RATIONALE, SOURCE GROUNDING, ACTIVITIES, OWNERSHIP, OUTPUTS, ACCEPTANCE, VERIFICATION, RISK CONTROL, REASSESSMENT, CLOSURE.

Provider Azure / AWS / GCP rows stay under one tactic ID. They are implementation and verification contracts, not separate tactics.

## What this is not

- Not assessment evidence.
- Not a Knowledge Base topic.
- Not a finding closer, compliance proof, residual-risk acceptance, or lifecycle authorization.
- Not a Vercel Blob ingest. Blob remains for Knowledge Base PDFs only.
