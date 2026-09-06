#!/usr/bin/env python3
"""Convert the frozen Landing Zone criteria HTML into domain-pack JSON.

Conversion only. Does not invent criteria, native extras, or evidence object IDs.
"""

from __future__ import annotations

import html as html_lib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CRITERIA_HTML = ROOT / "Landing_Zone_Assessment_Engine_Criteria_Batch_Definitions.html"
QUESTIONNAIRE_HTML = ROOT / "Landing_Zone_Assessment_Interview_Evidence_Discovery_Questionnaire.html"
OUT_DIR = ROOT / "src" / "domain-packs" / "landing-zone"

DESIGN_AREA_SLUGS = {
    "A": "tenant-billing-organization",
    "B": "identity-access",
    "C": "resource-organization",
    "D": "network-topology-connectivity",
    "E": "security-baseline",
    "F": "management-observability",
    "G": "governance-policy",
    "H": "platform-automation-devops",
}

CRITERION_ID_RE = re.compile(
    r'<div class="criterion-id">\s*(.*?)\s*</div>',
    re.S,
)
CRITERION_NAME_RE = re.compile(
    r'<div class="criterion-name">\s*(.*?)\s*</div>',
    re.S,
)
CRITERION_DESC_RE = re.compile(
    r'<div class="criterion-desc">\s*(.*?)\s*</div>',
    re.S,
)
SUBS_RE = re.compile(
    r'<ol class="criterion-subs">(.*?)</ol>',
    re.S,
)
LI_RE = re.compile(r"<li>(.*?)</li>", re.S)
PROV_RE = re.compile(r'<dl class="prov">(.*?)</dl>', re.S)
DT_DD_RE = re.compile(r"<dt>(.*?)</dt>\s*<dd>(.*?)</dd>", re.S)
BATCH_START_RE = re.compile(r'<div class="batch-section" id="batch-([A-H])">')
BATCH_NAME_RE = re.compile(r'<div class="batch-name">(.*?)</div>', re.S)
THEMES_RE = re.compile(r'<div class="themes">.*?<ol>(.*?)</ol>', re.S)
CRITERION_BLOCK_RE = re.compile(
    r'<div class="criterion">\s*'
    r'(<div class="criterion-id">.*?</div>\s*'
    r'<div class="criterion-name">.*?</div>\s*'
    r'<div class="criterion-desc">.*?</div>\s*'
    r'<ol class="criterion-subs">.*?</ol>\s*'
    r'<dl class="prov">.*?</dl>)\s*'
    r'</div>',
    re.S,
)
ID_LINE_RE = re.compile(
    r"^(AP-[A-H][1-5]|[A-H][1-5])\s*·\s*([a-z0-9-]+)\s*·\s*pair\s+(AP-[A-H][1-5]|[A-H][1-5])$"
)
QUESTIONNAIRE_RE = re.compile(r"const domains = (\[.*?\]);\nconst STORAGE_KEY", re.S)


def text(value: str) -> str:
    cleaned = re.sub(r"<[^>]+>", "", value)
    return html_lib.unescape(cleaned).replace("\xa0", " ").strip()


def parse_criterion(block: str, stream: str, design_area_id: str, design_area_name: str) -> dict:
    id_line = text(CRITERION_ID_RE.search(block).group(1))
    match = ID_LINE_RE.match(id_line)
    if not match:
        raise ValueError(f"Unrecognised criterion id line in {design_area_id}: {id_line!r}")
    criterion_id, intent_id, pair_id = match.groups()
    subs_block = SUBS_RE.search(block)
    sub_criteria = [text(item) for item in LI_RE.findall(subs_block.group(1))]
    if len(sub_criteria) != 3:
        raise ValueError(f"{criterion_id} has {len(sub_criteria)} sub-criteria, expected 3")
    providers = {}
    prov_block = PROV_RE.search(block)
    if not prov_block:
        raise ValueError(f"{criterion_id} is missing provider evidence")
    for provider_name, contract in DT_DD_RE.findall(prov_block.group(1)):
        key = text(provider_name).lower()
        if key == "google cloud":
            key = "gcp"
        if key not in {"azure", "aws", "gcp"}:
            raise ValueError(f"{criterion_id} has unexpected provider {provider_name!r}")
        providers[key] = {
            "kind": "mapped",
            "applicability": "applicable",
            "contract": text(contract),
        }
    if set(providers) != {"azure", "aws", "gcp"}:
        raise ValueError(f"{criterion_id} providers={sorted(providers)}")
    return {
        "id": criterion_id,
        "intent_id": intent_id,
        "batch": design_area_id,
        "design_area_id": design_area_id,
        "design_area": design_area_name,
        "stream": stream,
        "pair": pair_id,
        "title": text(CRITERION_NAME_RE.search(block).group(1)),
        "description": text(CRITERION_DESC_RE.search(block).group(1)),
        "sub_criteria": sub_criteria,
        "providers": providers,
    }


def split_criteria_blocks(column_html: str) -> list[str]:
    return [block.strip() for block in CRITERION_BLOCK_RE.findall(column_html) if block.strip()]


def extract_batches(html: str) -> list[dict]:
    starts = list(BATCH_START_RE.finditer(html))
    if [match.group(1) for match in starts] != list("ABCDEFGH"):
        raise ValueError(f"Unexpected batch order: {[match.group(1) for match in starts]}")
    table_wrap = html.find('<div class="table-wrap">', starts[-1].start())
    batches = []
    for index, match in enumerate(starts):
        end = starts[index + 1].start() if index + 1 < len(starts) else (table_wrap if table_wrap != -1 else len(html))
        body = html[match.end() : end]
        area_id = match.group(1)
        name = text(BATCH_NAME_RE.search(body).group(1))
        themes = [text(item) for item in LI_RE.findall(THEMES_RE.search(body).group(1))]
        blocks = split_criteria_blocks(body)
        if len(blocks) != 10:
            raise ValueError(f"Batch {area_id} has {len(blocks)} criterion blocks, expected 10")
        capabilities = [
            parse_criterion(block, "capability", area_id, name) for block in blocks[:5]
        ]
        antipatterns = [
            parse_criterion(block, "antipattern", area_id, name) for block in blocks[5:]
        ]
        batches.append(
            {
                "id": area_id,
                "name": name,
                "slug": DESIGN_AREA_SLUGS[area_id],
                "workshop_themes": themes,
                "capabilities": capabilities,
                "antipatterns": antipatterns,
            }
        )
    return batches


def extract_questionnaire(html: str) -> list[dict]:
    match = QUESTIONNAIRE_RE.search(html)
    if not match:
        raise ValueError("Questionnaire domain payload was not found")
    domains = json.loads(match.group(1))
    records = []
    for domain in domains:
        for question in domain["questions"]:
            refs = [part.strip() for part in question["refs"].replace("·", ",").split(",") if part.strip()]
            records.append(
                {
                    "id": question["id"],
                    "design_area_id": domain["id"],
                    "design_area": domain["name"],
                    "prompt": question["q"],
                    "hint": question["hint"],
                    "sample": question["sample"],
                    "referenced_criterion_ids": refs,
                    "evidence_class": "workshop",
                }
            )
    return records


KEYWORD_OVERLAY = {
    "A": ["hierarchy", "tenant", "management group", "organization", "billing account", "payer", "management account"],
    "B": ["pim", "identity center", "federation", "privileged access", "break-glass", "workload identity"],
    "C": ["management group", "ou", "folder", "vending", "naming standard", "subscription vending"],
    "D": ["hub", "spoke", "peering", "private dns", "public endpoint", "expressroute", "transit gateway"],
    "E": ["security baseline", "defender", "guardduty", "key vault", "secrets", "cmk"],
    "F": ["cloudtrail", "log sink", "diagnostic settings", "inventory", "platform backup"],
    "G": ["policy assignment", "scp", "org policy", "exemption", "deny policy"],
    "H": ["iac", "terraform", "bicep", "drift", "vending pipeline", "clickops"],
}

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "for", "from", "in", "is", "of", "on", "or",
    "the", "to", "with", "without", "vs",
}


def keyword_tokens(*parts: str) -> set[str]:
    tokens: set[str] = set()
    for part in parts:
        lowered = re.sub(r"[^a-z0-9\s-]", " ", part.lower())
        for raw in lowered.replace("-", " ").split():
            if raw and raw not in STOPWORDS and len(raw) > 2:
                tokens.add(raw)
        slug = part.lower().replace("_", "-")
        if "-" in slug and re.fullmatch(r"[a-z0-9-]+", slug):
            tokens.add(slug.replace("-", " "))
    return tokens


def build_routing_keywords(batches: list[dict]) -> dict:
    categories = {}
    for batch in batches:
        tokens = keyword_tokens(batch["name"], *batch["workshop_themes"])
        for item in batch["capabilities"] + batch["antipatterns"]:
            tokens.update(keyword_tokens(item["title"], item["intent_id"]))
        tokens.update(KEYWORD_OVERLAY[batch["id"]])
        categories[batch["id"]] = {
            "design_area_id": batch["id"],
            "weight": 3,
            "keywords": sorted(tokens),
        }
    return {
        "version": "1.0.0",
        "description": "Landing Zone routing vocabulary derived from the frozen catalogue plus architecture overlay terms. Replaces FinOps DOMAIN_TERMS.",
        "categories": categories,
    }


def strip_providers(criterion: dict) -> dict:
    return {key: value for key, value in criterion.items() if key != "providers"}


def write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def main() -> int:
    batches = extract_batches(CRITERIA_HTML.read_text(encoding="utf-8"))
    questionnaire = extract_questionnaire(QUESTIONNAIRE_HTML.read_text(encoding="utf-8"))
    capabilities = [item for batch in batches for item in batch["capabilities"]]
    antipatterns = [item for batch in batches for item in batch["antipatterns"]]
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    write_json(
        OUT_DIR / "taxonomy.json",
        {
            "version": "1.0.0",
            "description": "Frozen Landing Zone design-area taxonomy. Domain and criterion iteration must come from this registry.",
            "design_areas": [
                {
                    "id": batch["id"],
                    "name": batch["name"],
                    "slug": batch["slug"],
                    "capabilities": [item["id"] for item in batch["capabilities"]],
                    "antipatterns": [item["id"] for item in batch["antipatterns"]],
                    "workshop_themes": batch["workshop_themes"],
                }
                for batch in batches
            ],
            "streams": ["capability", "antipattern"],
            "providers": ["azure", "aws", "gcp"],
        },
    )
    write_json(
        OUT_DIR / "criteria.json",
        {
            "version": "1.0.0",
            "domain": "Landing Zone Assessment",
            "stream": "capability",
            "description": "40 frozen Landing Zone capabilities across design areas A–H. Each criterion has three sub-criteria.",
            "source": "Landing_Zone_Assessment_Engine_Criteria_Batch_Definitions.html",
            "criteria": [strip_providers(item) for item in capabilities],
        },
    )
    write_json(
        OUT_DIR / "antipatterns.json",
        {
            "version": "1.0.0",
            "domain": "Landing Zone Assessment",
            "stream": "antipattern",
            "description": "40 frozen Landing Zone anti-patterns, paired one-to-one with capabilities.",
            "source": "Landing_Zone_Assessment_Engine_Criteria_Batch_Definitions.html",
            "criteria": [strip_providers(item) for item in antipatterns],
        },
    )
    write_json(
        OUT_DIR / "pair-registry.json",
        {
            "schema_version": "lz_maturity_pair_registry_v1",
            "registry_version": "1.0.0",
            "status": "ACTIVE",
            "description": "Explicit capability ↔ anti-pattern pairs. Pairing must never be inferred from matching identifiers.",
            "pairs": [
                {
                    "pair_id": f"PAIR-{cap['id']}",
                    "capability_id": cap["id"],
                    "antipattern_id": anti["id"],
                    "design_area_id": cap["batch"],
                    "intent_id": cap["intent_id"],
                    "relationship_type": "DIRECT_INVERSE",
                    "interaction_strength": 1,
                    "weight": 1,
                    "rationale": f"{cap['title']} is the direct inverse of {anti['title']}.",
                }
                for cap, anti in zip(capabilities, antipatterns)
            ],
        },
    )
    write_json(
        OUT_DIR / "provider-evidence.json",
        {
            "version": "1.0.0",
            "description": "Provider evidence contracts copied from the frozen catalogue. Prose contracts are preserved; object IDs are not invented.",
            "providers": ["azure", "aws", "gcp"],
            "kind_values": ["mapped", "native", "not_applicable"],
            "records": [
                {
                    "id": item["id"],
                    "intent_id": item["intent_id"],
                    "stream": item["stream"],
                    "design_area_id": item["batch"],
                    "providers": item["providers"],
                }
                for item in capabilities + antipatterns
            ],
        },
    )
    write_json(
        OUT_DIR / "questionnaire-mapping.json",
        {
            "version": "1.0.0",
            "description": "48-question interview export mapping. Answers are Class 3 evidence leads, never scores.",
            "source": "Landing_Zone_Assessment_Interview_Evidence_Discovery_Questionnaire.html",
            "evidence_class": "workshop",
            "questions": questionnaire,
        },
    )
    write_json(OUT_DIR / "routing-keywords.json", build_routing_keywords(batches))
    print(
        f"Wrote catalogue JSON for {len(capabilities)} capabilities, "
        f"{len(antipatterns)} anti-patterns, {len(questionnaire)} questions."
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
