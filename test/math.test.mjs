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

function sameDirection(u, v, tol = 1e-9) {
  const dot = u.reduce((s, x, i) => s + x * v[i], 0);
  const nu = Math.hypot(...u), nv = Math.hypot(...v);
  return Math.abs(Math.abs(dot) / (nu * nv) - 1) < tol;
}

test('eigSym2 closed form on known matrices', () => {
  const e = M.eigSym2(2, 1, 2);                    // [[2,1],[1,2]] -> 3, 1, 45 deg
  close(e.values[0], 3); close(e.values[1], 1);
  close(e.angle, Math.PI / 4);
  assert.ok(sameDirection(e.vectors[0], [1, 1]));
  const d = M.eigSym2(5, 0, 2);                    // diagonal
  close(d.values[0], 5); assert.ok(sameDirection(d.vectors[0], [1, 0]));
  const f = M.eigSym2(2, 0, 5);                    // top eigenvector is y
  close(f.values[0], 5); assert.ok(sameDirection(f.vectors[0], [0, 1]));
});

test('jacobiEigen agrees with eigSym2 on every 2x2 and handles 4x4', () => {
  for (const [a, b, c] of [[2, 1, 2], [5, 0, 2], [1, -0.9, 1], [3, 0.5, 0.5]]) {
    const j = M.jacobiEigen([[a, b], [b, c]]), e = M.eigSym2(a, b, c);
    close(j.values[0], e.values[0], 1e-9); close(j.values[1], e.values[1], 1e-9);
    assert.ok(sameDirection(j.vectors[0], e.vectors[0]));
  }
  const A = [[4, 1, 0.5, 0], [1, 3, 0.2, 0.1], [0.5, 0.2, 2, 0.3], [0, 0.1, 0.3, 1]];
  const j = M.jacobiEigen(A);
  close(j.values.reduce((s, v) => s + v, 0), 4 + 3 + 2 + 1, 1e-9);   // trace preserved
  assert.ok(j.values[0] >= j.values[1] && j.values[1] >= j.values[2]);
  assert.throws(() => M.jacobiEigen([[1, 2], [3, 4]]));
});

test('pca on a plane-embedded cloud finds the plane', () => {
  const X = [[0, 0], [1, 1], [2, 2], [3, 3.1], [4, 3.9]];    // ~diagonal line
  const p = M.pca(X);
  assert.ok(p.explained[0] > 0.99);
  assert.ok(sameDirection(p.vectors[0], [1, 1], 0.02));
  close(p.explained[0] + p.explained[1], 1, 1e-9);
  assert.equal(p.scores.length, 5);
});

test('mulberry32 is deterministic; synth generators carry truth', () => {
  const a = M.mulberry32(42), b = M.mulberry32(42);
  close(a(), b()); close(a(), b());
  const s = M.synthLine({ seed: 7, n: 10, slope: 2, intercept: 1, noise: 0.5 });
  assert.equal(s.xs.length, 10);
  close(s.truth.slope, 2);
  const t = M.synthLine({ seed: 7, n: 10, slope: 2, intercept: 1, noise: 0.5 });
  close(s.xs[3], t.xs[3]);                                   // same seed, same data
  const c = M.synthCloud({ seed: 3, n: 500, rho: 0.8 });
  close(M.corr(c.xs, c.ys), 0.8, 0.06);                      // statistically near rho
});
