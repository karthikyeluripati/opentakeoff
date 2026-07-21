// One-Click Area benchmark corpus (RFC #60, slice E). REPORT-ONLY: this test
// runs the real flood-fill engine over the committed fixture plans, scores each
// traced room against its golden by IoU, and prints a metrics table. It never
// fails on a score — it is a measurement instrument for engine PRs, not a build
// gate (no agreed IoU floor exists yet). The only hard assertion is a liveness
// guard that the harness actually scored something. Status mismatches surface as
// ✗ rows in the table (a visible regression signal) but do not throw.
//
// The IoU math itself IS gated hard, separately, in polygonIou.test.ts.
//
// Fixtures: web/test/fixtures/corpus/*.json (skip files starting with "_", which
// are generators/helpers). To add a fixture, drop in a JSON file; it is picked
// up automatically. See fixtures/corpus/README.md for the schema + provenance rule.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { scoreCorpus, type CorpusFixture } from "../src/lib/corpusScore.ts";

const dir = new URL("./fixtures/corpus/", import.meta.url);
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
  .sort();
const fixtures: CorpusFixture[] = files.map(
  (f) => JSON.parse(readFileSync(new URL(f, dir), "utf8")) as CorpusFixture,
);

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const iouStr = (v: number | null) => (v == null ? "  —  " : v.toFixed(3));

test("One-Click benchmark corpus (report-only)", () => {
  const m = scoreCorpus(fixtures);

  const rows = m.perFixture.map((s) => {
    const flag = s.statusMatch ? "✓" : "✗";
    const hf = s.hatchFiltered ? " hatchFiltered" : "";
    return `  ${flag} ${s.name.padEnd(22)} ${s.status.padEnd(9)} (want ${s.expectedStatus.padEnd(9)}) IoU ${iouStr(s.iou)}${hf}`;
  });

  const table = [
    "",
    `One-Click Area — corpus benchmark  (${m.total} fixtures)`,
    ...rows,
    "  " + "-".repeat(60),
    `  mean IoU ${iouStr(m.meanIou)}   floor IoU ${iouStr(m.floorIou)}   scored ${m.scoredCount}/${m.total}`,
    `  ok ${m.okCount}/${m.total}   refusal rate ${pct(m.refusalRate)}   leak rate ${pct(m.leakRate)}`,
    "",
  ].join("\n");

  // the printed table IS the deliverable — surfaced in CI logs / pasted into engine PRs
  console.log(table);

  // liveness only — never gate on a score
  assert.ok(m.total > 0, "corpus should contain at least one fixture");
  assert.ok(
    m.perFixture.every((s) => typeof s.status === "string"),
    "every fixture should produce a flood status",
  );
});
