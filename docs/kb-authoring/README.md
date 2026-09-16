# Landing Zone KB pair documents

Author **two documents per pack pair**. Pair identity already lives in `src/domain-packs/landing-zone/pair-registry.json` (`PAIR-A1` … `PAIR-H5`). Do not invent new pair ids.

The engine loads **80 documents**, keyed `maturity:A1` … `maturity:H5` and `antipattern:AP-A1` … `antipattern:AP-H5`. It does not ingest the authoring envelope JSON. Split each envelope into two PDFs (JSON front matter first, then headings).

Authoring lives in the Google Drive folder identified by `GOOGLE_DRIVE_KB` (LZ Assessment KB). Drive uses letter folders `A`–`H`. Runtime ingest is still Vercel Blob under `LZ_KB_BLOB_PREFIX` (`Landing Zone Knowledge Base/<Design Area Name>/`). Copy only the canonical PDFs into Blob; keep `PAIR-*.md` / `PAIR-*.json` as authoring companions.

Validate a local snapshot with:

```
node scripts/validate-lz-kb-authoring.mjs /path/to/lz-assessment-kb
```

## Filename

Drive (authoring):

```
<A–H>/<ID> - <Design Area Name> - <Criterion ID> - <Short Title>.pdf
```

Blob (runtime ingest):

```
Landing Zone Knowledge Base/<Design Area Name>/<ID> - <Design Area Name> - <Criterion ID> - <Short Title>.pdf
```

Examples:

```
A/A - Tenant, billing & organization construct - A1 - Authoritative organization root.pdf
Landing Zone Knowledge Base/Tenant, billing & organization construct/A - Tenant, billing & organization construct - A1 - Authoritative organization root.pdf
A/A - Tenant, billing & organization construct - AP-A1 - Shadow tenants and unmanaged orgs.pdf
Landing Zone Knowledge Base/Tenant, billing & organization construct/A - Tenant, billing & organization construct - AP-A1 - Shadow tenants and unmanaged orgs.pdf
```

## Front matter rules the indexer will reject if broken

- `stream` is `maturity` or `antipattern`. Never `capability`.
- On both files, `capability_id` is the capability id **without** `AP-` (`A1` on the `AP-A1` file).
- `criterion_id` is `A1` on the capability file and `AP-A1` on the anti-pattern file.
- Do not include `streams` or `antipattern_id` (legacy FinOps fields).
- `forbidden_uses` must include `customer_current_state_claim`, `source_evidence_quote`, and `audited_finding`.
- `domain_name` must match the pack taxonomy name exactly.

## Heading order

Use these exact heading strings, in this order. Skip FinOps-only headings (`Migration Economics Interpretation`, `Cloud-Native Optimization Interpretation`, `FOCUS-Normalized Interpretation`). Do not duplicate headings.

1. Engine Usage Note
2. Purpose
3. Applies To
4. Canonical Definition *(required)*
5. Primary Assessment Questions
6. Maturity State Interpretation **or** Anti-Pattern State Interpretation *(required on anti-pattern)*
7. Detailed Maturity Interpretation **or** Detailed Anti-Pattern Interpretation
8. Evidence Requirements *(required, or supply the evidence example headings instead)*
9. Strong Evidence Examples
10. Moderate Evidence Examples
11. Weak Evidence Examples
12. Contradictory Evidence Examples
13. Accepted Evidence Types
14. Provider Mapping
15. Relationship to Maturity Capabilities *(needed for roadmap stage)*
16. False Positive Guards *(required)*
17. Validation Questions *(required)*
18. Detection Heuristics
19. Operational Indicators
20. Risk Notes *(needed for synthesis/roadmap)*
21. Remediation / Tactic Notes *(needed for roadmap; name tactics only when the playbook exists)*
22. Prohibited Inference Rules *(required on anti-pattern)*
23. Scoring Guidance Notes *(required for forensic audit)*
24. Canonical Source Foundations

## Start from

- Front-matter schema: `lz_kb_document_front_matter.schema.json`
- Pair envelope schema: `lz_kb_pair_authoring.schema.json`
- Filled PAIR-A1 samples: `samples/PAIR-A1.capability.md`, `samples/PAIR-A1.antipattern.md`
- Blank envelope: `samples/PAIR-XX.blank.json`
