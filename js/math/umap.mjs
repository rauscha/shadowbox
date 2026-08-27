// UMAP, factored the same way k-means was: the page, the probes and the tests all
// run this module, so a number in the prose cannot drift from a number in the code.
//
// This is the real algorithm, not a cartoon of it. The three stages are kept as
// separate exports because the lesson teaches them separately:
//
//   1. knn()        - who is near whom. Lesson 5 teaches kNN inside itself.
//   2. fuzzyGraph() - turn those neighbours into weighted edges. Deterministic:
//                     given X and k, there is exactly one graph, no seed involved.
//   3. optimize()   - push a 2D layout around until the low-dimensional edges
//                     look like the high-dimensional ones. Stochastic, seeded.
//
// Stage 2 being deterministic is the single most useful fact for the lesson. Every
// run-to-run difference a reader sees comes from stage 3 alone, which is the same
// "start from a guess and improve" idiom lesson 4 introduced. Lesson 4's Play loop
// drives frames from a live step(); this module instead precomputes a trajectory
// (see trajectory()) because UMAP's SGD is far too slow to run per animation frame.
//
// Fidelity notes, all deliberate, all matching umap-learn 0.5's reference code:
//   - sigma is found by the same 64-step bisection against a target of log2(k),
//     with the same MIN_K_DIST_SCALE = 1e-3 floor.
//   - the symmetrisation is the probabilistic t-conorm a + b - a*b.
//   - a and b are fitted to the min_dist/spread curve rather than hardcoded, so
//     changing min_dist in an instrument stays honest.
//   - the SGD is edge-sampled with epochs_per_sample, 5 negative samples per
//     positive, gradients clipped to +/-4, learning rate decaying linearly.
// What is NOT reproduced: umap-learn's approximate nearest neighbours (NN-Descent).
// Here kNN is exact brute force. At n <= 400 that is both affordable and strictly
// better, and it removes a source of run-to-run noise the lesson would have to
// explain away. reference/umap-probe.py pins this module against umap-learn on
// every deterministic stage; see test/umap.test.mjs.

import { mulberry32 } from './core.mjs';

export const MIN_K_DIST_SCALE = 1e-3;
export const SMOOTH_K_TOLERANCE = 1e-5;

export function euclidean(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return Math.sqrt(s);
}

// Exact brute-force kNN, self excluded, ascending by distance. Ties break on the
// lower index so the graph is a pure function of X and k with no hidden ordering.
export function knn(X, k) {
  const n = X.length;
  if (!(k >= 1 && k < n)) throw new Error(`knn: k must be in [1, ${n - 1}], got ${k}`);
  const indices = [], distances = [];
  for (let i = 0; i < n; i++) {
    const row = [];
    for (let j = 0; j < n; j++) if (j !== i) row.push([euclidean(X[i], X[j]), j]);
    row.sort((p, q) => p[0] - q[0] || p[1] - q[1]);
    indices.push(row.slice(0, k).map(r => r[1]));
    distances.push(row.slice(0, k).map(r => r[0]));
  }
  return { indices, distances };
}

// For each row: rho = distance to the nearest neighbour, and sigma chosen so the
// membership strengths of that row sum to log2(row length). Bisection, not a
// formula - there is no closed form, which is itself worth a sentence on the page.
//
// IMPORTANT, and measured rather than assumed: umap-learn's `n_neighbors` row
// INCLUDES the point itself at distance 0, so n_neighbors=15 means 14 real
// neighbours. A lesson that draws the neighbour edges cannot afford that gap
// between the number on the slider and the number of lines on screen, so this
// module's `k` counts REAL neighbours and rows arrive here with the self-zero
// prepended. The exact correspondence is therefore:
//
//     shadowbox umap(X, { k })  ===  umap-learn UMAP(n_neighbors = k + 1)
//
// test/umap.test.mjs pins that against reference/umap-probe.py output.
export function smoothKNNDist(rowsWithSelf, { tolerance = SMOOTH_K_TOLERANCE } = {}) {
  const width = rowsWithSelf[0].length;
  const target = Math.log2(width);
  const rhos = [], sigmas = [];
  const allMean = rowsWithSelf.reduce((a, r) => a + r.reduce((x, y) => x + y, 0), 0)
    / (rowsWithSelf.length * width);

  for (const row of rowsWithSelf) {
    const nonZero = row.filter(d => d > 0);
    const rho = nonZero.length ? nonZero[0] : 0;
    let lo = 0, hi = Infinity, mid = 1.0;
    for (let iter = 0; iter < 64; iter++) {
      let psum = 0;
      // Note the slice: the target is log2(k + 1) but the SUM skips the self
      // entry and runs over the k real neighbours only. umap-learn does exactly
      // this (`for j in range(1, ...)` against a target of log2(n_neighbors)),
      // and it is easy to miss - including the self term makes every sigma come
      // out too small, silently, with a perfectly plausible-looking graph.
      for (const d of row.slice(1)) {
        const t = d - rho;
        psum += t > 0 ? Math.exp(-t / mid) : 1;
      }
      if (Math.abs(psum - target) < tolerance) break;
      if (psum > target) { hi = mid; mid = (lo + hi) / 2; }
      else { lo = mid; mid = hi === Infinity ? mid * 2 : (lo + hi) / 2; }
    }
    const rowMean = row.reduce((a, b) => a + b, 0) / width;
    if (rho > 0) mid = Math.max(mid, MIN_K_DIST_SCALE * rowMean);
    else mid = Math.max(mid, MIN_K_DIST_SCALE * allMean);
    rhos.push(rho); sigmas.push(mid);
  }
  return { rhos, sigmas };
}

// The weighted, symmetric graph. Returns a de-duplicated edge list; this is the
// object the lesson calls "the graph", and it never depends on a seed.
export function fuzzyGraph(X, k) {
  const { indices, distances } = knn(X, k);
  // Prepend the self-zero so the bisection target and the row means match
  // umap-learn exactly. See smoothKNNDist.
  const { rhos, sigmas } = smoothKNNDist(distances.map(r => [0, ...r]));
  const n = X.length;

  // Directed membership strengths.
  const w = new Map(); // "i,j" -> strength
  for (let i = 0; i < n; i++) {
    for (let a = 0; a < k; a++) {
      const j = indices[i][a];
      const t = distances[i][a] - rhos[i];
      w.set(`${i},${j}`, t > 0 ? Math.exp(-t / sigmas[i]) : 1);
    }
  }

  // Probabilistic t-conorm: a + b - a*b, over the union of both directions.
  const seen = new Set(), head = [], tail = [], weight = [];
  for (const key of w.keys()) {
    const [i, j] = key.split(',').map(Number);
    const lo = Math.min(i, j), hi = Math.max(i, j);
    const canon = `${lo},${hi}`;
    if (seen.has(canon)) continue;
    seen.add(canon);
    const a = w.get(`${lo},${hi}`) || 0;
    const b = w.get(`${hi},${lo}`) || 0;
    head.push(lo); tail.push(hi); weight.push(a + b - a * b);
  }
  return { head, tail, weight, indices, distances, rhos, sigmas };
}

// Fit 1/(1 + a*d^(2b)) to the piecewise target UMAP uses for min_dist/spread.
// Levenberg-Marquardt, matching scipy's curve_fit (which is what umap-learn's
// find_ab_params calls) to ~1e-4 across the whole parameter grid the lesson can
// reach. Deterministic - no RNG, no data dependence, same answer every run.
//
// This started life as plain Gauss-Newton, which was a mistake worth recording:
// it converged fine for the default (0.1, 1.0) and diverged silently elsewhere,
// returning a NEGATIVE b for minDist >= 0.8 at spread 1 and failing at every
// minDist for spread 5. A negative b inverts the attractive gradient, so the
// layout flew apart to an x-spread of 14,000, and a negative a put a zero in the
// denominator and returned 150 NaN coordinates - which renders as an empty
// figure with no error reported anywhere. The damping is what fixes it; scipy
// fits all of those cases without complaint, so the model was never the problem.
export function fitAB(minDist = 0.1, spread = 1.0) {
  const xs = [], ys = [];
  for (let i = 0; i < 300; i++) {
    const x = (i / 299) * 3 * spread;
    xs.push(x);
    ys.push(x <= minDist ? 1 : Math.exp(-(x - minDist) / spread));
  }
  const sse = (a, b) => {
    let s = 0;
    for (let i = 0; i < xs.length; i++) {
      if (xs[i] === 0) continue;
      s += (1 / (1 + a * Math.pow(xs[i], 2 * b)) - ys[i]) ** 2;
    }
    return s;
  };

  let a = 1, b = 1, lambda = 1e-3, err = sse(a, b);
  for (let iter = 0; iter < 500; iter++) {
    let jtj00 = 0, jtj01 = 0, jtj11 = 0, jtr0 = 0, jtr1 = 0;
    for (let i = 0; i < xs.length; i++) {
      const x = xs[i];
      if (x === 0) continue;
      const p = Math.pow(x, 2 * b);
      const den = 1 + a * p;
      const r = 1 / den - ys[i];
      const dfda = -p / (den * den);
      const dfdb = -a * p * 2 * Math.log(x) / (den * den);
      jtj00 += dfda * dfda; jtj01 += dfda * dfdb; jtj11 += dfdb * dfdb;
      jtr0 += dfda * r; jtr1 += dfdb * r;
    }
    let stepped = false;
    for (let attempt = 0; attempt < 40; attempt++) {
      const m00 = jtj00 * (1 + lambda), m11 = jtj11 * (1 + lambda);
      const det = m00 * m11 - jtj01 * jtj01;
      if (det) {
        const da = (-jtr0 * m11 + jtr1 * jtj01) / det;
        const db = (-jtr1 * m00 + jtr0 * jtj01) / det;
        const na = a + da, nb = b + db;
        if (na > 0 && nb > 0) {
          const ne = sse(na, nb);
          if (ne < err) {
            a = na; b = nb; err = ne; lambda = Math.max(lambda / 10, 1e-12);
            stepped = Math.abs(da) > 1e-13 || Math.abs(db) > 1e-13;
            break;
          }
        }
      }
      lambda *= 10;
      if (lambda > 1e12) break;
    }
    if (!stepped) break;
  }

  // Safety net rather than an expected path: with damping in place every
  // (minDist, spread) the instruments expose fits cleanly. A throw here means the
  // fitter regressed, and that must not surface as a blank figure.
  if (!(a > 0) || !(b > 0)) {
    throw new Error(
      `fitAB: no usable fit for minDist=${minDist}, spread=${spread} (a=${a}, b=${b}).`);
  }
  return { a, b };
}

// epochs_per_sample: how often each edge gets to pull. Strong edges pull every
// epoch, weak ones rarely. This is UMAP's whole notion of "weighted" - the weights
// never appear in the gradient, only in how often an edge is sampled.
export function epochsPerSample(weight, nEpochs) {
  const max = Math.max(...weight);
  return weight.map(w => (w > 0 ? max / w : -1));
}

export function randomInit(n, rng, scale = 10) {
  const Y = [];
  for (let i = 0; i < n; i++) Y.push([(rng() * 2 - 1) * scale, (rng() * 2 - 1) * scale]);
  return Y;
}

const clip = v => (v > 4 ? 4 : v < -4 ? -4 : v);

// One epoch of edge-sampled SGD, mutating Y. Exported because the lesson's
// trajectory is just this called repeatedly, and because a test can then assert
// that a single epoch moves the things it should and nothing else.
export function optimizeEpoch(Y, graph, opts) {
  const { a, b, gamma = 1.0, negativeSampleRate = 5, alpha, epoch, eps, eons, eopns, rng } = opts;
  const { head, tail } = graph;
  const n = Y.length;
  for (let e = 0; e < head.length; e++) {
    if (eps[e] <= 0 || eons[e] > epoch) continue;
    const j = head[e], kk = tail[e];
    let d2 = 0;
    for (let d = 0; d < 2; d++) d2 += (Y[j][d] - Y[kk][d]) ** 2;
    let coeff = 0;
    if (d2 > 0) coeff = (-2 * a * b * Math.pow(d2, b - 1)) / (a * Math.pow(d2, b) + 1);
    for (let d = 0; d < 2; d++) {
      const g = clip(coeff * (Y[j][d] - Y[kk][d]));
      Y[j][d] += g * alpha;
      Y[kk][d] += -g * alpha;
    }
    eons[e] += eps[e];

    const nNeg = Math.floor((epoch - eopns[e]) / (eps[e] / negativeSampleRate));
    for (let p = 0; p < nNeg; p++) {
      const c = Math.floor(rng() * n);
      let nd2 = 0;
      for (let d = 0; d < 2; d++) nd2 += (Y[j][d] - Y[c][d]) ** 2;
      let ncoeff = 0;
      if (nd2 > 0) ncoeff = (2 * gamma * b) / ((0.001 + nd2) * (a * Math.pow(nd2, b) + 1));
      else if (j === c) continue;
      for (let d = 0; d < 2; d++) {
        const g = ncoeff > 0 ? clip(ncoeff * (Y[j][d] - Y[c][d])) : 4;
        Y[j][d] += g * alpha;
      }
    }
    eopns[e] += nNeg * (eps[e] / negativeSampleRate);
  }
}

// The full run. Returns the final layout plus, if asked, the frames the page
// animates. `every` is in epochs; frames include epoch 0 (the raw initialisation)
// so the reader sees where it started.
export function umap(X, {
  k = 15, minDist = 0.1, spread = 1.0, nEpochs = 200, seed = 42,
  gamma = 1.0, negativeSampleRate = 5, initialAlpha = 1.0, frameEvery = 0, init = null,
} = {}) {
  const rng = mulberry32(seed);
  const graph = fuzzyGraph(X, k);
  const { a, b } = fitAB(minDist, spread);
  const Y = init ? init.map(p => p.slice()) : randomInit(X.length, rng);

  const eps = epochsPerSample(graph.weight, nEpochs);
  const eons = eps.slice();
  const eopns = eps.map(v => v / negativeSampleRate);

  const frames = [];
  const snap = () => frames.push(Y.map(p => p.slice()));
  if (frameEvery) snap();

  for (let epoch = 0; epoch < nEpochs; epoch++) {
    const alpha = initialAlpha * (1 - epoch / nEpochs);
    optimizeEpoch(Y, graph, { a, b, gamma, negativeSampleRate, alpha, epoch, eps, eons, eopns, rng });
    if (frameEvery && ((epoch + 1) % frameEvery === 0)) snap();
  }
  return { Y, frames, graph, a, b };
}
