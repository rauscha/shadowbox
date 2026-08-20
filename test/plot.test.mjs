import test from 'node:test';
import assert from 'node:assert/strict';
import { VIRIDIS, bandLevel, bandColor, contrastInk } from '../js/lib/viridis.mjs';
import { rowBands, isoSegments } from '../js/lib/contours.mjs';
import { lossSurface } from '../js/math/core.mjs';

test('viridis quantisation is monotone and in range', () => {
  assert.equal(VIRIDIS.length, 10);
  assert.equal(bandLevel(0, 0, 1, 9), 0);
  assert.equal(bandLevel(1, 0, 1, 9), 8);
  let prev = -1;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const l = bandLevel(Math.min(t, 1), 0, 1, 9);
    assert.ok(l >= prev); prev = l;
  }
  assert.match(bandColor(0, 9), /^#[0-9a-f]{6}$/);
  assert.ok(['#111111', '#f5f5f5'].includes(contrastInk(0, 9)));
  assert.notEqual(contrastInk(0, 9), contrastInk(8, 9));   // dark band gets light ink
});

test('rowBands merges runs and covers the grid', () => {
  const grid = { values: [[0, 0, 5, 5], [0, 1, 5, 9]], min: 0, max: 9, n: 4 };
  const bands = rowBands(grid, 3);
  for (const b of bands) assert.ok(b.i1 >= b.i0);
  const cells = bands.reduce((s, b) => s + (b.i1 - b.i0 + 1), 0);
  assert.equal(cells, 8);                                   // 2 rows x 4 cols
  assert.ok(bands.length < 8);                              // merging happened
});

test('isoSegments on a paraboloid ring: nonempty, inside grid', () => {
  const g = lossSurface([0, 1, 2, 3], [0, 1, 1, 2], { s0: -2, s1: 3, b0: -2, b1: 3, n: 25 });
  const level = (g.min + g.max) / 4;
  const segs = isoSegments(g, level);
  assert.ok(segs.length > 8);
  for (const [x0, y0, x1, y1] of segs)
    for (const c of [x0, y0, x1, y1]) assert.ok(c >= 0 && c <= 24);
});
