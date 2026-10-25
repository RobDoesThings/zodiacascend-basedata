// Composes a full card illustration: element background, sun or moon disc, the creature,
// a red seal stamp with the creature's glyph, and stage ornaments.

import { darken, GROUND, H, hash, INK, lighten, mix, rng, W } from "./draw.ts";
import { beetle, bird, cricket, fish, moth, octopus, primate, quadruped, serpent, snail, swarm, tortoise, type Colours } from "./rigs.ts";
import { colourFor, type ArtSpec } from "./specs.ts";

export const ELEMENT_COLOURS: Record<string, string> = {
  wood: "#5FBF77",
  fire: "#F06A4A",
  earth: "#D9A441",
  metal: "#C9D1DC",
  water: "#4F9BEA",
};
export const ELEMENT_GLYPHS: Record<string, string> = { wood: "木", fire: "火", earth: "土", metal: "金", water: "水" };
export const ZODIAC_GLYPHS: Record<string, string> = {
  rat: "鼠", ox: "牛", tiger: "虎", rabbit: "兔", dragon: "龍", snake: "蛇",
  horse: "馬", goat: "羊", monkey: "猴", rooster: "雞", dog: "狗", pig: "豬",
};

// ---------------------------------------------------------------- element patterns
function pattern(el: string, col: string, r: () => number): string {
  const s: string[] = [];
  switch (el) {
    case "wood":
      for (let i = 0; i < 7; i++) {
        const x = 15 + i * 60 + r() * 20;
        s.push(`<path d="M${x} ${H} L${x + 6} 0" stroke="${col}" stroke-width="${10 + r() * 6}"/>`);
        for (let y = 30 + r() * 30; y < H; y += 55 + r() * 20) s.push(`<path d="M${x - 6} ${y} l${18} 0" stroke="${col}" stroke-width="3"/>`);
        s.push(`<path d="M${x + 4} ${60 + r() * 120} q25 -10 45 8 q-25 6 -45 -8" fill="${col}"/>`);
      }
      break;
    case "fire":
      for (let i = 0; i < 9; i++) {
        const x = i * 50 + r() * 20;
        const h = 70 + r() * 110;
        s.push(`<path d="M${x - 22} ${H} C${x - 30} ${H - h * 0.5} ${x + 10} ${H - h * 0.6} ${x} ${H - h} C${x + 30} ${H - h * 0.5} ${x + 30} ${H - h * 0.3} ${x + 22} ${H} Z" fill="${col}"/>`);
      }
      for (let i = 0; i < 18; i++) s.push(`<circle cx="${r() * W}" cy="${r() * H * 0.7}" r="${1.5 + r() * 2.5}" fill="${col}"/>`);
      break;
    case "earth":
      for (let i = 0; i < 6; i++) {
        const y = 90 + i * 36;
        s.push(`<path d="M0 ${y} Q${100 + r() * 60} ${y - 30} ${200} ${y - 6} T${W} ${y - 10}" stroke="${col}" stroke-width="7" fill="none"/>`);
      }
      s.push(`<path d="M-10 120 L70 40 L130 100 L190 30 L270 110 L330 60 L410 120" stroke="${col}" stroke-width="5" fill="none" stroke-linejoin="round"/>`);
      break;
    case "metal":
      for (let i = 0; i < 12; i++) {
        const x = r() * W;
        const y = r() * H;
        const rad = 14 + r() * 22;
        s.push(`<circle cx="${x}" cy="${y}" r="${rad}" fill="none" stroke="${col}" stroke-width="5"/><rect x="${x - rad * 0.3}" y="${y - rad * 0.3}" width="${rad * 0.6}" height="${rad * 0.6}" fill="none" stroke="${col}" stroke-width="4"/>`);
      }
      break;
    case "water":
      for (let row = 0; row < 8; row++) {
        for (let i = -1; i < 9; i++) {
          const cx = i * 52 + (row % 2) * 26;
          const cy = 40 + row * 34;
          for (const rr of [24, 16, 8]) s.push(`<path d="M${cx - rr} ${cy} A${rr} ${rr} 0 0 1 ${cx + rr} ${cy}" fill="none" stroke="${col}" stroke-width="3"/>`);
        }
      }
      break;
  }
  return s.join("");
}

export interface Scene {
  id: string;
  /** One element, two (confluence) or none (eclipse). */
  elements: string[];
  glyph: string;
  stage: number; // 1..3; 3 gets a halo
  sovereign: boolean;
  art: ArtSpec;
  markings: string[];
  /** Element to tint the creature toward (non-native forms). */
  tint?: string;
}

function background(sc: Scene, r: () => number): string {
  const out: string[] = [];
  if (sc.elements.length === 0) {
    out.push(`<defs><radialGradient id="ecl" cx="0.62" cy="0.36" r="0.8"><stop offset="0" stop-color="#2c3157"/><stop offset="1" stop-color="#0d0f1f"/></radialGradient></defs>`);
    out.push(`<rect width="${W}" height="${H}" fill="url(#ecl)"/>`);
    for (let i = 0; i < 60; i++) out.push(`<circle cx="${r() * W}" cy="${r() * H * 0.8}" r="${0.6 + r() * 1.4}" fill="#f6efd8" opacity="${0.4 + r() * 0.6}"/>`);
    out.push(`<circle cx="250" cy="105" r="88" fill="none" stroke="#f3d27a" stroke-width="10" opacity="0.5"/><circle cx="250" cy="105" r="80" fill="#07080f"/>`);
    out.push(`<rect y="${GROUND}" width="${W}" height="${H - GROUND}" fill="#1a1d33"/>`);
    return out.join("");
  }
  const cols = sc.elements.map((e) => ELEMENT_COLOURS[e]);
  const a = cols[0];
  const b = cols[1] ?? cols[0];
  out.push(`<defs><linearGradient id="bg-${sc.id}" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="${lighten(a, 0.72)}"/><stop offset="1" stop-color="${lighten(b, 0.5)}"/></linearGradient>`);
  if (cols.length === 2) out.push(`<clipPath id="half-a-${sc.id}"><polygon points="0,0 ${W * 0.62},0 ${W * 0.38},${H} 0,${H}"/></clipPath><clipPath id="half-b-${sc.id}"><polygon points="${W * 0.62},0 ${W},0 ${W},${H} ${W * 0.38},${H}"/></clipPath>`);
  out.push(`</defs><rect width="${W}" height="${H}" fill="url(#bg-${sc.id})"/>`);
  if (cols.length === 2) {
    out.push(`<g opacity="0.22" clip-path="url(#half-a-${sc.id})">${pattern(sc.elements[0], darken(a, 0.15), r)}</g>`);
    out.push(`<g opacity="0.22" clip-path="url(#half-b-${sc.id})">${pattern(sc.elements[1], darken(b, 0.15), r)}</g>`);
  } else {
    out.push(`<g opacity="0.2">${pattern(sc.elements[0], darken(a, sc.elements[0] === "metal" ? 0.35 : 0.12), r)}</g>`);
  }
  // sun / moon disc
  const disc = lighten(mix(a, b, 0.5), 0.86);
  if (sc.sovereign) {
    let rays = "";
    for (let i = 0; i < 24; i++) {
      const ang = (i / 24) * Math.PI * 2;
      rays += `<path d="M${250 + Math.cos(ang) * 96} ${105 + Math.sin(ang) * 96} L${250 + Math.cos(ang + 0.07) * 150} ${105 + Math.sin(ang + 0.07) * 150} L${250 + Math.cos(ang - 0.07) * 150} ${105 + Math.sin(ang - 0.07) * 150} Z" fill="#e9c46a" opacity="0.35"/>`;
    }
    out.push(rays, `<circle cx="250" cy="105" r="92" fill="none" stroke="#c9972f" stroke-width="5"/>`);
  }
  out.push(`<circle cx="250" cy="105" r="86" fill="${disc}"/>`);
  out.push(`<path d="M0 ${GROUND} Q${W / 2} ${GROUND - 10} ${W} ${GROUND} L${W} ${H} L0 ${H} Z" fill="${darken(mix(a, b, 0.5), 0.25)}" opacity="0.55"/>`);
  return out.join("");
}

function creature(sc: Scene, r: () => number): string {
  const glow = sc.elements.length ? ELEMENT_COLOURS[sc.elements[0]] : "#f3d27a";
  const t = (hex: string) => (sc.tint ? mix(hex, ELEMENT_COLOURS[sc.tint], 0.32) : hex);
  const c: Colours = {
    body: t(colourFor(sc.art.body ?? sc.markings[0] ?? "grey")),
    accent: t(colourFor(sc.art.accent ?? sc.markings[1] ?? "grey")),
    glow,
  };
  const s = sc.art.spec;
  const fig = (() => {
    switch (s.rig) {
      case "quad": return quadruped(s.p, c, sc.id);
      case "serpent": return serpent(s.p, c);
      case "bird": return bird(s.p, c);
      case "primate": return primate(s.p, c);
      case "fish": return fish(s.p, c);
      case "moth": return moth(c, s.big);
      case "cricket": return cricket(c, s.k);
      case "beetle": return beetle(c);
      case "swarm": return swarm(c, r, s.roots);
      case "tortoise": return tortoise(c, s.k, s.extra);
      case "snail": return snail(c, s.k);
      case "octopus": return octopus(c, s.squid, s.k);
    }
  })();
  const k = sc.art.scale;
  const floats = ["fish", "moth", "beetle", "octopus", "swarm"].includes(s.rig) || (s.rig === "serpent" && s.p.flying);
  const oy = floats ? 150 : GROUND;
  // ground shadow for standing figures
  const shadow = floats ? "" : `<ellipse cx="200" cy="${GROUND + 2}" rx="${130 * k}" ry="9" fill="${INK}" opacity="0.18"/>`;
  return `${shadow}<g transform="translate(200 ${oy}) scale(${k}) translate(-200 ${-oy})">${fig.render()}</g>`;
}

function seal(glyph: string, stage: number): string {
  let pips = "";
  for (let i = 0; i < stage; i++) pips += `<circle cx="${W - 22 - i * 16}" cy="${H - 20}" r="5.5" fill="#b8322a" stroke="#fff" stroke-width="1.5"/>`;
  return `<g transform="translate(14 14)"><rect width="46" height="46" rx="5" fill="#b8322a"/><rect x="3.5" y="3.5" width="39" height="39" rx="3" fill="none" stroke="#f6e7cf" stroke-width="1.5"/><text x="23" y="32" text-anchor="middle" font-size="27" font-family="'Noto Serif CJK SC','Noto Serif SC','Songti SC','SimSun',serif" fill="#f6e7cf">${glyph}</text></g>${pips}`;
}

export function renderScene(sc: Scene): string {
  const r = rng(hash(sc.id));
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">${background(sc, r)}${creature(sc, r)}${seal(sc.glyph, sc.stage)}</svg>`;
}

// ---------------------------------------------------------------- Keeper card emblems
const CATEGORY_COLOURS: Record<string, string> = {
  snare: "#8c5a3c", ward: "#b8322a", counter: "#3f6f9f", omen: "#4b3f7a", gambit: "#c9972f",
  edict: "#2f6f5a", rite: "#7a3f5a", lure: "#c77d3a", talisman: "#4f8f6f", memory: "#5c5c66",
};
const CATEGORY_GLYPHS: Record<string, string> = {
  snare: "罠", ward: "守", counter: "返", omen: "兆", gambit: "賭", edict: "令", rite: "祭", lure: "餌", talisman: "符", memory: "憶",
};

function emblem(cat: string, col: string): string {
  const light = lighten(col, 0.8);
  switch (cat) {
    case "snare":
      return `<g stroke="${col}" stroke-width="6" fill="none"><path d="M120 230 L280 230 M140 230 L200 80 L260 230"/><path d="M200 80 q60 30 40 90 q-20 40 -60 10 q-30 -30 20 -40" /></g><circle cx="200" cy="80" r="9" fill="${col}"/>`;
    case "ward":
      return `<rect x="150" y="55" width="100" height="190" rx="4" fill="${light}" stroke="${col}" stroke-width="5"/><g stroke="${col}" stroke-width="5" stroke-linecap="round"><path d="M200 80 L200 220 M170 110 L230 110 M175 150 L225 150 M165 190 L235 190"/></g>`;
    case "counter":
      return `<g stroke="${col}" stroke-width="10" stroke-linecap="round" fill="none"><path d="M130 200 C130 110 250 90 260 160"/><path d="M240 140 L262 165 L285 140"/><path d="M270 100 C270 190 150 210 140 140"/><path d="M160 160 L138 135 L115 160"/></g>`;
    case "omen":
      return `<path d="M120 220 L250 90" stroke="${lighten(col, 0.4)}" stroke-width="16" stroke-linecap="round" opacity="0.6"/><path d="M265 70 l10 25 l27 2 l-21 17 l7 26 l-23 -15 l-23 15 l7 -26 l-21 -17 l27 -2 Z" fill="#e9c46a" stroke="${col}" stroke-width="4"/><circle cx="150" cy="200" r="45" fill="${light}" stroke="${col}" stroke-width="5"/><path d="M150 200 L150 172 M150 200 L170 210" stroke="${col}" stroke-width="5" stroke-linecap="round"/>`;
    case "gambit":
      return `<g transform="rotate(-12 150 160)"><rect x="100" y="110" width="100" height="100" rx="16" fill="${light}" stroke="${col}" stroke-width="5"/><circle cx="125" cy="135" r="9" fill="${col}"/><circle cx="150" cy="160" r="9" fill="#b8322a"/><circle cx="175" cy="185" r="9" fill="${col}"/></g><circle cx="270" cy="150" r="55" fill="#e9c46a" stroke="${col}" stroke-width="5"/><rect x="255" y="135" width="30" height="30" fill="none" stroke="${col}" stroke-width="5"/>`;
    case "edict":
      return `<path d="M160 250 L160 60" stroke="${col}" stroke-width="8" stroke-linecap="round"/><path d="M164 66 L290 66 L270 110 L290 154 L164 154 Z" fill="${light}" stroke="${col}" stroke-width="5"/><circle cx="215" cy="110" r="20" fill="#b8322a"/>`;
    case "rite":
      return `<path d="M130 230 Q200 210 270 230 L260 250 L140 250 Z" fill="${light}" stroke="${col}" stroke-width="5"/><g stroke="${col}" stroke-width="5"><path d="M180 225 L180 120 M200 222 L200 105 M220 225 L220 120"/></g><g stroke="${lighten(col, 0.4)}" stroke-width="4" fill="none"><path d="M180 112 q-15 -20 0 -40 q15 -20 0 -40"/><path d="M200 97 q15 -20 0 -40 q-15 -20 0 -40"/><path d="M220 112 q-15 -20 0 -40"/></g>`;
    case "lure":
      return `<path d="M140 220 L200 100 L260 220 Z" fill="#f6f1e6" stroke="${col}" stroke-width="5" stroke-linejoin="round"/><rect x="160" y="180" width="80" height="40" fill="${INK}"/><path d="M290 60 Q300 150 250 200" stroke="${col}" stroke-width="3" fill="none" stroke-dasharray="6 6"/>`;
    case "talisman":
      return `<circle cx="200" cy="150" r="80" fill="${lighten(col, 0.4)}" stroke="${col}" stroke-width="6"/><circle cx="200" cy="150" r="26" fill="${light}" stroke="${col}" stroke-width="5"/><path d="M200 30 L200 70 M200 230 L200 280" stroke="#b8322a" stroke-width="6"/>`;
    case "memory":
      return `<rect x="165" y="60" width="70" height="170" rx="10" fill="${light}" stroke="${col}" stroke-width="5"/><path d="M150 230 L250 230 L260 252 L140 252 Z" fill="${col}"/><g stroke="${col}" stroke-width="4" stroke-linecap="round"><path d="M200 85 L200 205 M185 110 L215 110"/></g>`;
  }
  return "";
}

// Small motifs for a card's effect tags, so cards in one category still look distinct.
const TAG_GLYPHS: Record<string, string> = {
  prone: "伏", restrained: "縛", hidden: "隱", exposed: "露", burning: "炎", soaked: "濕", rooted: "根",
  frightened: "懼", charmed: "魅", poisoned: "毒", stunned: "暈", blinded: "盲", heal: "癒", qi: "氣",
  damage: "傷", defence: "防", guard: "甲", swap: "換", draw: "札", deck: "札", evolution: "進", trial: "試",
  revive: "蘇", field: "場", bond: "絆", vessel: "器", capture: "捕", reflect: "鏡", negate: "消", risk: "險",
  random: "運", "seal-chain": "印", disruption: "亂", steal: "奪", control: "制", survival: "生", reroll: "再",
  revenge: "報", "to-hit": "中", resolve: "志", cleanse: "淨", command: "命", defeated: "亡", discard: "灰",
};

export function renderCardArt(id: string, category: string, tags: string[] = []): string {
  const r = rng(hash(id));
  const col = mix(CATEGORY_COLOURS[category] ?? "#555555", r() > 0.5 ? "#000000" : "#ffffff", r() * 0.25);
  const angle = (r() - 0.5) * 16;
  const motifs = tags.map((t) => TAG_GLYPHS[t]).filter(Boolean).slice(0, 2);
  const motifSvg = motifs
    .map((g, i) => `<g transform="translate(${W - 52 - i * 50} ${H - 66})"><circle cx="20" cy="20" r="21" fill="${lighten(col, 0.85)}" stroke="${col}" stroke-width="3"/><text x="20" y="28" text-anchor="middle" font-size="22" font-family="'Noto Serif CJK SC','Noto Serif SC','Songti SC','SimSun',serif" fill="${col}">${g}</text></g>`)
    .join("");
  let paper = "";
  for (let i = 0; i < 40; i++) paper += `<circle cx="${r() * W}" cy="${r() * H}" r="${1 + r() * 3}" fill="${col}" opacity="0.06"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#f4ecdc"/>${paper}<circle cx="200" cy="150" r="128" fill="${lighten(col, 0.88)}"/><g transform="rotate(${angle.toFixed(1)} 200 150)">${emblem(category, col)}</g>${motifSvg}${seal(CATEGORY_GLYPHS[category] ?? "", 0)}</svg>`;
}
