from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from domain_packs.loader import LANDING_ZONE_PACK_DIR, PackRegistry, load_pack
from domain_packs.validate import PackValidationError


def _write_json(path: Path, payload: dict) -> None:
    path.write_text(json.dumps(payload), encoding="utf-8")


def write_independent_pack(directory: Path, pack_id: str = "fixture-alpha") -> Path:
    """Minimal second pack used to prove the registry does not hard-code Landing Zone A–H."""
    directory.mkdir(parents=True, exist_ok=True)
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
            },
            "invariants": {
                "designAreaCount": 1,
                "pairsPerDesignArea": 1,
                "capabilityCount": 1,
                "antipatternCount": 1,
                "questionnaireCount": 1,
            },
        },
    )
    _write_json(
        directory / "taxonomy.json",
        {
            "design_areas": [
                {
                    "id": "Z",
                    "name": "Fixture area",
                    "slug": "fixture-area",
                    "capabilities": ["Z1"],
                    "antipatterns": ["AP-Z1"],
                    "workshop_themes": ["What is the fixture root?"],
                }
            ]
        },
    )
    criterion = {
        "id": "Z1",
        "intent_id": "fixture-root",
        "batch": "Z",
        "design_area_id": "Z",
        "design_area": "Fixture area",
        "stream": "capability",
        "pair": "AP-Z1",
        "title": "Fixture capability",
        "description": "A single fixture capability used only for pack isolation tests.",
        "sub_criteria": ["Sub 1?", "Sub 2?", "Sub 3?"],
    }
    anti = {
        **criterion,
        "id": "AP-Z1",
        "stream": "antipattern",
        "pair": "Z1",
        "title": "Fixture anti-pattern",
        "description": "A single fixture anti-pattern used only for pack isolation tests.",
    }
    _write_json(directory / "criteria.json", {"criteria": [criterion]})
    _write_json(directory / "antipatterns.json", {"criteria": [anti]})
    _write_json(
        directory / "pair-registry.json",
        {
            "pairs": [
                {
                    "pair_id": "PAIR-Z1",
                    "capability_id": "Z1",
                    "antipattern_id": "AP-Z1",
                    "design_area_id": "Z",
                    "intent_id": "fixture-root",
                    "relationship_type": "DIRECT_INVERSE",
                }
            ]
        },
    )
    provider = {
        "kind": "mapped",
        "applicability": "applicable",
        "contract": "Fixture inventory export.",
    }
    _write_json(
        directory / "provider-evidence.json",
        {
            "records": [
                {"id": "Z1", "intent_id": "fixture-root", "stream": "capability", "design_area_id": "Z", "providers": {"azure": provider, "aws": provider, "gcp": provider}},
                {"id": "AP-Z1", "intent_id": "fixture-root", "stream": "antipattern", "design_area_id": "Z", "providers": {"azure": provider, "aws": provider, "gcp": provider}},
            ]
        },
    )
    _write_json(
        directory / "evidence-taxonomy.json",
        {"evidence_classes": {"platform": {"id": "platform"}, "document": {"id": "document"}, "workshop": {"id": "workshop"}}},
    )
    _write_json(directory / "routing-keywords.json", {"categories": {"Z": {"design_area_id": "Z", "keywords": ["fixture"]}}})
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
    _write_json(directory / "report-vocabulary.json", {"product_name": "Fixture"})
    _write_json(
        directory / "questionnaire-mapping.json",
        {
            "questions": [
                {
                    "id": "Z-Q1",
                    "design_area_id": "Z",
                    "prompt": "Where is the fixture root?",
                    "referenced_criterion_ids": ["Z1", "AP-Z1"],
                    "evidence_class": "workshop",
                }
            ]
        },
    )
    return directory


class LandingZonePackTests(unittest.TestCase):
    def test_frozen_catalogue_counts_and_ids(self) -> None:
        pack = load_pack(LANDING_ZONE_PACK_DIR)
        capabilities = [item for item in pack["criteria"] if item["stream"] == "capability"]
        antipatterns = [item for item in pack["criteria"] if item["stream"] == "antipattern"]
        self.assertEqual(pack["packId"], "landing-zone")
        self.assertEqual([area["id"] for area in pack["designAreas"]], list("ABCDEFGH"))
        self.assertEqual(len(capabilities), 40)
        self.assertEqual(len(antipatterns), 40)
        self.assertEqual(len(pack["pairs"]), 40)
        self.assertEqual(len(pack["questionnaire"]), 48)
        self.assertEqual({item["id"] for item in capabilities}, {f"{area}{n}" for area in "ABCDEFGH" for n in range(1, 6)})
        self.assertEqual({item["id"] for item in antipatterns}, {f"AP-{area}{n}" for area in "ABCDEFGH" for n in range(1, 6)})
        self.assertTrue(all(len(item["sub_criteria"]) == 3 for item in pack["criteria"]))
        self.assertEqual(pack["scoringPolicy"]["maturity_labels"], ["Foundation", "Pilot", "Rollout", "Operate"])
        self.assertTrue(pack["knowledgeBase"]["must_not_fallback_to_finops_content"])
        self.assertEqual(pack["tactics"], [])

    def test_pairs_are_reciprocal(self) -> None:
        pack = load_pack(LANDING_ZONE_PACK_DIR)
        by_id = {item["id"]: item for item in pack["criteria"]}
        for pair in pack["pairs"]:
            cap = by_id[pair["capability_id"]]
            anti = by_id[pair["antipattern_id"]]
            self.assertEqual(cap["pair"], anti["id"])
            self.assertEqual(anti["pair"], cap["id"])
            self.assertEqual(pair["design_area_id"], cap["design_area_id"])

    def test_questionnaire_refs_resolve(self) -> None:
        pack = load_pack(LANDING_ZONE_PACK_DIR)
        known = {item["id"] for item in pack["criteria"]}
        for question in pack["questionnaire"]:
            self.assertTrue(question["referenced_criterion_ids"])
            self.assertTrue(set(question["referenced_criterion_ids"]) <= known)

    def test_invalid_pair_fails_closed(self) -> None:
        pack = load_pack(LANDING_ZONE_PACK_DIR)
        pack["pairs"][0]["antipattern_id"] = "AP-H5"
        with self.assertRaises(PackValidationError):
            from domain_packs.validate import validate_pack

            validate_pack(pack)

    def test_registry_loads_packs_independently(self) -> None:
        registry = PackRegistry()
        lz = registry.load_and_register(LANDING_ZONE_PACK_DIR)
        with tempfile.TemporaryDirectory() as tmp:
            other_dir = write_independent_pack(Path(tmp) / "fixture-alpha")
            other = registry.load_and_register(other_dir)
        self.assertEqual(registry.pack_ids(), ["fixture-alpha", "landing-zone"])
        self.assertEqual([area["id"] for area in registry.get_design_areas("landing-zone")], list("ABCDEFGH"))
        self.assertEqual([area["id"] for area in registry.get_design_areas("fixture-alpha")], ["Z"])
        self.assertNotEqual({item["id"] for item in lz["criteria"]}, {item["id"] for item in other["criteria"]})
        self.assertNotIn("A1", {item["id"] for item in other["criteria"]})
        self.assertNotIn("Z1", {item["id"] for item in lz["criteria"]})


if __name__ == "__main__":
    unittest.main()
