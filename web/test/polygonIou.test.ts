// IoU primitive tests — pure geometry, runs straight under node. The benchmark's
// whole credibility rests on this number, so the math is gated hard here (unlike
// the report-only corpus scorer). Grid IoU is approximate, so identical/known
// overlaps are asserted within a small tolerance, not exactly.
import { test } from "node:test";
import assert from "node:assert/strict";
import { polygonIou } from "../src/lib/polygonIou.ts";
import type { Point } from "../src/lib/oneclick.ts";

const near = (a: number, b: number, tol = 0.01) => Math.abs(a - b) <= tol;
const unit: Point[] = [[0, 0], [1, 0], [1, 1], [0, 1]];

test("identical squares → 1.0", () => {
  assert.ok(near(polygonIou(unit, unit), 1), `got ${polygonIou(unit, unit)}`);
});

test("disjoint squares → 0", () => {
  const far: Point[] = [[5, 5], [6, 5], [6, 6], [5, 6]];
  assert.equal(polygonIou(unit, far), 0);
});

test("half-overlap: two unit squares offset by 0.5 in x → 1/3", () => {
  // overlap = 0.5×1 = 0.5; union = 1 + 1 − 0.5 = 1.5; IoU = 1/3
  const shifted: Point[] = [[0.5, 0], [1.5, 0], [1.5, 1], [0.5, 1]];
  assert.ok(near(polygonIou(unit, shifted), 1 / 3), `got ${polygonIou(unit, shifted)}`);
});

test("containment: a quarter-square inside the unit square → 1/4", () => {
  // inner area 0.25, union = 1, IoU = 0.25
  const inner: Point[] = [[0, 0], [0.5, 0], [0.5, 0.5], [0, 0.5]];
  assert.ok(near(polygonIou(unit, inner), 0.25), `got ${polygonIou(unit, inner)}`);
});

test("concave L-room vs itself → 1.0 (even-odd handles concavity)", () => {
  const L: Point[] = [[0, 0], [3, 0], [3, 1], [1, 1], [1, 3], [0, 3]];
  assert.ok(near(polygonIou(L, L), 1), `got ${polygonIou(L, L)}`);
});

test("winding-agnostic: reversed vertex order scores the same", () => {
  const cw = [...unit].reverse();
  assert.ok(near(polygonIou(unit, cw), 1), `got ${polygonIou(unit, cw)}`);
});

test("degenerate rings (< 3 verts) → 0", () => {
  assert.equal(polygonIou([[0, 0], [1, 1]] as Point[], unit), 0);
  assert.equal(polygonIou(unit, [] as Point[]), 0);
});
