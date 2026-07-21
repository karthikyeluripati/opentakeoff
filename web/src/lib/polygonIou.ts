// Polygon intersection-over-union (RFC #60, slice E). PURE and DOM-free.
// The One-Click benchmark scores a traced room against a golden room by IoU —
// intersection area / union area, in [0,1]. We compute it by RASTERIZING both
// rings onto a fixed lattice over their shared bounding box and counting cells,
// rather than with an analytic clipper. Rooms are routinely concave (L/U/T
// shapes), and a robust general polygon clipper (Weiler–Atherton /
// Greiner–Hormann) is fragile exactly where floor plans live — collinear edges,
// near-degenerate corners, vertices that touch. Grid IoU has none of those
// failure modes: it is fully deterministic, concavity-agnostic, and its error
// is bounded and shrinks with the grid. For a benchmark whose one job is to
// produce "a number that must go up", monotonic + reproducible beats a fraction
// of a percent of precision. Matches the engine's own raster nature.
import { pointInPoly } from "./geometry.js";
import type { Point } from "./oneclick.ts";

// Lattice resolution per axis. 512² = 262 144 samples over the union bbox —
// worst-case cell error is ~1/512 of a side, i.e. sub-percent IoU, and it is
// symmetric so it does not bias one ring over the other.
export const IOU_GRID = 512;

/**
 * Intersection-over-union of two simple polygons (image-px, any winding).
 * Returns a value in [0,1]; 0 when either ring is degenerate or they are
 * disjoint, 1 when they coincide (within lattice tolerance). Concave rings are
 * handled correctly — `pointInPoly` is an even-odd test.
 */
export function polygonIou(a: Point[], b: Point[], grid: number = IOU_GRID): number {
  if (a.length < 3 || b.length < 3) return 0;

  // union bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y] of [...a, ...b]) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  const w = maxX - minX, h = maxY - minY;
  if (w <= 0 || h <= 0) return 0;

  // sample cell CENTERS so the lattice is symmetric across the box
  let inA = 0, inB = 0, both = 0;
  for (let gy = 0; gy < grid; gy++) {
    const py = minY + ((gy + 0.5) / grid) * h;
    for (let gx = 0; gx < grid; gx++) {
      const px = minX + ((gx + 0.5) / grid) * w;
      const a1 = pointInPoly(px, py, a);
      const b1 = pointInPoly(px, py, b);
      if (a1) inA++;
      if (b1) inB++;
      if (a1 && b1) both++;
    }
  }
  const union = inA + inB - both;
  return union > 0 ? both / union : 0;
}
