// Maps every species to a rig, its proportions and its colours. Proportions follow each
// species' description; later stages are larger, with heavier horns, manes and ornaments.

import type { Bird, Fish, Primate, Quad, Serpent } from "./rigs.ts";

export type Spec =
  | { rig: "quad"; p: Quad }
  | { rig: "serpent"; p: Serpent }
  | { rig: "bird"; p: Bird }
  | { rig: "primate"; p: Primate }
  | { rig: "fish"; p: Fish }
  | { rig: "moth"; big: boolean }
  | { rig: "cricket"; k: number }
  | { rig: "beetle" }
  | { rig: "swarm"; roots: boolean }
  | { rig: "tortoise"; k: number; extra: "teacup" | "pavilion" | "moss" | "none" }
  | { rig: "snail"; k: number }
  | { rig: "octopus"; squid: boolean; k: number };

export interface ArtSpec {
  spec: Spec;
  /** Overall scale of the figure (smaller for early stages). */
  scale: number;
  /** Colour keywords (matched against PALETTE) for body and accent. Defaults come from markings. */
  body?: string;
  accent?: string;
}

// Marking keywords → colours. The first keyword found in a marking name wins.
export const PALETTE: [string, string][] = [
  ["ink", "#3d4148"], ["starless", "#26262b"], ["black", "#2b2a2e"], ["charcoal", "#3a3a3d"], ["slate", "#5d6670"],
  ["river-brown", "#7b5a3c"], ["earth-brown", "#80603f"], ["mud", "#7a6048"], ["forest-brown", "#6e5137"], ["grain", "#a07c4f"],
  ["thicket", "#7d6346"], ["dusk", "#6d5a4a"], ["bark", "#6f5e4c"], ["clay", "#a86f4a"], ["dun", "#b8946a"], ["bay", "#8a4f2e"],
  ["amber", "#d98a2b"], ["sun-chestnut", "#b5632f"], ["copper", "#b8693a"], ["rust", "#b5532f"], ["cinnamon", "#b06a3b"], ["ember", "#d5532f"],
  ["flame", "#d6402b"], ["festival", "#c8402e"], ["koi", "#d9542f"], ["red", "#c0442e"], ["rose", "#e6a3a8"], ["pink", "#e6a3a8"],
  ["gold", "#d4a63a"], ["hearth", "#d29a45"], ["paper-gold", "#e1bf6a"], ["rice", "#d8bf7a"], ["cream", "#efe6d2"], ["cotton", "#f3efe6"],
  ["egret", "#f5f2ea"], ["paper-white", "#f0ece2"], ["cloud", "#e9edf2"], ["white", "#f2efe8"], ["moon", "#e4e6ee"], ["pearl", "#ece6dc"],
  ["silver", "#b9c0c9"], ["steel", "#9aa3ad"], ["iron", "#7f8790"], ["ash", "#a19d98"], ["grey", "#8f9399"], ["smoke", "#85888d"], ["sand", "#c9b48f"],
  ["dawn", "#b7b2c4"], ["bronze", "#a87436"], ["jade", "#5fa575"], ["moss", "#6c9a5b"], ["leaf", "#6caa58"], ["grass", "#79b25b"], ["clover", "#7fb069"],
  ["celadon", "#a9c9a4"], ["blue", "#4f7fbf"], ["crimson", "#b52c35"], ["lacquer", "#2d2a2a"], ["five", "#c9a14a"],
];

export function colourFor(keyword: string): string {
  const k = keyword.toLowerCase();
  for (const [key, hex] of PALETTE) if (k.includes(key)) return hex;
  return "#8f8577";
}

const stageScale = (stage: number, kind: string) => (kind === "zodiac" ? [0.7, 0.86, 1][stage - 1] : [0.82, 0.98][stage - 1]);

type Maker = (stage: number) => Omit<ArtSpec, "scale"> & { scale?: number };

const q = (p: Quad): Spec => ({ rig: "quad", p });

// ---------------------------------------------------------------- zodiac lines (by line id)
const ZODIAC: Record<string, Maker> = {
  rat: (s) => ({ spec: q({ len: 150, h: 58, leg: 26, legW: 12, head: s === 1 ? 36 : 30, snout: 26, neck: 0.1, ears: "round", tail: s === 3 ? "fork" : "thin" }) }),
  ox: (s) => ({ spec: q({ len: 205, h: 105, leg: 50, legW: 24, head: 36, snout: 22, neck: 0, ears: "small", horns: s === 1 ? "short" : "crescent", tail: "tuft", hooves: true, blaze: s > 1, bell: s === 3 }) }),
  tiger: (s) => ({ spec: q({ len: 195, h: 80, leg: 46, legW: 19, head: s === 1 ? 40 : 35, snout: 12, neck: 0.15, ears: "round", tail: "long", stripes: s === 1 ? 4 : 7 }), accent: "black" }),
  rabbit: (s) => ({ spec: q({ len: 120, h: 72, leg: 18, legW: 15, head: 34, snout: 8, neck: 0.45, ears: "long", tail: "stub" }), accent: s === 3 ? "jade" : "rose" }),
  dragon: (s) => ({ spec: { rig: "serpent", p: { thick: s === 1 ? 30 : 30, waves: s === 1 ? 1.5 : 2.2, amp: s === 1 ? 30 : 48, flying: s > 1, dragon: true, pearl: s === 3, rise: 50 } } }),
  snake: (s) => ({ spec: { rig: "serpent", p: { thick: s === 3 ? 34 : 26, waves: 2.5, amp: 48, rise: 80, bands: true, hood: s === 3 } }, accent: "ember" }),
  horse: (s) => ({ spec: q({ len: 185, h: 78, leg: s === 1 ? 82 : 76, legW: 15, head: 30, snout: 30, neck: 0.95, ears: "pointed", tail: "flowing", mane: "flowing", hooves: true, blaze: s === 3 }), accent: s === 3 ? "gold" : "black" }),
  goat: (s) => ({ spec: q({ len: 150, h: 70, leg: 50, legW: 13, head: 28, snout: 18, neck: 0.6, ears: "small", horns: s === 1 ? "short" : "spiral", tail: "stub", hooves: true, beard: s > 1 }), accent: s === 3 ? "gold" : "cream" }),
  monkey: (s) => ({ spec: { rig: "primate", p: { size: 95, tail: true, mane: s === 3, item: s === 3 ? "mirror" : "none" } }, accent: s === 3 ? "silver" : "red" }),
  rooster: (s) => ({ spec: { rig: "bird", p: s === 1 ? { body: 55, neck: 0, leg: 25, beak: 10, chick: true, tail: "none" } : { body: 62, neck: 30, leg: 45, beak: 16, comb: true, tail: "sickle" } }, accent: "gold", ...(s === 1 ? { body: "paper-gold" } : {}) }),
  dog: (s) => ({ spec: q({ len: 160, h: 70, leg: 45, legW: 16, head: 33, snout: 20, neck: 0.5, ears: s === 1 ? "round" : "small", tail: s === 1 ? "curl" : "bushy", mane: s === 1 ? "none" : s === 2 ? "ruff" : "curly", bell: s === 1 }), accent: "bronze" }),
  pig: (s) => ({ spec: q({ len: 185, h: 92, leg: 28, legW: 18, head: 36, snout: 16, neck: 0, ears: "pointed", tail: "curl", hooves: true, spikes: s === 1 ? 0 : 5 }), accent: s === 3 ? "moss" : "mud" }),
};

// ---------------------------------------------------------------- Wanderer lines
const WANDERER: Record<string, Maker> = {
  inkcarp: () => ({ spec: { rig: "fish", p: { len: 205, h: 90, kind: "carp", whiskers: true, scales: true } } }),
  "lantern-moth": (s) => ({ spec: { rig: "moth", big: s === 2 } }),
  "paddy-heron": (s) => ({ spec: { rig: "bird", p: { body: 45, neck: 60, leg: 85, beak: 36, tail: "short", crest: s === 2 } }, accent: "black" }),
  "teacup-tortoise": (s) => ({ spec: { rig: "tortoise", k: 0.9, extra: s === 1 ? "teacup" : "pavilion" } }),
  "fox-ember": (s) => ({ spec: q({ len: 150, h: 55, leg: 40, legW: 11, head: 28, snout: 28, neck: 0.4, ears: "pointed", tail: "bushy" }), accent: s === 2 ? "flame" : "white" }),
  "granary-mouse": () => ({ spec: q({ len: 110, h: 52, leg: 16, legW: 11, head: 30, snout: 18, neck: 0.1, ears: "round", tail: "thin" }) }),
  "wallow-buffalo": (s) => ({ spec: q({ len: 205, h: 100, leg: 48, legW: 24, head: 36, snout: 22, neck: 0, ears: "small", horns: s === 1 ? "short" : "crescent", tail: "tuft", hooves: true }), accent: "grey" }),
  mistprowler: () => ({ spec: q({ len: 165, h: 58, leg: 36, legW: 14, head: 30, snout: 10, neck: 0.15, ears: "pointed", tail: "long", spots: 10 }), accent: "black" }),
  bramblehare: () => ({ spec: q({ len: 125, h: 62, leg: 22, legW: 13, head: 30, snout: 8, neck: 0.4, ears: "long", tail: "stub" }), accent: "sand" }),
  callgecko: () => ({ spec: q({ len: 160, h: 40, leg: 30, legW: 9, head: 26, snout: 16, neck: 0, ears: "none", tail: "long", spots: 9, low: true }), accent: "amber" }),
  "saltroad-pony": (s) => ({ spec: q({ len: 175, h: 82, leg: 58, legW: 17, head: 30, snout: 26, neck: 0.75, ears: "pointed", tail: "flowing", mane: "flowing", hooves: true, bell: true }), accent: "black" }),
  cliffserow: (s) => ({ spec: q({ len: 150, h: 72, leg: 52, legW: 13, head: 28, snout: 18, neck: 0.6, ears: "small", horns: "short", tail: "stub", hooves: true, mane: s === 2 ? "ruff" : "none" }), accent: "red" }),
  duskloris: () => ({ spec: { rig: "primate", p: { size: 85, tail: false, bigEyes: true } }, accent: "cream" }),
  "whistle-dhole": () => ({ spec: q({ len: 160, h: 64, leg: 42, legW: 14, head: 30, snout: 22, neck: 0.4, ears: "round", tail: "bushy" }), accent: "black" }),
  bristleboar: (s) => ({ spec: q({ len: 185, h: 85, leg: 32, legW: 16, head: 32, snout: 30, neck: 0, ears: "pointed", tail: "tuft", hooves: true, beard: true, spikes: s === 2 ? 5 : 0 }), accent: "grey" }),
  bellcricket: () => ({ spec: { rig: "cricket", k: 1.1 } }),
};

// ---------------------------------------------------------------- vessel spirits (by id)
const SPIRIT: Record<string, ArtSpec> = {
  gatecarp: { spec: { rig: "fish", p: { len: 210, h: 95, kind: "carp", whiskers: true, scales: true } }, scale: 1, body: "koi", accent: "gold" },
  "needlefin-shoal": { spec: { rig: "fish", p: { len: 200, h: 60, kind: "sword", school: 4 } }, scale: 1, body: "steel", accent: "silver" },
  thornpuff: { spec: { rig: "fish", p: { len: 160, h: 70, kind: "puffer" } }, scale: 1, body: "sand", accent: "cream" },
  "moonshell-snail": { spec: { rig: "snail", k: 1 }, scale: 1, body: "pearl", accent: "clay" },
  "rain-snail": { spec: { rig: "snail", k: 0.85 }, scale: 1, body: "jade", accent: "grey" },
  "crimson-tidemother": { spec: { rig: "octopus", squid: false, k: 1 }, scale: 1, body: "crimson", accent: "rose" },
  "hooktail-shark": { spec: { rig: "fish", p: { len: 240, h: 75, kind: "shark" } }, scale: 1, body: "slate", accent: "white" },
  "harbour-grandfather": { spec: { rig: "fish", p: { len: 255, h: 85, kind: "whale" } }, scale: 1, body: "slate", accent: "white" },
  wingwhale: { spec: { rig: "fish", p: { len: 240, h: 72, kind: "whale", wings: true } }, scale: 1, body: "dawn", accent: "silver" },
  "forktail-elder": { spec: q({ len: 150, h: 55, leg: 40, legW: 12, head: 30, snout: 8, neck: 0.3, ears: "pointed", tail: "fork", raisedPaw: true }), scale: 1, body: "ash", accent: "flame" },
  "beckoning-cat": { spec: q({ len: 140, h: 60, leg: 34, legW: 13, head: 34, snout: 6, neck: 0.4, ears: "pointed", tail: "stub", raisedPaw: true, bell: true, spots: 3 }), scale: 1, body: "white", accent: "gold" },
  "silverpoint-cat": { spec: q({ len: 150, h: 55, leg: 38, legW: 12, head: 30, snout: 8, neck: 0.3, ears: "pointed", tail: "long" }), scale: 1, body: "silver", accent: "jade" },
  "shrine-dove": { spec: { rig: "bird", p: { body: 55, neck: 10, leg: 22, beak: 10, tail: "fan", plump: true, wingUp: true } }, scale: 1, body: "white", accent: "silver" },
  "pebble-finch": { spec: { rig: "bird", p: { body: 45, neck: 4, leg: 20, beak: 12, tail: "short", plump: true, pebble: true } }, scale: 0.9, body: "sand", accent: "earth-brown" },
  "three-step-sunrook": { spec: { rig: "bird", p: { body: 58, neck: 14, leg: 40, beak: 22, tail: "fan", legs: 3, wingUp: true } }, scale: 1, body: "black", accent: "gold" },
  gulfmaw: { spec: { rig: "serpent", p: { thick: 38, waves: 2.5, amp: 42, flying: true, dragon: false, moon: true, bands: true } }, scale: 1, body: "slate", accent: "blue" },
  dreamgrazer: { spec: q({ len: 190, h: 90, leg: 36, legW: 20, head: 34, snout: 14, neck: 0.1, ears: "round", tail: "stub", trunk: true }), scale: 1, body: "moon", accent: "black" },
  goldmaw: { spec: q({ len: 175, h: 72, leg: 42, legW: 18, head: 34, snout: 12, neck: 0.4, ears: "small", horns: "single", mane: "curly", tail: "bushy", wings: true }), scale: 1, body: "gold", accent: "jade" },
  truthmane: { spec: q({ len: 180, h: 76, leg: 42, legW: 19, head: 35, snout: 14, neck: 0.4, ears: "small", horns: "single", mane: "curly", tail: "bushy", spots: 6 }), scale: 1, body: "blue", accent: "jade" },
  "riverhop-mousedeer": { spec: q({ len: 115, h: 50, leg: 58, legW: 7, head: 22, snout: 18, neck: 0.5, ears: "round", tail: "stub", hooves: true, spots: 5 }), scale: 1, body: "bay", accent: "cream" },
  lampsquid: { spec: { rig: "octopus", squid: true, k: 0.9 }, scale: 1, body: "moon", accent: "blue" },
  blinkswarm: { spec: { rig: "swarm", roots: true }, scale: 1, body: "moss", accent: "gold" },
  "mossback-tortoise": { spec: { rig: "tortoise", k: 1, extra: "moss" }, scale: 1, body: "moss", accent: "bark" },
  ironeater: { spec: q({ len: 200, h: 100, leg: 40, legW: 26, head: 38, snout: 22, neck: 0, ears: "small", tail: "tuft", spikes: 7 }), scale: 1, body: "iron", accent: "ember" },
  "jewelwing-beetle": { spec: { rig: "beetle" }, scale: 1, body: "jade", accent: "blue" },
};

export function artSpecFor(species: any): ArtSpec {
  if (species.kind === "vessel-spirit") {
    const s = SPIRIT[species.id];
    if (!s) throw new Error(`no art spec for spirit ${species.id}`);
    return s;
  }
  const table = species.kind === "zodiac" ? ZODIAC : WANDERER;
  const make = table[species.line];
  if (!make) throw new Error(`no art spec for line ${species.line}`);
  const m = make(species.stage);
  return { ...m, scale: m.scale ?? stageScale(species.stage, species.kind) };
}
