from __future__ import annotations

import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
UPSTREAM = "github.com/jorieskolin-creator/finops-engine-2026"
ALLOWED = {
    "src/knowledge_base/KERNEL_BASELINE.md",
    "docs/copied-baseline/FINOPS_ENGINE_README.md",
    "Landing_Zone_Assessment_Implementation_Plan.md",
    "scripts/check-independence.mjs",
    "scripts/test-landing-zone-pack.mjs",
    "tests/test_independence.py",
}
SKIP_DIRS = {".git", "node_modules", "dist", "build", ".pytest_cache", "__pycache__"}
TEXT_SUFFIXES = {
    ".ts",
    ".tsx",
    ".js",
    ".mjs",
    ".cjs",
    ".json",
    ".md",
    ".yml",
    ".yaml",
    ".html",
    ".css",
    ".sh",
    ".py",
    ".txt",
    ".example",
    ".toml",
}


class IndependenceTests(unittest.TestCase):
    def test_no_submodule_or_package_link(self) -> None:
        self.assertFalse((ROOT / ".gitmodules").exists())
        package = json.loads((ROOT / "package.json").read_text(encoding="utf-8"))
        deps = {**package.get("dependencies", {}), **package.get("devDependencies", {})}
        for name, spec in deps.items():
            self.assertNotIn("finops-engine", name.lower())
            self.assertNotIn("finops-engine-2026", str(spec))

    def test_upstream_url_is_provenance_only(self) -> None:
        hits: list[str] = []
        for path in ROOT.rglob("*"):
            if any(part in SKIP_DIRS for part in path.parts):
                continue
            if not path.is_file():
                continue
            if path.suffix not in TEXT_SUFFIXES and path.name not in {"Dockerfile", "environment.json"}:
                continue
            rel = path.relative_to(ROOT).as_posix()
            text = path.read_text(encoding="utf-8", errors="ignore")
            if UPSTREAM not in text:
                continue
            if rel in ALLOWED:
                continue
            hits.append(rel)
        self.assertEqual(hits, [], f"upstream URL leaked into {hits}")

    def test_production_knowledge_index_does_not_fetch_finops_playbook(self) -> None:
        source = (ROOT / "src" / "knowledge_base" / "index.ts").read_text(encoding="utf-8")
        self.assertIn("landingZoneKnowledge", source)
        self.assertNotIn("VITE_FINOPS_TACTICS_URL", source)
        self.assertNotIn("FALLBACK_TACTICS", source)
        self.assertNotIn("finops-tactic-playbook-knowledge-base.vercel.app", source)


if __name__ == "__main__":
    unittest.main()
