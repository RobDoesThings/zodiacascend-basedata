// Loads the hand-authored YAML in /data.

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { parse } from "yaml";

export const ROOT = join(import.meta.dirname, "..", "..");
export const DATA_DIR = join(ROOT, "data");
export const SCHEMA_DIR = join(ROOT, "schemas");

export interface SourceFile<T = unknown> {
  /** Path relative to the project root, for messages. */
  path: string;
  data: T;
}

export function readYaml<T = unknown>(path: string): SourceFile<T> {
  const text = readFileSync(path, "utf8");
  return { path: relative(ROOT, path), data: parse(text, { prettyErrors: true }) as T };
}

export function readYamlDir<T = unknown>(dir: string): SourceFile<T>[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".yaml"))
    .sort()
    .map((f) => readYaml<T>(join(dir, f)));
}

// Loose shapes of the source data; the JSON Schemas are the strict contract.
export type Element = "wood" | "fire" | "earth" | "metal" | "water";

export interface ElementData {
  id: Element;
  name: string;
  glyph: string;
  colour: string;
  form_prefix: string;
  stat_bump: { ability: string; amount: number };
  generates: Element;
  controls: Element;
}

export interface FamilyData {
  id: string;
  name: string;
  wanderer_only: boolean;
}

export interface BondsData {
  trines: { id: string; members: string[] }[];
  kindred: { id: string; members: string[]; combo_move?: string }[];
  rivals: { id: string; members: string[] }[];
}

export interface RulesData {
  levels: { min: number; max: number };
  rank: { min_level: number; max_level: number; bonus: number }[];
  abilities: { modifier_base: number; modifier_divisor: number };
  technique_dc: { base: number };
  zodiac_order: string[];
  conditions: { id: string }[];
  element_relationships: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

export interface Dataset {
  elements: SourceFile<{ elements: ElementData[] }>;
  families: SourceFile<{ families: FamilyData[] }>;
  bonds: SourceFile<BondsData>;
  rules: SourceFile<RulesData>;
  lines: SourceFile<Record<string, unknown>>[];
  moves: SourceFile<{ moves: Record<string, unknown>[] }>[];
  fields: SourceFile<{ fields: Record<string, unknown>[] }> | null;
}

export function loadDataset(): Dataset {
  const opt = (name: string) => (existsSync(join(DATA_DIR, name)) ? readYaml<any>(join(DATA_DIR, name)) : null);
  const movesDir = join(DATA_DIR, "moves");
  return {
    elements: readYaml(join(DATA_DIR, "elements.yaml")),
    families: readYaml(join(DATA_DIR, "families.yaml")),
    bonds: readYaml(join(DATA_DIR, "bonds.yaml")),
    rules: readYaml(join(DATA_DIR, "rules.yaml")),
    lines: readYamlDir(join(DATA_DIR, "lines")),
    moves: [
      ...(existsSync(join(movesDir, "universal.yaml")) ? [readYaml<any>(join(movesDir, "universal.yaml"))] : []),
      ...readYamlDir<any>(join(movesDir, "elements")),
      ...readYamlDir<any>(join(movesDir, "families")),
      ...readYamlDir<any>(join(movesDir, "signatures")),
      ...(existsSync(join(movesDir, "combos.yaml")) ? [readYaml<any>(join(movesDir, "combos.yaml"))] : []),
    ],
    fields: opt("fields.yaml"),
  };
}
