import test from 'node:test';
import assert from 'node:assert/strict';
import * as CE from '../js/instruments/cloud-ellipse.mjs';
import * as UT from '../js/instruments/units-trap.mjs';
import { covariance, corr, variance, eigSym2 } from '../js/math/core.mjs';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} !~ ${b}`);
const state = (over = {}) => ({ ...CE.defaults, idKey: 'ce1', ...over });

test('cloud-ellipse renders prefixed svg with points, ellipse, stripes, matrix, handles', () => {
  const svg = CE.render(state());
  assert.match(svg, /^<svg[^>]*viewBox="0 0 640 460"/);
  assert.ok(svg.includes('sb-ce1-clip'));
  assert.ok((svg.match(/data-role="pt"/g) || []).length === 80);
  assert.ok(svg.includes('data-role="ellipse"'));
  assert.ok((svg.match(/data-role="pc1-stripe"/g) || []).length === 3);
  for (const d of ['spread-x', 'spread-y', 'tilt', 'm-sxx', 'm-sxy', 'm-syy'])
    assert.ok(svg.includes(`data-drag="${d}"`), d);
});

test('cloud-ellipse read-only mode drops every drag handle', () => {
  const svg = CE.render(state({ editable: false }));
  assert.ok(!svg.includes('data-drag='));
});

test('displayed cloud carries the dialed covariance exactly', () => {
  const st = state({ sxx: 2.1, sxy: -0.5, syy: 0.7 });
  const svg = CE.render(st);
  // parse the rendered point coordinates back out and undo the layout mapping
  const L = CE.layout();
  const pts = [...svg.matchAll(/data-role="pt" cx="([0-9.eE+-]+)" cy="([0-9.eE+-]+)"/g)]
    .map(m => ({ x: L.invX(+m[1]), y: L.invY(+m[2]) }));
  const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
  close(variance(xs), st.sxx, 2e-2);       // px rounding to 2 decimals costs a little
  close(covariance(xs, ys), st.sxy, 2e-2);
  close(variance(ys), st.syy, 2e-2);
});

test('drag semantics: spreads hold rho, tilt holds eigenvalues, sxy stays PD', () => {
  const st = state();
  const L = CE.layout();
  const out = CE.applyDrag(st, { id: 'spread-x', x: L.x(2 * Math.sqrt(2.5)), y: L.cy });
  close(out.sxx, 2.5, 1e-9);
  close(out.sxy / Math.sqrt(out.sxx * st.syy), st.rho, 1e-9);

  const tilt = CE.applyDrag(st, { id: 'tilt', x: L.x(Math.cos(1.1)), y: L.y(Math.sin(1.1)) });
  const before = eigSym2(st.sxx, st.sxy, st.syy).values;
  const after = eigSym2(tilt.sxx, tilt.sxy, tilt.syy).values;
  close(after[0], before[0], 1e-9); close(after[1], before[1], 1e-9);

  const top = CE.applyDrag(st, { id: 'm-sxy', x: 0, y: CE.layout().plot.y0 });
  assert.ok(Math.abs(top.sxy) <= 0.99 * Math.sqrt(st.sxx * st.syy) + 1e-12);
});

test('applyControl: the rho dial rewrites sxy to match', () => {
  const out = CE.applyControl(state(), 'rho', -0.4);
  close(out.sxy, -0.4 * Math.sqrt(1.6 * 0.9), 1e-12);
});

test('units-trap: unit flips scale covariance entries by exact powers of ten; r immune', () => {
  const st = { ...UT.defaults, idKey: 'ut1' };
  const base = UT.currentData(st);
  const flipped = UT.currentData({ ...st, xUnit: 'cm', yUnit: 'kg' });
  close(covariance(flipped.xs, flipped.ys), covariance(base.xs, base.ys) / 10 / 1000, 1e-6);
  close(corr(flipped.xs, flipped.ys), corr(base.xs, base.ys), 1e-12);
});

test('units-trap renders the matrix, correlation, unit-labelled axes; no drag handles', () => {
  const svg = UT.render({ ...UT.defaults, idKey: 'ut2', xName: 'head circumference', yName: 'estimated fetal weight' });
  assert.ok((svg.match(/data-role="cov-entry"/g) || []).length === 4);
  assert.ok(svg.includes('data-role="corr"'));
  assert.ok(svg.includes('head circumference (mm)'));
  assert.ok(svg.includes('estimated fetal weight (g)'));
  assert.ok(!svg.includes('data-drag='));
});

test('units-trap accepts direct data arrays and its r matches the raw correlation', () => {
  const xs = [280, 300, 310, 320, 331, 296, 305, 315, 340, 288];
  const ys = [1600, 2100, 2400, 2700, 3000, 1900, 2250, 2600, 3300, 1750];
  const svg = UT.render({ ...UT.defaults, idKey: 'ut3', xs, ys });
  const m = svg.match(/r = ([0-9.−-]+)/);
  close(+m[1], corr(xs, ys), 5e-4);
});
