import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(new URL(".", import.meta.url)));
const UPSTREAM = "github.com/jorieskolin-creator/finops-engine-2026";
const ALLOWED_UPSTREAM_MENTIONS = new Set([
  "src/knowledge_base/KERNEL_BASELINE.md",
  "docs/copied-baseline/FINOPS_ENGINE_README.md",
  "Landing_Zone_Assessment_Implementation_Plan.md",
  "scripts/check-independence.mjs",
  "scripts/test-landing-zone-pack.mjs",
  "tests/test_independence.py",
]);

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".pytest_cache",
  "__pycache__",
]);

const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".mjs", ".cjs", ".json", ".md", ".yml", ".yaml",
  ".html", ".css", ".sh", ".py", ".txt", ".example", ".toml",
]);

async function walk(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(path, files);
    } else {
      files.push(path);
    }
  }
  return files;
}

const files = await walk(ROOT);
const packageJson = JSON.parse(await readFile(join(ROOT, "package.json"), "utf8"));
const allDeps = {
  ...(packageJson.dependencies || {}),
  ...(packageJson.devDependencies || {}),
};

for (const [name, spec] of Object.entries(allDeps)) {
  assert.doesNotMatch(name, /finops-engine/i, `dependency ${name} must not reference FinOps Engine`);
  assert.doesNotMatch(String(spec), /finops-engine-2026/, `dependency ${name} spec must not reference FinOps Engine`);
}

assert.equal(existsSync(join(ROOT, ".gitmodules")), false, "this repository must not use a FinOps Engine git submodule");

const hits = [];
for (const file of files) {
  const rel = relative(ROOT, file).replaceAll("\\", "/");
  const ext = rel.includes(".") ? `.${rel.split(".").pop()}` : "";
  if (!TEXT_EXTENSIONS.has(ext) && !rel.endsWith("Dockerfile") && !rel.endsWith("environment.json")) continue;
  const text = await readFile(file, "utf8");
  if (!text.includes(UPSTREAM) && !/git@github\.com:jorieskolin-creator\/finops-engine-2026/.test(text)) continue;
  if (ALLOWED_UPSTREAM_MENTIONS.has(rel)) continue;
  hits.push(rel);
}

assert.deepEqual(hits, [], `FinOps Engine repository URL leaked into executable or non-provenance files:\n${hits.join("\n")}`);

const knowledgeIndex = await readFile(join(ROOT, "src/knowledge_base/index.ts"), "utf8");
assert.match(knowledgeIndex, /from '\.\/landingZoneKnowledge'/);
assert.doesNotMatch(knowledgeIndex, /VITE_FINOPS_TACTICS_URL/);
assert.doesNotMatch(knowledgeIndex, /FALLBACK_TACTICS/);
assert.doesNotMatch(knowledgeIndex, /finops-tactic-playbook-knowledge-base\.vercel\.app/);

console.log("independence check passed");
