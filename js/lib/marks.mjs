// Cluster identity, drawn. The owner is colorblind, so membership is never hue:
// it is the shape of the mark, and the partition is a heavy drawn outline. Four
// filled silhouettes separate by outline at small sizes, and plus and cross are
// stroke-only line marks that read differently from all four fills and from each
// other. Six is the ceiling, which is where the k cap on the membership-drawing
// instruments comes from. elbow draws no membership and is not capped.
//
// The boundary: every point goes to its nearest center, so a k-means cell is a
// Voronoi cell, and the boundary of cluster j is the zero level set of
//   f_j(p) = d2(p, c_j) - min over l != j of d2(p, c_l)
// which is a scalar field, which is what contours.mjs already traces. Tracing
// every j walks each internal wall twice, once from each side, so the segments
// are deduped on a rounded midpoint.

import { isoSegments } from './contours.mjs';
import { d2 } from '../math/kmeans.mjs';

export const MARK_KINDS = ['circle', 'square', 'triangle', 'diamond', 'plus', 'cross'];
export const MAX_MARKS = MARK_KINDS.length;

export function markFor(i) {
  if (!(i >= 0 && i < MAX_MARKS)) {
    throw new RangeError(`cluster ${i} has no mark: the shape budget is six, and k is capped there`);
  }
  return MARK_KINDS[i];
}

const N = v => +v.toFixed(2);

// Returns {d, filled}. filled marks are painted with a screen and outlined;
// unfilled marks are stroked only. The caller decides stroke width and paint.
export function markPath(kind, cx, cy, r) {
  const x = N(cx), y = N(cy);
  switch (kind) {
    case 'circle':
      return { d: `M${N(cx - r)} ${y}a${N(r)} ${N(r)} 0 1 0 ${N(2 * r)} 0a${N(r)} ${N(r)} 0 1 0 ${N(-2 * r)} 0Z`, filled: true };
    case 'square':
      return { d: `M${N(cx - r)} ${N(cy - r)}H${N(cx + r)}V${N(cy + r)}H${N(cx - r)}Z`, filled: true };
    case 'triangle':
      return { d: `M${x} ${N(cy - r)}L${N(cx + r)} ${N(cy + r * 0.8)}L${N(cx - r)} ${N(cy + r * 0.8)}Z`, filled: true };
    case 'diamond':
      return { d: `M${x} ${N(cy - r)}L${N(cx + r)} ${y}L${x} ${N(cy + r)}L${N(cx - r)} ${y}Z`, filled: true };
    case 'plus':
      return { d: `M${N(cx - r)} ${y}H${N(cx + r)}M${x} ${N(cy - r)}V${N(cy + r)}`, filled: false };
    case 'cross': {
      const q = N(r * 0.75);
      return { d: `M${N(cx - q)} ${N(cy - q)}L${N(cx + q)} ${N(cy + q)}M${N(cx + q)} ${N(cy - q)}L${N(cx - q)} ${N(cy + q)}`, filled: false };
    }
    default:
      throw new RangeError(`unknown mark kind: ${kind}`);
  }
}

// frame: {plot:{x0,y0,x1,y1}, invX, invY} as built by js/lib/frame.mjs.
// Returns segments [x0, y0, x1, y1] in screen coordinates.
// n is the grid resolution; keep it coarse, the cost is O(n^2 * k^2).
export function partitionSegments(centers, frame, { n = 64 } = {}) {
  if (centers.length < 2) return [];
  const { plot } = frame;
  const w = (plot.x1 - plot.x0) / n, h = (plot.y1 - plot.y0) / n;
  const px = i => plot.x0 + i * w, py = j => plot.y0 + j * h;

  // Squared distance from every grid node to every center, computed once.
  const dist = [];
  for (let j = 0; j <= n; j++) {
    const row = [];
    for (let i = 0; i <= n; i++) {
      const p = [frame.invX(px(i)), frame.invY(py(j))];
      row.push(centers.map(c => d2(p, c)));
    }
    dist.push(row);
  }

  const out = [], seen = new Set();
  for (let c = 0; c < centers.length; c++) {
    const values = dist.map(row => row.map(ds => {
      let other = Infinity;
      for (let l = 0; l < ds.length; l++) if (l !== c && ds[l] < other) other = ds[l];
      return ds[c] - other;
    }));
    // isoSegments' saddle-pairing shortcut is only documented safe for a convex
    // bowl (see its own header comment); a Voronoi boundary is not guaranteed
    // convex, so a four-crossing cell here pairs its two segments as-is rather
    // than checking which pairing matches the true nearest-center topology.
    // The one place this file's partition can be inexact, not exact by proof.
    for (const [i0, j0, i1, j1] of isoSegments({ values }, 0)) {
      const s = [N(px(i0)), N(py(j0)), N(px(i1)), N(py(j1))];
      const key = `${Math.round((s[0] + s[2]) * 2)}:${Math.round((s[1] + s[3]) * 2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
  }
  return out;
}
