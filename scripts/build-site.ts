// npm run site
// Builds the card viewer into dist/: the static page from site/viewer/, every generated image,
// and data/cards.json — one card record per creature, spirit, Keeper card, material and recipe,
// each carrying its full draft metadata. Run `npm run drafts && npm run art` first.

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/data.ts";

const DIST = join(ROOT, "dist");
const J = (name: string) => JSON.parse(readFileSync(join(ROOT, "drafts", "json", name), "utf8"));
const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));

const zodiac = J("zodiac-bestiary.json").species;
const wanderers = J("wanderers.json").species;
const spiritsFile = J("vessel-spirits.json");
const cardsFile = J("keeper-cards.json");
const materials = J("materials.json").materials;
const crafting = J("crafting.json");
const armour = J("armour.json");
const characteristics = J("characteristics.json");
const manifest: Record<string, string> = JSON.parse(readFileSync(join(ROOT, "art", "manifest.json"), "utf8"));

// Commissioned art in art/overrides/{key}.{png,jpg,jpeg,webp,svg} replaces the generated image.
const overrides = new Map<string, string>();
const overrideDir = join(ROOT, "art", "overrides");
if (existsSync(overrideDir)) {
  for (const f of readdirSync(overrideDir)) {
    const m = /^(.+)\.(png|jpe?g|webp|svg)$/i.exec(f);
    if (m) overrides.set(m[1], `art/overrides/${f}`);
  }
}
// AI-generated art (npm run art:ai) beats the SVG placeholders; overrides beat both.
const generatedPath = join(ROOT, "art", "generated", "manifest.json");
const generated: Record<string, { file: string }> = existsSync(generatedPath) ? JSON.parse(readFileSync(generatedPath, "utf8")) : {};
const art = (key: string) =>
  overrides.get(key.replace(/^card:/, "card-")) ??
  (generated[key] && existsSync(join(ROOT, "art", "generated", generated[key].file)) ? `art/generated/${generated[key].file}` : null) ??
  manifest[key] ??
  null;

const ELEMENT_ORDER = ["wood", "fire", "earth", "metal", "water"];
const STAGE_NAMES = ["Kit", "Adept", "Sovereign"];

const cards: any[] = [];

// Zodiac: each card links to its line's other stages and to the same stage in the animal's
// other four element lines, so the viewer can step across both.
for (const s of zodiac) {
  const line = zodiac.filter((x: any) => x.line === s.line).sort((a: any, b: any) => a.stage - b.stage);
  const siblings = zodiac
    .filter((x: any) => x.animal === s.animal && x.stage === s.stage)
    .sort((a: any, b: any) => (b.native ? 1 : 0) - (a.native ? 1 : 0) || ELEMENT_ORDER.indexOf(a.element) - ELEMENT_ORDER.indexOf(b.element));
  cards.push({
    id: s.id,
    type: "zodiac",
    name: s.name,
    subtitle: [s.stage_name, s.epithet].filter(Boolean).join(" · "),
    elements: [s.element],
    animal: s.animal,
    native: s.native,
    stages: line.map((x: any) => ({ id: x.id, label: STAGE_NAMES[x.stage - 1] })),
    siblings: siblings.map((x: any) => ({ id: x.id, element: x.element, native: x.native })),
    stage: s.stage,
    family: s.family,
    text: s.description,
    art: art(s.id),
    facts: { "Bond DC": s.taming.bond_dc, "Command DC": s.control.command_dc, "Avg weight": `${s.physical.weight_kg.mean} kg` },
    data: s,
  });
}
for (const s of wanderers) {
  const line = wanderers.filter((x: any) => x.line === s.line).sort((a: any, b: any) => a.stage - b.stage);
  cards.push({
    id: s.id,
    type: "wanderer",
    name: s.name,
    subtitle: [s.stage_name, s.mythical ? "Mythical" : null].filter(Boolean).join(" · "),
    elements: s.elements,
    mythical: !!s.mythical,
    stages: line.map((x: any) => ({ id: x.id, label: x.stage_name })),
    stage: s.stage,
    family: s.family,
    text: s.description,
    art: art(s.id),
    facts: { "Bond DC": s.taming.bond_dc, "Command DC": s.control.command_dc, "Avg weight": `${s.physical.weight_kg.mean} kg` },
    data: s,
  });
}
for (const s of spiritsFile.spirits) {
  cards.push({
    id: s.id,
    type: "spirit",
    name: s.name,
    subtitle: s.creature.replace(/^\w/, (c: string) => c.toUpperCase()),
    elements: s.type.elements,
    typeLabel: s.type.kind === "element" ? null : s.type.id,
    text: s.release.card_text,
    art: art(s.id),
    facts: { "Capture DC": s.capture.dc, Vessel: s.capture.vessel, Holds: `${s.capture.hold_rounds} rounds` },
    data: { ...s, vessel_detail: spiritsFile.vessels.find((v: any) => v.id === s.capture.vessel) },
  });
}
for (const c of cardsFile.cards) {
  const cat = cardsFile.categories.find((x: any) => x.id === c.category);
  cards.push({
    id: c.id,
    type: "keeper-card",
    name: c.name,
    subtitle: `${cat.name} · ${c.speed}`,
    elements: [],
    category: c.category,
    text: c.card_text,
    art: art(`card:${c.id}`),
    facts: { Resolve: c.resolve, ...(c.trigger ? { Trigger: c.trigger } : {}), ...(c.delay_rounds ? { Delay: `${c.delay_rounds} rounds` } : {}) },
    data: { ...c, category_detail: cat },
  });
}
const CONFLUENCE_ELEMENTS = Object.fromEntries(characteristics.confluences.map((c: any) => [c.id, c.elements]));
for (const m of materials) {
  cards.push({
    id: m.id,
    type: "material",
    name: m.name,
    subtitle: `Tier ${m.tier} · ${m.category}`,
    elements: m.element ? (CONFLUENCE_ELEMENTS[m.element] ?? [m.element]) : [],
    typeLabel: CONFLUENCE_ELEMENTS[m.element] ? m.element : null,
    text: m.properties,
    art: null,
    facts: { Source: m.source.from ? `${m.source.method} (${m.source.from})` : m.source.method, Value: m.value ?? "gift only", Roles: m.roles.join(", ") },
    data: m,
  });
}
for (const r of crafting.recipes) {
  const el = r.armour_element;
  cards.push({
    id: r.id,
    type: "recipe",
    name: r.name,
    subtitle: `${r.wearer === "keeper" ? "Keeper armour" : r.makes_vessel ? "Vessel" : r.weight === "none" ? "Charm" : "Beast armour"} · ${crafting.disciplines.find((d: any) => d.id === r.discipline).name}`,
    elements: el ? (CONFLUENCE_ELEMENTS[el] ?? [el]) : [],
    typeLabel: CONFLUENCE_ELEMENTS[el] ? el : null,
    text: r.materials.map((x: any) => `${x.qty}× ${materials.find((m: any) => m.id === x.material).name}`).join(", "),
    art: null,
    facts: { DC: r.dc, Days: r.days, ...(r.weight && r.weight !== "none" ? { Guard: `+${r.guard_bonus}` } : {}) },
    data: r,
  });
}

rmSync(DIST, { recursive: true, force: true });
mkdirSync(join(DIST, "data"), { recursive: true });
cpSync(join(ROOT, "site", "viewer"), DIST, { recursive: true });
cpSync(join(ROOT, "art"), join(DIST, "art"), { recursive: true });
cpSync(join(ROOT, "drafts", "json"), join(DIST, "data", "drafts"), { recursive: true });
writeFileSync(
  join(DIST, "data", "cards.json"),
  JSON.stringify({ version: pkg.version, built: new Date().toISOString().slice(0, 10), licence: "CC-BY-4.0", count: cards.length, cards, armour }),
);
writeFileSync(join(DIST, ".nojekyll"), "");
console.log(`site: ${cards.length} cards → dist/`);
