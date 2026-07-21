# One-Click Area benchmark corpus

Committed fixture "plans" scored by [`corpus.test.ts`](../../corpus.test.ts) against
the real flood-fill engine (`web/src/lib/oneclick.ts`). The scorer
(`web/src/lib/corpusScore.ts`) runs `buildMask → floodRegion → traceRegion` on each
fixture and reports IoU vs. a golden room, plus refusal/leak rates. It is
**report-only** — a low score never fails CI; it is a measurement instrument for
engine PRs (RFC #60). Per the RFC, *no One-Click engine PR is reviewable without
pasting the corpus table into the PR description.*

Add a fixture by dropping a `*.json` file here — it is picked up automatically.
Files beginning with `_` (generators/helpers) are skipped by the runner.

## Fixture schema

```jsonc
{
  "name": "clean-rect",                 // unique label (matches filename)
  "description": "…",                   // what this fixture demonstrates
  "source": "…",                        // PROVENANCE — required (see below)
  "img": { "w": 600, "h": 600 },        // sheet size, image-px
  "maxDim": 500,                        // OPTIONAL mask cap (buildMask arg); default MASK_MAX_DIM
  "segs": [x0, y0, x1, y1, ...],        // flat boundary segments, image-px
  "meta": "zero",                       // OPTIONAL — "zero" enables hatch classification;
                                        //   number[] = explicit per-segment bytes; omit = strict
  "seed": [275, 250],                   // click point, image-px
  "sensitivity": 0.5,                   // OPTIONAL fill sensitivity; default SENS_BALANCED
  "expect": { "status": "ok" },         // outcome bucket: ok | leak | tiny | boundary
  "golden": [[x, y], ...]               // true room polygon, image-px; null for leak/refusal
}
```

Golden and traced polygons share the fixture's image-px space, so IoU compares
them directly — no normalization.

## Provenance rule (`source` is mandatory)

The current seed fixtures are **synthetic** — geometry authored for this project,
no third-party plan data. Any future fixture cut from a **real plan** must:

- come from a public-domain or publicly-released set (an architect's seal only),
- have all document metadata stripped, and
- record its origin + license in `source` (and, for binary/PDF-derived fixtures,
  a sibling `<name>.meta.json` documenting the source URL, license, and that
  metadata was stripped).

This mirrors the repo's allowlist ethos for provenance (`docs/CONTRIBUTION_SPEC.md`
§5 — only registered keys leave the machine): nothing enters the corpus whose
origin and license aren't stated.

## Regenerating the hatch pair

`hatch-bounded.json` and `dense-hatch-refusal.json` share one generated geometry
(≈160 segments) and are emitted by [`_generate-hatch.mjs`](./_generate-hatch.mjs) —
**never hand-edit the JSON**. After an intentional change:

```bash
node web/test/fixtures/corpus/_generate-hatch.mjs
```
