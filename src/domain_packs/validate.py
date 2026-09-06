"""Validate an assembled AssessmentDomainPack. Fail closed on catalogue defects."""

from __future__ import annotations

from typing import Any, Iterable

from .types import AssessmentDomainPack

VALID_PROVIDER_IDS = {"azure", "aws", "gcp"}
VALID_KINDS = {"mapped", "native", "not_applicable"}
VALID_APPLICABILITY = {"applicable", "not_applicable", "out_of_scope"}
VALID_EVIDENCE_CLASSES = {"platform", "document", "workshop"}


class PackValidationError(ValueError):
    pass


def _require(condition: bool, message: str) -> None:
    if not condition:
        raise PackValidationError(message)


def _unique(values: Iterable[str], label: str) -> set[str]:
    items = list(values)
    unique = set(items)
    _require(len(items) == len(unique), f"Duplicate {label}: {sorted(set(x for x in items if items.count(x) > 1))}")
    return unique


def validate_pack(pack: AssessmentDomainPack) -> None:
    _require(bool(pack.get("packId")), "packId is required")
    _require(bool(pack.get("version")), "version is required")
    _require(bool(pack.get("schemaVersion")), "schemaVersion is required")

    design_area_ids = _unique((area["id"] for area in pack["designAreas"]), "design area ids")
    capabilities = [item for item in pack["criteria"] if item.get("stream") == "capability"]
    antipatterns = [item for item in pack["criteria"] if item.get("stream") == "antipattern"]
    _require(capabilities and antipatterns, "Pack must include capability and antipattern streams")
    capability_ids = _unique((item["id"] for item in capabilities), "capability ids")
    antipattern_ids = _unique((item["id"] for item in antipatterns), "anti-pattern ids")
    _require(capability_ids.isdisjoint(antipattern_ids), "Capability and anti-pattern ids must not overlap")

    for item in pack["criteria"]:
        subs = item.get("sub_criteria") or []
        _require(len(subs) == 3, f"{item.get('id')} must have exactly 3 sub-criteria")
        _require(item.get("design_area_id") in design_area_ids, f"{item.get('id')} has unknown design area")
        _require(item.get("title") and item.get("description"), f"{item.get('id')} is missing title or description")

    pair_ids = _unique((pair["pair_id"] for pair in pack["pairs"]), "pair ids")
    _require(len(pair_ids) == len(capability_ids) == len(antipattern_ids), "Pair, capability and anti-pattern counts must match")
    seen_caps: set[str] = set()
    seen_antis: set[str] = set()
    for pair in pack["pairs"]:
        cap_id = pair["capability_id"]
        anti_id = pair["antipattern_id"]
        _require(cap_id in capability_ids, f"Pair {pair['pair_id']} capability {cap_id} is missing")
        _require(anti_id in antipattern_ids, f"Pair {pair['pair_id']} anti-pattern {anti_id} is missing")
        _require(cap_id not in seen_caps, f"Capability {cap_id} is paired more than once")
        _require(anti_id not in seen_antis, f"Anti-pattern {anti_id} is paired more than once")
        seen_caps.add(cap_id)
        seen_antis.add(anti_id)
        cap = next(item for item in capabilities if item["id"] == cap_id)
        anti = next(item for item in antipatterns if item["id"] == anti_id)
        _require(cap.get("pair") == anti_id, f"{cap_id} pair field {cap.get('pair')!r} is not reciprocal with {anti_id}")
        _require(anti.get("pair") == cap_id, f"{anti_id} pair field {anti.get('pair')!r} is not reciprocal with {cap_id}")

    provider_records = pack["providers"].get("records", [])
    record_ids = _unique((record["id"] for record in provider_records), "provider evidence ids")
    _require(record_ids == capability_ids | antipattern_ids, "Provider evidence records must cover every criterion")
    for record in provider_records:
        providers = record.get("providers") or {}
        _require(set(providers) == VALID_PROVIDER_IDS, f"{record['id']} providers must be azure, aws and gcp")
        for provider_id, mapping in providers.items():
            _require(mapping.get("kind") in VALID_KINDS, f"{record['id']}.{provider_id} has invalid kind")
            _require(
                mapping.get("applicability") in VALID_APPLICABILITY,
                f"{record['id']}.{provider_id} has invalid applicability",
            )
            _require(bool(mapping.get("contract")), f"{record['id']}.{provider_id} is missing an evidence contract")

    class_ids = set((pack["evidenceTaxonomy"].get("evidence_classes") or {}).keys())
    _require(class_ids == VALID_EVIDENCE_CLASSES, "Evidence classes must be platform, document and workshop")

    routing = pack["routingPolicy"].get("categories") or {}
    _require(set(routing.keys()) == design_area_ids, "Routing keywords must exist for every design area")

    known_ids = capability_ids | antipattern_ids
    for question in pack.get("questionnaire") or []:
        _require(question.get("evidence_class") == "workshop", f"{question.get('id')} must be workshop evidence")
        for ref in question.get("referenced_criterion_ids") or []:
            _require(ref in known_ids, f"Questionnaire {question.get('id')} references unknown criterion {ref}")

    for tactic in pack.get("tactics") or []:
        for ref in tactic.get("criterion_ids") or []:
            _require(ref in known_ids, f"Tactic {tactic.get('id')} references unknown criterion {ref}")
    for binding in pack.get("tacticBindings") or []:
        for ref in list(binding.get("criterion_ids") or []) + list(binding.get("antipattern_ids") or []):
            _require(ref in known_ids, f"Tactic binding {binding.get('tactic_id')} references unknown id {ref}")
    for topic in pack.get("knowledgeBase", {}).get("topics") or []:
        for ref in topic.get("criterion_ids") or []:
            _require(ref in known_ids, f"Knowledge topic {topic.get('id')} references unknown criterion {ref}")

    invariants = pack.get("invariants") or {}
    _check_invariant(invariants, "designAreaCount", len(pack["designAreas"]))
    _check_invariant(invariants, "capabilityCount", len(capabilities))
    _check_invariant(invariants, "antipatternCount", len(antipatterns))
    _check_invariant(invariants, "questionnaireCount", len(pack.get("questionnaire") or []))
    if "pairsPerDesignArea" in invariants:
        for area in pack["designAreas"]:
            pair_count = len(area.get("capabilities") or [])
            _require(
                pair_count == invariants["pairsPerDesignArea"],
                f"Design area {area['id']} has {pair_count} pairs, expected {invariants['pairsPerDesignArea']}",
            )
    scoring = pack["scoringPolicy"]
    _require(scoring.get("unknown_is_not_zero") is True, "Scoring policy must keep unknown-is-not-zero")
    _require(scoring.get("provider_blending") == "forbidden", "Scoring policy must forbid provider blending")


def _check_invariant(invariants: dict[str, Any], key: str, actual: int) -> None:
    if key in invariants:
        _require(invariants[key] == actual, f"Invariant {key} expected {invariants[key]}, found {actual}")
