// npm run art
// Generates card illustrations into art/ from the draft bestiary and Keeper cards:
//   art/creatures/{prefix}-{species}.svg   one per element form (zodiac: all five)
//   art/creatures/{species}.svg            the native form
//   art/spirits/{id}.svg                   vessel spirits
//   art/cards/{id}.svg                     Keeper cards
// To replace a generated image with commissioned art, drop a file with the same name into
// art/overrides/ (png, jpg, webp or svg); the viewer prefers it.

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ROOT } from "./lib/data.ts";
import { artSpecFor } from "./art/specs.ts";
import { ELEMENT_GLYPHS, renderCardArt, renderScene, ZODIAC_GLYPHS } from "./art/scene.ts";

const J = (name: string) => JSON.parse(readFileSync(join(ROOT, "drafts", "json", name), "utf8"));
const zodiac = J("zodiac-bestiary.json").species;
const wanderers = J("wanderers.json").species;
const spirits = J("vessel-spirits.json").spirits;
const cards = J("keeper-cards.json").cards;
const chars = J("characteristics.json");

const PREFIX: Record<string, string> = { wood: "jade", fire: "ember", earth: "ochre", metal: "steel", water: "tide" };
const NATIVE: Record<string, string> = {
  rat: "water", ox: "earth", tiger: "wood", rabbit: "wood", dragon: "earth", snake: "fire",
  horse: "fire", goat: "earth", monkey: "metal", rooster: "metal", dog: "earth", pig: "water",
};
const ELEMENTS = ["wood", "fire", "earth", "metal", "water"];

const OUT = join(ROOT, "art");
for (const d of ["creatures", "spirits", "cards"]) {
  rmSync(join(OUT, d), { recursive: true, force: true });
  mkdirSync(join(OUT, d), { recursive: true });
}
mkdirSync(join(OUT, "overrides"), { recursive: true });

const manifest: Record<string, string> = {};
const put = (rel: string, svg: string, key: string) => {
  writeFileSync(join(OUT, rel), svg);
  manifest[key] = `art/${rel}`;
};
const markingsOf = (s: any) => s.characteristics.markings.map((m: any) => m.id);

for (const s of zodiac) {
  const art = artSpecFor(s);
  for (const el of ELEMENTS) {
    const svg = renderScene({ id: `${PREFIX[el]}-${s.id}`, elements: [el], glyph: ZODIAC_GLYPHS[s.line], stage: s.stage, sovereign: s.stage === 3, art, markings: markingsOf(s), tint: el === NATIVE[s.line] ? undefined : el });
    put(`creatures/${PREFIX[el]}-${s.id}.svg`, svg, `${PREFIX[el]}-${s.id}`);
    if (el === NATIVE[s.line]) put(`creatures/${s.id}.svg`, svg, s.id);
  }
}
for (const s of wanderers) {
  const art = artSpecFor(s);
  s.elements.forEach((el: string, i: number) => {
    const svg = renderScene({ id: `${PREFIX[el]}-${s.id}`, elements: [el], glyph: ELEMENT_GLYPHS[el], stage: s.stage, sovereign: false, art, markings: markingsOf(s), tint: i === 0 ? undefined : el });
    put(`creatures/${PREFIX[el]}-${s.id}.svg`, svg, `${PREFIX[el]}-${s.id}`);
    if (i === 0) put(`creatures/${s.id}.svg`, svg, s.id);
  });
}
for (const s of spirits) {
  const els: string[] = s.type.elements;
  const glyph = els.length === 0 ? "蝕" : ELEMENT_GLYPHS[els[0]];
  const svg = renderScene({ id: s.id, elements: els, glyph, stage: 0, sovereign: false, art: artSpecFor(s), markings: [] });
  put(`spirits/${s.id}.svg`, svg, s.id);
}
for (const c of cards) put(`cards/${c.id}.svg`, renderCardArt(c.id, c.category, c.tags), `card:${c.id}`);

writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`art: ${Object.keys(manifest).length} images → art/ (confluences: ${chars.confluences.length})`);
