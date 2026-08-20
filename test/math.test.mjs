import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../js/math/core.mjs';

const close = (a, b, tol = 1e-12) => assert.ok(Math.abs(a - b) < tol, `${a} !~ ${b}`);

test('sample stats on tiny exact cases', () => {
  close(M.mean([1, 2, 3]), 2);
  close(M.variance([1, 2, 3]), 1);            // sample, n-1
  close(M.sd([1, 2, 3]), 1);
  close(M.covariance([1, 2, 3], [2, 4, 6]), 2);
  close(M.corr([1, 2, 3], [2, 4, 6]), 1);
  const z = M.standardize([1, 2, 3]);
  close(z[0], -1); close(z[1], 0); close(z[2], 1);
});

test('ols recovers an exact line and minimises sse', () => {
  const { slope, intercept, sse } = M.ols([0, 1, 2], [1, 3, 5]);
  close(slope, 2); close(intercept, 1); close(sse, 0, 1e-9);
  const f = M.ols([0, 1, 2, 3], [0, 1, 1, 2]);
  const at = M.sse([0, 1, 2, 3], [0, 1, 1, 2], f.slope, f.intercept);
  close(at, f.sse);
  assert.ok(at <= M.sse([0, 1, 2, 3], [0, 1, 1, 2], f.slope + 0.01, f.intercept));
  assert.ok(at <= M.sse([0, 1, 2, 3], [0, 1, 1, 2], f.slope, f.intercept + 0.01));
});

test('sae is the absolute-error total', () => {
  close(M.sae([0, 1], [1, 1], 0, 0), 2);
});

test('lossSurface grid contains the ols minimum', () => {
  const xs = [0, 1, 2, 3], ys = [0, 1, 1, 2];
  const fit = M.ols(xs, ys);
  const g = M.lossSurface(xs, ys, { s0: fit.slope - 1, s1: fit.slope + 1, b0: fit.intercept - 1, b1: fit.intercept + 1, n: 41 });
  close(g.minAt[0], fit.slope, 0.06);
  close(g.minAt[1], fit.intercept, 0.06);
  assert.equal(g.values.length, 41);
  assert.equal(g.values[0].length, 41);
});
