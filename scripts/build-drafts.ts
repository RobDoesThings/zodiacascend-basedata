// npm run drafts
// Expands the review drafts in drafts/src/*.yaml into drafts/json/*.json and drafts/REVIEW.md.
// Computes the bell-curve figures (sd, min, max, percentiles) and checks the drafts for
// consistency. Drafts are not canon data until they are moved into /data.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR, ROOT, readYaml } from "./lib/data.ts";

const SRC = join(ROOT, "drafts", "src");
const OUT = join(ROOT, "drafts", "json");
const errors: string[] = [];

const chars = readYaml<any>(join(SRC, "characteristics.yaml")).data;
const zodiac = readYaml<any>(join(SRC, "zodiac.yaml")).data;
const wanderers = readYaml<any>(join(SRC, "wanderers.yaml")).data;
const vessels = readYaml<any>(join(SRC, "vessel-spirits.yaml")).data;
const cards = readYaml<any>(join(SRC, "keeper-cards.yaml")).data;
const rules = readYaml<any>(join(DATA_DIR, "rules.yaml")).data;
const families = readYaml<any>(join(DATA_DIR, "families.yaml")).data.families.map((f: any) => f.id);

const ELEMENTS = ["wood", "fire", "earth", "metal", "water"];
const CONFLUENCES = chars.confluences.map((c: any) => c.id);
const CELESTIAL = chars.celestial_types.map((c: any) => c.id);
const TEMPERAMENTS = chars.temperaments.map((t: any) => t.id);
const CATEGORIES = cards.categories.map((c: any) => c.id);

// z-scores for the one-sided percentiles we publish.
const Z95 = 1.6449;
const Z99 = 2.3263;

/** Rounds to 3 significant figures, which is plenty for game use. */
const sig = (n: number) => Number(n.toPrecision(3));

function curve(mean: number, cv: number) {
  const sd = mean * cv;
  const k = chars.physical_model.clamp_sd;
  return {
    distribution: chars.physical_model.distribution,
    mean: sig(mean),
    sd: sig(sd),
    min: sig(Math.max(mean - k * sd, mean * 0.05)),
    p95: sig(mean + Z95 * sd),
    p99: sig(mean + Z99 * sd),
    upper: sig(mean + k * sd),
  };
}

function physical(e: any) {
  const cv = e.cv ?? chars.physical_model.default_cv;
  return {
    size: e.size,
    measure: e.measure,
    weight_kg: curve(e.weight_kg, cv),
    [`${e.measure}_cm`]: curve(e.size_cm, cv * 0.5),
  };
}

function checkWeights(obj: Record<string, number>, where: string, allowed?: string[]) {
  const total = Object.values(obj).reduce((a, b) => a + b, 0);
  if (total !== 100) errors.push(`${where}: weights sum to ${total}, expected 100`);
  if (allowed) for (const k of Object.keys(obj)) if (!allowed.includes(k)) errors.push(`${where}: unknown value "${k}"`);
}

function weighted(obj: Record<string, number>) {
  return Object.entries(obj).map(([id, weight]) => ({ id, weight }));
}

function tameLabel(dc: number) {
  return chars.tame_scale.find((t: any) => dc <= t.max_dc).label;
}

const ids = new Set<string>();
function claim(id: string, where: string) {
  if (ids.has(id)) errors.push(`${where}: duplicate id "${id}"`);
  ids.add(id);
}

const STAGE_KEYS = ["kit", "adept", "sovereign"];

// ---------- Zodiac bestiary ----------
const zodiacOut = zodiac.lines.flatMap((line: any) => {
  checkWeights(line.temperaments, `zodiac ${line.id} temperaments`, TEMPERAMENTS);
  checkWeights(line.markings, `zodiac ${line.id} markings`);
  return line.stages.map((s: any, i: number) => {
    claim(s.id, `zodiac ${line.id}`);
    const stageKey = STAGE_KEYS[i];
    const bondDc = rules.bond_check.dc[stageKey];
    const storyOnly = rules.bond_check.story_only.includes(stageKey);
    const commandDc = chars.command_check.base_dc[stageKey] + line.command_dc_mod;
    return {
      id: s.id,
      name: s.name,
      line: line.id,
      kind: "zodiac",
      stage: i + 1,
      stage_name: rules.stages.zodiac[i].name,
      ...(s.epithet ? { epithet: s.epithet } : {}),
      playable: true,
      habitat: s.habitat,
      description: s.description,
      physical: physical(s),
      form_weight_multipliers: chars.form_weight_multipliers,
      characteristics: {
        temperaments: weighted(line.temperaments),
        markings: weighted(line.markings),
        quirks: line.quirks,
        moonmarked_chance: chars.moonmarked.chance,
      },
      taming: {
        bond_dc: bondDc,
        story_only: storyOnly,
        difficulty: storyOnly ? "Story only" : tameLabel(bondDc),
        favoured_offerings: line.favoured_offerings,
        dislikes: line.dislikes,
      },
      control: {
        command_dc: commandDc,
        difficulty: tameLabel(commandDc),
        disobeys_when: line.disobeys_when,
      },
      lore: s.lore.trim(),
      folklore_sources: line.folklore_sources,
    };
  });
});

// ---------- Wanderers ----------
const wandererOut = wanderers.lines.flatMap((line: any) => {
  checkWeights(line.temperaments, `wanderer ${line.id} temperaments`, TEMPERAMENTS);
  checkWeights(line.markings, `wanderer ${line.id} markings`);
  if (!families.includes(line.family)) errors.push(`wanderer ${line.id}: unknown family ${line.family}`);
  for (const el of line.elements) if (!ELEMENTS.includes(el)) errors.push(`wanderer ${line.id}: unknown element ${el}`);
  return line.stages.map((s: any, i: number) => {
    claim(s.id, `wanderer ${line.id}`);
    const commandDc = chars.command_check.base_dc[i === 0 ? "wanderer" : "elder-wanderer"];
    return {
      id: s.id,
      name: s.name,
      line: line.id,
      kind: "wanderer",
      family: line.family,
      elements: line.elements,
      stage: i + 1,
      stage_name: rules.stages.wanderer[i].name,
      playable: true,
      description: s.description,
      physical: physical({ ...s, size: undefined }),
      form_weight_multipliers: chars.form_weight_multipliers,
      characteristics: {
        temperaments: weighted(line.temperaments),
        markings: weighted(line.markings),
        moonmarked_chance: chars.moonmarked.chance,
      },
      taming: {
        bond_dc: rules.bond_check.dc.wanderer,
        story_only: false,
        difficulty: tameLabel(rules.bond_check.dc.wanderer),
        favoured_offerings: line.favoured_offerings,
      },
      control: { command_dc: commandDc, difficulty: tameLabel(commandDc) },
      lore: s.lore.trim(),
      folklore_sources: line.folklore_sources,
    };
  });
});

// ---------- Vessel spirits ----------
const vesselIds = vessels.vessels.map((v: any) => v.id);
const spiritOut = vessels.spirits.map((s: any) => {
  claim(s.id, "vessel spirit");
  const typeCount = [s.element, s.confluence, s.celestial].filter(Boolean).length;
  if (typeCount !== 1) errors.push(`spirit ${s.id}: needs exactly one of element, confluence or celestial`);
  if (s.element && !ELEMENTS.includes(s.element)) errors.push(`spirit ${s.id}: unknown element ${s.element}`);
  if (s.confluence && !CONFLUENCES.includes(s.confluence)) errors.push(`spirit ${s.id}: unknown confluence ${s.confluence}`);
  if (s.celestial && !CELESTIAL.includes(s.celestial)) errors.push(`spirit ${s.id}: unknown celestial type ${s.celestial}`);
  if (!vesselIds.includes(s.vessel)) errors.push(`spirit ${s.id}: unknown vessel ${s.vessel}`);
  if (!TEMPERAMENTS.includes(s.temperament)) errors.push(`spirit ${s.id}: unknown temperament ${s.temperament}`);
  if (s.release.card_text.length > 200) errors.push(`spirit ${s.id}: card_text over 200 characters`);
  const confluence = chars.confluences.find((c: any) => c.id === s.confluence);
  return {
    id: s.id,
    name: s.name,
    kind: "vessel-spirit",
    creature: s.creature,
    type: s.element
      ? { kind: "element", id: s.element, elements: [s.element] }
      : s.confluence
        ? { kind: "confluence", id: s.confluence, elements: confluence.elements }
        : { kind: "celestial", id: s.celestial, elements: [] },
    ...(s.becomes ? { becomes: s.becomes } : {}),
    playable: false,
    single_use: true,
    physical: physical(s),
    temperament: s.temperament,
    capture: {
      dc: s.capture_dc,
      difficulty: tameLabel(s.capture_dc),
      vessel: s.vessel,
      vessel_mode: s.vessel_mode,
      hold_rounds: s.hold_rounds,
    },
    release: { card_text: s.release.card_text, rules_text: s.release.rules_text.trim() },
    lore: s.lore.trim(),
    folklore_sources: s.folklore_sources,
  };
});
for (const v of vessels.vessels) claim(v.id, "vessel");

// ---------- Keeper cards ----------
const cardOut = cards.cards.map((c: any) => {
  claim(c.id, "keeper card");
  if (!CATEGORIES.includes(c.category)) errors.push(`card ${c.id}: unknown category ${c.category}`);
  if (c.card_text.length > 200) errors.push(`card ${c.id}: card_text is ${c.card_text.length} characters (max 200)`);
  if (["snare", "counter"].includes(c.category) && !c.trigger) errors.push(`card ${c.id}: ${c.category} needs a trigger`);
  if (c.category === "omen" && !c.delay_rounds) errors.push(`card ${c.id}: omen needs delay_rounds`);
  return { ...c, canon: c.canon ?? false };
});

if (errors.length) {
  console.error(`${errors.length} draft error(s):`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}

mkdirSync(OUT, { recursive: true });
const write = (name: string, value: unknown) => writeFileSync(join(OUT, name), JSON.stringify(value, null, 2) + "\n");
const meta = { status: "draft", licence: "CC-BY-4.0" };
write("characteristics.json", { ...meta, ...chars });
write("zodiac-bestiary.json", { ...meta, count: zodiacOut.length, species: zodiacOut });
write("wanderers.json", { ...meta, count: wandererOut.length, species: wandererOut });
write("vessel-spirits.json", { ...meta, count: spiritOut.length, spirits: spiritOut, vessels: vessels.vessels });
write("keeper-cards.json", { ...meta, count: cardOut.length, categories: cards.categories, cards: cardOut });

// ---------- Review digest ----------
const md: string[] = [];
const fmtKg = (n: number) => (n >= 1000 ? `${sig(n / 1000)} t` : `${n} kg`);
md.push("# Draft review: bestiary, vessel spirits and Keeper cards", "");
md.push("Generated by `npm run drafts` from `drafts/src/`. Full detail is in `drafts/json/`.", "");
md.push(`**Counts:** ${zodiacOut.length} zodiac species · ${wandererOut.length} Wanderer species · ${spiritOut.length} vessel spirits · ${vessels.vessels.length} vessels · ${cardOut.length} Keeper cards`, "");
md.push("Weights are truncated normal curves: *mean* is the average, *upper* is the ceiling (mean + 3 sd), *p99* is a record specimen.", "");

md.push("## Zodiac species", "");
md.push("| Species | Stage | Avg weight | Upper weight | Size (avg) | Bond DC | Command DC | Top temperament |", "|---|---|---|---|---|---|---|---|");
for (const s of zodiacOut) {
  const len = s.physical[`${s.physical.measure}_cm`];
  const top = s.characteristics.temperaments[0];
  md.push(`| ${s.name}${s.epithet ? ` (${s.epithet})` : ""} | ${s.stage_name} | ${fmtKg(s.physical.weight_kg.mean)} | ${fmtKg(s.physical.weight_kg.upper)} | ${len.mean} cm ${s.physical.measure} | ${s.taming.bond_dc} (${s.taming.difficulty}) | ${s.control.command_dc} (${s.control.difficulty}) | ${top.id} ${top.weight}% |`);
}
md.push("");

md.push("## Wanderers", "");
md.push("| Species | Line | Family | Elements | Avg weight | Upper weight | Command DC |", "|---|---|---|---|---|---|---|");
for (const s of wandererOut) {
  md.push(`| ${s.name} | ${s.line} | ${s.family} | ${s.elements.join(", ")} | ${fmtKg(s.physical.weight_kg.mean)} | ${fmtKg(s.physical.weight_kg.upper)} | ${s.control.command_dc} |`);
}
md.push("");

md.push("## Vessel spirits (non-playable, single use, caged)", "");
md.push("| Spirit | Creature | Type | Avg weight | Capture DC | Vessel | Holds for | Release effect |", "|---|---|---|---|---|---|---|---|");
for (const s of spiritOut) {
  const type = s.type.kind === "confluence" ? `${s.type.id} (${s.type.elements.join("+")})` : s.type.id;
  md.push(`| **${s.name}** | ${s.creature} | ${type} | ${fmtKg(s.physical.weight_kg.mean)} | ${s.capture.dc} | ${s.capture.vessel}${s.capture.vessel_mode === "token" ? " (token)" : ""} | ${s.capture.hold_rounds} rd | ${s.release.card_text} |`);
}
md.push("");
md.push("### Folklore behind each spirit", "");
for (const s of spiritOut) md.push(`- **${s.name}** — ${s.folklore_sources.map((f: any) => `${f.tradition} *(${f.region})*`).join(" ")}`);
md.push("");

md.push("## Keeper cards", "");
for (const cat of cards.categories) {
  const inCat = cardOut.filter((c: any) => c.category === cat.id);
  md.push(`### ${cat.name} (${inCat.length})`, "", `*${cat.summary}*`, "");
  md.push("| Card | Resolve | Speed | Trigger | Effect |", "|---|---|---|---|---|");
  for (const c of inCat) md.push(`| **${c.name}**${c.canon ? " ⓒ" : ""} | ${c.resolve} | ${c.speed} | ${c.trigger ?? "—"} | ${c.card_text} |`);
  md.push("");
}
md.push("ⓒ = already canon in the brief.", "");

md.push("## Sample lore", "");
for (const id of ["nezrath", "gyuurok", "usagetsu"]) {
  const s = zodiacOut.find((x: any) => x.id === id);
  md.push(`**${s.name}, ${s.epithet}.** ${s.lore}`, "");
}
writeFileSync(join(ROOT, "drafts", "REVIEW.md"), md.join("\n"));

console.log(`drafts: ${zodiacOut.length} zodiac · ${wandererOut.length} wanderer · ${spiritOut.length} spirits · ${cardOut.length} cards → drafts/json, drafts/REVIEW.md`);
