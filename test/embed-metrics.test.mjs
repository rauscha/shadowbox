// The three measures lesson 5 quotes. Hand-computable cases only: the point is
// that each measure has a known answer at its extremes, so a refactor that
// quietly changes what "local structure kept" means fails here rather than as a
// wrong number on the page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { knnRecall, distanceSpearman, gaFromNeighbours } from '../js/lib/embed-metrics.mjs';

test('local structure kept is 1 when the layout is the data itself', () => {
  const X = [[0, 0], [1, 0], [0, 1], [5, 5], [6, 5], [5, 6]];
  assert.equal(knnRecall(X, X.map(p => p.slice()), 2), 1);
});

test('local structure kept collapses when the layout interleaves two clusters', () => {
  const X = [[0, 0], [1, 0], [0, 1], [10, 10], [11, 10], [10, 11]];
  // Alternating, so each point's two nearest are now from the other cluster.
  const Y = [[0, 0], [10, 0], [1, 0], [11, 0], [2, 0], [12, 0]];
  const r = knnRecall(X, Y, 2);
  assert.ok(r < 0.5, `an interleaved layout should lose most neighbours, got ${r}`);
});

test('global distance agreement is 1 for a pure rescale', () => {
  const X = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]];
  const scaled = X.map(p => [p[0] * 3, 0]);
  assert.ok(Math.abs(distanceSpearman(X, scaled) - 1) < 1e-12);
});

test('global distance agreement is negative when the order of distances reverses', () => {
  const X = [[0, 0], [1, 0], [2, 0]];
  const Y = [[0, 0], [2, 0], [1, 0]];   // the far pair in X is the near pair in Y
  assert.ok(distanceSpearman(X, Y) < 0);
});

test('outcome from neighbours is 1 when neighbours share the outcome exactly', () => {
  const P = [[0, 0], [0.1, 0], [0, 0.1], [9, 9], [9.1, 9], [9, 9.1]];
  const y = [20, 20, 20, 40, 40, 40];
  assert.ok(Math.abs(gaFromNeighbours(P, y, 2) - 1) < 1e-12);
});

test('outcome from neighbours is poor when position says nothing about the outcome', () => {
  const P = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]];
  const y = [30, 22, 38, 24, 36, 28];        // deliberately anti-correlated with position
  assert.ok(gaFromNeighbours(P, y, 2) < 0.5);
});

test('outcome from neighbours refuses a k it cannot honour', () => {
  assert.throws(() => gaFromNeighbours([[0, 0], [1, 1]], [1, 2], 5), /k/);
});
