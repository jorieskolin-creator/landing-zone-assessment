#!/usr/bin/env python3
"""Load and validate an assessment domain pack."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from domain_packs.loader import LANDING_ZONE_PACK_DIR, load_pack  # noqa: E402
from domain_packs.validate import PackValidationError  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "pack_dir",
        nargs="?",
        default=str(LANDING_ZONE_PACK_DIR),
        help="Path to a domain-pack directory containing pack.json",
    )
    args = parser.parse_args()
    try:
        pack = load_pack(args.pack_dir)
    except PackValidationError as exc:
        print(f"INVALID: {exc}", file=sys.stderr)
        return 1
    capabilities = [item for item in pack["criteria"] if item["stream"] == "capability"]
    antipatterns = [item for item in pack["criteria"] if item["stream"] == "antipattern"]
    summary = {
        "packId": pack["packId"],
        "version": pack["version"],
        "designAreas": [area["id"] for area in pack["designAreas"]],
        "capabilityCount": len(capabilities),
        "antipatternCount": len(antipatterns),
        "pairCount": len(pack["pairs"]),
        "questionnaireCount": len(pack["questionnaire"]),
        "status": "valid",
    }
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
