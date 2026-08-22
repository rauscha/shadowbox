import test from 'node:test';
import assert from 'node:assert/strict';
import { isoSegments } from '../js/lib/contours.mjs';
import { halftoneDots, PITCH } from '../js/lib/halftone.mjs';
import { lossSurface } from '../js/math/core.mjs';

test('isoSegments on a paraboloid ring: nonempty, inside grid', () => {
  const g = lossSurface([0, 1, 2, 3], [0, 1, 1, 2], { s0: -2, s1: 3, b0: -2, b1: 3, n: 25 });
  const level = (g.min + g.max) / 4;
  const segs = isoSegments(g, level);
  assert.ok(segs.length > 8);
  for (const [x0, y0, x1, y1] of segs)
    for (const c of [x0, y0, x1, y1]) assert.ok(c >= 0 && c <= 24);
});

const PLOT = { x0: 64, y0: 44, x1: 626, y1: 412 };
const bowlGrid = () =>
  lossSurface([0, 1, 2, 3], [0, 1, 1, 2], { s0: -2, s1: 3, b0: -2, b1: 3, n: 48 });

test('halftone dots stay inside the plot and under the fuse radius', () => {
  const g = bowlGrid();
  const dots = halftoneDots(g, PLOT);
  assert.ok(dots.length > 300);
  const rTouch = PITCH / Math.sqrt(Math.PI);
  for (const d of dots) {
    assert.ok(d.x >= PLOT.x0 && d.x <= PLOT.x1 && d.y >= PLOT.y0 && d.y <= PLOT.y1);
    assert.ok(d.r > 0 && d.r <= rTouch);
  }
});

test('halftone is graduated: radius rises with the field, bare at the minimum', () => {
  const g = bowlGrid();
  const dots = halftoneDots(g, PLOT);
  // many distinct sizes - a gradient, not a uniform Ben-Day screen
  assert.ok(new Set(dots.map(d => d.r.toFixed(2))).size > 30);
  // no dot within a pitch of the minimum (bare paper at the bottom of the bowl)
  const mx = PLOT.x0 + (PLOT.x1 - PLOT.x0) * (g.minAt[0] - g.s0) / (g.s1 - g.s0);
  const my = PLOT.y1 - (PLOT.y1 - PLOT.y0) * (g.minAt[1] - g.b0) / (g.b1 - g.b0);
  const nearMin = dots.filter(d => Math.hypot(d.x - mx, d.y - my) < PITCH);
  assert.equal(nearMin.length, 0);
  // and the far field carries fat dots
  assert.ok(Math.max(...dots.map(d => d.r)) > 0.8 * PITCH / Math.sqrt(Math.PI));
});

test('halftone ink coverage integrates to the mean normalized field', () => {
  const g = bowlGrid();
  const dots = halftoneDots(g, PLOT, { minR: 0 });
  const inkArea = dots.reduce((s, d) => s + Math.PI * d.r * d.r, 0);
  const plotArea = (PLOT.x1 - PLOT.x0) * (PLOT.y1 - PLOT.y0);
  let tSum = 0, n = 0;
  for (const row of g.values) for (const v of row) { tSum += (v - g.min) / (g.max - g.min); n++; }
  const meanT = tSum / n;
  // coverage tracks mean(t): rMax clamping + lattice edges cost a little ink
  assert.ok(Math.abs(inkArea / plotArea - meanT) / meanT < 0.15);
});
