#!/usr/bin/env python3
"""Transcribe the approved Tactical Playbook PDF into pack JSON. Do not invent prose."""

from __future__ import annotations

import json
import re
from pathlib import Path

from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
PDF = ROOT / "Landing_Zone_Assessment_Tactical_Playbook_v1.0.0_APPROVED.pdf"
INDEX = ROOT / "docs/tactics-authoring/catalogue-index.json"
TACTICS_OUT = ROOT / "src/domain-packs/landing-zone/tactics.json"
BINDINGS_OUT = ROOT / "src/domain-packs/landing-zone/tactic-bindings.json"

ID_RE = re.compile(
    r"^(TAC-(?:ORG|IDENTITY|RESOURCE|NETWORK|SECURITY|OPERATIONS|GOVERNANCE|AUTOMATION)-(?:AP-)?[A-H][1-5]-01)$"
)
CRIT_RE = re.compile(r"^(?:AP-)?[A-H][1-5]$")
SRC_RE = re.compile(r"SRC-[A-Z0-9-]+")
FOOTER_RE = re.compile(r"^Landing Zone Assessment Tactical Playbook")
PAGE_RE = re.compile(r"^===== PAGE \d+ =====$|^\d+ / 99$|^LANDING ZONE ASSESSMENT · TACTICAL KB$|^APPROVED - ACTIVE$")

LABELS = [
    "VERSION / STATUS",
    "MAPPING",
    "PRIMARY OWNER",
    "SUPPORTING ROLES",
    "APPROVED SOURCE IDS",
    "SOURCE GROUNDING",
    "Activation trigger",
    "Control purpose and rationale",
    "Implementation activities",
    "Required outputs",
    "Acceptance criteria",
    "Verification",
    "IMPLEMENTATION RISK",
    "RISK CONTROL",
    "DO-NOT-USE BOUNDARY",
    "REASSESSMENT / CLOSURE",
]


def extract_text(path: Path) -> str:
    reader = PdfReader(str(path))
    parts = []
    for i, page in enumerate(reader.pages):
        parts.append(f"\n===== PAGE {i + 1} =====\n{page.extract_text() or ''}")
    return "\n".join(parts)


def normalize_lines(raw: str) -> list[str]:
    merged: list[str] = []
    pending = ""
    for raw_line in raw.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if pending:
            line = f"{pending} {line}".strip()
            pending = ""
        if line in {"SUPPORTING", "APPROVED", "SOURCE", "IMPLEMENTATION", "REASSESSMENT", "DO-NOT-USE"}:
            pending = line
            continue
        if pending:
            line = f"{pending} {line}".strip()
            pending = ""
        # Join split two-word labels that landed as consecutive lines.
        merged.append(line)

    # Second pass: join known split labels.
    out: list[str] = []
    i = 0
    pairs = {
        ("SUPPORTING", "ROLES"): "SUPPORTING ROLES",
        ("APPROVED", "SOURCE IDS"): "APPROVED SOURCE IDS",
        ("SOURCE", "GROUNDING"): "SOURCE GROUNDING",
        ("IMPLEMENTATION", "RISK"): "IMPLEMENTATION RISK",
        ("REASSESSMENT /", "CLOSURE"): "REASSESSMENT / CLOSURE",
        ("DO-NOT-USE", "BOUNDARY"): "DO-NOT-USE BOUNDARY",
    }
    while i < len(merged):
        if i + 1 < len(merged) and (merged[i], merged[i + 1]) in pairs:
            out.append(pairs[(merged[i], merged[i + 1])])
            i += 2
            continue
        if merged[i] == "SUPPORTING ROLES" or merged[i] == "SUPPORTING":
            if merged[i] == "SUPPORTING" and i + 1 < len(merged) and merged[i + 1] == "ROLES":
                out.append("SUPPORTING ROLES")
                i += 2
                continue
        out.append(merged[i])
        i += 1
    return out


def object_starts(lines: list[str]) -> list[int]:
    starts = []
    for i, line in enumerate(lines):
        if not ID_RE.match(line):
            continue
        window = " ".join(lines[i + 1 : i + 6])
        if "CAPABILITY" in window or "ANTI-PATTERN" in window:
            starts.append(i)
    return starts


def appendix_index(lines: list[str]) -> int:
    found = [i for i, line in enumerate(lines) if line.startswith("Approved source identity appendix")]
    if not found:
        raise SystemExit("appendix header not found")
    return found[-1]


def trim_reassessment(value: str) -> str:
    marker = "Completion creates evidence only;"
    idx = value.find(marker)
    if idx == -1:
        return value
    rest = value[idx:]
    end = rest.find(". ")
    if end == -1:
        return value[: idx + len(rest)]
    # Keep the full closure sentence, drop appendix/release prose.
    sentence_end = rest.find("progression.")
    if sentence_end != -1:
        return value[: idx + sentence_end + len("progression.")].strip()
    return value[: idx + end + 1].strip()


def split_bullets(block: str) -> list[str]:
    items = []
    current = []
    for line in block.splitlines():
        line = line.strip()
        if line in {"●", "•", "-"}:
            if current:
                items.append(" ".join(current).strip())
                current = []
            continue
        if line.startswith("● ") or line.startswith("• "):
            if current:
                items.append(" ".join(current).strip())
            current = [line[2:].strip()]
            continue
        current.append(line)
    if current:
        items.append(" ".join(current).strip())
    return [item for item in items if item]


def parse_mapping(value: str) -> tuple[str, str, list[str]]:
    text = " ".join(value.split())
    primary = ""
    pair = ""
    supporting: list[str] = []
    m_primary = re.search(r"Primary:\s*([A-H][1-5]|AP-[A-H][1-5])", text)
    m_pair = re.search(r"Pair:\s*([A-H][1-5]|AP-[A-H][1-5])", text)
    m_sup = re.search(r"Supporting/reuse:\s*(.+)$", text)
    if m_primary:
        primary = m_primary.group(1)
    if m_pair:
        pair = m_pair.group(1)
    if m_sup:
        supporting = [part.strip() for part in m_sup.group(1).split(",") if CRIT_RE.match(part.strip())]
    return primary, pair, supporting


def section_map(body_lines: list[str]) -> dict[str, str]:
    cleaned = [ln for ln in body_lines if not PAGE_RE.match(ln) and not FOOTER_RE.match(ln)]
    sections: dict[str, list[str]] = {label: [] for label in LABELS}
    current = None
    preamble: list[str] = []
    for line in cleaned:
        if line in LABELS:
            current = line
            continue
        if current:
            sections[current].append(line)
        else:
            preamble.append(line)
    return {
        "preamble": "\n".join(preamble),
        **{key: "\n".join(value).strip() for key, value in sections.items()},
    }


def parse_preamble(preamble: str, tactic_id: str) -> dict[str, str]:
    lines = [ln.strip() for ln in preamble.splitlines() if ln.strip()]
    kind = "capability"
    domain = tactic_id.split("-")[1]
    title_parts: list[str] = []
    for line in lines:
        if "ANTI-PATTERN" in line:
            kind = "antipattern"
            continue
        if "CAPABILITY" in line:
            kind = "capability"
            continue
        if line.startswith("DOMAIN"):
            continue
        title_parts.append(line)
    return {"kind": kind, "title": " ".join(title_parts).strip(), "namespace": domain}


def transcribe() -> tuple[dict, dict]:
    index = json.loads(INDEX.read_text())
    by_id = {item["id"]: item for item in index["tactics"]}
    text = extract_text(PDF)
    lines = normalize_lines(text)
    starts = object_starts(lines)
    if len(starts) != 80:
        raise SystemExit(f"expected 80 tactic objects, found {len(starts)}")
    starts.append(appendix_index(lines))
    tactics = []
    bindings = []
    for i in range(80):
        tactic_id = lines[starts[i]]
        body = lines[starts[i] + 1 : starts[i + 1]]
        sections = section_map(body)
        meta = parse_preamble(sections["preamble"], tactic_id)
        index_row = by_id[tactic_id]
        primary, pair, supporting = parse_mapping(sections["MAPPING"])
        if not primary:
            primary = index_row["primary_criterion_id"]
        if not pair:
            pair = index_row["pair_criterion_id"]
        if not supporting:
            supporting = list(index_row["supporting_criterion_ids"])
        title = meta["title"] or index_row["title"]
        source_ids = SRC_RE.findall(sections["APPROVED SOURCE IDS"])
        activities = split_bullets(sections["Implementation activities"])
        outputs = split_bullets(sections["Required outputs"])
        acceptance = split_bullets(sections["Acceptance criteria"])
        verification = split_bullets(sections["Verification"])
        owner_roles = [part.strip() for part in re.split(r",| and ", sections["SUPPORTING ROLES"]) if part.strip()]
        criterion_ids = [primary, pair, *supporting]
        seen = []
        for crit in criterion_ids:
            if crit and crit not in seen:
                seen.append(crit)
        tactic = {
            "id": tactic_id,
            "title": title,
            "canonical_name": title,
            "version": "1.0.0",
            "status": "APPROVED-ACTIVE",
            "kind": index_row["kind"],
            "namespace": index_row["namespace"],
            "design_area_id": index_row["design_area_id"],
            "primary_criterion_id": primary,
            "pair_criterion_id": pair,
            "supporting_criterion_ids": supporting,
            "criterion_ids": seen,
            "primary_owner": " ".join(sections["PRIMARY OWNER"].split()),
            "supporting_roles": owner_roles,
            "approved_source_ids": source_ids,
            "source_grounding": " ".join(sections["SOURCE GROUNDING"].split()),
            "activation_trigger": " ".join(sections["Activation trigger"].split()),
            "purpose": " ".join(sections["Control purpose and rationale"].split()),
            "implementation_activities": activities,
            "required_outputs": outputs,
            "acceptance_criteria": acceptance,
            "verification": verification,
            "implementation_risk": " ".join(sections["IMPLEMENTATION RISK"].split()),
            "risk_control": " ".join(sections["RISK CONTROL"].split()),
            "do_not_use": " ".join(sections["DO-NOT-USE BOUNDARY"].split()),
            "reassessment": trim_reassessment(" ".join(sections["REASSESSMENT / CLOSURE"].split())),
        }
        tactics.append(tactic)

        is_ap = index_row["kind"] == "antipattern"
        bindings.append(
            {
                "tactic_id": tactic_id,
                "relationship": "PRIMARY",
                "criterion_ids": [] if is_ap else [primary],
                "antipattern_ids": [primary] if is_ap else [],
                "mandatory_when_activated": is_ap,
            }
        )
        bindings.append(
            {
                "tactic_id": tactic_id,
                "relationship": "RELATED",
                "criterion_ids": [] if not is_ap else [pair],
                "antipattern_ids": [pair] if not is_ap else [],
                "mandatory_when_activated": False,
            }
        )
        cap_supporting = [cid for cid in supporting if not cid.startswith("AP-")]
        ap_supporting = [cid for cid in supporting if cid.startswith("AP-")]
        if cap_supporting or ap_supporting:
            bindings.append(
                {
                    "tactic_id": tactic_id,
                    "relationship": "SUPPORTING",
                    "criterion_ids": cap_supporting,
                    "antipattern_ids": ap_supporting,
                    "mandatory_when_activated": False,
                }
            )

    missing = [
        tactic["id"]
        for tactic in tactics
        if not tactic["title"]
        or not tactic["activation_trigger"]
        or not tactic["purpose"]
        or len(tactic["implementation_activities"]) < 3
        or len(tactic["acceptance_criteria"]) < 3
        or not tactic["do_not_use"]
        or not tactic["approved_source_ids"]
        or "Approved source identity appendix" in tactic["reassessment"]
        or "===== PAGE" in tactic["title"]
    ]
    if missing:
        raise SystemExit(f"incomplete transcription for: {missing[:8]} ({len(missing)} total)")

    tactics_doc = {
        "version": "1.0.0",
        "schemaVersion": "lz_tactics_v1",
        "status": "approved_active",
        "playbook": "Landing_Zone_Assessment_Tactical_Playbook_v1.0.0_APPROVED.pdf",
        "description": "Landing Zone Tactic Playbook v1.0.0 transcribed from the approved PDF. Tactics are permissioned responses, not evidence.",
        "id_pattern": r"TAC-(ORG|IDENTITY|RESOURCE|NETWORK|SECURITY|OPERATIONS|GOVERNANCE|AUTOMATION)-(AP-)?[A-H][1-5]-01",
        "id_prefixes": [
            "TAC-ORG",
            "TAC-IDENTITY",
            "TAC-RESOURCE",
            "TAC-NETWORK",
            "TAC-SECURITY",
            "TAC-OPERATIONS",
            "TAC-GOVERNANCE",
            "TAC-AUTOMATION",
        ],
        "tactics": tactics,
    }
    bindings_doc = {
        "version": "1.0.0",
        "schemaVersion": "lz_tactic_bindings_v1",
        "status": "approved_active",
        "playbook": "Landing_Zone_Assessment_Tactical_Playbook_v1.0.0_APPROVED.pdf",
        "description": "Tactic bindings transcribed from the approved playbook. PRIMARY is exact; pair is RELATED; remaining mappings are SUPPORTING. No similarity matching.",
        "relationship_values": ["PRIMARY", "SUPPORTING", "RELATED"],
        "activation_rules": [
            "Permit tactics only from verified and sufficiently resolved findings.",
            "Anti-pattern PRIMARY bindings are mandatory when the finding is locked PRESENT or UNRESOLVED.",
            "Capability PRIMARY bindings are candidates when below target; they are not auto-required.",
            "Supporting mappings are exact approved reuse. Title or similarity matching is forbidden.",
            "Suppress tactics for silent or unsupported areas.",
            "Reference frameworks and accelerators never become customer evidence.",
        ],
        "bindings": bindings,
    }
    return tactics_doc, bindings_doc


def main() -> None:
    tactics_doc, bindings_doc = transcribe()
    TACTICS_OUT.write_text(json.dumps(tactics_doc, indent=2) + "\n")
    BINDINGS_OUT.write_text(json.dumps(bindings_doc, indent=2) + "\n")
    print(f"wrote {len(tactics_doc['tactics'])} tactics and {len(bindings_doc['bindings'])} bindings")


if __name__ == "__main__":
    main()
