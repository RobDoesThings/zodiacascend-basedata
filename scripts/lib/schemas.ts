// Compiles every JSON Schema in /schemas with Ajv (draft 2020-12).

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Ajv2020, type ValidateFunction } from "ajv/dist/2020.js";
import { SCHEMA_DIR } from "./data.ts";

export type SchemaName =
  | "common" | "element" | "family" | "line" | "creature" | "move" | "field"
  | "bonds" | "rules" | "learnset" | "lore" | "envelope";

export function loadSchemas(): Record<string, object> {
  const out: Record<string, object> = {};
  for (const file of readdirSync(SCHEMA_DIR).filter((f) => f.endsWith(".schema.json")).sort()) {
    out[file.replace(".schema.json", "")] = JSON.parse(readFileSync(join(SCHEMA_DIR, file), "utf8"));
  }
  return out;
}

export function createValidator() {
  // The schemas use a few annotation-only formats (uri-reference); don't fail on them.
  const ajv = new Ajv2020({ allErrors: true, strict: true, validateFormats: false });
  const schemas = loadSchemas();
  for (const schema of Object.values(schemas)) ajv.addSchema(schema);

  const cache = new Map<SchemaName, ValidateFunction>();
  const get = (name: SchemaName) => {
    let fn = cache.get(name);
    if (!fn) {
      const id = (schemas[name] as { $id: string }).$id;
      fn = ajv.getSchema(id);
      if (!fn) throw new Error(`schema ${name} not registered`);
      cache.set(name, fn);
    }
    return fn;
  };

  /** Returns human-readable error strings; empty when valid. */
  return function validate(name: SchemaName, value: unknown, where: string): string[] {
    const fn = get(name);
    if (fn(value)) return [];
    return (fn.errors ?? []).map((e) => {
      const extra = e.params && "additionalProperty" in e.params ? ` (${(e.params as any).additionalProperty})` : "";
      return `${where}${e.instancePath || ""}: ${e.message}${extra}`;
    });
  };
}
