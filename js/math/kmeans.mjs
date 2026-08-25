// k-means, factored so the page and the tests run the same code, and so one
// click of Step is one half-step. The reference probes in reference/ produced
// every number in the spec's claims table; this module reproduces them exactly,
// which means matching their rng consumption order, their tie-breaking, and
// their treatment of an empty cluster. Change any of those and the claims move.
//
// On standardizing: zscoreColumns divides by n (population sd), which is what
// the probes do. core.mjs standardize() divides by n-1. For a fixed n that is
// one global scalar on every column at once, so labels, purity, eta2 and all
// drop percentages come out identical either way; only the absolute total
// squared distance differs, by n/(n-1). test/kmeans-claims.test.mjs pins that
// invariance so nobody has to rediscover it.

export function d2(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return s;
}

// cols: one array per variable. Returns rows: one array per observation.
export function zscoreColumns(cols) {
  const n = cols[0].length;
  const mu = cols.map(c => c.reduce((a, b) => a + b, 0) / n);
  const sd = cols.map((c, j) => Math.sqrt(c.reduce((a, b) => a + (b - mu[j]) ** 2, 0) / n));
  return Array.from({ length: n }, (_, i) => cols.map((c, j) => (c[i] - mu[j]) / (sd[j] || 1)));
}

// Rejection sampling on distinct indices, insertion-ordered. Matches the probes.
export function initRandom(X, k, rng) {
  const idx = new Set();
  while (idx.size < k) idx.add(Math.floor(rng() * X.length));
  return [...idx].map(i => X[i].slice());
}

// k-means++: the first center uniform, each next one drawn with probability
// proportional to its squared distance from the nearest center already chosen.
export function initPlusPlus(X, k, rng) {
  const C = [X[Math.floor(rng() * X.length)].slice()];
  while (C.length < k) {
    const d = X.map(x => Math.min(...C.map(c => d2(x, c))));
    const T = d.reduce((a, b) => a + b, 0);
    let r = rng() * T, i = 0;
    while (r > d[i] && i < X.length - 1) { r -= d[i]; i++; }
    C.push(X[i].slice());
  }
  return C;
}

export function initCenters(X, k, rng, plusplus) {
  return plusplus ? initPlusPlus(X, k, rng) : initRandom(X, k, rng);
}

// Strict less-than, so the lowest center index wins a tie. The probes do this.
export function assign(X, centers) {
  const labels = new Array(X.length);
  for (let i = 0; i < X.length; i++) {
    let best = 0, bd = Infinity;
    for (let j = 0; j < centers.length; j++) {
      const dd = d2(X[i], centers[j]);
      if (dd < bd) { bd = dd; best = j; }
    }
    labels[i] = best;
  }
  return labels;
}

// An empty cluster keeps the center it had. Dropping or reseeding it would make
// the run non-reproducible against the probes.
export function recompute(X, labels, k, centers) {
  const dim = X[0].length;
  const sum = Array.from({ length: k }, () => new Array(dim).fill(0));
  const cnt = new Array(k).fill(0);
  for (let i = 0; i < X.length; i++) {
    const l = labels[i];
    if (l < 0) continue;
    cnt[l]++;
    for (let j = 0; j < dim; j++) sum[l][j] += X[i][j];
  }
  return centers.map((c, j) => (cnt[j] ? sum[j].map(s => s / cnt[j]) : c.slice()));
}

export function totalSquaredDistance(X, labels, centers) {
  let s = 0;
  for (let i = 0; i < X.length; i++) s += d2(X[i], centers[labels[i]]);
  return s;
}

export function startState(X, k, rng, { plusplus = false } = {}) {
  return {
    X, k,
    centers: initCenters(X, k, rng, plusplus),
    labels: new Array(X.length).fill(-1),
    phase: 'assign',
    iter: 0,
    done: false,
  };
}

// One half-step. assign redraws membership with the centers frozen; update moves
// the centers with membership frozen. Never both in one click.
export function kmeansStep(s) {
  if (s.phase === 'assign') {
    const labels = assign(s.X, s.centers);
    const moved = labels.some((l, i) => l !== s.labels[i]);
    return { ...s, labels, phase: 'update', done: !moved };
  }
  return {
    ...s,
    centers: recompute(s.X, s.labels, s.k, s.centers),
    phase: 'assign',
    iter: s.iter + 1,
  };
}

// Drives kmeansStep so there is exactly one implementation. iters counts full
// iterations, each of which is two half-steps, matching the probes' loop.
export function kmeansRun(X, k, rng, { plusplus = false, iters = 300 } = {}) {
  let s = startState(X, k, rng, { plusplus });
  for (let it = 0; it < iters; it++) {
    s = kmeansStep(s);                       // assign
    const done = s.done;
    s = kmeansStep(s);                       // update, which the probes also run before breaking
    if (done) break;
  }
  return { centers: s.centers, labels: s.labels, wcss: totalSquaredDistance(X, s.labels, s.centers), iters: s.iter };
}

export function purity(labels, truth, k) {
  const n = labels.length;
  let hit = 0;
  for (let j = 0; j < k; j++) {
    const cnt = new Map();
    for (let i = 0; i < n; i++) if (labels[i] === j) cnt.set(truth[i], (cnt.get(truth[i]) || 0) + 1);
    if (cnt.size) hit += Math.max(...cnt.values());
  }
  return hit / n;
}

// The share of the variation in y that the labels account for. Never called
// eta-squared on the page.
export function eta2(y, labels, k) {
  const n = y.length;
  const m = y.reduce((a, b) => a + b, 0) / n;
  const tot = y.reduce((s, v) => s + (v - m) ** 2, 0);
  let between = 0;
  for (let j = 0; j < k; j++) {
    const g = y.filter((_, i) => labels[i] === j);
    if (!g.length) continue;
    const mg = g.reduce((a, b) => a + b, 0) / g.length;
    between += g.length * (mg - m) ** 2;
  }
  return between / tot;
}
