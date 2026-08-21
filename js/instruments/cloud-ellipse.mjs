// cloud-ellipse — a point cloud, its covariance ellipse, and the 2×2 covariance
// matrix as four live numbers, bidirectionally bound: drag the cloud's spread
// or tilt and the numbers move; drag a matrix number and the cloud reshapes.
// The base cloud is whitened (js/lib/cloud.mjs) so the displayed points carry
// the dialed covariance exactly — the matrix, the ellipse, and the dots can
// never disagree. Leave-behind: the covariance matrix IS an ellipse.
// Isotropic mapping: one numeric unit is the same number of pixels on both
// axes, so shape on screen is shape in the numbers.

import { corr } from '../math/core.mjs';
import { baseCloud, colorCloud, ellipseParams, covFromEllipse, fmtSig } from '../lib/cloud.mjs';

export const name = 'cloud-ellipse';

export const defaults = {
  idKey: 'cloud-ellipse',
  sxx: 1.6, sxy: 0.84, syy: 0.9,     // rho 0.7 on these spreads
  rho: 0.7,
  seed: 5, n: 80,
  truth: { rho: 0.7 },                // synthetic: the dial IS the truth
  editable: true,
  labels: { x: 'x', y: 'y', title: 'drag the cloud. or drag the matrix.' },
};

export const posterState = null;

export const controls = [
  { id: 'rho', kind: 'slider', min: -0.95, max: 0.95, step: 0.01, label: 'true ρ', needsTruth: true },
  { id: 'resample', kind: 'action', label: 'resample', needsTruth: true },
];

const W = 640, H = 460;
const MARGIN = { l: 56, r: 190, t: 44, b: 48 };   // right margin hosts the matrix
const HALF = 5;                                    // numeric half-extent of the frame
const K = 2;                                       // ellipse at 2 standard deviations
const SXX_RANGE = [0.05, 4];

// module-level cache of whitened bases per (seed, n)
const bases = new Map();
export function baseFor(seed, n) {
  const key = `${seed}|${n}`;
  if (!bases.has(key)) bases.set(key, baseCloud(seed, n));
  return bases.get(key);
}

export function layout() {
  const plot = { x0: MARGIN.l, y0: MARGIN.t, x1: W - MARGIN.r, y1: H - MARGIN.b };
  const side = Math.min(plot.x1 - plot.x0, plot.y1 - plot.y0);
  const cx = (plot.x0 + plot.x1) / 2, cy = (plot.y0 + plot.y1) / 2;
  const s = side / (2 * HALF);                     // px per numeric unit, both axes
  const x = v => cx + v * s;
  const y = v => cy - v * s;
  const invX = px => (px - cx) / s;
  const invY = py => (cy - py) / s;
  return { plot, cx, cy, s, x, y, invX, invY };
}

const F = v => +v.toFixed(2);
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

function matrixPanel(id, st, L, editable) {
  const px = W - MARGIN.r + 26, py = 130;          // panel anchor
  const colW = 62, rowH = 34;
  const parts = [`<g font-family="'IBM Plex Mono', Consolas, monospace" font-size="15">`];
  parts.push(`<text x="${px + colW}" y="${py - 44}" text-anchor="middle" font-family="'IBM Plex Sans', Arial, sans-serif" font-size="12" fill="var(--text-light)">the covariance matrix</text>`);
  // brackets
  parts.push(`<path d="M${px - 10} ${py - 24}h-7v${rowH * 2 + 14}h7" stroke="var(--ink)" stroke-width="2" fill="none"/>`);
  parts.push(`<path d="M${px + colW * 2 + 8} ${py - 24}h7v${rowH * 2 + 14}h-7" stroke="var(--ink)" stroke-width="2" fill="none"/>`);
  const cells = [
    { id: 'm-sxx', v: st.sxx, col: 0, row: 0, label: 'var(x)' },
    { id: 'm-sxy', v: st.sxy, col: 1, row: 0, label: 'cov(x,y)' },
    { id: 'm-sxy2', v: st.sxy, col: 0, row: 1, label: null },
    { id: 'm-syy', v: st.syy, col: 1, row: 1, label: 'var(y)' },
  ];
  for (const c of cells) {
    const tx = px + c.col * colW + colW / 2, ty = py + c.row * rowH;
    const draggable = editable && c.id !== 'm-sxy2';
    const dragAttrs = draggable
      ? ` data-drag="${c.id === 'm-sxy2' ? 'm-sxy' : c.id}" tabindex="0" aria-label="matrix entry ${c.label || 'cov(x,y)'}: drag vertically" style="cursor:ns-resize"`
      : '';
    parts.push(`<text${dragAttrs} x="${tx}" y="${ty}" text-anchor="middle" fill="var(--heading)"${draggable ? ' text-decoration="underline"' : ''}>${fmtSig(c.v)}</text>`);
  }
  parts.push(`</g>`);
  // correlation readout under the matrix: the number the ellipse's *shape* encodes
  parts.push(`<text x="${px + colW}" y="${py + rowH * 2 + 26}" text-anchor="middle" font-size="15" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--heading)">r = ${corrOf(st).toFixed(2)}</text>`);
  return parts.join('\n');
}

export function corrOf(st) { return st.sxy / Math.sqrt(st.sxx * st.syy); }

export function render(state) {
  const st = { ...defaults, ...state };
  const { idKey, labels } = st;
  const L = layout();
  const { plot } = L;
  const id = s => `sb-${idKey}-${s}`;
  const editable = st.editable !== false;
  const parts = [];

  parts.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="'IBM Plex Sans', Arial, sans-serif">`);
  parts.push(`<title>A point cloud with its covariance ellipse and the 2 by 2 covariance matrix as live numbers; dragging the cloud reshapes the matrix and dragging the matrix reshapes the cloud.</title>`);
  parts.push(`<defs><clipPath id="${id('clip')}"><rect x="${plot.x0}" y="${plot.y0}" width="${plot.x1 - plot.x0}" height="${plot.y1 - plot.y0}"/></clipPath></defs>`);

  // frame + zero axes (numeric, isotropic)
  parts.push(`<rect x="${plot.x0}" y="${plot.y0}" width="${plot.x1 - plot.x0}" height="${plot.y1 - plot.y0}" fill="none" stroke="var(--border)" stroke-width="1.5"/>`);
  for (const t of [-4, -2, 2, 4]) {
    parts.push(`<line x1="${F(L.x(t))}" y1="${plot.y1}" x2="${F(L.x(t))}" y2="${plot.y1 + 5}" stroke="var(--border)" stroke-width="1.5"/>`);
    parts.push(`<text x="${F(L.x(t))}" y="${plot.y1 + 19}" text-anchor="middle" font-size="12" fill="var(--text-light)">${t}</text>`);
    parts.push(`<line x1="${plot.x0 - 5}" y1="${F(L.y(t))}" x2="${plot.x0}" y2="${F(L.y(t))}" stroke="var(--border)" stroke-width="1.5"/>`);
    parts.push(`<text x="${plot.x0 - 9}" y="${F(L.y(t) + 4)}" text-anchor="end" font-size="12" fill="var(--text-light)">${t}</text>`);
  }
  parts.push(`<g clip-path="url(#${id('clip')})"><line x1="${plot.x0}" y1="${F(L.y(0))}" x2="${plot.x1}" y2="${F(L.y(0))}" stroke="var(--border)" stroke-width="1"/><line x1="${F(L.x(0))}" y1="${plot.y0}" x2="${F(L.x(0))}" y2="${plot.y1}" stroke="var(--border)" stroke-width="1"/></g>`);
  parts.push(`<text x="${plot.x0}" y="26" font-size="14" fill="var(--text)" font-family="'IBM Plex Serif', Georgia, serif" font-style="italic">${labels.title}</text>`);

  // points
  const base = baseFor(st.seed, st.n);
  const { xs, ys } = colorCloud(base, st.sxx, st.sxy, st.syy);
  parts.push(`<g clip-path="url(#${id('clip')})">`);
  for (let i = 0; i < xs.length; i++) {
    parts.push(`<circle data-role="pt" cx="${F(L.x(xs[i]))}" cy="${F(L.y(ys[i]))}" r="3" fill="var(--heading)"/>`);
  }

  // covariance ellipse: heavy outline carries the structure; stripes along PC1
  // carry the direction (never hue)
  const e = ellipseParams(st.sxx, st.sxy, st.syy, K);
  const deg = -e.angle * 180 / Math.PI;            // svg y is down
  const tf = `translate(${F(L.cx)} ${F(L.cy)}) rotate(${F(deg)})`;
  parts.push(`<g transform="${tf}">`);
  parts.push(`<ellipse data-role="ellipse" rx="${F(e.rx * L.s)}" ry="${F(e.ry * L.s)}" fill="none" stroke="var(--ink)" stroke-width="3"/>`);
  for (const off of [-0.5, 0, 0.5]) {
    const oy = off * e.ry * L.s;
    const hw = e.rx * L.s * Math.sqrt(Math.max(1 - off * off, 0)) * 0.92;
    parts.push(`<line data-role="pc1-stripe" x1="${F(-hw)}" y1="${F(oy)}" x2="${F(hw)}" y2="${F(oy)}" stroke="var(--text-light)" stroke-width="1.25"/>`);
  }
  parts.push(`</g>`);
  parts.push(`</g>`);

  // drag handles: x-spread, y-spread (squares on the axes), tilt (diamond at PC1 tip)
  if (editable) {
    const hx = L.x(K * Math.sqrt(st.sxx)), hy = L.y(K * Math.sqrt(st.syy));
    parts.push(`<rect data-drag="spread-x" tabindex="0" aria-label="x spread" x="${F(hx - 7)}" y="${F(L.cy - 7)}" width="14" height="14" fill="var(--bg)" stroke="var(--ink)" stroke-width="2.5" style="cursor:ew-resize"/>`);
    parts.push(`<rect data-drag="spread-y" tabindex="0" aria-label="y spread" x="${F(L.cx - 7)}" y="${F(hy - 7)}" width="14" height="14" fill="var(--bg)" stroke="var(--ink)" stroke-width="2.5" style="cursor:ns-resize"/>`);
    const tipx = L.cx + e.rx * L.s * Math.cos(e.angle), tipy = L.cy - e.rx * L.s * Math.sin(e.angle);
    parts.push(`<path data-drag="tilt" tabindex="0" aria-label="tilt: rotate the ellipse" d="M${F(tipx)} ${F(tipy - 9)}L${F(tipx + 9)} ${F(tipy)}L${F(tipx)} ${F(tipy + 9)}L${F(tipx - 9)} ${F(tipy)}Z" fill="var(--bg)" stroke="var(--ink)" stroke-width="2.5" style="cursor:grab"/>`);
    parts.push(`<text x="${F(tipx + 12)}" y="${F(tipy - 10)}" font-size="12" fill="var(--text-light)">tilt</text>`);
  }

  parts.push(matrixPanel(id, st, L, editable));
  parts.push(`<text x="${(plot.x0 + plot.x1) / 2}" y="${H - 10}" text-anchor="middle" font-size="13" fill="var(--text)">${labels.x}</text>`);
  parts.push(`<text x="16" y="${(plot.y0 + plot.y1) / 2}" text-anchor="middle" font-size="13" fill="var(--text)" transform="rotate(-90 16 ${(plot.y0 + plot.y1) / 2})">${labels.y}</text>`);
  parts.push(`</svg>`);
  return parts.join('\n');
}

// Drag semantics. spread-x/spread-y stretch while holding rho; tilt rotates the
// ellipse rigidly (eigenvalues fixed); matrix numbers move only themselves,
// with sxy clamped to keep Σ positive-definite.
export function applyDrag(state, { id, x, y }) {
  const st = { ...defaults, ...state };
  const L = layout();
  const maxAbsSxy = () => 0.99 * Math.sqrt(st.sxx * st.syy);

  if (id === 'spread-x') {
    const sxx = clamp((L.invX(x) / K) ** 2, SXX_RANGE[0], SXX_RANGE[1]);
    const sxy = st.rho * Math.sqrt(sxx * st.syy);
    return { sxx, sxy };
  }
  if (id === 'spread-y') {
    const syy = clamp((L.invY(y) / K) ** 2, SXX_RANGE[0], SXX_RANGE[1]);
    const sxy = st.rho * Math.sqrt(st.sxx * syy);
    return { syy, sxy };
  }
  if (id === 'tilt') {
    const ang = Math.atan2(L.invY(y), L.invX(x));
    const e = ellipseParams(st.sxx, st.sxy, st.syy, 1);
    const S = covFromEllipse(e.rx * e.rx, e.ry * e.ry, ang);
    const rho = S.sxy / Math.sqrt(S.sxx * S.syy);
    return { ...S, rho };
  }
  if (id === 'm-sxx' || id === 'm-syy') {
    // vertical slider semantics over the plot's height
    const t = clamp((L.plot.y1 - y) / (L.plot.y1 - L.plot.y0), 0, 1);
    const v = SXX_RANGE[0] + t * (SXX_RANGE[1] - SXX_RANGE[0]);
    const next = id === 'm-sxx' ? { sxx: v } : { syy: v };
    const cap = 0.99 * Math.sqrt((next.sxx ?? st.sxx) * (next.syy ?? st.syy));
    const sxy = clamp(st.sxy, -cap, cap);
    return { ...next, sxy, rho: sxy / Math.sqrt((next.sxx ?? st.sxx) * (next.syy ?? st.syy)) };
  }
  if (id === 'm-sxy') {
    const t = clamp((L.plot.y1 - y) / (L.plot.y1 - L.plot.y0), 0, 1);
    const sxy = (2 * t - 1) * maxAbsSxy();
    return { sxy, rho: sxy / Math.sqrt(st.sxx * st.syy) };
  }
  return {};
}

// The rho dial rewrites the off-diagonal so the dial, the matrix, and the
// ellipse always agree.
export function applyControl(state, id, value) {
  if (id === 'rho') {
    const st = { ...defaults, ...state };
    return { rho: value, sxy: value * Math.sqrt(st.sxx * st.syy) };
  }
  return { [id]: value };
}
