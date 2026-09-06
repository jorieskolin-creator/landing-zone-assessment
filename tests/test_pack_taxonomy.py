from __future__ import annotations

import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from domain_packs.loader import LANDING_ZONE_PACK_DIR, load_pack
from domain_packs.taxonomy import (
    ASSESSMENT_OUTPUT_CONTRACT_IDS,
    LEGACY_FINOPS_CRITERION_BRACKET_RX,
    LEGACY_FINOPS_DOMAIN_IDS,
    PackTaxonomy,
)
from tests.pack_fixtures import write_finops_shape_pack, write_independent_pack


def legacy_five_wide(batch_id: str) -> list[str]:
    return [f"{batch_id}{index}" for index in range(1, 6)]


class PackTaxonomyTests(unittest.TestCase):
    def test_landing_zone_iteration_comes_from_pack_not_a_to_f(self) -> None:
        taxonomy = PackTaxonomy(load_pack(LANDING_ZONE_PACK_DIR))
        self.assertEqual(taxonomy.domain_ids, list("ABCDEFGH"))
        self.assertNotEqual(tuple(taxonomy.domain_ids), LEGACY_FINOPS_DOMAIN_IDS)
        self.assertTrue(taxonomy.is_domain_id("G"))
        self.assertTrue(taxonomy.is_domain_id("H"))
        self.assertEqual(taxonomy.batch_titles()["H"], "Platform automation & DevOps")
        self.assertEqual(taxonomy.criterion_ids("capability"), [f"{area}{n}" for area in "ABCDEFGH" for n in range(1, 6)])
        self.assertEqual(
            taxonomy.expected_batch_output_ids("H"),
            {
                "maturity": ["H1", "H2", "H3", "H4", "H5"],
                "antipattern": ["AP-H1", "AP-H2", "AP-H3", "AP-H4", "AP-H5"],
            },
        )
        self.assertNotEqual(taxonomy.expected_batch_output_ids("H")["antipattern"], legacy_five_wide("H"))
        self.assertIn("hierarchy", taxonomy.routing_terms("A"))
        self.assertNotIn("finops", " ".join(taxonomy.routing_terms("A")))
        self.assertEqual(
            taxonomy.persona_ids(),
            ["ciso_leadership", "platform_owner", "security_owners", "application_delivery"],
        )
        self.assertNotIn("finops_lead", taxonomy.persona_ids())
        self.assertEqual(taxonomy.persistence_prefix(), "landing_zone")
        self.assertEqual(taxonomy.domain_diagnosis_keys(), list("ABCDEFGH"))
        self.assertEqual(taxonomy.domain_id_max_length(), 1)

    def test_five_wide_generation_is_wrong_when_pack_has_one_pair(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            taxonomy = PackTaxonomy(load_pack(write_independent_pack(Path(tmp) / "fixture-alpha")))
        self.assertEqual(taxonomy.domain_ids, ["Z"])
        self.assertEqual(taxonomy.expected_batch_output_ids("Z")["maturity"], ["Z1"])
        self.assertEqual(taxonomy.expected_batch_output_ids("Z")["antipattern"], ["AP-Z1"])
        self.assertEqual(len(taxonomy.unavailable_evidence_check_items("Z")), 2)
        self.assertNotEqual(taxonomy.expected_batch_output_ids("Z")["maturity"], legacy_five_wide("Z"))
        with self.assertRaises(KeyError):
            taxonomy.expected_batch_output_ids("A")

    def test_finops_shape_stays_a_to_f_because_the_pack_says_so(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            taxonomy = PackTaxonomy(load_pack(write_finops_shape_pack(Path(tmp) / "finops")))
        self.assertEqual(taxonomy.domain_ids, list("ABCDEF"))
        self.assertFalse(taxonomy.is_domain_id("G"))
        self.assertFalse(taxonomy.is_domain_id("H"))
        self.assertEqual(len(taxonomy.criterion_ids("capability")), 30)
        self.assertEqual(taxonomy.batch_titles()["A"], "Cost Visibility & Allocation")
        self.assertEqual(len(taxonomy.unavailable_evidence_check_items("A")), 10)
        self.assertNotIn("H5", taxonomy.criterion_ids("capability"))
        self.assertFalse(taxonomy.criterion_token_regex().search("H5"))
        self.assertTrue(taxonomy.criterion_token_regex().search("F5"))

    def test_criterion_regex_is_built_from_pack_ids(self) -> None:
        lz = PackTaxonomy(load_pack(LANDING_ZONE_PACK_DIR))
        self.assertIsNone(LEGACY_FINOPS_CRITERION_BRACKET_RX.search("[H5]"))
        self.assertIsNone(LEGACY_FINOPS_CRITERION_BRACKET_RX.search("[AP-H1]"))
        self.assertIsNotNone(LEGACY_FINOPS_CRITERION_BRACKET_RX.search("[A1]"))
        self.assertIsNotNone(lz.criterion_reference_regex().search("[H5]"))
        self.assertIsNotNone(lz.criterion_reference_regex().search("[AP-H1]"))
        self.assertIsNotNone(lz.criterion_reference_regex().search("[A1]"))
        self.assertIsNone(lz.criterion_reference_regex().search("[Z1]"))
        self.assertIsNotNone(lz.criterion_token_regex().search("AP-A1"))
        self.assertIsNone(lz.criterion_token_regex().search("AP-A1X"))

    def test_phase1_and_knowledge_keys_use_pack_antipattern_ids(self) -> None:
        taxonomy = PackTaxonomy(load_pack(LANDING_ZONE_PACK_DIR))
        self.assertIn("AP-A1", taxonomy.expected_phase1_ids("antipattern"))
        self.assertNotIn("A1", taxonomy.expected_phase1_ids("antipattern"))
        self.assertIn("maturity:A1", taxonomy.expected_knowledge_document_keys("A"))
        self.assertIn("antipattern:AP-A1", taxonomy.expected_knowledge_document_keys("A"))
        self.assertNotIn("antipattern:A1", taxonomy.expected_knowledge_document_keys("A"))
        self.assertEqual(len(taxonomy.expected_knowledge_document_keys()), 80)

    def test_output_contracts_are_assessment_prefixed_with_finops_aliases(self) -> None:
        taxonomy = PackTaxonomy(load_pack(LANDING_ZONE_PACK_DIR))
        self.assertEqual(taxonomy.output_contract_ids()["evidenceGapQuery"], "assessment_evidence_gap_query_v1")
        self.assertEqual(
            taxonomy.resolve_output_contract_id("finops_evidence_gap_query_v1"),
            ASSESSMENT_OUTPUT_CONTRACT_IDS["evidenceGapQuery"],
        )
        self.assertNotIn("A", taxonomy.domain_diagnosis_schema_properties().keys() ^ set("ABCDEFGH"))


if __name__ == "__main__":
    unittest.main()
