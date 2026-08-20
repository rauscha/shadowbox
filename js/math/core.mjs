// shadowbox math core — pure functions, no DOM, no dependencies.
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
