// The UMAP core, pinned against umap-learn 0.5.12 itself via
// reference/umap-probe.py. Every deterministic stage of the algorithm - the kNN
// rows, the per-point rho and sigma from the bisection, the symmetrised edge
// weights, and the (a, b) curve fit - has to reproduce the reference exactly. If
// this file and the fixtures disagree, js/math/umap.mjs is no longer UMAP and the
// lesson is teaching something that only shadowbox does.
//
// The stochastic stage (the layout SGD) is deliberately not pinned to
// coordinates. It is seeded and reproducible within this codebase, but it cannot
// match numba's RNG stream sample for sample, and pretending otherwise would be a
// fake test. What is asserted instead is the property the lesson actually claims:
// the graph is seed-independent, and the layout is not.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { zscoreColumns } from '../js/math/kmeans.mjs';
import { knn, smoothKNNDist, fuzzyGraph, fitAB, umap, euclidean, MIN_K_DIST_SCALE } from '../js/math/umap.mjs';

const read = f => JSON.parse(readFileSync(new URL(f, import.meta.url), 'utf8'));
const F = read('./umap-fixtures.json');
const blobs = read('../data/blobs.json');
const births = read('../data/births.json');
const bio = read('../data/biometry.json');

const SETS = {};
for (const [n, c] of Object.entries(blobs.configs)) SETS[n] = c.xs.map((x, i) => [x, c.ys[i]]);
SETS.births = zscoreColumns([births.xs, births.ys]);
SETS.biometry = zscoreColumns([bio.bpd, bio.hc, bio.ac, bio.fl]);

test('fitAB reproduces umap-learn find_ab_params', () => {
  for (const [key, ref] of Object.entries(F.ab)) {
    const [minDist, spread] = key.split(',').map(Number);
    const { a, b } = fitAB(minDist, spread);
    assert.ok(Math.abs(a - ref.a) < 1e-5, `a for ${key}: ${a} !~ ${ref.a}`);
    assert.ok(Math.abs(b - ref.b) < 1e-5, `b for ${key}: ${b} !~ ${ref.b}`);
  }
});

// The safety net, not an expected path. An earlier Gauss-Newton fitter returned
// b = -146.8 at minDist 0.8 and no fit at all at spread 5, which surfaced as NaN
// coordinates and a blank figure. The damped fitter handles the whole grid, so
// what is asserted here is that nothing in range throws.
test('fitAB fits the whole parameter grid without falling over', () => {
  for (const spread of [0.5, 1.0, 2.0, 5.0]) {
    for (const md of [0, 0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 1.0]) {
      if (md > spread) continue;
      const { a, b } = fitAB(md, spread);
      assert.ok(a > 0 && Number.isFinite(a), `a for (${md}, ${spread}) = ${a}`);
      assert.ok(b > 0 && Number.isFinite(b), `b for (${md}, ${spread}) = ${b}`);
    }
  }
});

test('a layout at the far end of minDist is still finite and still separates', () => {
  const X = SETS.blobs;
  for (const minDist of [0, 0.5, 1.0]) {
    const { Y } = umap(X, { k: 15, seed: 1, nEpochs: 120, minDist });
    for (const p of Y) for (const v of p) {
      assert.ok(Number.isFinite(v), `minDist ${minDist} produced a non-finite coordinate`);
    }
    const xs = Y.map(p => p[0]);
    assert.ok(Math.max(...xs) - Math.min(...xs) < 200, `minDist ${minDist} blew the layout up`);
  }
});

test('knn excludes self, sorts ascending, and breaks ties on the lower index', () => {
  const X = [[0, 0], [1, 0], [-1, 0], [0, 2]];
  const { indices, distances } = knn(X, 3);
  assert.deepEqual(indices[0], [1, 2, 3]);          // 1 and 2 tie at d=1; 1 wins on index
  assert.ok(!indices[0].includes(0));
  for (const row of distances) {
    for (let i = 1; i < row.length; i++) assert.ok(row[i] >= row[i - 1]);
  }
  assert.throws(() => knn(X, 4), /k must be in/);
});

test('the bisection sums the k real neighbours against a target of log2(k + 1)', () => {
  // Regression guard for the single easiest way to get UMAP subtly wrong:
  // including the self term in the sum makes every sigma too small, silently,
  // and still produces a plausible-looking graph.
  const row = [0, 1, 2, 3, 4];
  const { rhos, sigmas } = smoothKNNDist([row]);
  assert.equal(rhos[0], 1);
  let psum = 0;
  for (const d of row.slice(1)) {
    const t = d - rhos[0];
    psum += t > 0 ? Math.exp(-t / sigmas[0]) : 1;
  }
  assert.ok(Math.abs(psum - Math.log2(row.length)) < 1e-4, `psum ${psum} should hit log2(5)`);
});

test('a row whose neighbours all tie with rho falls back to the sigma floor', () => {
  // This is the births case in miniature, and it is unreachable by bisection:
  // every neighbour sits exactly at rho, so each contributes 1 and the sum is
  // pinned at 4 no matter how small sigma gets. The target of log2(5) = 2.32 can
  // never be met, so sigma runs to zero and MIN_K_DIST_SCALE catches it.
  const row = [0, 0.5, 0.5, 0.5, 0.5];
  const { rhos, sigmas } = smoothKNNDist([row]);
  assert.equal(rhos[0], 0.5);
  const rowMean = row.reduce((a, b) => a + b, 0) / row.length;
  assert.ok(Math.abs(sigmas[0] - MIN_K_DIST_SCALE * rowMean) < 1e-12,
    `sigma ${sigmas[0]} should be the floor ${MIN_K_DIST_SCALE * rowMean}`);
});

for (const [name, ds] of Object.entries(F.datasets)) {
  for (const [k, ref] of Object.entries(ds.ks)) {
    test(`fuzzyGraph matches umap-learn on ${name}, k=${k} (n_neighbors=${ref.n_neighbors_umap})`, () => {
      const g = fuzzyGraph(SETS[name], Number(k));

      for (let i = 0; i < g.rhos.length; i++) {
        assert.ok(Math.abs(g.rhos[i] - ref.rhos[i]) < 1e-7, `rho[${i}]`);
        const rel = Math.abs(g.sigmas[i] - ref.sigmas[i]) / ref.sigmas[i];
        assert.ok(rel < 1e-4, `sigma[${i}]: ${g.sigmas[i]} vs ${ref.sigmas[i]}`);
      }

      const mine = new Map();
      for (let e = 0; e < g.head.length; e++) mine.set(`${g.head[e]},${g.tail[e]}`, g.weight[e]);
      assert.equal(mine.size, ref.edge_count, 'edge count');
      for (const [key, w] of Object.entries(ref.edges)) {
        assert.ok(mine.has(key), `missing edge ${key}`);
        assert.ok(Math.abs(mine.get(key) - w) < 1e-5, `weight ${key}: ${mine.get(key)} vs ${w}`);
      }
    });
  }
}

test('the graph is seed-independent and the layout is not', () => {
  const X = SETS.blobs;
  const g1 = fuzzyGraph(X, 15), g2 = fuzzyGraph(X, 15);
  assert.deepEqual(g1.head, g2.head);
  assert.deepEqual(g1.weight, g2.weight);

  const A = umap(X, { k: 15, seed: 1, nEpochs: 60 }).Y;
  const B = umap(X, { k: 15, seed: 2, nEpochs: 60 }).Y;
  const C = umap(X, { k: 15, seed: 1, nEpochs: 60 }).Y;
  assert.deepEqual(A, C, 'same seed must reproduce exactly');
  assert.notDeepEqual(A, B, 'different seeds must not');
  for (const p of A) for (const v of p) assert.ok(Number.isFinite(v));
});

test('frames record the trajectory, starting from the raw initialisation', () => {
  const { frames, Y } = umap(SETS.blobs, { k: 15, seed: 3, nEpochs: 40, frameEvery: 10 });
  assert.equal(frames.length, 5);                    // epoch 0 plus 4 snapshots
  assert.deepEqual(frames.at(-1), Y);
  assert.notDeepEqual(frames[0], frames[1]);
  // The first frame is the initialisation, so it is uniform noise in [-10, 10]
  // and carries none of the structure the last frame has.
  for (const p of frames[0]) for (const v of p) assert.ok(Math.abs(v) <= 10);
});

// births is not in F.datasets on purpose. It is the one dataset whose kNN is not
// reproducible across implementations, and the fixture records why.
test('births is recorded as tie-pathological rather than pinned', () => {
  assert.ok(!('births' in F.datasets), 'births must not ship a pinned edge list');
  const t = F.ties.births;
  assert.equal(t.n, 400);
  assert.equal(t.duplicate_rows, 78);
  assert.equal(t.nearest_neighbour_at_zero, 129);
  assert.ok(t.ambiguous_kth['5'] > 80 && t.ambiguous_kth['15'] > 80);

  // And the other datasets are clean, which is what makes them usable.
  for (const name of ['blobs', 'crescents', 'uniform', 'biometry']) {
    assert.equal(F.ties[name].duplicate_rows, 0, `${name} duplicates`);
    assert.equal(F.ties[name].nearest_neighbour_at_zero, 0, `${name} zero-distance neighbours`);
    for (const v of Object.values(F.ties[name].ambiguous_kth)) {
      assert.equal(v, 0, `${name} ambiguous k-th neighbour rows`);
    }
  }
});

test('euclidean agrees with a hand-computed distance', () => {
  assert.equal(euclidean([0, 0], [3, 4]), 5);
  assert.equal(euclidean([1, 2, 3, 4], [1, 2, 3, 4]), 0);
});
