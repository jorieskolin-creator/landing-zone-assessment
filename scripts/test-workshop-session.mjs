import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ts from "../node_modules/typescript/lib/typescript.js";

const compile = (source) => ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2020,
    importsNotUsedAsValues: ts.ImportsNotUsedAsValues.Remove,
  },
}).outputText;

const source = await readFile(new URL("../src/scope/workshopSession.ts", import.meta.url), "utf8");
const dir = await mkdtemp(join(tmpdir(), "lz-workshop-"));
const modulePath = join(dir, "workshopSession.mjs");
await writeFile(modulePath, compile(source), "utf8");
const {
  LZ_ENGINE_WORKSHOP_SESSION_SCHEMA,
  emptyWorkshopSession,
  inventoryExportsIncludedFromChoice,
  workshopInventoryChoiceFromExports,
  normalizeWorkshopSession,
  workshopSessionHasContent,
} = await import(`file://${modulePath}`);

assert.equal(LZ_ENGINE_WORKSHOP_SESSION_SCHEMA, "lz_engine_workshop_session_v1");
assert.equal(inventoryExportsIncludedFromChoice("yes"), true);
assert.equal(inventoryExportsIncludedFromChoice("partial"), true);
assert.equal(inventoryExportsIncludedFromChoice("no"), false);
assert.equal(workshopInventoryChoiceFromExports(true), "yes");
assert.equal(workshopInventoryChoiceFromExports(false), "no");

assert.equal(normalizeWorkshopSession(emptyWorkshopSession()), undefined);
assert.equal(normalizeWorkshopSession({ schema_version: LZ_ENGINE_WORKSHOP_SESSION_SCHEMA, facilitator: "  " }), undefined);
assert.equal(workshopSessionHasContent(emptyWorkshopSession()), false);

const session = normalizeWorkshopSession({
  facilitator: " Alex Rivera ",
  date: "2026-09-15",
  start_time: "09:00",
  end_time: "12:30",
  reference: "NS-LZ-001",
  participants: "Pat — Platform\nSam — Security",
  estate_name: "must-not-copy",
});
assert.deepEqual(session, {
  schema_version: "lz_engine_workshop_session_v1",
  date: "2026-09-15",
  start_time: "09:00",
  end_time: "12:30",
  facilitator: "Alex Rivera",
  reference: "NS-LZ-001",
  participants: "Pat — Platform\nSam — Security",
});
assert.equal("estate_name" in session, false);
assert.equal("providers" in session, false);
assert.equal("inventory_exports_included" in session, false);
assert.ok(workshopSessionHasContent(session));

const hero = await readFile(new URL("../src/components/IntakeHero.tsx", import.meta.url), "utf8");
assert.match(hero, /Landing Zone Engine · Forensic assessment/);
assert.match(hero, /Interview observation → Evidence lead → Evidence acquisition → Landing Zone Engine verification/);
assert.match(hero, /Live inventory here means file-set exports/);
assert.doesNotMatch(hero, /30 maturity vectors/);

const types = await readFile(new URL("../src/types.ts", import.meta.url), "utf8");
assert.match(types, /lz_engine_workshop_session\?:/);
assert.match(types, /scope\/workshopSession/);

const scope = await readFile(new URL("../src/scope/step0Scope.ts", import.meta.url), "utf8");
assert.doesNotMatch(scope, /facilitator/);
assert.doesNotMatch(scope, /lz_engine_workshop_session/);

console.log("workshop session metadata tests passed");
