// Pure rule helpers driven by rules.yaml and elements.yaml.

import type { Element, ElementData, RulesData } from "./data.ts";

export type Relationship =
  | "attacker_controls_defender"
  | "defender_controls_attacker"
  | "attacker_generates_defender"
  | "defender_generates_attacker"
  | "same_element";

export function abilityModifier(score: number, rules: RulesData): number {
  return Math.floor((score - rules.abilities.modifier_base) / rules.abilities.modifier_divisor);
}

export function rankForLevel(level: number, rules: RulesData): number {
  const row = rules.rank.find((r) => level >= r.min_level && level <= r.max_level);
  if (!row) throw new Error(`no rank defined for level ${level}`);
  return row.bonus;
}

export function techniqueDc(level: number, abilityScore: number, rules: RulesData): number {
  return rules.technique_dc.base + rankForLevel(level, rules) + abilityModifier(abilityScore, rules);
}

export function relationship(attacker: Element, defender: Element, elements: ElementData[]): Relationship {
  if (attacker === defender) return "same_element";
  const by = new Map(elements.map((e) => [e.id, e]));
  const a = by.get(attacker)!;
  const d = by.get(defender)!;
  if (a.controls === defender) return "attacker_controls_defender";
  if (d.controls === attacker) return "defender_controls_attacker";
  if (a.generates === defender) return "attacker_generates_defender";
  if (d.generates === attacker) return "defender_generates_attacker";
  throw new Error(`no relationship between ${attacker} and ${defender}; the cycles are inconsistent`);
}

/** Full attacker x defender matrix of relationship names. */
export function relationshipMatrix(elements: ElementData[]): Record<Element, Record<Element, Relationship>> {
  const ids = elements.map((e) => e.id);
  return Object.fromEntries(
    ids.map((a) => [a, Object.fromEntries(ids.map((d) => [d, relationship(a, d, elements)]))]),
  ) as Record<Element, Record<Element, Relationship>>;
}

/** Follows a cycle edge from `start` and returns the visiting order, or null if it isn't one closed cycle through all elements. */
export function walkCycle(elements: ElementData[], edge: "generates" | "controls"): Element[] | null {
  const by = new Map(elements.map((e) => [e.id, e]));
  const start = elements[0].id;
  const order: Element[] = [start];
  let cur = by.get(start)![edge];
  while (cur !== start) {
    if (order.includes(cur) || !by.has(cur)) return null;
    order.push(cur);
    cur = by.get(cur)![edge];
  }
  return order.length === elements.length ? order : null;
}
