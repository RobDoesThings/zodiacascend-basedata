// Builds a text-to-image prompt for every card from its draft data. The prompts are written to
// art/prompts.json by `npm run art:prompts` so they can be reviewed (and hand-edited through
// art/prompt-overrides.json) before any credits are spent.

import { createHash } from "node:crypto";

export interface PromptJob {
  key: string; // image key, e.g. "torakai" or "card:reed-pitfall"
  file: string; // file name under art/generated/, e.g. "torakai.jpg"
  kind: "zodiac" | "wanderer" | "spirit" | "card";
  name: string;
  prompt: string;
  seed: number;
  width: number;
  height: number;
}

// 4:3, multiples of 32, inside FLUX's 256–1440 range.
export const WIDTH = 1024;
export const HEIGHT = 768;

const STYLE =
  "Realistic fantasy creature illustration for a collectible trading card. Painterly digital painting with lifelike anatomy, " +
  "detailed fur, feathers or scales, natural proportions and soft cinematic lighting. East Asian ink-wash atmosphere in the " +
  "background, shallow depth of field. One main creature, full body, centred, facing three-quarters to the right, with clear space " +
  "around it. No text, no lettering, no logos, no border, no frame, no watermark, no people.";

const CARD_STYLE =
  "Symbolic illustration for a collectible card, painterly and realistic, rich textures and soft dramatic lighting, East Asian " +
  "ink-wash atmosphere. A still life of objects and natural elements only. No text, no lettering, no border, no watermark, no people.";

const ELEMENT_SETTING: Record<string, string> = {
  wood: "spring green palette, bamboo and blossom, morning mist",
  fire: "warm red and amber palette, glowing paper lanterns and drifting embers, summer dusk",
  earth: "ochre and golden palette, terraced hills and sun-warmed stone, late-summer haze",
  metal: "cool silver and white palette, autumn mountains, bronze temple bells and crisp air",
  water: "deep blue palette, moonlit river or sea, waves and soft fog, winter night",
};

// Colour only, for hand-written art descriptions that already set the scene and time of day.
const ELEMENT_COLOURS: Record<string, string> = {
  wood: "fresh greens and jade with soft gold light",
  fire: "warm reds, ambers and gold",
  earth: "ochre, gold and warm earth tones",
  metal: "cool silvers, whites and bronze accents",
  water: "deep blues, indigo and silver",
};

const article = (w: string) => (/^[aeiou]/i.test(w) ? "an" : "a");

const STAGE: Record<string, string> = {
  Kit: "shown as a small, young and endearing juvenile",
  Adept: "shown as a strong, agile adolescent",
  Sovereign: "shown as an immense, majestic and ancient ruler of legend with a powerful elemental aura",
  Wanderer: "shown young",
  "Elder Wanderer": "shown fully grown",
};

const ANIMAL: Record<string, string> = {
  rat: "rat", buffalo: "Asian water buffalo (swept-back crescent horns)", tiger: "tiger", cat: "cat", dragon: "East Asian long dragon (serpentine body, four clawed legs, whiskers, antlers)",
  snake: "snake", horse: "horse", goat: "goat", monkey: "monkey", rooster: "rooster", dog: "dog", pig: "pig",
};

const words = (id: string) => id.replace(/-/g, " ");

function colouring(s: any): string {
  const m = s.characteristics?.markings ?? [];
  return m.slice(0, 2).map((x: any) => words(x.id)).join(" with ") || "natural";
}

const firstSentence = (t: string) => (t.match(/^[^.!?]+[.!?]/)?.[0] ?? t).trim();

/** Stable 31-bit seed per key, so re-runs reproduce the same composition. */
export function seedFor(key: string): number {
  return parseInt(createHash("sha256").update(key).digest("hex").slice(0, 8), 16) & 0x7fffffff;
}

export const fileFor = (key: string) => `${key.replace(/^card:/, "card-")}.jpg`;

function job(key: string, kind: PromptJob["kind"], name: string, prompt: string): PromptJob {
  return { key, file: fileFor(key), kind, name, prompt: prompt.replace(/\s+/g, " ").trim(), seed: seedFor(key), width: WIDTH, height: HEIGHT };
}

export function buildPrompts(d: { zodiac: any[]; wanderers: any[]; spirits: any[]; cards: any[] }): PromptJob[] {
  const jobs: PromptJob[] = [];
  for (const s of d.zodiac) {
    // A hand-written art description replaces the generated subject details.
    if (s.art_description) {
      jobs.push(
        job(
          s.id,
          "zodiac",
          s.name,
          `${STYLE} Subject: ${s.name}${s.epithet ? ` ("${s.epithet}")` : ""}, ${article(ANIMAL[s.animal])} ${ANIMAL[s.animal]} of the ${s.element} element, ${STAGE[s.stage_name]}. ` +
            `${s.art_description} Colour palette: ${ELEMENT_COLOURS[s.element]}.`,
        ),
      );
      continue;
    }
    jobs.push(
      job(
        s.id,
        "zodiac",
        s.name,
        `${STYLE} Subject: ${s.name}${s.epithet ? ` ("${s.epithet}")` : ""}, ${article(ANIMAL[s.animal])} ${ANIMAL[s.animal]} of the ${s.element} element, ${STAGE[s.stage_name]}. ` +
          `${s.description} Colouring: ${colouring(s)}. Setting: ${s.habitat ? `${s.habitat.replace(/\.$/, "")}; ` : ""}${ELEMENT_SETTING[s.element]}.`,
      ),
    );
  }
  for (const s of d.wanderers) {
    const el = s.elements[0];
    const folk = s.mythical && s.folklore_sources?.[0] ? ` Inspired by ${s.folklore_sources[0].region} folklore.` : "";
    jobs.push(
      job(
        s.id,
        "wanderer",
        s.name,
        `${STYLE} Subject: ${s.name}, a wild ${s.mythical ? "creature of myth" : "animal"}, ${STAGE[s.stage_name]}. ${s.description}${folk} ` +
          `Colouring: ${colouring(s)}. Setting: ${ELEMENT_SETTING[el]}.`,
      ),
    );
  }
  for (const s of d.spirits) {
    const els: string[] = s.type.elements;
    const setting = els.length ? els.map((e) => ELEMENT_SETTING[e]).join("; blended with ") : "a starry night sky during a total eclipse, black sun ringed with gold";
    jobs.push(
      job(
        s.id,
        "spirit",
        s.name,
        `${STYLE} Subject: ${s.name}, a mysterious ${s.creature} spirit with a faint ethereal glow. ${firstSentence(s.lore)} ` +
          `Setting: ${setting}.`,
      ),
    );
  }
  for (const c of d.cards) {
    jobs.push(
      job(
        `card:${c.id}`,
        "card",
        c.name,
        `${CARD_STYLE} Theme: "${c.name}", a ${c.category} card. ${c.flavour ? `${c.flavour} ` : ""}The image should evoke this effect: ${c.card_text}`,
      ),
    );
  }
  return jobs;
}

export function promptHash(j: PromptJob): string {
  return createHash("sha256").update(`${j.prompt}|${j.seed}|${j.width}x${j.height}`).digest("hex").slice(0, 16);
}
