"""Load a versioned assessment domain pack from a directory of JSON files."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .types import AssessmentDomainPack
from .validate import PackValidationError, validate_pack

REPO_ROOT = Path(__file__).resolve().parents[1].parent
LANDING_ZONE_PACK_DIR = REPO_ROOT / "src" / "domain-packs" / "landing-zone"


def _read_json(path: Path) -> Any:
    if not path.is_file():
        raise PackValidationError(f"Missing pack file: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def load_pack(directory: str | Path, *, validate: bool = True) -> AssessmentDomainPack:
    pack_dir = Path(directory)
    manifest = _read_json(pack_dir / "pack.json")
    files = manifest["files"]
    tactics_doc = _read_json(pack_dir / files["tactics"])
    bindings_doc = _read_json(pack_dir / files["tacticBindings"])
    questionnaire_doc = _read_json(pack_dir / files["questionnaire"]) if "questionnaire" in files else {"questions": []}
    prompts_doc = _read_json(pack_dir / files["prompts"]) if "prompts" in files else {"templates": []}
    personas_doc = _read_json(pack_dir / files["personas"])
    personas = personas_doc.get("personas", personas_doc) if isinstance(personas_doc, dict) else personas_doc
    pack: AssessmentDomainPack = {
        "packId": manifest["packId"],
        "version": manifest["version"],
        "schemaVersion": manifest["schemaVersion"],
        "designAreas": _read_json(pack_dir / files["taxonomy"])["design_areas"],
        "criteria": _read_json(pack_dir / files["criteria"])["criteria"]
        + _read_json(pack_dir / files["antipatterns"])["criteria"],
        "pairs": _read_json(pack_dir / files["pairs"])["pairs"],
        "providers": _read_json(pack_dir / files["providers"]),
        "evidenceTaxonomy": _read_json(pack_dir / files["evidenceTaxonomy"]),
        "routingPolicy": _read_json(pack_dir / files["routingPolicy"]),
        "validationRules": _read_json(pack_dir / files["validationRules"]),
        "personas": personas,
        "knowledgeBase": _read_json(pack_dir / files["knowledgeBase"]),
        "tactics": tactics_doc.get("tactics", []),
        "tacticBindings": bindings_doc.get("bindings", []),
        "scoringPolicy": _read_json(pack_dir / files["scoringPolicy"]),
        "qualityGatePolicy": _read_json(pack_dir / files["qualityGatePolicy"]),
        "reportVocabulary": _read_json(pack_dir / files["reportVocabulary"]),
        "questionnaire": questionnaire_doc.get("questions", []),
        "prompts": prompts_doc.get("templates", prompts_doc.get("prompts", [])),
        "invariants": manifest.get("invariants", {}),
        "sourceDirectory": str(pack_dir),
    }
    if validate:
        validate_pack(pack)
    return pack


class PackRegistry:
    """In-memory registry so the kernel can load packs by id instead of importing domain constants."""

    def __init__(self) -> None:
        self._packs: dict[str, AssessmentDomainPack] = {}

    def register(self, pack: AssessmentDomainPack) -> AssessmentDomainPack:
        pack_id = pack["packId"]
        if pack_id in self._packs:
            raise PackValidationError(f"Pack already registered: {pack_id}")
        self._packs[pack_id] = pack
        return pack

    def get(self, pack_id: str) -> AssessmentDomainPack:
        try:
            return self._packs[pack_id]
        except KeyError as exc:
            raise PackValidationError(f"Unknown pack: {pack_id}") from exc

    def load_and_register(self, directory: str | Path) -> AssessmentDomainPack:
        return self.register(load_pack(directory))

    def pack_ids(self) -> list[str]:
        return sorted(self._packs)

    def get_design_areas(self, pack_id: str) -> list[dict[str, Any]]:
        return self.get(pack_id)["designAreas"]

    def get_criteria(self, pack_id: str) -> list[dict[str, Any]]:
        return self.get(pack_id)["criteria"]

    def taxonomy(self, pack_id: str) -> "PackTaxonomy":
        from .taxonomy import PackTaxonomy

        return PackTaxonomy(self.get(pack_id))
