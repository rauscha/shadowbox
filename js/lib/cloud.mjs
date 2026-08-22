// Shared cloud/ellipse geometry for lesson 2+. The trick that makes the matrix
// readout honest: the base cloud is *whitened* (exact sample mean 0, exact
// identity sample covariance, n-1 convention), so transforming it by the
// Cholesky factor of a target Σ produces points whose sample covariance IS Σ,
// to machine precision. The dial and the picture can never disagree.

import { mean, covariance, variance, eigSym2 } from '../math/core.mjs';
import { mulberry32, gaussian } from '../math/core.mjs';

// 2x2 Cholesky: Σ = L·Lᵀ with L = [[a,0],[b,c]]. Requires positive-definite Σ.
export function chol2(sxx, sxy, syy) {
  const a = Math.sqrt(sxx);
  const b = sxy / a;
  const c2 = syy - b * b;
  if (!(a > 0) || !(c2 > 0)) throw new Error('chol2: not positive-definite');
  return { a, b, c: Math.sqrt(c2) };
}

// Whiten a cloud: returns [ux, uy] with sample mean exactly 0 and sample
// covariance exactly the identity (n-1 convention).
export function whiten(xs, ys) {
  const mx = mean(xs), my = mean(ys);
  const cx = xs.map(v => v - mx), cy = ys.map(v => v - my);
  const { a, b, c } = chol2(variance(cx), covariance(cx, cy), variance(cy));
  // forward-substitute L⁻¹·p for each centered point p
  const ux = cx.map(v => v / a);
  const uy = cy.map((v, i) => (v - b * ux[i]) / c);
  return { ux, uy };
}

// A whitened standard cloud for a seed: n gaussian points, then exact-whitened.
export function baseCloud(seed, n = 80) {
  const rng = mulberry32(seed);
  const xs = [], ys = [];
  for (let i = 0; i < n; i++) { xs.push(gaussian(rng)); ys.push(gaussian(rng)); }
  return whiten(xs, ys);
}

// Color a whitened base with a target covariance (and optional means).
export function colorCloud(base, sxx, sxy, syy, meanX = 0, meanY = 0) {
  const { a, b, c } = chol2(sxx, sxy, syy);
  const xs = base.ux.map(u => meanX + a * u);
  const ys = base.ux.map((u, i) => meanY + b * u + c * base.uy[i]);
  return { xs, ys };
}

// Covariance ellipse parameters at k standard deviations, in data units.
// angle is the PC1 direction in radians (math convention, y up).
export function ellipseParams(sxx, sxy, syy, k = 2) {
  const { values, angle } = eigSym2(sxx, sxy, syy);
  return { rx: k * Math.sqrt(Math.max(values[0], 0)), ry: k * Math.sqrt(Math.max(values[1], 0)), angle };
}

// Rebuild Σ from ellipse form: eigenvalues λ1 ≥ λ2 and a PC1 angle.
export function covFromEllipse(l1, l2, angle) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return {
    sxx: l1 * c * c + l2 * s * s,
    sxy: (l1 - l2) * c * s,
    syy: l1 * s * s + l2 * c * c,
  };
}

// Deterministic 3-significant-figure formatter (no locale dependence, so the
// committed posters render identically everywhere).
export function fmtSig(v) {
  if (v === 0) return '0';
  const a = Math.abs(v);
  if (a >= 1000) {
    const r = Number(a.toPrecision(3));
    const s = String(Math.round(r)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (v < 0 ? '−' : '') + s;
  }
  const s = String(Number(a.toPrecision(3)));
  return (v < 0 ? '−' : '') + s;
}
