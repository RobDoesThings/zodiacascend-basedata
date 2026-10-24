import { test } from "node:test";
import assert from "node:assert/strict";
import { DiceError, expectedValue, maxValue, minValue, parseDice, roll, seededRng } from "../scripts/lib/dice.ts";

test("parses dice, constants, abilities and RANK", () => {
  assert.deepEqual(parseDice("2d8+STR").terms, [
    { kind: "dice", sign: 1, count: 2, sides: 8 },
    { kind: "ability", sign: 1, ability: "STR" },
  ]);
  assert.deepEqual(parseDice("1d10 + 4").terms, [
    { kind: "dice", sign: 1, count: 1, sides: 10 },
    { kind: "const", sign: 1, value: 4 },
  ]);
  assert.deepEqual(parseDice("1d6+RANK-1").terms.map((t) => t.kind), ["dice", "rank", "const"]);
  assert.equal(parseDice("6d6").terms.length, 1);
  assert.equal(parseDice("4").terms[0].kind, "const");
});

test("rejects malformed expressions", () => {
  for (const bad of ["", "d6", "2d", "2d8+", "+2d8", "2d8++4", "2d8 4", "2x8", "STRENGTH", "0d6", "1d1", "2d8+foo"]) {
    assert.throws(() => parseDice(bad), DiceError, bad);
  }
});

test("expected, min and max values", () => {
  const ctx = { modifiers: { STR: 4 }, rank: 3 };
  assert.equal(expectedValue("2d8+STR", ctx), 13);
  assert.equal(minValue("2d8+STR", ctx), 6);
  assert.equal(maxValue("2d8+STR", ctx), 20);
  assert.equal(expectedValue("6d6"), 21);
  assert.equal(expectedValue("1d6+RANK-1", ctx), 5.5);
  assert.equal(minValue("1d4-1d6"), -5);
  assert.equal(maxValue("1d4-1d6"), 3);
});

test("critical hits double the dice, not the modifiers", () => {
  assert.equal(expectedValue("2d8+4", {}, true), 22);
  const r = roll("2d8+4", {}, seededRng(1), true);
  assert.equal(r.rolls[0].results.length, 4);
});

test("rolls stay within bounds and are deterministic for a seed", () => {
  const a = seededRng(42);
  for (let i = 0; i < 1000; i++) {
    const { total } = roll("3d6+DEX", { modifiers: { DEX: 2 } }, a);
    assert.ok(total >= 5 && total <= 20, `total ${total}`);
  }
  const first = roll("4d10", {}, seededRng(7)).total;
  const second = roll("4d10", {}, seededRng(7)).total;
  assert.equal(first, second);
});

test("missing abilities count as +0", () => {
  assert.equal(expectedValue("1d4+CHA"), 2.5);
});
