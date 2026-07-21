// One-Click Area benchmark scorer (RFC #60, slice E). PURE and DOM-free.
// Runs the real flood-fill engine (buildMask → floodRegion → traceRegion) over
// pre-extracted fixture geometry and scores each traced room against a golden
// room by IoU. It is a MEASUREMENT INSTRUMENT, not a gate: it reports mean/floor
// IoU, refusal rate, and leak rate so an engine PR can prove it got better
// globally rather than just on the plan its author happened to hold. The engine
// stays honest — a refusal (tiny/boundary) is a first-class, counted outcome;
// nothing here nudges the engine toward coverage.
//
// Fixtures carry PRE-EXTRACTED geometry (flat image-px segment arrays), so the
// scorer never touches pdf.js or the DOM — same headless path web/test/
// geometry.test.ts already exercises. Seed and golden polygons share the
// fixture's image-px space, so no normalization is needed for IoU.
import {
  buildMask, floodRegion, traceRegion, ringArea, SENS_BALANCED, MASK_MAX_DIM,
  type FloodResult, type Point,
} from "./oneclick.ts";
import { polygonIou } from "./polygonIou.ts";

export type FloodStatus = FloodResult["status"];

export type CorpusFixture = {
  name: string;
  description?: string;
  source: string;                       // provenance — required (see fixtures/corpus/README.md)
  img: { w: number; h: number };
  maxDim?: number;                      // mask working-raster cap (buildMask arg); defaults to MASK_MAX_DIM
  segs: number[];                       // flat [x0,y0,x1,y1,...] boundary segments, image-px
  meta?: number[] | "zero" | null;      // per-segment bytes; "zero" = all-zero (enables hatch classification)
  seed: [number, number];               // click point, image-px
  sensitivity?: number;                 // defaults to SENS_BALANCED
  expect: { status: FloodStatus };      // the outcome bucket this fixture demonstrates
  golden?: Point[] | null;              // true room polygon, image-px; omit for leak/refusal fixtures
};

export type FixtureScore = {
  name: string;
  status: FloodStatus;
  expectedStatus: FloodStatus;
  statusMatch: boolean;
  hatchFiltered: boolean;
  iou: number | null;                   // null unless status==="ok" && a golden was supplied
  areaPx: number | null;                // traced ring area (image-px²), null unless ok
};

export type CorpusMetrics = {
  perFixture: FixtureScore[];
  meanIou: number | null;               // over fixtures that produced an IoU
  floorIou: number | null;              // min IoU
  refusalRate: number;                  // (tiny + boundary) / total
  leakRate: number;                     // leak / total
  okCount: number;
  scoredCount: number;                  // fixtures with an IoU
  total: number;
};

function resolveMeta(f: CorpusFixture): Uint8Array | undefined {
  if (f.meta === "zero") return new Uint8Array(f.segs.length >> 2);
  if (Array.isArray(f.meta)) return Uint8Array.from(f.meta);
  return undefined;
}

/** Score one fixture through the engine. Pure — no fs, no DOM. */
export function scoreFixture(f: CorpusFixture): FixtureScore {
  const meta = resolveMeta(f);
  const mask = buildMask(f.segs, f.img.w, f.img.h, f.maxDim ?? MASK_MAX_DIM, meta ?? null);
  const flood = floodRegion(mask, f.seed[0], f.seed[1], f.sensitivity ?? SENS_BALANCED);

  let iou: number | null = null;
  let areaPx: number | null = null;
  let hatchFiltered = false;
  if (flood.status === "ok") {
    hatchFiltered = !!flood.hatchFiltered;
    const ring = traceRegion(flood);
    areaPx = ringArea(ring);
    if (f.golden && f.golden.length >= 3) iou = polygonIou(ring, f.golden);
  }
  return {
    name: f.name,
    status: flood.status,
    expectedStatus: f.expect.status,
    statusMatch: flood.status === f.expect.status,
    hatchFiltered,
    iou,
    areaPx,
  };
}

/** Score a whole corpus and aggregate the benchmark metrics. Pure. */
export function scoreCorpus(fixtures: CorpusFixture[]): CorpusMetrics {
  const perFixture = fixtures.map(scoreFixture);
  const ious = perFixture.map((s) => s.iou).filter((v): v is number => v != null);
  const total = perFixture.length;
  const refusals = perFixture.filter((s) => s.status === "tiny" || s.status === "boundary").length;
  const leaks = perFixture.filter((s) => s.status === "leak").length;
  return {
    perFixture,
    meanIou: ious.length ? ious.reduce((a, b) => a + b, 0) / ious.length : null,
    floorIou: ious.length ? Math.min(...ious) : null,
    refusalRate: total ? refusals / total : 0,
    leakRate: total ? leaks / total : 0,
    okCount: perFixture.filter((s) => s.status === "ok").length,
    scoredCount: ious.length,
    total,
  };
}
