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
const art = (key: string) => overrides.get(key.replace(/^card:/, "card-")) ?? manifest[key] ?? null;

const PREFIX: Record<string, string> = { wood: "jade", fire: "ember", earth: "ochre", metal: "steel", water: "tide" };
const PREFIX_NAME: Record<string, string> = { wood: "Jade", fire: "Ember", earth: "Ochre", metal: "Steel", water: "Tide" };
const ELEMENTS = ["wood", "fire", "earth", "metal", "water"];
const NATIVE: Record<string, string> = {
  rat: "water", ox: "earth", tiger: "wood", rabbit: "wood", dragon: "earth", snake: "fire",
  horse: "fire", goat: "earth", monkey: "metal", rooster: "metal", dog: "earth", pig: "water",
};

const forms = (id: string, els: string[]) =>
  els.map((el) => ({ element: el, id: `${PREFIX[el]}-${id}`, prefix: PREFIX_NAME[el], art: art(`${PREFIX[el]}-${id}`) }));

const cards: any[] = [];

for (const s of zodiac) {
  const native = NATIVE[s.line];
  cards.push({
    id: s.id,
    type: "zodiac",
    name: s.name,
    subtitle: [s.stage_name, s.epithet].filter(Boolean).join(" · "),
    elements: [native],
    forms: forms(s.id, [native, ...ELEMENTS.filter((e) => e !== native)]),
    stage: s.stage,
    family: s.family,
    text: s.description,
    art: art(s.id),
    facts: { "Bond DC": s.taming.bond_dc, "Command DC": s.control.command_dc, "Avg weight": `${s.physical.weight_kg.mean} kg` },
    data: s,
  });
}
for (const s of wanderers) {
  cards.push({
    id: s.id,
    type: "wanderer",
    name: s.name,
    subtitle: s.stage_name,
    elements: [s.elements[0]],
    forms: forms(s.id, s.elements),
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
