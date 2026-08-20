import test from 'node:test';
import assert from 'node:assert/strict';
import * as FS from '../js/instruments/fit-scatter.mjs';
import { synthLine, ols, sse } from '../js/math/core.mjs';

const state = () => {
  const d = synthLine({ seed: 7, n: 12, slope: 0.6, intercept: 1, noise: 0.9 });
  const fit = ols(d.xs, d.ys);
  return { ...FS.defaults, idKey: 't1', xs: d.xs, ys: d.ys, slope: fit.slope, intercept: fit.intercept, truth: d.truth };
};

test('fit-scatter renders well-formed prefixed SVG with drag handles', () => {
  const svg = FS.render(state());
  assert.match(svg, /^<svg[^>]*viewBox="0 0 640 460"/);
  assert.match(svg, /<\/svg>\s*$/);
  assert.ok(!svg.includes('id="dots"'));                    // ids must be prefixed
  assert.ok(svg.includes('sb-t1-dots'));
  assert.ok(svg.includes('data-drag="points"'));
  assert.ok(svg.includes('data-drag="line-move"'));
  assert.ok((svg.match(/data-drag="line-rot"/g) || []).length === 2);
});

test('fit-scatter residual squares sum to SSE in pixel terms', () => {
  const s = state();
  const svg = FS.render(s);
  const L = FS.layout(s);
  const yScale = Math.abs(L.y(1) - L.y(0));
  const sides = [...svg.matchAll(/data-role="residual-square"[^>]*? width="([0-9.eE+-]+)"/g)].map(m => +m[1]);
  assert.equal(sides.length, s.xs.length);
  const areaSum = sides.reduce((t, w) => t + w * w, 0);
  const expected = sse(s.xs, s.ys, s.slope, s.intercept) * yScale * yScale;
  assert.ok(Math.abs(areaSum - expected) / expected < 1e-6);
});

test('fit-scatter absolute mode renders sticks, not squares', () => {
  const svg = FS.render({ ...state(), loss: 'absolute' });
  assert.ok(!svg.includes('data-role="residual-square"'));
  assert.ok(svg.includes('data-role="residual-stick"'));
});

test('applyDrag: line-move keeps slope, moves intercept through cursor', () => {
  const s = state();
  const L = FS.layout(s);
  const target = { xd: 5, yd: 4 };
  const out = FS.applyDrag(s, { id: 'line-move', index: 0, x: L.x(target.xd), y: L.y(target.yd) });
  assert.ok(Math.abs(out.intercept - (target.yd - s.slope * target.xd)) < 1e-9);
  assert.equal(out.slope, undefined);                       // partial update only
});

test('applyDrag: points moves one data point', () => {
  const s = state();
  const L = FS.layout(s);
  const out = FS.applyDrag(s, { id: 'points', index: 3, x: L.x(2), y: L.y(2) });
  assert.ok(Math.abs(out.xs[3] - 2) < 1e-9 && Math.abs(out.ys[3] - 2) < 1e-9);
  assert.equal(out.xs.length, s.xs.length);
});
