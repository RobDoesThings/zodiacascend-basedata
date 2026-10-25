// npm run drafts
// Expands the review drafts in drafts/src/*.yaml into drafts/json/*.json and drafts/REVIEW.md.
// Computes the bell-curve figures (sd, min, max, percentiles) and checks the drafts for
// consistency. Drafts are not canon data until they are moved into /data.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { DATA_DIR, ROOT, readYaml, type Element, type ElementData } from "./lib/data.ts";

const SRC = join(ROOT, "drafts", "src");
const OUT = join(ROOT, "drafts", "json");
const errors: string[] = [];

const chars = readYaml<any>(join(SRC, "characteristics.yaml")).data;
const zodiac = readYaml<any>(join(SRC, "zodiac.yaml")).data;
const zodiacElements = readYaml<any>(join(SRC, "zodiac-elements.yaml")).data;
const wanderers = readYaml<any>(join(SRC, "wanderers.yaml")).data;
const vessels = readYaml<any>(join(SRC, "vessel-spirits.yaml")).data;
const cards = readYaml<any>(join(SRC, "keeper-cards.yaml")).data;
const armour = readYaml<any>(join(SRC, "armour.yaml")).data;
const materials = readYaml<any>(join(SRC, "materials.yaml")).data.materials;
const crafting = readYaml<any>(join(SRC, "crafting.yaml")).data;
const rules = readYaml<any>(join(DATA_DIR, "rules.yaml")).data;
const families = readYaml<any>(join(DATA_DIR, "families.yaml")).data.families.map((f: any) => f.id);
const elementData: ElementData[] = readYaml<any>(join(DATA_DIR, "elements.yaml")).data.elements;

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
// Each animal has five lines, one per element. The native line comes from zodiac.yaml with
// authored weights and habitats; the other four come from zodiac-elements.yaml and take the
// native stage's weight and size, times the element's form multiplier, times the line's build.
const zodiacLines = zodiac.lines.flatMap((animal: any) => {
  const extra = zodiacElements.lines.filter((l: any) => l.animal === animal.id);
  const elements = [animal.native_element, ...extra.map((l: any) => l.element)];
  if (new Set(elements).size !== 5 || !elements.every((e: string) => ELEMENTS.includes(e))) {
    errors.push(`zodiac ${animal.id}: needs exactly one line per element, got ${elements.join(", ")}`);
  }
  const native = { ...animal, element: animal.native_element, native: true };
  return [
    native,
    ...extra.map((l: any) => ({
      ...animal,
      ...l,
      id: animal.id,
      native: false,
      temperaments: l.temperaments ?? animal.temperaments,
      folklore_sources: [...(l.folklore_sources ?? []), ...(animal.folklore_sources ?? [])],
      stages: l.stages.map((st: any, i: number) => {
        const base = animal.stages[i];
        const k = chars.form_weight_multipliers[l.element] * (l.build ?? 1);
        return { ...st, weight_kg: base.weight_kg * k, size_cm: base.size_cm, measure: base.measure, cv: base.cv, habitat: st.habitat ?? l.habitat };
      }),
    })),
  ];
});
for (const e of zodiacElements.lines) {
  if (!zodiac.lines.some((a: any) => a.id === e.animal)) errors.push(`zodiac-elements: unknown animal ${e.animal}`);
  if (e.stages.length !== 3) errors.push(`zodiac-elements ${e.animal}-${e.element}: needs 3 stages`);
}

const zodiacOut = zodiacLines.flatMap((line: any) => {
  const lineId = `${line.id}-${line.element}`;
  checkWeights(line.temperaments, `zodiac ${lineId} temperaments`, TEMPERAMENTS);
  checkWeights(line.markings, `zodiac ${lineId} markings`);
  const stageIds = line.stages.map((x: any) => x.id);
  return line.stages.map((s: any, i: number) => {
    claim(s.id, `zodiac ${lineId}`);
    const stageKey = STAGE_KEYS[i];
    const bondDc = rules.bond_check.dc[stageKey];
    const storyOnly = rules.bond_check.story_only.includes(stageKey);
    const commandDc = chars.command_check.base_dc[stageKey] + line.command_dc_mod;
    return {
      id: s.id,
      name: s.name,
      line: lineId,
      animal: line.id,
      element: line.element,
      native: line.native,
      kind: "zodiac",
      family: line.family,
      stage: i + 1,
      stage_name: rules.stages.zodiac[i].name,
      ...(s.epithet ? { epithet: s.epithet } : {}),
      evolves_from: stageIds[i - 1] ?? null,
      evolves_to: stageIds[i + 1] ?? null,
      playable: true,
      habitat: s.habitat,
      description: s.description,
      physical: physical(s),
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
      ...(line.mythical ? { mythical: true } : {}),
      elements: line.elements,
      evolves_from: line.stages[i - 1]?.id ?? null,
      evolves_to: line.stages[i + 1]?.id ?? null,
      stage: i + 1,
      stage_name: rules.stages.wanderer[i].name,
      playable: true,
      description: s.description,
      physical: physical({ ...s, size: undefined }),
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

// ---------- Armour, materials and crafting ----------
const elementById = new Map(elementData.map((e) => [e.id, e]));

/** The plain elements a material or wearer type stands for (confluences expand to two). */
function componentsOf(type: string | null): Element[] {
  if (!type) return [];
  if (ELEMENTS.includes(type)) return [type as Element];
  const c = chars.confluences.find((x: any) => x.id === type);
  if (!c) throw new Error(`unknown element or confluence ${type}`);
  return c.elements;
}

type PairRelation = "same" | "a_generates_b" | "b_generates_a" | "a_controls_b" | "b_controls_a";
function pairRelation(a: Element, b: Element): PairRelation {
  if (a === b) return "same";
  if (elementById.get(a)!.generates === b) return "a_generates_b";
  if (elementById.get(b)!.generates === a) return "b_generates_a";
  if (elementById.get(a)!.controls === b) return "a_controls_b";
  return "b_controls_a";
}

/** Resolves one relationship per component; disagreeing components cancel to null (neutral). */
function agree<T>(results: T[]): T | null {
  return results.every((r) => r === results[0]) ? results[0] : null;
}

const WEARER_EFFECT: Record<PairRelation, string> = {
  same: "same_element",
  a_generates_b: "material_generates_wearer",
  b_generates_a: "wearer_generates_material",
  a_controls_b: "material_controls_wearer",
  b_controls_a: "wearer_controls_material",
};

const HELPFUL = new Set(["same_element", "material_generates_wearer", "wearer_generates_material"]);

/** Plain elements give one effect. A confluence gives both components' effects when they are all
 *  helpful or all harmful; a helpful effect against a harmful one cancels to neutral. */
function wearerEffect(materialType: string, wearer: Element): string | null {
  const keys = [...new Set(componentsOf(materialType).map((m) => WEARER_EFFECT[pairRelation(m, wearer)]))];
  if (!agree(keys.map((k) => HELPFUL.has(k)))) return null;
  return keys.map((k) => armour.element_compatibility.wearer_vs_material[k].name).join(" + ");
}

/** Any component that resists makes the material resist, unless another component is vulnerable. */
function techniqueEffect(materialType: string, attacker: Element): string | null {
  const res = new Set(
    componentsOf(materialType).map((m) => {
      const r = pairRelation(m, attacker);
      return r === "a_controls_b" ? "resists" : r === "b_controls_a" ? "vulnerable" : "neutral";
    }),
  );
  if (res.has("resists") && res.has("vulnerable")) return null;
  return res.has("resists") ? "resists" : res.has("vulnerable") ? "vulnerable" : null;
}

const MATERIAL_TYPES = [...ELEMENTS, ...CONFLUENCES];
const wearerMatrix = Object.fromEntries(
  MATERIAL_TYPES.map((m) => [m, Object.fromEntries(ELEMENTS.map((w) => [w, wearerEffect(m, w as Element) ?? "Neutral"]))]),
);
const techniqueMatrix = Object.fromEntries(
  MATERIAL_TYPES.map((m) => {
    const resists = ELEMENTS.filter((a) => techniqueEffect(m, a as Element) === "resists");
    const vulnerable = ELEMENTS.filter((a) => techniqueEffect(m, a as Element) === "vulnerable");
    return [m, { resists, vulnerable }];
  }),
);

// Armour types x body plans.
const BODY_PLANS = armour.body_plans.map((b: any) => b.id);
const WEIGHT_ORDER = ["none", "light", "medium", "heavy"];
const SIZE_ORDER = ["tiny", "small", "medium", "large", "huge"];
for (const t of armour.armour_types) {
  claim(t.id, "armour type");
  for (const bp of BODY_PLANS) if (!(bp in t.fit)) errors.push(`armour type ${t.id}: no fit given for body plan ${bp}`);
  for (const [bp, fit] of Object.entries(t.fit)) {
    const plan = armour.body_plans.find((b: any) => b.id === bp);
    if (!plan) errors.push(`armour type ${t.id}: unknown body plan ${bp}`);
    else if (fit !== "no" && !plan.slots.includes(t.slot)) errors.push(`armour type ${t.id}: fits ${bp} but ${bp} has no ${t.slot} slot`);
  }
}
for (const [fam, bp] of Object.entries(armour.family_body_plans)) {
  if (!families.includes(fam)) errors.push(`family_body_plans: unknown family ${fam}`);
  if (!BODY_PLANS.includes(bp)) errors.push(`family_body_plans: unknown body plan ${bp}`);
}

function sizeFromWeight(kg: number): string {
  return armour.beast_armour.sizes_by_weight_kg.find((s: any) => kg <= s.max).size;
}

/** What a species can wear: body plan, size, slots and the heaviest class allowed at its stage and size. */
function armourProfile(species: any) {
  const plan = armour.body_plans.find(
    (b: any) => b.id === (armour.line_body_plan_overrides[species.animal ?? species.line] ?? armour.family_body_plans[species.family]),
  );
  const size = sizeFromWeight(species.physical.weight_kg.mean);
  const allowedClasses = armour.beast_armour.weight_classes
    .filter(
      (w: any) =>
        species.stage >= w.min_stage &&
        SIZE_ORDER.indexOf(size) >= SIZE_ORDER.indexOf(w.min_size) &&
        WEIGHT_ORDER.indexOf(w.id) <= WEIGHT_ORDER.indexOf(plan.max_weight),
    )
    .map((w: any) => w.id);
  const types = armour.armour_types
    .filter((t: any) => t.fit[plan.id] !== "no" && (t.weight === "none" || allowedClasses.includes(t.weight)))
    .map((t: any) => ({ type: t.id, fit: t.fit[plan.id] }));
  return { body_plan: plan.id, size, slots: plan.slots, max_weight: allowedClasses.at(-1) ?? "none", armour_types: types };
}

// Materials.
const materialById = new Map<string, any>();
const knownSpecies = new Set([...zodiacOut, ...wandererOut, ...spiritOut].map((s: any) => s.id));
for (const m of materials) {
  claim(m.id, "material");
  materialById.set(m.id, m);
  if (m.element !== null && !MATERIAL_TYPES.includes(m.element)) errors.push(`material ${m.id}: unknown element ${m.element}`);
  if (m.source.from && !knownSpecies.has(m.source.from)) errors.push(`material ${m.id}: source species ${m.source.from} not found`);
  if (m.tier === 4 && m.source.method !== "gifted") errors.push(`material ${m.id}: legendary materials must be gifted`);
  if (m.tier === 4 && m.value !== null) errors.push(`material ${m.id}: legendary materials have no price`);
}
const materialOut = materials.map((m: any) => ({
  ...m,
  gather_dc: m.tier === 4 ? null : crafting.tier_dc_floor[m.tier],
  resists: m.element ? techniqueMatrix[m.element].resists : [],
  vulnerable_to: m.element ? techniqueMatrix[m.element].vulnerable : [],
}));

// Recipes.
const DISCIPLINES = crafting.disciplines.map((d: any) => d.id);
const recipeOut = crafting.recipes.map((r: any) => {
  claim(r.id, "recipe");
  if (!DISCIPLINES.includes(r.discipline)) errors.push(`recipe ${r.id}: unknown discipline ${r.discipline}`);
  const type = r.armour_type ? armour.armour_types.find((t: any) => t.id === r.armour_type) : null;
  if (r.armour_type && !type) errors.push(`recipe ${r.id}: unknown armour type ${r.armour_type}`);
  if (r.makes_vessel && !vessels.vessels.some((v: any) => v.id === r.makes_vessel)) errors.push(`recipe ${r.id}: unknown vessel ${r.makes_vessel}`);
  const mats = r.materials.map((x: any) => materialById.get(x.material));
  r.materials.forEach((x: any, i: number) => !mats[i] && errors.push(`recipe ${r.id}: unknown material ${x.material}`));
  if (mats.some((m: any) => !m)) return r;

  // Element synergy between every distinct pair of typed materials.
  const typed: string[] = [...new Set<string>(mats.filter((m: any) => m.element).map((m: any) => m.element as string))];
  const synergy: { pair: string[]; dc_change: number }[] = [];
  for (let i = 0; i < typed.length; i++) {
    for (let j = i + 1; j < typed.length; j++) {
      const rels = componentsOf(typed[i]).flatMap((a) => componentsOf(typed[j]).map((b) => pairRelation(a, b)));
      const change =
        (rels.some((x) => x.includes("generates")) ? crafting.element_synergy.one_generates_the_other.dc_change : 0) +
        (rels.some((x) => x.includes("controls")) ? crafting.element_synergy.one_controls_the_other.dc_change : 0);
      if (change) synergy.push({ pair: [typed[i], typed[j]], dc_change: change });
    }
  }
  const floor = crafting.tier_dc_floor[Math.max(...mats.map((m: any) => m.tier))];
  const finalDc = Math.max(floor, r.dc + synergy.reduce((s, x) => s + x.dc_change, 0));
  const weight = r.weight ?? type?.weight ?? null;
  const wc = armour.beast_armour.weight_classes.find((w: any) => w.id === weight);
  const primary = mats[0];
  return {
    ...r,
    base_dc: r.dc,
    dc: finalDc,
    synergy,
    weight,
    guard_bonus: r.wearer === "keeper" ? r.guard_bonus : (wc?.guard_bonus ?? 0),
    ...(r.wearer === "beast" && wc ? { speed_change_ft: wc.speed_change_ft } : {}),
    durability: weight ? armour.durability.by_weight[weight] : null,
    armour_element: primary.element,
    resists: primary.element ? techniqueMatrix[primary.element].resists : [],
    vulnerable_to: primary.element ? techniqueMatrix[primary.element].vulnerable : [],
    fits: type ? Object.entries(type.fit).filter(([, f]) => f !== "no").map(([bp, f]) => ({ body_plan: bp, fit: f })) : undefined,
  };
});
for (const [cls, list] of Object.entries(armour.keeper_armour.proficiency) as [string, string[]][]) {
  for (const w of list) if (!armour.keeper_armour.classes.some((c: any) => c.id === w)) errors.push(`keeper proficiency ${cls}: unknown class ${w}`);
}
for (const a of crafting.beast_abilities.by_family) if (!families.includes(a.family)) errors.push(`beast ability: unknown family ${a.family}`);

for (const s of [...zodiacOut, ...wandererOut] as any[]) s.armour = armourProfile(s);

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
write("armour.json", {
  ...meta,
  ...armour,
  compatibility: {
    armour_type_by_body_plan: Object.fromEntries(armour.armour_types.map((t: any) => [t.id, t.fit])),
    material_by_wearer_element: wearerMatrix,
    material_vs_techniques: techniqueMatrix,
  },
});
write("materials.json", { ...meta, count: materialOut.length, materials: materialOut });
write("crafting.json", { ...meta, ...crafting, recipes: recipeOut });

// ---------- Review digest ----------
const md: string[] = [];
const fmtKg = (n: number) => (n >= 1000 ? `${sig(n / 1000)} t` : `${n} kg`);
md.push("# Draft review: bestiary, vessel spirits and Keeper cards", "");
md.push("Generated by `npm run drafts` from `drafts/src/`. Full detail is in `drafts/json/`.", "");
md.push(`**Counts:** ${zodiacOut.length} zodiac species · ${wandererOut.length} Wanderer species · ${spiritOut.length} vessel spirits · ${vessels.vessels.length} vessels · ${cardOut.length} Keeper cards`, "");
md.push("Weights are truncated normal curves: *mean* is the average, *upper* is the ceiling (mean + 3 sd), *p99* is a record specimen.", "");

md.push("## Zodiac species", "");
md.push("| Species | Animal | Element | Stage | Avg weight | Upper weight | Size (avg) | Bond DC | Command DC | Top temperament |", "|---|---|---|---|---|---|---|---|---|---|");
for (const s of zodiacOut) {
  const len = s.physical[`${s.physical.measure}_cm`];
  const top = s.characteristics.temperaments[0];
  md.push(`| ${s.name}${s.epithet ? ` (${s.epithet})` : ""} | ${s.animal} | ${s.element}${s.native ? " (native)" : ""} | ${s.stage_name} | ${fmtKg(s.physical.weight_kg.mean)} | ${fmtKg(s.physical.weight_kg.upper)} | ${len.mean} cm ${s.physical.measure} | ${s.taming.bond_dc} (${s.taming.difficulty}) | ${s.control.command_dc} (${s.control.difficulty}) | ${top.id} ${top.weight}% |`);
}
md.push("");

md.push("## Wanderers", "");
md.push("| Species | Line | Family | Elements | Mythical | Avg weight | Upper weight | Command DC |", "|---|---|---|---|---|---|---|---|");
for (const s of wandererOut) {
  md.push(`| ${s.name} | ${s.line} | ${s.family} | ${s.elements.join(", ")} | ${s.mythical ? "yes" : ""} | ${fmtKg(s.physical.weight_kg.mean)} | ${fmtKg(s.physical.weight_kg.upper)} | ${s.control.command_dc} |`);
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

// Armour
const FIT_MARK: Record<string, string> = { yes: "✔", adapted: "◐", no: "·" };
md.push("## Armour compatibility", "");
md.push("### Armour type × body plan", "", "✔ fits · ◐ adapted (Beastwright fitting: DC +2, double time) · · can't be worn", "");
md.push(`| Armour type | Slot | Weight | ${BODY_PLANS.join(" | ")} |`, `|---|---|---|${BODY_PLANS.map(() => "---").join("|")}|`);
for (const t of armour.armour_types) md.push(`| ${t.name} | ${t.slot} | ${t.weight} | ${BODY_PLANS.map((bp: string) => FIT_MARK[t.fit[bp]]).join(" | ")} |`);
md.push("");
md.push("### Beast weight classes", "", "| Class | Guard | Speed | Min stage | Min size |", "|---|---|---|---|---|");
for (const w of armour.beast_armour.weight_classes) md.push(`| ${w.id} | +${w.guard_bonus} | ${w.speed_change_ft} ft | ${w.min_stage} | ${w.min_size} |`);
md.push("", `Total armour Guard bonus on a beast is capped at +${armour.beast_armour.max_total_guard_bonus}.`, "");
md.push("### Material element × wearer element", "", "Rows: the armour's material. Columns: the wearer's form element. Keepers have no element, so for them only resistances apply.", "");
md.push(`| Material | ${ELEMENTS.join(" | ")} | Resists | Vulnerable to |`, `|---|${ELEMENTS.map(() => "---").join("|")}|---|---|`);
for (const m of MATERIAL_TYPES) {
  md.push(`| **${m}** | ${ELEMENTS.map((w) => wearerMatrix[m][w]).join(" | ")} | ${techniqueMatrix[m].resists.join(", ") || "—"} | ${techniqueMatrix[m].vulnerable.join(", ") || "—"} |`);
}
md.push("");
for (const [k, v] of Object.entries(armour.element_compatibility.wearer_vs_material) as [string, any][]) md.push(`- **${v.name}** — ${v.effect}`);
md.push(`- **Resists** — ${armour.element_compatibility.versus_incoming_techniques.material_controls_attacker.effect}`);
md.push(`- **Vulnerable** — ${armour.element_compatibility.versus_incoming_techniques.attacker_controls_material.effect}`, "");
md.push("### What each zodiac species can wear", "", "| Species | Body plan | Size | Slots | Heaviest |", "|---|---|---|---|---|");
for (const s of zodiacOut) md.push(`| ${s.name} | ${s.armour.body_plan} | ${s.armour.size} | ${s.armour.slots.join(", ")} | ${s.armour.max_weight} |`);
md.push("");
md.push("### Keeper armour", "", "| Armour | Class | Guard | DEX cap | Material element | Resists | Vulnerable | Craft DC | Days |", "|---|---|---|---|---|---|---|---|---|");
for (const r of recipeOut.filter((x: any) => x.wearer === "keeper")) {
  const cls = armour.keeper_armour.classes.find((c: any) => c.id === r.weight);
  md.push(`| ${r.name} | ${r.weight} | +${r.guard_bonus} | ${cls.dex_cap ?? "none"} | ${r.armour_element ?? "—"} | ${r.resists.join(", ") || "—"} | ${r.vulnerable_to.join(", ") || "—"} | ${r.dc} | ${r.days} |`);
}
md.push("");

// Materials
md.push("## Materials", "", "Tier 4 materials are Sovereign gifts only: they can't be bought, sold or crafted.", "");
md.push("| Material | Element | Tier | Source | Roles | Value | Property |", "|---|---|---|---|---|---|---|");
for (const m of materialOut) {
  const src = m.source.from ? `${m.source.method} (${m.source.from})` : m.source.method;
  md.push(`| ${m.name} | ${m.element ?? "—"} | ${m.tier} | ${src} | ${m.roles.join(", ")} | ${m.value ?? "gift"} | ${m.properties} |`);
}
md.push("");

// Crafting
md.push("## Crafting", "", `**Check:** ${crafting.check.roll}.`, "");
for (const o of crafting.check.outcomes) md.push(`- **${o.id}** (${o.when}): ${o.result}`);
md.push("", `**Element synergy:** materials that generate each other −2 DC; materials that control each other +3 DC. The best material's tier sets a minimum DC (${Object.entries(crafting.tier_dc_floor).map(([t, d]) => `T${t} ${d}`).join(", ")}).`, "");
md.push("### Disciplines", "", "| Discipline | Ability | Makes |", "|---|---|---|");
for (const d of crafting.disciplines) md.push(`| ${d.name} | ${d.ability} | ${d.makes} |`);
md.push("", "### Beast crafting abilities", "", "| Family / form | Ability | Effect |", "|---|---|---|");
for (const a of crafting.beast_abilities.by_family) md.push(`| ${a.family} | ${a.name} | ${a.effect} |`);
for (const a of crafting.beast_abilities.by_element_form) md.push(`| ${a.element} form | ${a.name} | ${a.effect} |`);
md.push("", "### Beast armour recipes", "", "| Recipe | Type | Weight | Guard | Element | Materials | DC (base → final) | Days |", "|---|---|---|---|---|---|---|---|");
for (const r of recipeOut.filter((x: any) => x.wearer !== "keeper")) {
  const mats = r.materials.map((x: any) => `${x.qty}× ${x.material}`).join(", ");
  md.push(`| ${r.name} | ${r.armour_type ?? r.makes_vessel ?? "—"} | ${r.weight ?? "—"} | ${r.weight ? `+${r.guard_bonus}` : "—"} | ${r.armour_element ?? "—"} | ${mats} | ${r.base_dc} → ${r.dc} | ${r.days} |`);
}
md.push("");

md.push("## Sample lore", "");
for (const id of ["nezrath", "gyuurok", "usagetsu"]) {
  const s = zodiacOut.find((x: any) => x.id === id);
  md.push(`**${s.name}, ${s.epithet}.** ${s.lore}`, "");
}
writeFileSync(join(ROOT, "drafts", "REVIEW.md"), md.join("\n"));

console.log(`drafts: ${zodiacOut.length} zodiac · ${wandererOut.length} wanderer · ${spiritOut.length} spirits · ${cardOut.length} cards · ${materialOut.length} materials · ${recipeOut.length} recipes → drafts/json, drafts/REVIEW.md`);
