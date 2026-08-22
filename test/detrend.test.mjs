import test from 'node:test';
import assert from 'node:assert/strict';
import { detrend, mean, sd } from '../js/math/core.mjs';

test('detrend removes an exact quadratic exactly', () => {
  const xs = Array.from({ length: 40 }, (_, i) => 20 + i * 0.5);
  const ys = xs.map(x => 3 - 2 * x + 0.4 * x * x);
  for (const r of detrend(ys, xs)) assert.ok(Math.abs(r) < 1e-6, `residual ${r}`);
});

test('detrend leaves the added noise behind, centred', () => {
  const xs = Array.from({ length: 200 }, (_, i) => 20 + i * 0.1);
  const wob = xs.map((x, i) => (i % 2 ? 1 : -1) * 2);
  const ys = xs.map((x, i) => 100 + 5 * x + 0.1 * x * x + wob[i]);
  const r = detrend(ys, xs);
  assert.ok(Math.abs(mean(r)) < 1e-8);
  assert.ok(Math.abs(sd(r) - 2) < 0.05, `sd ${sd(r)}`);
});

test('detrend with degree 1 is ordinary least squares residuals', async () => {
  const { ols } = await import('../js/math/core.mjs');
  const xs = [1, 2, 3, 4, 5, 6], ys = [2, 4.1, 5.9, 8.2, 9.8, 12.1];
  const { slope, intercept } = ols(xs, ys);
  const r = detrend(ys, xs, 1);
  xs.forEach((x, i) => assert.ok(Math.abs(r[i] - (ys[i] - (intercept + slope * x))) < 1e-9));
});
