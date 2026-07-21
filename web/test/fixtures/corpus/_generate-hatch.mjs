// Regenerates the two hatch fixtures (hatch-bounded.json, dense-hatch-refusal.json).
// They share one geometry — a solid-walled room whose interior is packed with a
// tight vertical tile-hatch — and differ only in `meta`, which is exactly what
// flips the engine's outcome:
//   • meta:"zero"  → classifyHatchSegs detects the parallel-row family → soft
//     boundaries → grow-but-verify escalation fills the room  → "ok" (hatchFiltered)
//   • meta omitted → strict pass is trapped between hatch lines → "tiny"/"boundary"
// Geometry mirrors the proven case in web/test/geometry.test.ts:93 (1000×800 sheet
// at maxDim 500 ⇒ ws 0.5, so the 4px pitch becomes 2px sub-thickness slivers).
// Run: node web/test/fixtures/corpus/_generate-hatch.mjs   (never hand-edit the JSON)
import { writeFileSync } from "node:fs";

const sq = (x0, y0, x1, y1) => [x0, y0, x1, y0, x1, y0, x1, y1, x1, y1, x0, y1, x0, y1, x0, y0];
const border = sq(2, 2, 998, 798);
const room = sq(100, 100, 700, 500);
const hatch = [];
for (let x = 100; x <= 700; x += 4) hatch.push(x, 100, x, 500);
const segs = [...border, ...room, ...hatch];

const base = {
  img: { w: 1000, h: 800 },
  maxDim: 500,
  segs,
  seed: [400, 300],
  golden: [[100, 100], [700, 100], [700, 500], [100, 500]],
};
const src = "synthetic — authored for this project (no third-party plan data)";
const here = new URL(".", import.meta.url);

writeFileSync(new URL("hatch-bounded.json", here), JSON.stringify({
  name: "hatch-bounded",
  description: "A tile-hatched room: solid walls, interior packed with a tight vertical hatch. With meta the hatch family classifies soft and grow-but-verify escalation fills to the walls — status ok, hatchFiltered. Golden is the wall-inner interior.",
  source: src,
  ...base,
  meta: "zero",
  expect: { status: "ok" },
}, null, 2) + "\n");

writeFileSync(new URL("dense-hatch-refusal.json", here), JSON.stringify({
  name: "dense-hatch-refusal",
  description: "Identical geometry to hatch-bounded but with no meta, so hatch classification is disabled. The strict fill is trapped between hatch lines and refuses rather than guessing — the honest refusal outcome. No golden.",
  source: src,
  ...base,
  golden: null,
  expect: { status: "tiny" },
}, null, 2) + "\n");

console.log("wrote hatch-bounded.json and dense-hatch-refusal.json;", segs.length >> 2, "segments each");
