// The claims umap.html makes in prose, pinned so they cannot drift silently.
// Mirrors test/kmeans-claims.test.mjs and test/pca-claims.test.mjs.
//
// Measured 2026-08-27 by reference/umap-measure.mjs; results/umap-measure.log is
// the committed output. Every embedding claim is a RANGE over seeds, never a
// point value - spec §7 - because a single embedding number is not a
// reproducible fact and the page computes a fresh one on every load.
//
// Runtime: this file embeds a few hundred times. Each dataset/k/seed is embedded
// ONCE and every metric read off that one layout; recomputing per metric roughly
// triples the file's cost for nothing.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { umap, fuzzyGraph } from '../js/math/umap.mjs';
import { knnRecall, distanceSpearman, gaFromNeighbours } from '../js/lib/embed-metrics.mjs';
import { zscoreColumns, kmeansRun, purity, eta2 } from '../js/math/kmeans.mjs';
import { mulberry32 } from '../js/math/core.mjs';

const read = p => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), 'utf8'));
const BLOBS = read('blobs.json');
const BIO = read('biometry.json');

const SETS = {
  blobs:     { X: rowsOf(BLOBS.configs.blobs),     truth: BLOBS.configs.blobs.labels,     k: 3 },
  crescents: { X: rowsOf(BLOBS.configs.crescents), truth: BLOBS.configs.crescents.labels, k: 2 },
  uniform:   { X: rowsOf(BLOBS.configs.uniform),   truth: null,                           k: 3 },
  biometry:  { X: zscoreColumns([BIO.bpd, BIO.hc, BIO.ac, BIO.fl]), truth: null,          k: 3 },
};
function rowsOf(c) { return c.xs.map((x, i) => [x, c.ys[i]]); }

const inRange = (v, lo, hi, what) =>
  assert.ok(v >= lo && v <= hi, `${what}: ${v} is outside the measured ${lo} to ${hi}`);
const median = v => {
  const s = [...v].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
// One embedding per (dataset, k, seed), reused by every metric that wants it.
const EMBED_CACHE = new Map();
const embed = (name, k, seed) => {
  const key = `${name}:${k}:${seed}`;
  if (!EMBED_CACHE.has(key)) {
    EMBED_CACHE.set(key, umap(SETS[name].X, { k, seed, nEpochs: 200 }).Y);
  }
  return EMBED_CACHE.get(key);
};

// ------------------------------------------------------- the graph is not seeded

test('the graph is seed-independent: same X and same neighbours give identical edges', () => {
  for (const name of ['blobs', 'biometry']) {
    const a = fuzzyGraph(SETS[name].X, 15), b = fuzzyGraph(SETS[name].X, 15);
    assert.equal(a.head.length, b.head.length);
    assert.deepEqual(a.head, b.head);
    assert.deepEqual(a.tail, b.tail);
    assert.ok(a.weight.every((w, i) => w === b.weight[i]), `${name}: edge weights moved`);
  }
});

test('the edge counts the prose quotes: blobs 1398, biometry 3329, at 15 neighbours', () => {
  assert.equal(fuzzyGraph(SETS.blobs.X, 15).head.length, 1398);
  assert.equal(fuzzyGraph(SETS.biometry.X, 15).head.length, 3329);
});

// ------------------------------------------- local is stable, global is not (§3.3)

test('local structure is stable across ten seeds and global structure is not', () => {
  // The single most useful thing a reader can carry away about reading somebody
  // else's UMAP plot, and it is measured rather than folklore.
  const expected = {
    blobs:     { local: [0.769, 0.799], global: [0.565, 0.763] },
    crescents: { local: [0.840, 0.890], global: [0.333, 0.703] },
    uniform:   { local: [0.756, 0.805], global: [0.589, 0.881] },
    biometry:  { local: [0.646, 0.655], global: [0.586, 0.965] },
  };
  const TOL = 0.02;      // ten seeds is a small sample of a stochastic optimiser
  for (const [name, want] of Object.entries(expected)) {
    const loc = [], glo = [];
    for (let seed = 1; seed <= 10; seed++) {
      const Y = embed(name, 15, seed);
      loc.push(knnRecall(SETS[name].X, Y, 15));
      glo.push(distanceSpearman(SETS[name].X, Y));
    }
    inRange(Math.min(...loc), want.local[0] - TOL, want.local[1], `${name} local min`);
    inRange(Math.max(...loc), want.local[0], want.local[1] + TOL, `${name} local max`);
    inRange(Math.min(...glo), want.global[0] - TOL, want.global[1], `${name} global min`);
    inRange(Math.max(...glo), want.global[0], want.global[1] + TOL, `${name} global max`);

    // The claim itself: the local spread is far tighter than the global one.
    const localSpread = Math.max(...loc) - Math.min(...loc);
    const globalSpread = Math.max(...glo) - Math.min(...glo);
    assert.ok(localSpread < globalSpread,
      `${name}: local moved ${localSpread.toFixed(3)}, global moved ${globalSpread.toFixed(3)} - the lesson's central claim is that local moves less`);
  }
});

test('on biometry the numbers are 0.009 against 0.379, which is the sentence the page prints', () => {
  const loc = [], glo = [];
  for (let seed = 1; seed <= 10; seed++) {
    const Y = embed('biometry', 15, seed);
    loc.push(knnRecall(SETS.biometry.X, Y, 15));
    glo.push(distanceSpearman(SETS.biometry.X, Y));
  }
  assert.ok(Math.max(...loc) - Math.min(...loc) < 0.03, 'local structure must barely move');
  assert.ok(Math.max(...glo) - Math.min(...glo) > 0.25, 'global structure must move a lot');
});

// -------------------------------------------------- neighbours are structural (§7)

test('the number of neighbours changes the picture: blobs local structure at k=2/5/15/50', () => {
  const want = [0.680, 0.720, 0.793, 0.773];
  [2, 5, 15, 50].forEach((k, i) => {
    const v = knnRecall(SETS.blobs.X, embed('blobs', k, 1), Math.min(k, 15));
    assert.ok(Math.abs(v - want[i]) < 0.05, `k=${k}: ${v} against a measured ${want[i]}`);
  });
});

// ------------------------------------- UMAP is not a strict improvement on k-means

test('crescents: UMAP beats k-means at many neighbours and loses to it at few', () => {
  // §8 requires both numbers to appear together. The k=5 median is WORSE than the
  // 0.747 k-means gets for free; the k=50 median is perfect. The method is not an
  // upgrade, it is a different bet, and the bet depends on a number you chose.
  const KMEANS_RAW = 0.747;
  // Measured by reference/umap-measure.mjs section 8; see results/umap-measure.log.
  // Three of these moved when the harness was made to compute them rather than
  // having them pasted in: k=5 median 0.660 -> 0.657, k=15 median 0.867 -> 0.830,
  // k=50 perfect 25/30 -> 24/30. Spec §7 was corrected to match, per the standing
  // rule that measurement wins.
  const want = {
    5:  { median: 0.657, perfect: 1 },
    15: { median: 0.830, perfect: 8 },
    30: { median: 1.000, perfect: 20 },
    50: { median: 1.000, perfect: 24 },
  };
  for (const [k, w] of Object.entries(want)) {
    const p = [];
    for (let seed = 1; seed <= 30; seed++) {
      const Y = embed('crescents', Number(k), seed);
      p.push(purity(kmeansRun(Y, 2, mulberry32(7), { plusplus: true }).labels, SETS.crescents.truth, 2));
    }
    assert.ok(Math.abs(median(p) - w.median) < 0.08, `k=${k} median ${median(p)} against ${w.median}`);
    const perfect = p.filter(v => v > 0.999).length;
    assert.ok(Math.abs(perfect - w.perfect) <= 5, `k=${k} perfect ${perfect}/30 against ${w.perfect}/30`);
  }
  // The comparison the page must never drop.
  const five = [];
  for (let seed = 1; seed <= 30; seed++) {
    const Y = embed('crescents', 5, seed);
    five.push(purity(kmeansRun(Y, 2, mulberry32(7), { plusplus: true }).labels, SETS.crescents.truth, 2));
  }
  assert.ok(median(five) < KMEANS_RAW,
    `at five neighbours UMAP must come out WORSE than k-means' ${KMEANS_RAW}, or §8's refusal has nothing to stand on`);
});

// --------------------------------------------- UMAP invents structure (§8, uniform)

test('uniform: a structureless square looks MORE grouped after UMAP, not less', () => {
  // The honest failure, and it has to be reachable in the instrument rather than
  // merely described. Ruled explicitly by Andrew 2026-08-27.
  const RAW = 0.444;                                  // best k-means k=2..6 on the raw square
  for (const k of [5, 15, 50]) {
    const sil = [];
    for (let seed = 1; seed <= 5; seed++) sil.push(bestSilhouette(embed('uniform', k, seed)));
    assert.ok(Math.min(...sil) > RAW,
      `k=${k}: after UMAP the apparent grouping (${Math.min(...sil).toFixed(3)}) must exceed the raw square's ${RAW}`);
    assert.ok(Math.max(...sil) < 0.72, `k=${k}: ${Math.max(...sil)} is higher than anything measured`);
  }
});

// bestSilhouette and silhouette are copied from reference/umap-measure.mjs rather
// than imported: they are a measurement detail of THIS claim, not a page-facing
// measure, and embed-metrics.mjs stays the set of three things the page names.
function bestSilhouette(Y) {
  let best = -1;
  for (let k = 2; k <= 6; k++) {
    const { labels } = kmeansRun(Y, k, mulberry32(7), { plusplus: true });
    best = Math.max(best, silhouette(Y, labels, k));
  }
  return best;
}
function silhouette(Y, labels, k) {
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const groups = Array.from({ length: k }, () => []);
  labels.forEach((l, i) => groups[l].push(i));
  let total = 0, counted = 0;
  for (let i = 0; i < Y.length; i++) {
    const own = groups[labels[i]];
    if (own.length < 2) continue;
    let a = 0; for (const j of own) if (j !== i) a += dist(Y[i], Y[j]);
    a /= own.length - 1;
    let b = Infinity;
    for (let g = 0; g < k; g++) {
      if (g === labels[i] || !groups[g].length) continue;
      let m = 0; for (const j of groups[g]) m += dist(Y[i], Y[j]);
      b = Math.min(b, m / groups[g].length);
    }
    total += (b - a) / Math.max(a, b); counted++;
  }
  return counted ? total / counted : 0;
}

// -------------------------------------------------------------------- the closer

test('the embedding recovers gestational age as well as the four raw measurements do', () => {
  // The punchline: 0.973 against a ceiling of 0.972. Three unrelated machines -
  // PCA's first component, k-means' labels, this embedding - land on the same
  // answer. Approved 2026-08-27 as the closer's ONLY number.
  const ga = BIO.ga;
  const ceiling = gaFromNeighbours(SETS.biometry.X, ga, 15);
  assert.ok(Math.abs(ceiling - 0.972) < 0.01, `ceiling ${ceiling} against a measured 0.972`);

  for (const k of [5, 15, 50]) {
    const v = [];
    for (let seed = 1; seed <= 10; seed++) v.push(gaFromNeighbours(embed('biometry', k, seed), ga, 15));
    inRange(Math.min(...v), 0.955, 0.975, `k=${k} low end`);
    inRange(Math.max(...v), 0.960, 0.985, `k=${k} high end`);
    assert.ok(Math.max(...v) - Math.min(...v) < 0.02,
      `k=${k}: the closer must be rock stable across seeds, spread was ${(Math.max(...v) - Math.min(...v)).toFixed(4)}`);
  }
});

test("lesson 4's cluster labels reach 0.871 on the same data, and the page says so", () => {
  const km = kmeansRun(SETS.biometry.X, 3, mulberry32(11), { plusplus: true });
  assert.ok(Math.abs(eta2(BIO.ga, km.labels, 3) - 0.871) < 0.005);
});

test('the linear reading of the same closer is unstable, which is why it is not the closer', () => {
  // Regressing GA on the two embedding coordinates gives anything from 0.261 to
  // 0.971 depending on the seed. It reads as a wildly unstable result and is not
  // one: it is a straight line fitted to a curved arc. §2(c). This stays on the
  // page as a lesson about picking the wrong instrument.
  const v = [];
  for (let seed = 1; seed <= 10; seed++) v.push(r2OnEmbedding(embed('biometry', 15, seed), BIO.ga));
  assert.ok(Math.max(...v) - Math.min(...v) > 0.3,
    `the linear reading must be visibly unstable, spread was ${(Math.max(...v) - Math.min(...v)).toFixed(3)}`);
});

// Copied from reference/umap-measure.mjs. Only this one test uses it, and it
// exists to be shown failing rather than to measure anything the page trusts.
function r2OnEmbedding(Y, y) {
  const n = Y.length, X = Y.map(p => [1, p[0], p[1]]);
  const A = Array.from({ length: 3 }, () => new Array(3).fill(0)), c = new Array(3).fill(0);
  for (let i = 0; i < n; i++) for (let r = 0; r < 3; r++) {
    c[r] += X[i][r] * y[i];
    for (let s = 0; s < 3; s++) A[r][s] += X[i][r] * X[i][s];
  }
  for (let p = 0; p < 3; p++) {
    let piv = p; for (let r = p + 1; r < 3; r++) if (Math.abs(A[r][p]) > Math.abs(A[piv][p])) piv = r;
    [A[p], A[piv]] = [A[piv], A[p]]; [c[p], c[piv]] = [c[piv], c[p]];
    if (!A[p][p]) return NaN;
    for (let r = 0; r < 3; r++) {
      if (r === p) continue;
      const f = A[r][p] / A[p][p];
      for (let s = p; s < 3; s++) A[r][s] -= f * A[p][s];
      c[r] -= f * c[p];
    }
  }
  const beta = c.map((v, i) => v / A[i][i]);
  const my = y.reduce((a, b) => a + b, 0) / n;
  let ssr = 0, sst = 0;
  for (let i = 0; i < n; i++) {
    const p = beta[0] + beta[1] * Y[i][0] + beta[2] * Y[i][1];
    ssr += (y[i] - p) ** 2; sst += (y[i] - my) ** 2;
  }
  return 1 - ssr / sst;
}

// ---------------------------------------------------------------------- runtime

test('a full embedding is fast enough to run live, which is why no frames are shipped', () => {
  // Node/V8 only. Spec §11 keeps this as an inference about browsers until the
  // real-hardware check in Task 10.
  const t0 = process.hrtime.bigint();
  umap(SETS.biometry.X, { k: 50, seed: 1, nEpochs: 200 });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms < 400, `the worst committed case took ${ms.toFixed(0)} ms; 96 ms was measured, and past ~400 the live design in §2(a) stops being honest`);
});
