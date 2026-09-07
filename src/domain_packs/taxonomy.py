"""Pack-driven taxonomy for the assessment kernel.

Work 2: domain IDs, criterion IDs, routing terms, report keys, and output
contracts come from the selected pack. The kernel must not infer A–F, six
domains, or five criteria from string patterns.
"""

from __future__ import annotations

import re
from functools import cached_property
from typing import Iterable, Literal, Pattern

from .types import AssessmentDomainPack

StreamName = Literal["capability", "antipattern"]
EngineStreamName = Literal["maturity", "antipattern"]

ASSESSMENT_OUTPUT_CONTRACT_IDS = {
    "evidenceGapQuery": "assessment_evidence_gap_query_v1",
    "evidenceSynthesis": "assessment_evidence_synthesis_v1",
    "roadmapSynthesis": "assessment_roadmap_synthesis_v1",
    "findingsSynthesis": "assessment_findings_synthesis_v1",
    "summaryFactCheck": "assessment_summary_fact_check_v1",
    "roadmapFactCheck": "assessment_roadmap_fact_check_v2",
}

# Versioned aliases so existing FinOps runs keep resolving after the rename.
FINOPS_OUTPUT_CONTRACT_ALIASES = {
    "finops_evidence_gap_query_v1": ASSESSMENT_OUTPUT_CONTRACT_IDS["evidenceGapQuery"],
    "finops_evidence_synthesis_v1": ASSESSMENT_OUTPUT_CONTRACT_IDS["evidenceSynthesis"],
    "finops_roadmap_synthesis_v1": ASSESSMENT_OUTPUT_CONTRACT_IDS["roadmapSynthesis"],
    "finops_findings_synthesis_v1": ASSESSMENT_OUTPUT_CONTRACT_IDS["findingsSynthesis"],
    "finops_summary_fact_check_v1": ASSESSMENT_OUTPUT_CONTRACT_IDS["summaryFactCheck"],
    "finops_roadmap_fact_check_v2": ASSESSMENT_OUTPUT_CONTRACT_IDS["roadmapFactCheck"],
}

LEGACY_FINOPS_CRITERION_BRACKET_RX = re.compile(
    r"\[(?:AP-)?[A-F][1-5](?:\s*-\s*(?:[A-F])?[1-5])?\]"
)
LEGACY_FINOPS_DOMAIN_IDS = ("A", "B", "C", "D", "E", "F")


def _engine_stream(stream: StreamName | EngineStreamName) -> EngineStreamName:
    return "maturity" if stream in {"capability", "maturity"} else "antipattern"


class PackTaxonomy:
    """Kernel iteration surface. Construct from a loaded pack, never from literals."""

    def __init__(self, pack: AssessmentDomainPack) -> None:
        self.pack = pack

    @property
    def pack_id(self) -> str:
        return self.pack["packId"]

    @cached_property
    def domain_ids(self) -> list[str]:
        return [area["id"] for area in self.pack["designAreas"]]

    def batch_titles(self) -> dict[str, str]:
        return {area["id"]: area["name"] for area in self.pack["designAreas"]}

    def is_domain_id(self, value: str) -> bool:
        return value in self.domain_ids

    def domain_id_max_length(self) -> int:
        return max(len(domain_id) for domain_id in self.domain_ids)

    def capabilities(self, domain_id: str | None = None) -> list[dict]:
        return [
            item
            for item in self.pack["criteria"]
            if item.get("stream") == "capability" and (domain_id is None or item["design_area_id"] == domain_id)
        ]

    def antipatterns(self, domain_id: str | None = None) -> list[dict]:
        return [
            item
            for item in self.pack["criteria"]
            if item.get("stream") == "antipattern" and (domain_id is None or item["design_area_id"] == domain_id)
        ]

    def criterion_ids(self, stream: StreamName | EngineStreamName, domain_id: str | None = None) -> list[str]:
        items = self.capabilities(domain_id) if _engine_stream(stream) == "maturity" else self.antipatterns(domain_id)
        return [item["id"] for item in items]

    def all_criterion_ids(self) -> list[str]:
        return [item["id"] for item in self.pack["criteria"]]

    def expected_batch_output_ids(self, batch_id: str) -> dict[str, list[str]]:
        if not self.is_domain_id(batch_id):
            raise KeyError(f"Unknown design area {batch_id} in pack {self.pack_id}")
        return {
            "maturity": self.criterion_ids("capability", batch_id),
            "antipattern": self.criterion_ids("antipattern", batch_id),
        }

    def expected_phase1_ids(self, stream: StreamName | EngineStreamName) -> list[str]:
        return self.criterion_ids(stream)

    def expected_knowledge_document_keys(self, batch_id: str | None = None) -> list[str]:
        keys = []
        for item in self.pack["criteria"]:
            if batch_id and item["design_area_id"] != batch_id:
                continue
            stream = "maturity" if item["stream"] == "capability" else "antipattern"
            keys.append(f"{stream}:{item['id']}")
        return keys

    def domain_diagnosis_keys(self) -> list[str]:
        return list(self.domain_ids)

    def domain_diagnosis_schema_properties(self) -> dict[str, dict[str, str]]:
        return {domain_id: {"type": "string"} for domain_id in self.domain_ids}

    def routing_terms(self, domain_id: str) -> list[str]:
        categories = self.pack["routingPolicy"].get("categories") or {}
        entry = categories.get(domain_id) or {}
        return list(entry.get("keywords") or [])

    def persona_ids(self) -> list[str]:
        raw = self.pack["personas"]
        personas = raw.get("personas") if isinstance(raw, dict) and "personas" in raw else raw
        if isinstance(personas, dict):
            return list(personas.keys())
        if isinstance(personas, list):
            return [item["id"] for item in personas if isinstance(item, dict) and "id" in item]
        return []

    def persistence_prefix(self) -> str:
        return self.pack_id.replace("-", "_")

    def output_contract_ids(self) -> dict[str, str]:
        return dict(ASSESSMENT_OUTPUT_CONTRACT_IDS)

    def resolve_output_contract_id(self, contract_id: str) -> str:
        if contract_id in ASSESSMENT_OUTPUT_CONTRACT_IDS.values():
            return contract_id
        return FINOPS_OUTPUT_CONTRACT_ALIASES.get(contract_id, contract_id)

    def criterion_reference_regex(self) -> Pattern[str]:
        ids = _sorted_ids(self.all_criterion_ids())
        return re.compile(rf"\[(?:{'|'.join(ids)})(?:\s*-\s*(?:{'|'.join(ids)}))?\]")

    def criterion_token_regex(self) -> Pattern[str]:
        ids = _sorted_ids(self.all_criterion_ids())
        return re.compile(rf"\b(?:{'|'.join(ids)})\b")

    def unavailable_evidence_check_items(self, batch_id: str) -> list[dict[str, str]]:
        expected = self.expected_batch_output_ids(batch_id)
        items = []
        for stream, criterion_ids in expected.items():
            for criterion_id in criterion_ids:
                items.append(
                    {
                        "stream": stream,
                        "id": criterion_id,
                        "status": "missing",
                    }
                )
        return items


def taxonomy_for(pack: AssessmentDomainPack) -> PackTaxonomy:
    return PackTaxonomy(pack)


def _sorted_ids(ids: Iterable[str]) -> list[str]:
    unique = list(dict.fromkeys(ids))
    unique.sort(key=len, reverse=True)
    return [re.escape(item) for item in unique]
