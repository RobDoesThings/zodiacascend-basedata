import { test } from "node:test";
import assert from "node:assert/strict";
import { loadDataset } from "../scripts/lib/data.ts";
import { abilityModifier, rankForLevel, relationship, relationshipMatrix, techniqueDc } from "../scripts/lib/rules.ts";

const ds = loadDataset();
const rules = ds.rules.data;
const elements = ds.elements.data.elements;

test("ability modifiers follow the d20 curve", () => {
  assert.deepEqual([1, 8, 9, 10, 11, 12, 14, 18, 20, 30].map((s) => abilityModifier(s, rules)), [-5, -1, -1, 0, 0, 1, 2, 4, 5, 10]);
});

test("rank bonus by level", () => {
  assert.deepEqual([1, 8, 9, 16, 17, 28, 29, 40].map((l) => rankForLevel(l, rules)), [2, 2, 3, 3, 4, 4, 5, 5]);
  assert.throws(() => rankForLevel(41, rules));
});

test("technique DC is 8 + Rank + ability modifier", () => {
  assert.equal(techniqueDc(1, 14, rules), 12);
  assert.equal(techniqueDc(36, 18, rules), 17);
});

test("canon element relationships", () => {
  assert.equal(relationship("wood", "earth", elements), "attacker_controls_defender");
  assert.equal(relationship("earth", "wood", elements), "defender_controls_attacker");
  assert.equal(relationship("wood", "fire", elements), "attacker_generates_defender");
  assert.equal(relationship("fire", "wood", elements), "defender_generates_attacker");
  assert.equal(relationship("water", "fire", elements), "attacker_controls_defender");
  assert.equal(relationship("metal", "wood", elements), "attacker_controls_defender");
  assert.equal(relationship("metal", "metal", elements), "same_element");
});

test("each element has exactly one of each relationship toward the other four", () => {
  const m = relationshipMatrix(elements);
  for (const a of Object.keys(m)) {
    const row = Object.values(m[a as keyof typeof m]).filter((r) => r !== "same_element").sort();
    assert.deepEqual(row, [
      "attacker_controls_defender",
      "attacker_generates_defender",
      "defender_controls_attacker",
      "defender_generates_attacker",
    ]);
  }
});
