from __future__ import annotations

import copy
import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from domain_packs.loader import LANDING_ZONE_PACK_DIR, PackRegistry, load_pack
from domain_packs.validate import PackValidationError, validate_pack
from tests.pack_fixtures import write_independent_pack


def _load_extractor():
    spec = importlib.util.spec_from_file_location(
        "extract_lz_catalogue", ROOT / "scripts" / "extract_lz_catalogue.py"
    )
    module = importlib.util.module_from_spec(spec)
    assert spec.loader is not None
    spec.loader.exec_module(module)
    return module


class LandingZonePackTests(unittest.TestCase):
    def test_frozen_catalogue_counts_and_ids(self) -> None:
        pack = load_pack(LANDING_ZONE_PACK_DIR)
        capabilities = [item for item in pack["criteria"] if item["stream"] == "capability"]
        antipatterns = [item for item in pack["criteria"] if item["stream"] == "antipattern"]
        self.assertEqual(pack["packId"], "landing-zone")
        self.assertEqual([area["id"] for area in pack["designAreas"]], list("ABCDEFGH"))
        self.assertEqual(len(capabilities), 40)
        self.assertEqual(len(antipatterns), 40)
        self.assertEqual(len(pack["criteria"]), 80)
        self.assertEqual(len({item["id"] for item in pack["criteria"]}), 80)
        self.assertEqual(len(pack["pairs"]), 40)
        self.assertEqual(len(pack["questionnaire"]), 48)
        self.assertEqual({item["id"] for item in capabilities}, {f"{area}{n}" for area in "ABCDEFGH" for n in range(1, 6)})
        self.assertEqual({item["id"] for item in antipatterns}, {f"AP-{area}{n}" for area in "ABCDEFGH" for n in range(1, 6)})
        self.assertTrue(all(len(item["sub_criteria"]) == 3 for item in pack["criteria"]))
        self.assertEqual(pack["scoringPolicy"]["maturity_labels"], ["Foundation", "Pilot", "Rollout", "Operate"])
        self.assertEqual(pack["qualityGatePolicy"]["publication_states"], ["GO", "WARN", "BLOCK"])
        self.assertTrue(pack["knowledgeBase"]["must_not_fallback_to_finops_content"])
        self.assertEqual(pack["tactics"], [])
        self.assertEqual(pack["knowledgeBase"]["topics"], [])
        self.assertTrue(pack["prompts"])
        self.assertEqual({area["id"] for area in pack["designAreas"]}, set("ABCDEFGH"))

    def test_pairs_are_reciprocal(self) -> None:
        pack = load_pack(LANDING_ZONE_PACK_DIR)
        by_id = {item["id"]: item for item in pack["criteria"]}
        for pair in pack["pairs"]:
            cap = by_id[pair["capability_id"]]
            anti = by_id[pair["antipattern_id"]]
            self.assertEqual(cap["pair"], anti["id"])
            self.assertEqual(anti["pair"], cap["id"])
            self.assertEqual(pair["design_area_id"], cap["design_area_id"])

    def test_provider_mappings_cover_every_criterion(self) -> None:
        pack = load_pack(LANDING_ZONE_PACK_DIR)
        known = {item["id"] for item in pack["criteria"]}
        records = {record["id"]: record for record in pack["providers"]["records"]}
        self.assertEqual(set(records), known)
        for record in records.values():
            self.assertEqual(set(record["providers"]), {"azure", "aws", "gcp"})
            for mapping in record["providers"].values():
                self.assertIn(mapping["kind"], {"mapped", "native", "not_applicable"})
                self.assertIn(mapping["applicability"], {"applicable", "not_applicable", "out_of_scope"})
                self.assertTrue(mapping["contract"])

    def test_questionnaire_kb_tactics_prompts_and_reports_resolve(self) -> None:
        pack = load_pack(LANDING_ZONE_PACK_DIR)
        known = {item["id"] for item in pack["criteria"]}
        areas = {area["id"] for area in pack["designAreas"]}
        for question in pack["questionnaire"]:
            self.assertTrue(question["referenced_criterion_ids"])
            self.assertTrue(set(question["referenced_criterion_ids"]) <= known)
            self.assertIn(question["design_area_id"], areas)
        for topic in pack["knowledgeBase"]["topics"]:
            self.assertTrue(set(topic.get("criterion_ids") or []) <= known)
        for tactic in pack["tactics"]:
            self.assertTrue(set(tactic.get("criterion_ids") or []) <= known)
        for template in pack["prompts"]:
            self.assertTrue(set(template.get("referenced_criterion_ids") or []) <= known)
            self.assertTrue(set(template.get("referenced_design_area_ids") or []) <= areas)
        self.assertTrue(set(pack["reportVocabulary"].get("referenced_criterion_ids") or []) <= known)
        self.assertEqual(set(pack["reportVocabulary"]["referenced_design_area_ids"]), areas)

    def test_frozen_html_matches_committed_json(self) -> None:
        extractor = _load_extractor()
        self.assertEqual(extractor.catalogue_fidelity_errors(LANDING_ZONE_PACK_DIR), [])

    def test_invalid_pair_fails_closed(self) -> None:
        pack = load_pack(LANDING_ZONE_PACK_DIR)
        pack["pairs"][0]["antipattern_id"] = "AP-H5"
        with self.assertRaises(PackValidationError):
            validate_pack(pack)

    def test_unknown_prompt_and_report_refs_fail_closed(self) -> None:
        pack = load_pack(LANDING_ZONE_PACK_DIR)
        broken = copy.deepcopy(pack)
        broken["prompts"][0]["referenced_criterion_ids"] = ["A9"]
        with self.assertRaises(PackValidationError):
            validate_pack(broken)
        broken_report = copy.deepcopy(pack)
        broken_report["reportVocabulary"]["referenced_criterion_ids"] = ["FINOPS-A1"]
        with self.assertRaises(PackValidationError):
            validate_pack(broken_report)
        broken_kb = copy.deepcopy(pack)
        broken_kb["knowledgeBase"]["topics"] = [{"id": "topic-1", "criterion_ids": ["Z1"]}]
        with self.assertRaises(PackValidationError):
            validate_pack(broken_kb)
        broken_tactic = copy.deepcopy(pack)
        broken_tactic["tactics"] = [{"id": "TAC-ORG-001", "criterion_ids": ["A99"]}]
        with self.assertRaises(PackValidationError):
            validate_pack(broken_tactic)

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
        self.assertEqual(list(lz["personas"]), ["ciso_leadership", "platform_owner", "security_owners", "application_delivery"])


if __name__ == "__main__":
    unittest.main()
