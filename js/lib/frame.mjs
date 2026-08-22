// Shared plotting frame for the lesson-3 cloud instruments. One numeric unit is
// the same number of pixels on both axes, so an angle on screen is the angle in
// the numbers - which is the whole point of a lesson about directions. The
// half-extent is *radial* (max distance from the sample mean), a quantity a
// rotation cannot change, so basis-spin can turn the cloud all the way into PC
// coordinates without the frame breathing under it.
// Kept in one place so axis-projector, three-lines and basis-spin put the same
// cloud in the same spot, and the reader's eye carries from figure to figure.

import { mean } from '../math/core.mjs';

export const F = v => +v.toFixed(2);

export function isoFrame(xs, ys, plot, { pad = 1.12, minHalf = 0 } = {}) {
  const mx = mean(xs), my = mean(ys);
  let reach = 0;
  for (let i = 0; i < xs.length; i++) reach = Math.max(reach, Math.hypot(xs[i] - mx, ys[i] - my));
  const half = Math.max(minHalf, pad * (reach || 1));
  const side = Math.min(plot.x1 - plot.x0, plot.y1 - plot.y0);
  const s = side / (2 * half);                      // px per numeric unit, both axes
  const cx = (plot.x0 + plot.x1) / 2, cy = (plot.y0 + plot.y1) / 2;
  return {
    mx, my, half, s, cx, cy, plot,
    x: v => cx + (v - mx) * s,
    y: v => cy - (v - my) * s,
    invX: px => mx + (px - cx) / s,
    invY: py => my + (cy - py) / s,
  };
}

// Human tick steps (1 / 2 / 2.5 / 5 times a power of ten) across a numeric span.
export function niceTicks(min, max, target = 4) {
  const raw = (max - min) / target;
  if (!(raw > 0)) return [];
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => s >= raw) || raw;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(6));
  return out;
}

// Liang-Barsky: the segment of the infinite line through (cx, cy) with screen
// direction (dx, dy) that survives inside the plot rectangle. null if it misses.
export function clipToRect(cx, cy, dx, dy, plot) {
  let u0 = -Infinity, u1 = Infinity;
  const slab = (p, q) => {
    if (Math.abs(p) < 1e-12) return q >= 0;
    const r = q / p;
    if (p < 0) { if (r > u1) return false; if (r > u0) u0 = r; }
    else { if (r < u0) return false; if (r < u1) u1 = r; }
    return true;
  };
  if (!slab(-dx, cx - plot.x0) || !slab(dx, plot.x1 - cx)) return null;
  if (!slab(-dy, cy - plot.y0) || !slab(dy, plot.y1 - cy)) return null;
  if (!(u0 < u1)) return null;
  return { x0: cx + u0 * dx, y0: cy + u0 * dy, x1: cx + u1 * dx, y1: cy + u1 * dy };
}
