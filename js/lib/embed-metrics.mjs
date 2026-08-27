// The three measures lesson 5 quotes, in one place. The instruments, the
// measurement harness and the claims test all import from here, so a number
// drawn on the page and a number asserted in a test cannot come from two
// different definitions of the same word.
//
// Naming: the page never says "kNN recall" or "Spearman". It says how much of
// the local neighbourhood survived, and how well the distances between
// far-apart points survived. The function names keep the technical term; the
// labels_ strings on each instrument carry the plain one.

import { knn, euclidean } from '../math/umap.mjs';

// Fraction of each point's k original neighbours that survive as neighbours in
// the layout. The most honest one-number summary of "did local structure
// survive the flattening".
export function knnRecall(X, Y, k) {
  const a = knn(X, k).indices, b = knn(Y, k).indices;
  let hit = 0;
  for (let i = 0; i < a.length; i++) {
    const s = new Set(b[i]);
    for (const j of a[i]) if (s.has(j)) hit++;
  }
  return hit / (a.length * k);
}

export function rank(v) {
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

export function pearson(a, b) {
  const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let sab = 0, sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { const da = a[i] - ma, db = b[i] - mb; sab += da * db; sa += da * da; sb += db * db; }
  return sab / Math.sqrt(sa * sb);
}

// Global structure: do pairwise distances in the layout track pairwise distances
// in the original space? Spearman, over every pair.
export function distanceSpearman(X, Y) {
  const dx = [], dy = [];
  for (let i = 0; i < X.length; i++) for (let j = i + 1; j < X.length; j++) {
    dx.push(euclidean(X[i], X[j])); dy.push(euclidean(Y[i], Y[j]));
  }
  return pearson(rank(dx), rank(dy));
}

// Predict each point's outcome from the mean outcome of its k nearest
// neighbours IN P, and report the share of the outcome's variation that
// prediction accounts for. P is the raw rows for the ceiling and the 2D
// embedding for the result.
//
// This replaces the obvious measure - regress the outcome on the two embedding
// coordinates - which reads 0.261 to 0.971 depending on the seed and looks like
// a wildly unstable result. It is not unstable. It is a straight line fitted to
// a curved arc. Spec §2(c). The linear reading stays on the page as a lesson in
// picking the wrong instrument, never as the closer's number.
export function gaFromNeighbours(P, y, k) {
  const n = P.length;
  if (!(k >= 1 && k < n)) throw new Error(`gaFromNeighbours: k must be in [1, ${n - 1}], got ${k}`);
  const { indices } = knn(P, k);
  const my = y.reduce((a, b) => a + b, 0) / n;
  let sse = 0, sst = 0;
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (const j of indices[i]) m += y[j];
    m /= k;
    sse += (y[i] - m) ** 2;
    sst += (y[i] - my) ** 2;
  }
  return 1 - sse / sst;
}
