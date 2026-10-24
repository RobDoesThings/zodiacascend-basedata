// npm run validate
// 1. Checks every YAML file in /data against its JSON Schema.
// 2. Checks referential integrity and canon invariants.
// 3. Runs the unit tests (including the dice-expression parser tests).
// Checks for data that doesn't exist yet (lines, moves, fields) run once that data is authored.

import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { loadDataset, ROOT, type Dataset } from "./lib/data.ts";
import { createValidator } from "./lib/schemas.ts";
import { relationshipMatrix, walkCycle } from "./lib/rules.ts";

const errors: string[] = [];
const warnings: string[] = [];
const err = (msg: string) => errors.push(msg);

function checkSchemas(ds: Dataset) {
  const validate = createValidator();
  for (const [i, e] of ds.elements.data.elements.entries()) errors.push(...validate("element", e, `${ds.elements.path}#elements[${i}]`));
  for (const [i, f] of ds.families.data.families.entries()) errors.push(...validate("family", f, `${ds.families.path}#families[${i}]`));
  errors.push(...validate("bonds", ds.bonds.data, ds.bonds.path));
  errors.push(...validate("rules", ds.rules.data, ds.rules.path));
  for (const line of ds.lines) errors.push(...validate("line", line.data, line.path));
  for (const file of ds.moves) for (const [i, m] of (file.data.moves ?? []).entries()) errors.push(...validate("move", m, `${file.path}#moves[${i}]`));
  if (ds.fields) for (const [i, f] of ds.fields.data.fields.entries()) errors.push(...validate("field", f, `${ds.fields.path}#fields[${i}]`));
}

function unique(ids: string[], what: string) {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) err(`duplicate ${what} id "${id}"`);
    seen.add(id);
  }
}

function checkElements(ds: Dataset) {
  const elements = ds.elements.data.elements;
  unique(elements.map((e) => e.id), "element");
  unique(elements.map((e) => e.form_prefix), "form prefix");
  const gen = walkCycle(elements, "generates");
  const ctl = walkCycle(elements, "controls");
  if (gen?.join(">") !== "wood>fire>earth>metal>water") err(`generating cycle must be Wood → Fire → Earth → Metal → Water, got ${gen?.join(" → ") ?? "a broken cycle"}`);
  if (ctl?.join(">") !== "wood>earth>water>fire>metal") err(`controlling cycle must be Wood › Earth › Water › Fire › Metal, got ${ctl?.join(" › ") ?? "a broken cycle"}`);
  if (gen && ctl) {
    // Every ordered pair of different elements must have exactly one relationship.
    try {
      relationshipMatrix(elements);
    } catch (e) {
      err((e as Error).message);
    }
  }
}

function checkRules(ds: Dataset) {
  const r = ds.rules.data;
  // The rank table must cover every level exactly once, in order.
  let next = r.levels.min;
  for (const row of r.rank) {
    if (row.min_level !== next) err(`rules.rank: expected a row starting at level ${next}, got ${row.min_level}`);
    if (row.max_level < row.min_level) err(`rules.rank: row ${row.min_level}–${row.max_level} is inverted`);
    next = row.max_level + 1;
  }
  if (next !== r.levels.max + 1) err(`rules.rank: table ends at level ${next - 1}, levels.max is ${r.levels.max}`);
  unique(r.conditions.map((c) => c.id), "condition");
}

function checkBonds(ds: Dataset) {
  const order = ds.rules.data.zodiac_order;
  const b = ds.bonds.data;
  const partition = (groups: { id: string; members: string[] }[], what: string) => {
    unique(groups.map((g) => g.id), what);
    const members = groups.flatMap((g) => g.members);
    const missing = order.filter((a) => !members.includes(a));
    if (members.length !== order.length || missing.length) err(`${what}s must place each of the 12 animals exactly once (missing: ${missing.join(", ") || "none"})`);
  };
  partition(b.trines, "trine");
  partition(b.kindred, "kindred pair");
  partition(b.rivals, "rival pair");
  // Rivals sit opposite each other on the wheel.
  for (const r of b.rivals) {
    const [x, y] = r.members.map((m) => order.indexOf(m));
    if (Math.abs(x - y) !== 6) err(`${r.id}: rivals must be six places apart in the zodiac order`);
  }
  // Trine members sit four places apart.
  for (const t of b.trines) {
    const idx = t.members.map((m) => order.indexOf(m)).sort((p, q) => p - q);
    if (idx[1] - idx[0] !== 4 || idx[2] - idx[1] !== 4) err(`${t.id}: trine members must be four places apart in the zodiac order`);
  }
}

function checkFamilies(ds: Dataset) {
  unique(ds.families.data.families.map((f) => f.id), "family");
}

function runTests() {
  const res = spawnSync(process.execPath, ["--import", "tsx", "--test", ...readdirSync(join(ROOT, "tests")).filter((f) => f.endsWith(".test.ts")).map((f) => join("tests", f))], { cwd: ROOT, encoding: "utf8" });
  if (res.status !== 0) {
    err(`unit tests failed:\n${res.stdout}${res.stderr}`);
    return "failed";
  }
  const pass = /# pass (\d+)/.exec(res.stdout)?.[1] ?? "?";
  return `${pass} passed`;
}

const ds = loadDataset();
checkSchemas(ds);
checkElements(ds);
checkRules(ds);
checkBonds(ds);
checkFamilies(ds);
if (ds.lines.length === 0) warnings.push("no evolution lines authored yet (data/lines/)");
if (ds.moves.length === 0) warnings.push("no moves authored yet (data/moves/)");
if (!ds.fields) warnings.push("no fields authored yet (data/fields.yaml)");
const tests = runTests();

console.log("Zodiac Ascendant data validation");
console.log(`  elements ${ds.elements.data.elements.length} · families ${ds.families.data.families.length} · lines ${ds.lines.length} · move files ${ds.moves.length}`);
console.log(`  unit tests: ${tests}`);
for (const w of warnings) console.log(`  warning: ${w}`);
if (errors.length) {
  console.error(`\n${errors.length} error(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log("\n  ✓ all checks passed");
