// The k-means core, pinned against the two reference probes that produced every
// number in the spec. If this file and reference/kmeans-probe-*.mjs ever
// disagree, the spec's claims table is no longer reproducible and the page is
// quoting numbers that nothing generates.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mulberry32 } from '../js/math/core.mjs';
import {
  d2, zscoreColumns, initRandom, initPlusPlus, initCenters,
  assign, recompute, totalSquaredDistance,
  startState, kmeansStep, kmeansRun, purity, eta2,
} from '../js/math/kmeans.mjs';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} !~ ${b}`);
const births = () => JSON.parse(readFileSync(new URL('../data/births.json', import.meta.url), 'utf8'));

// A three-cluster toy small enough to reason about by hand.
const TOY = [[0, 0], [0.1, 0], [0, 0.1], [10, 10], [10.1, 10], [10, 10.1], [-10, 8], [-10.1, 8], [-10, 8.1]];

test('d2 is squared euclidean and works in any dimension', () => {
  close(d2([0, 0], [3, 4]), 25);
  close(d2([1, 2, 3, 4], [1, 2, 3, 4]), 0);
  close(d2([1, 1, 1, 1], [0, 0, 0, 0]), 4);
});

test('zscoreColumns takes columns and returns rows, centred, population sd', () => {
  const rows = zscoreColumns([[1, 2, 3], [10, 20, 30]]);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].length, 2);
  for (let j = 0; j < 2; j++) {
    const col = rows.map(r => r[j]);
    close(col.reduce((a, b) => a + b, 0) / 3, 0);
    close(Math.sqrt(col.reduce((s, v) => s + v * v, 0) / 3), 1);   // population sd, divide by n
  }
});

test('assign gives every point its nearest center, lowest index wins a tie', () => {
  assert.deepEqual(assign([[0, 0], [9, 0], [5, 0]], [[0, 0], [10, 0]]), [0, 1, 0]);
  assert.deepEqual(assign([[5, 0]], [[0, 0], [10, 0]]), [0]);      // exact tie goes to index 0
});

test('recompute moves each center to its cluster mean and leaves an empty cluster alone', () => {
  const X = [[0, 0], [2, 0], [10, 10]];
  const out = recompute(X, [0, 0, 1], 3, [[99, 99], [99, 99], [7, 7]]);
  assert.deepEqual(out[0], [1, 0]);
  assert.deepEqual(out[1], [10, 10]);
  assert.deepEqual(out[2], [7, 7]);                                 // empty: keeps its old position
});

test('totalSquaredDistance sums each point to its own center', () => {
  close(totalSquaredDistance([[0, 0], [3, 4]], [0, 0], [[0, 0]]), 25);
});

test('a half-step alternates assign and update, and only one of them moves', () => {
  const s0 = startState(TOY, 3, mulberry32(1), { plusplus: true });
  assert.equal(s0.phase, 'assign');
  assert.ok(s0.labels.every(l => l === -1), 'nothing is assigned before the first Step');

  const s1 = kmeansStep(s0);                       // assign
  assert.equal(s1.phase, 'update');
  assert.deepEqual(s1.centers, s0.centers, 'assign must leave the centers frozen');
  assert.ok(s1.labels.every(l => l >= 0), 'assign must label every point');

  const s2 = kmeansStep(s1);                       // update
  assert.equal(s2.phase, 'assign');
  assert.deepEqual(s2.labels, s1.labels, 'recompute must leave membership frozen');
  assert.notDeepEqual(s2.centers, s1.centers, 'recompute must actually move the centers');
  assert.equal(s2.iter, s1.iter + 1, 'one full iteration is two half-steps');
});

test('done is raised on the assign half-step where no label changed, and later steps are inert', () => {
  let s = startState(TOY, 3, mulberry32(1), { plusplus: true });
  let guard = 0;
  while (!s.done && guard++ < 100) s = kmeansStep(s);
  assert.equal(s.phase, 'update', 'done is raised during assign, so the next half-step is update');
  const settled = kmeansStep(s);
  const after = kmeansStep(kmeansStep(settled));
  assert.deepEqual(after.labels, settled.labels);
  assert.deepEqual(after.centers, settled.centers, 'once converged, nothing moves again');
});

test('kmeansRun is the half-step loop, not a second implementation', () => {
  const run = kmeansRun(TOY, 3, mulberry32(4), { plusplus: true });
  let s = startState(TOY, 3, mulberry32(4), { plusplus: true });
  let guard = 0;
  while (!s.done && guard++ < 600) s = kmeansStep(s);
  s = kmeansStep(s);                                // the trailing update the probes also perform
  assert.deepEqual(run.labels, s.labels);
  assert.deepEqual(run.centers, s.centers);
  close(run.wcss, totalSquaredDistance(TOY, s.labels, s.centers));
});

test('purity is the share of points in their cluster majority class', () => {
  close(purity([0, 0, 1, 1], [0, 0, 1, 1], 2), 1);
  close(purity([0, 0, 0, 0], [0, 0, 1, 1], 2), 0.5);
  close(purity([0, 0, 1, 1], [1, 1, 0, 0], 2), 1);                  // a label permutation must not matter
});

test('eta2 is the share of variation in y the labels account for', () => {
  close(eta2([1, 1, 5, 5], [0, 0, 1, 1], 2), 1);                    // labels account for everything
  close(eta2([1, 5, 1, 5], [0, 0, 1, 1], 2), 0);                    // labels account for nothing
});

test('both initializers are deterministic under a seed, and ++ picks one center per blob', () => {
  const a = initPlusPlus(TOY, 3, mulberry32(9));
  assert.deepEqual(a, initPlusPlus(TOY, 3, mulberry32(9)), 'same seed must give the same centers');
  const c = initRandom(TOY, 3, mulberry32(9));
  assert.deepEqual(c, initRandom(TOY, 3, mulberry32(9)));
  assert.deepEqual(initCenters(TOY, 3, mulberry32(9), true), a);
  assert.deepEqual(initCenters(TOY, 3, mulberry32(9), false), c);
  const pairs = [];
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) pairs.push(d2(a[i], a[j]));
  assert.ok(Math.min(...pairs) > 50, `++ must not take two centers from one blob: ${pairs}`);
});

test('random init never picks the same point twice', () => {
  for (let s = 1; s <= 30; s++) {
    const c = initRandom(TOY, 3, mulberry32(s));
    assert.equal(new Set(c.map(p => p.join(','))).size, 3, `seed ${s} produced a duplicate center`);
  }
});

test('the core reproduces the probe on real data: births k=3 is 10 / 159 / 231', () => {
  // Lifted straight from reference/kmeans-probe-real.mjs. This is the check that
  // says the module is the probes refactored rather than a rewrite that agrees
  // on toys and diverges where it matters.
  const b = births();
  const X = zscoreColumns([b.xs, b.ys]);
  const r = kmeansRun(X, 3, mulberry32(7), { plusplus: true });
  const sizes = [0, 1, 2].map(j => r.labels.filter(l => l === j).length).sort((p, q) => p - q);
  assert.deepEqual(sizes, [10, 159, 231]);
});
