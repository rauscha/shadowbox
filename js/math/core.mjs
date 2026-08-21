// shadowbox math core - pure functions, no DOM, no dependencies.
// Convention: sample statistics everywhere (n-1), matching numpy ddof=1.
// Pinned against reference/fixtures.py (numpy) via test/fixtures.json.

export function mean(xs) { let s = 0; for (const x of xs) s += x; return s / xs.length; }
export function variance(xs) { const m = mean(xs); let s = 0; for (const x of xs) s += (x - m) ** 2; return s / (xs.length - 1); }
export function sd(xs) { return Math.sqrt(variance(xs)); }
export function covariance(xs, ys) {
  const mx = mean(xs), my = mean(ys); let s = 0;
  for (let i = 0; i < xs.length; i++) s += (xs[i] - mx) * (ys[i] - my);
  return s / (xs.length - 1);
}
export function corr(xs, ys) { return covariance(xs, ys) / (sd(xs) * sd(ys)); }
export function standardize(xs) { const m = mean(xs), s = sd(xs); return xs.map(x => (x - m) / s); }

export function sse(xs, ys, slope, intercept) {
  let t = 0;
  for (let i = 0; i < xs.length; i++) { const r = ys[i] - (slope * xs[i] + intercept); t += r * r; }
  return t;
}
export function sae(xs, ys, slope, intercept) {
  let t = 0;
  for (let i = 0; i < xs.length; i++) t += Math.abs(ys[i] - (slope * xs[i] + intercept));
  return t;
}
export function ols(xs, ys) {
  const slope = covariance(xs, ys) / variance(xs);
  const intercept = mean(ys) - slope * mean(xs);
  const residuals = xs.map((x, i) => ys[i] - (slope * x + intercept));
  return { slope, intercept, residuals, sse: sse(xs, ys, slope, intercept) };
}
export function lossSurface(xs, ys, { s0, s1, b0, b1, n = 48, loss = 'squared' } = {}) {
  const f = loss === 'absolute' ? sae : sse;
  const values = []; let min = Infinity, max = -Infinity, minAt = [s0, b0];
  for (let j = 0; j < n; j++) {
    const b = b0 + (b1 - b0) * j / (n - 1); const row = [];
    for (let i = 0; i < n; i++) {
      const s = s0 + (s1 - s0) * i / (n - 1); const v = f(xs, ys, s, b);
      row.push(v);
      if (v < min) { min = v; minAt = [s, b]; }
      if (v > max) max = v;
    }
    values.push(row);
  }
  return { values, min, max, minAt, s0, s1, b0, b1, n };
}

// ---- eigen + pca ----
// Sign convention: largest-magnitude component positive. Comparisons elsewhere are
// direction-based; this convention only keeps rendering stable frame-to-frame.

export function signNorm(v) {
  let k = 0;
  for (let i = 1; i < v.length; i++) if (Math.abs(v[i]) > Math.abs(v[k])) k = i;
  return v[k] < 0 ? v.map(x => -x) : v.slice();
}
export function eigSym2(sxx, sxy, syy) {
  const half = (sxx + syy) / 2;
  const d = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy * sxy);
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const v1 = [Math.cos(angle), Math.sin(angle)];
  return { values: [half + d, half - d], vectors: [signNorm(v1), signNorm([-v1[1], v1[0]])], angle };
}
export function jacobiEigen(A) {
  const n = A.length;
  const a = A.map(r => r.slice());
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
    if (Math.abs(a[i][j] - a[j][i]) > 1e-9) throw new Error('jacobiEigen: not symmetric');
  const V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0));
  for (let sweep = 0; sweep < 50; sweep++) {
    let off = 0;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) off = Math.max(off, Math.abs(a[p][q]));
    if (off < 1e-12) break;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(a[p][q]) < 1e-15) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const kp = a[k][p], kq = a[k][q]; a[k][p] = c * kp - s * kq; a[k][q] = s * kp + c * kq; }
      for (let k = 0; k < n; k++) { const pk = a[p][k], qk = a[q][k]; a[p][k] = c * pk - s * qk; a[q][k] = s * pk + c * qk; }
      for (let k = 0; k < n; k++) { const vp = V[k][p], vq = V[k][q]; V[k][p] = c * vp - s * vq; V[k][q] = s * vp + c * vq; }
    }
  }
  const pairs = a.map((_, i) => ({ value: a[i][i], vector: V.map(row => row[i]) }));
  pairs.sort((x, y) => y.value - x.value);
  return { values: pairs.map(p => p.value), vectors: pairs.map(p => signNorm(p.vector)) };
}
export function pca(X, { standardize: std = false } = {}) {
  const n = X.length, p = X[0].length;
  const cols = Array.from({ length: p }, (_, j) => X.map(r => r[j]));
  const means = cols.map(mean), sds = cols.map(sd);
  const C = cols.map((c, j) => std ? c.map(v => (v - means[j]) / sds[j]) : c.map(v => v - means[j]));
  const S = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => {
    let t = 0; for (let k = 0; k < n; k++) t += C[i][k] * C[j][k]; return t / (n - 1);
  }));
  const { values, vectors } = jacobiEigen(S);
  const total = values.reduce((s, v) => s + v, 0);
  const scores = Array.from({ length: n }, (_, k) => vectors.map(v => {
    let t = 0; for (let j = 0; j < p; j++) t += v[j] * C[j][k]; return t;
  }));
  return { values, vectors, explained: values.map(v => v / total), scores, means, sds: std ? sds : null };
}

// ---- seeded randomness + synthetic generators (truth always carried) ----

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function gaussian(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng(); while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export function synthLine({ seed = 1, n = 12, slope = 0.6, intercept = 1, noise = 0.8, xMin = 0, xMax = 10 } = {}) {
  const rng = mulberry32(seed); const xs = [], ys = [];
  for (let i = 0; i < n; i++) {
    const x = xMin + (xMax - xMin) * rng();
    xs.push(x); ys.push(slope * x + intercept + noise * gaussian(rng));
  }
  return { xs, ys, truth: { slope, intercept } };
}
export function synthCloud({ seed = 1, n = 80, rho = 0.7, sdX = 1, sdY = 1, meanX = 0, meanY = 0 } = {}) {
  const rng = mulberry32(seed); const xs = [], ys = [];
  for (let i = 0; i < n; i++) {
    const z1 = gaussian(rng), z2 = gaussian(rng);
    xs.push(meanX + sdX * z1);
    ys.push(meanY + sdY * (rho * z1 + Math.sqrt(1 - rho * rho) * z2));
  }
  return { xs, ys, truth: { rho } };
}
