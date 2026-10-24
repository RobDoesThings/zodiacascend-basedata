// Dice expressions such as "2d8+STR", "1d10+4", "6d6" or "1d6+RANK-1".
// Terms are dice (NdM), integer constants, ability names (their modifier) or RANK,
// joined by + or -.

export const ABILITIES = ["STR", "DEX", "CON", "INT", "WIS", "CHA"] as const;
export type Ability = (typeof ABILITIES)[number];

export type DiceTerm =
  | { kind: "dice"; sign: 1 | -1; count: number; sides: number }
  | { kind: "const"; sign: 1 | -1; value: number }
  | { kind: "ability"; sign: 1 | -1; ability: Ability }
  | { kind: "rank"; sign: 1 | -1 };

export interface DiceExpression {
  source: string;
  terms: DiceTerm[];
}

export interface DiceContext {
  /** Ability modifiers (not scores). */
  modifiers?: Partial<Record<Ability, number>>;
  rank?: number;
}

export class DiceError extends Error {}

const TERM = /^(?:(\d+)d(\d+)|(\d+)|(STR|DEX|CON|INT|WIS|CHA)|(RANK))$/;
const MAX_DICE = 100;
const MAX_SIDES = 1000;

export function parseDice(source: string): DiceExpression {
  if (/[0-9A-Za-z]\s+[0-9A-Za-z]/.test(source)) throw new DiceError(`missing operator in "${source}"`);
  const compact = source.replace(/\s+/g, "");
  if (compact === "") throw new DiceError("empty dice expression");
  // Split into signed chunks: "2d8+STR-1" -> ["2d8", "+STR", "-1"]
  const chunks = compact.match(/[+-]?[^+-]+/g);
  if (!chunks || chunks.join("") !== compact) throw new DiceError(`malformed dice expression "${source}"`);

  const terms: DiceTerm[] = chunks.map((chunk, i) => {
    let sign: 1 | -1 = 1;
    let body = chunk;
    if (chunk[0] === "+" || chunk[0] === "-") {
      if (i === 0) throw new DiceError(`expression may not start with a sign: "${source}"`);
      sign = chunk[0] === "-" ? -1 : 1;
      body = chunk.slice(1);
    } else if (i > 0) {
      throw new DiceError(`missing operator in "${source}"`);
    }
    const m = TERM.exec(body);
    if (!m) throw new DiceError(`unknown term "${body}" in "${source}"`);
    if (m[1] !== undefined) {
      const count = Number(m[1]);
      const sides = Number(m[2]);
      if (count < 1 || count > MAX_DICE) throw new DiceError(`dice count out of range in "${source}"`);
      if (sides < 2 || sides > MAX_SIDES) throw new DiceError(`die size out of range in "${source}"`);
      return { kind: "dice", sign, count, sides };
    }
    if (m[3] !== undefined) return { kind: "const", sign, value: Number(m[3]) };
    if (m[4] !== undefined) return { kind: "ability", sign, ability: m[4] as Ability };
    return { kind: "rank", sign };
  });

  return { source, terms };
}

function flatValue(term: DiceTerm, ctx: DiceContext): number {
  switch (term.kind) {
    case "const":
      return term.value;
    case "ability":
      return ctx.modifiers?.[term.ability] ?? 0;
    case "rank":
      return ctx.rank ?? 0;
    case "dice":
      throw new Error("unreachable");
  }
}

/** Expected (mean) value. `critical` doubles the number of dice, never the flat terms. */
export function expectedValue(expr: DiceExpression | string, ctx: DiceContext = {}, critical = false): number {
  const e = typeof expr === "string" ? parseDice(expr) : expr;
  return e.terms.reduce((sum, t) => {
    if (t.kind === "dice") {
      const count = critical ? t.count * 2 : t.count;
      return sum + t.sign * count * ((t.sides + 1) / 2);
    }
    return sum + t.sign * flatValue(t, ctx);
  }, 0);
}

export function minValue(expr: DiceExpression | string, ctx: DiceContext = {}): number {
  const e = typeof expr === "string" ? parseDice(expr) : expr;
  return e.terms.reduce((sum, t) => {
    if (t.kind === "dice") return sum + (t.sign > 0 ? t.count : -t.count * t.sides);
    return sum + t.sign * flatValue(t, ctx);
  }, 0);
}

export function maxValue(expr: DiceExpression | string, ctx: DiceContext = {}): number {
  const e = typeof expr === "string" ? parseDice(expr) : expr;
  return e.terms.reduce((sum, t) => {
    if (t.kind === "dice") return sum + (t.sign > 0 ? t.count * t.sides : -t.count);
    return sum + t.sign * flatValue(t, ctx);
  }, 0);
}

/** A source of uniform floats in [0, 1). Pass a seeded generator for determinism. */
export type Rng = () => number;

export interface RollResult {
  total: number;
  rolls: { die: string; results: number[] }[];
}

export function roll(expr: DiceExpression | string, ctx: DiceContext = {}, rng: Rng = Math.random, critical = false): RollResult {
  const e = typeof expr === "string" ? parseDice(expr) : expr;
  const rolls: RollResult["rolls"] = [];
  let total = 0;
  for (const t of e.terms) {
    if (t.kind === "dice") {
      const count = critical ? t.count * 2 : t.count;
      const results = Array.from({ length: count }, () => 1 + Math.floor(rng() * t.sides));
      rolls.push({ die: `${count}d${t.sides}`, results });
      total += t.sign * results.reduce((a, b) => a + b, 0);
    } else {
      total += t.sign * flatValue(t, ctx);
    }
  }
  return { total, rolls };
}

/** Small, fast, seedable PRNG (mulberry32). Same seed, same sequence, on every platform. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
