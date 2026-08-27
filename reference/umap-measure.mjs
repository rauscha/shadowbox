// Measurement harness for lesson 5. Hand-run, output pasted into the spec's
// claims table and later pinned by test/umap-claims.test.mjs:
//
//     node reference/umap-measure.mjs
//
// Nothing here is used by the page. This exists so that no sentence in the spec
// or the prose is written from expectation. Lesson 3 asserted "PC2 = head-vs-body
// proportion" from textbook expectation and it was half wrong; this is the
// standing correction to that.

import { readFileSync } from 'node:fs';
import { umap, fuzzyGraph, knn, euclidean } from '../js/math/umap.mjs';
import { zscoreColumns, kmeansRun, purity, eta2 } from '../js/math/kmeans.mjs';
import { mulberry32 } from '../js/math/core.mjs';

const D = new URL('../data/', import.meta.url);
const read = f => JSON.parse(readFileSync(new URL(f, D), 'utf8'));
const blobs = read('blobs.json'), births = read('births.json'), bio = read('biometry.json');

const SETS = {};
for (const [n, c] of Object.entries(blobs.configs)) {
  SETS[n] = { X: c.xs.map((x, i) => [x, c.ys[i]]), truth: c.labels, k: c.k };
}
SETS.births = { X: zscoreColumns([births.xs, births.ys]), truth: null, k: 3 };
SETS.biometry = { X: zscoreColumns([bio.bpd, bio.hc, bio.ac, bio.fl]), truth: null, k: 3 };

const fmt = (v, d = 3) => (v === null || Number.isNaN(v) ? '  n/a' : v.toFixed(d));

// --- metrics -----------------------------------------------------------------

// Fraction of each point's k original neighbours that survive as neighbours in 2D.
// The single most honest summary of "did local structure survive the flattening".
function knnRecall(X, Y, k) {
  const a = knn(X, k).indices, b = knn(Y, k).indices;
  let hit = 0;
  for (let i = 0; i < a.length; i++) {
    const s = new Set(b[i]);
    for (const j of a[i]) if (s.has(j)) hit++;
  }
  return hit / (a.length * k);
}

// DROPPED: 1-nearest-neighbour label agreement. It reads 1.000 on the embedding
// for both labelled datasets - and 1.000 on the RAW data as well, because these
// are densely sampled blobs and arcs where your nearest neighbour is always a
// sibling. A metric that is saturated before the method runs cannot show what the
// method did. Use kmeansPurity below, which has a real baseline to beat (0.747 on
// raw crescents, from lesson 4's claims table).
function kmeansPurity(Y, truth, k) {
  if (!truth) return null;
  const km = kmeansRun(Y, k, mulberry32(7), { plusplus: true });
  return purity(km.labels, truth, k);
}

function rank(v) {
  const idx = v.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]);
  const r = new Array(v.length);
  for (let i = 0; i < idx.length;) {
    let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let t = i; t <= j; t++) r[idx[t][1]] = avg;
    i = j + 1;
  }
  return r;
}
function pearson(a, b) {
  const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let sab = 0, sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { const da = a[i] - ma, db = b[i] - mb; sab += da * db; sa += da * da; sb += db * db; }
  return sab / Math.sqrt(sa * sb);
}
// Global structure: do pairwise distances in 2D track pairwise distances in the
// original space? Spearman, over every pair.
function distanceSpearman(X, Y) {
  const dx = [], dy = [];
  for (let i = 0; i < X.length; i++) for (let j = i + 1; j < X.length; j++) {
    dx.push(euclidean(X[i], X[j])); dy.push(euclidean(Y[i], Y[j]));
  }
  return pearson(rank(dx), rank(dy));
}

// Mean silhouette of the best k-means partition of the EMBEDDING, k = 2..6.
// This is the "did UMAP invent groups that were not there" detector, and it
// deliberately reuses lesson 4's machinery.
function bestSilhouette(Y) {
  let best = { k: null, s: -1 };
  for (let k = 2; k <= 6; k++) {
    const { labels } = kmeansRun(Y, k, mulberry32(7), { plusplus: true });
    const s = silhouette(Y, labels, k);
    if (s > best.s) best = { k, s };
  }
  return best;
}
function silhouette(Y, labels, k) {
  const n = Y.length, groups = Array.from({ length: k }, () => []);
  labels.forEach((l, i) => groups[l].push(i));
  let total = 0, counted = 0;
  for (let i = 0; i < n; i++) {
    const own = groups[labels[i]];
    if (own.length < 2) continue;
    let a = 0; for (const j of own) if (j !== i) a += euclidean(Y[i], Y[j]);
    a /= own.length - 1;
    let b = Infinity;
    for (let g = 0; g < k; g++) {
      if (g === labels[i] || !groups[g].length) continue;
      let m = 0; for (const j of groups[g]) m += euclidean(Y[i], Y[j]);
      b = Math.min(b, m / groups[g].length);
    }
    total += (b - a) / Math.max(a, b); counted++;
  }
  return counted ? total / counted : 0;
}

// R^2 of gestational age regressed on the two embedding coordinates. The 2D
// analogue of lesson 4's "share of the variation in GA the labels account for".
function r2OnEmbedding(Y, y) {
  const n = Y.length;
  const X = Y.map(p => [1, p[0], p[1]]);
  // normal equations, 3x3
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

// --- runs --------------------------------------------------------------------

const log = s => process.stdout.write(s + '\n');
const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const stamp = () => new Date().toTimeString().slice(0, 8);

log(`[${stamp()}] umap measurement harness`);
log(`queue: (1) graph determinism  (2) seed spread  (3) k sweep  (4) min_dist sweep`);
log(`       (5) crescents vs k-means  (6) uniform false structure  (7) biometry closer`);
log('');

log('== 1. is the graph deterministic? (same X, same k, different seeds) ==');
for (const name of ['blobs', 'biometry']) {
  const { X } = SETS[name];
  const g1 = fuzzyGraph(X, 15), g2 = fuzzyGraph(X, 15);
  const same = g1.weight.every((w, i) => w === g2.weight[i]) && g1.head.length === g2.head.length;
  log(`  ${name.padEnd(10)} edges=${g1.head.length} identical across calls: ${same}`);
}
log('');

log('== 2. seed spread of the embedding (k=15, min_dist=0.1, 200 epochs) ==');
log('  dataset     seeds  knn-recall(15)      km-purity           dist-spearman');
for (const [name, S] of Object.entries(SETS)) {
  const rec = [], agr = [], sp = [];
  for (const seed of SEEDS) {
    const { Y } = umap(S.X, { k: 15, seed, nEpochs: 200 });
    rec.push(knnRecall(S.X, Y, 15));
    const a = kmeansPurity(Y, S.truth, S.k); if (a !== null) agr.push(a);
    sp.push(distanceSpearman(S.X, Y));
  }
  const rng = v => v.length ? `${fmt(Math.min(...v))}-${fmt(Math.max(...v))}` : ' n/a       ';
  log(`  ${name.padEnd(11)} ${SEEDS.length}     ${rng(rec).padEnd(19)} ${rng(agr).padEnd(19)} ${rng(sp)}`);
}
log('');

log('== 3. k sweep (seed 1) - does the number of neighbours change the picture? ==');
log('  dataset     k    knn-recall  km-purity  dist-spearman  best-silhouette(k)');
for (const [name, S] of Object.entries(SETS)) {
  for (const k of [2, 5, 15, 50]) {
    if (k >= S.X.length) continue;
    const { Y } = umap(S.X, { k, seed: 1, nEpochs: 200 });
    const sil = bestSilhouette(Y);
    log(`  ${name.padEnd(11)} ${String(k).padEnd(4)} ${fmt(knnRecall(S.X, Y, Math.min(k, 15))).padEnd(11)} ${fmt(kmeansPurity(Y, S.truth, S.k)).padEnd(10)} ${fmt(distanceSpearman(S.X, Y)).padEnd(14)} ${fmt(sil.s)} (k=${sil.k})`);
  }
}
log('');

log('== 4. min_dist sweep on blobs (k=15, seed 1) - cosmetic or structural? ==');
log('  min_dist  knn-recall  km-purity  dist-spearman  spread(x)');
for (const md of [0.0, 0.1, 0.35, 0.6, 0.75, 0.9, 1.0]) {
  const S = SETS.blobs;
  const { Y } = umap(S.X, { k: 15, seed: 1, nEpochs: 200, minDist: md });
  const xs = Y.map(p => p[0]);
  log(`  ${String(md).padEnd(9)} ${fmt(knnRecall(S.X, Y, 15)).padEnd(11)} ${fmt(kmeansPurity(Y, S.truth, S.k)).padEnd(10)} ${fmt(distanceSpearman(S.X, Y)).padEnd(14)} ${fmt(Math.max(...xs) - Math.min(...xs), 1)}`);
}
log('');

log('== 5. crescents: the thing k-means could not do ==');
{
  const S = SETS.crescents;
  const km = kmeansRun(S.X, 2, mulberry32(7), { plusplus: true });
  log(`  k-means on the raw data, k=2:      purity ${fmt(purity(km.labels, S.truth, 2))}`);
  for (const seed of SEEDS.slice(0, 5)) {
    const { Y } = umap(S.X, { k: 15, seed, nEpochs: 200 });
    const ku = kmeansRun(Y, 2, mulberry32(7), { plusplus: true });
    log(`  umap(k=15,seed=${String(seed).padEnd(2)}) then k-means k=2:  purity ${fmt(purity(ku.labels, S.truth, 2))}   km-purity ${fmt(kmeansPurity(Y, S.truth, S.k))}`);
  }
}
log('');

log('== 6. uniform: does umap manufacture groups that are not there? ==');
{
  const S = SETS.uniform;
  const raw = bestSilhouette(S.X);
  log(`  silhouette of best k-means on the RAW uniform square: ${fmt(raw.s)} (k=${raw.k})`);
  for (const k of [5, 15, 50]) {
    const sils = SEEDS.slice(0, 5).map(seed => bestSilhouette(umap(S.X, { k, seed, nEpochs: 200 }).Y));
    const s = sils.map(v => v.s);
    log(`  silhouette after umap k=${String(k).padEnd(3)}: ${fmt(Math.min(...s))}-${fmt(Math.max(...s))}  (best k per seed: ${sils.map(v => v.k).join(',')})`);
  }
}
log('');

log('== 7. biometry closer: does the embedding recover gestational age? ==');
{
  const S = SETS.biometry, ga = bio.ga;
  for (const k of [5, 15, 50]) {
    const r2 = [], rec = [];
    for (const seed of SEEDS.slice(0, 5)) {
      const { Y } = umap(S.X, { k, seed, nEpochs: 200 });
      r2.push(r2OnEmbedding(Y, ga)); rec.push(knnRecall(S.X, Y, 15));
    }
    log(`  k=${String(k).padEnd(3)} R^2(GA on the 2 embedding coords) ${fmt(Math.min(...r2))}-${fmt(Math.max(...r2))}   knn-recall ${fmt(Math.min(...rec))}-${fmt(Math.max(...rec))}`);
  }
  const { Y } = umap(S.X, { k: 15, seed: 1, nEpochs: 200 });
  const km = kmeansRun(S.X, 3, mulberry32(11), { plusplus: true });
  log(`  for comparison, lesson 4's k=3 cluster labels on the same data: eta^2(GA) ${fmt(eta2(ga, km.labels, 3))}`);
  log(`  and PCA's PC1 (lesson 3) is the same story by a third route.`);
  log(`  embedding-vs-GA rank correlation on the best axis: ${fmt(Math.max(
    Math.abs(pearson(rank(Y.map(p => p[0])), rank(ga))),
    Math.abs(pearson(rank(Y.map(p => p[1])), rank(ga)))))}`);
}
log('');
log(`[${stamp()}] done`);
