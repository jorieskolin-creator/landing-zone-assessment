"""Helpers to materialize tiny domain packs for kernel tests."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable


def _write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload), encoding="utf-8")


def write_synthetic_pack(
    directory: Path,
    *,
    pack_id: str,
    areas: Iterable[tuple[str, str, int]],
) -> Path:
    """Write a valid pack. areas is (id, name, pair_count). IDs come from the spec, not A–F inference."""
    directory.mkdir(parents=True, exist_ok=True)
    area_list = list(areas)
    capabilities = []
    antipatterns = []
    pairs = []
    provider_records = []
    questions = []
    routing = {}
    provider = {"kind": "mapped", "applicability": "applicable", "contract": "Synthetic inventory export."}

    for area_id, area_name, pair_count in area_list:
        cap_ids = []
        anti_ids = []
        for index in range(1, pair_count + 1):
            cap_id = f"{area_id}{index}"
            anti_id = f"AP-{area_id}{index}"
            cap_ids.append(cap_id)
            anti_ids.append(anti_id)
            cap = {
                "id": cap_id,
                "intent_id": f"{area_id.lower()}-intent-{index}",
                "batch": area_id,
                "design_area_id": area_id,
                "design_area": area_name,
                "stream": "capability",
                "pair": anti_id,
                "title": f"{area_name} capability {index}",
                "description": f"Synthetic capability {cap_id}.",
                "sub_criteria": ["Sub 1?", "Sub 2?", "Sub 3?"],
            }
            anti = {
                **cap,
                "id": anti_id,
                "stream": "antipattern",
                "pair": cap_id,
                "title": f"{area_name} anti-pattern {index}",
                "description": f"Synthetic anti-pattern {anti_id}.",
            }
            capabilities.append(cap)
            antipatterns.append(anti)
            pairs.append(
                {
                    "pair_id": f"PAIR-{cap_id}",
                    "capability_id": cap_id,
                    "antipattern_id": anti_id,
                    "design_area_id": area_id,
                    "intent_id": cap["intent_id"],
                    "relationship_type": "DIRECT_INVERSE",
                }
            )
            for item in (cap, anti):
                provider_records.append(
                    {
                        "id": item["id"],
                        "intent_id": item["intent_id"],
                        "stream": item["stream"],
                        "design_area_id": area_id,
                        "providers": {"azure": provider, "aws": provider, "gcp": provider},
                    }
                )
        questions.append(
            {
                "id": f"{area_id}-Q1",
                "design_area_id": area_id,
                "prompt": f"Fixture question for {area_name}",
                "referenced_criterion_ids": [cap_ids[0], anti_ids[0]],
                "evidence_class": "workshop",
            }
        )
        routing[area_id] = {"design_area_id": area_id, "keywords": [area_name.lower(), f"{area_id.lower()} keyword"]}

    _write_json(
        directory / "pack.json",
        {
            "packId": pack_id,
            "version": "0.0.1",
            "schemaVersion": "assessment_domain_pack_v1",
            "files": {
                "taxonomy": "taxonomy.json",
                "criteria": "criteria.json",
                "antipatterns": "antipatterns.json",
                "pairs": "pair-registry.json",
                "providers": "provider-evidence.json",
                "evidenceTaxonomy": "evidence-taxonomy.json",
                "routingPolicy": "routing-keywords.json",
                "validationRules": "validation-rules.json",
                "personas": "personas.json",
                "knowledgeBase": "knowledge-base-manifest.json",
                "tactics": "tactics.json",
                "tacticBindings": "tactic-bindings.json",
                "scoringPolicy": "scoring-policy.json",
                "qualityGatePolicy": "quality-gate-policy.json",
                "reportVocabulary": "report-vocabulary.json",
                "questionnaire": "questionnaire-mapping.json",
                "prompts": "prompts.json",
            },
            "invariants": {
                "designAreaCount": len(area_list),
                "capabilityCount": len(capabilities),
                "antipatternCount": len(antipatterns),
                "questionnaireCount": len(questions),
            },
        },
    )
    _write_json(
        directory / "taxonomy.json",
        {
            "design_areas": [
                {
                    "id": area_id,
                    "name": area_name,
                    "slug": area_name.lower().replace(" ", "-"),
                    "capabilities": [item["id"] for item in capabilities if item["design_area_id"] == area_id],
                    "antipatterns": [item["id"] for item in antipatterns if item["design_area_id"] == area_id],
                    "workshop_themes": [f"Theme for {area_name}"],
                }
                for area_id, area_name, _ in area_list
            ]
        },
    )
    _write_json(directory / "criteria.json", {"criteria": capabilities})
    _write_json(directory / "antipatterns.json", {"criteria": antipatterns})
    _write_json(directory / "pair-registry.json", {"pairs": pairs})
    _write_json(directory / "provider-evidence.json", {"records": provider_records})
    _write_json(
        directory / "evidence-taxonomy.json",
        {"evidence_classes": {"platform": {"id": "platform"}, "document": {"id": "document"}, "workshop": {"id": "workshop"}}},
    )
    _write_json(directory / "routing-keywords.json", {"categories": routing})
    _write_json(directory / "validation-rules.json", {"phase1": {}})
    _write_json(directory / "personas.json", {"personas": {"owner": {"id": "owner", "title": "Owner"}}})
    _write_json(directory / "knowledge-base-manifest.json", {"topics": [], "must_not_fallback_to_finops_content": True})
    _write_json(directory / "tactics.json", {"tactics": []})
    _write_json(directory / "tactic-bindings.json", {"bindings": []})
    _write_json(
        directory / "scoring-policy.json",
        {"unknown_is_not_zero": True, "provider_blending": "forbidden", "maturity_labels": ["Foundation"]},
    )
    _write_json(directory / "quality-gate-policy.json", {"publication_states": ["GO", "WARN", "BLOCK"]})
    _write_json(directory / "report-vocabulary.json", {"product_name": pack_id})
    _write_json(directory / "questionnaire-mapping.json", {"questions": questions})
    _write_json(directory / "prompts.json", {"templates": []})
    return directory


def write_independent_pack(directory: Path, pack_id: str = "fixture-alpha") -> Path:
    return write_synthetic_pack(directory, pack_id=pack_id, areas=[("Z", "Fixture area", 1)])


def write_finops_shape_pack(directory: Path) -> Path:
    """A–F × 5 lives in the FinOps pack, not in the kernel."""
    return write_synthetic_pack(
        directory,
        pack_id="finops",
        areas=[
            ("A", "Cost Visibility & Allocation", 5),
            ("B", "Rate & Usage Optimization", 5),
            ("C", "Governance & Policy", 5),
            ("D", "Architecture & Engineering", 5),
            ("E", "Culture & Organization", 5),
            ("F", "GenAI & AI Cost Management", 5),
        ],
    )
