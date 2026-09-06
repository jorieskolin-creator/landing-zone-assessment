from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from domain_packs.loader import LANDING_ZONE_PACK_DIR, PackRegistry, load_pack
from domain_packs.validate import PackValidationError
from tests.pack_fixtures import write_independent_pack


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
