// units-trap — the same cloud with a unit switch on each axis. Flip millimetres
// to centimetres and grams to kilograms: the covariance entries jump by whole
// powers of ten while the correlation readout refuses to move. The plot is
// numerically isotropic (one numeric unit = the same pixels on both axes), so
// the unit choice literally reshapes the picture — that's the trap, drawn.
// Runs twice on the page: linked to the synthetic cloud's store, and again on
// the real biometry pair where the units aren't a gotcha, they're Tuesday.

import { mean, covariance, corr } from '../math/core.mjs';
import { colorCloud, ellipseParams, fmtSig } from '../lib/cloud.mjs';
import { baseFor } from './cloud-ellipse.mjs';

export const name = 'units-trap';

export const defaults = {
  idKey: 'units-trap',
  xs: null, ys: null,                // direct data in base units, OR derive from Σ:
  sxx: 1.6, sxy: 0.84, syy: 0.9, seed: 5, n: 80,
  baseScaleX: 60, baseScaleY: 450,   // synthetic pretend-units: numeric -> mm / g
  baseMeanX: 300, baseMeanY: 2400,
  xUnit: 'mm', yUnit: 'g',
  xName: 'x', yName: 'y',
  truth: null,
  labels: { title: 'same cloud. new units. watch the matrix.' },
};

export const posterState = null;

export const controls = [
  { id: 'xUnit', kind: 'toggle', label: 'x in cm', on: 'cm', off: 'mm' },
  { id: 'yUnit', kind: 'toggle', label: 'y in kg', on: 'kg', off: 'g' },
];

const FACTORS = { mm: 1, cm: 0.1, g: 1, kg: 0.001 };

const W = 640, H = 460;
const MARGIN = { l: 64, r: 230, t: 44, b: 48 };
const K = 2;
const F = v => +v.toFixed(2);

function niceTicks(min, max, target = 4) {
  const raw = (max - min) / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => s >= raw) || raw;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(v);
  return out;
}
const fmtTick = v => Math.abs(v) >= 1000 ? String(Math.round(v)) : String(+v.toPrecision(3));

// Data in *current* units, derived either from direct arrays or from Σ.
export function currentData(st) {
  let xs, ys;
  if (st.xs && st.ys) { xs = st.xs; ys = st.ys; }
  else {
    const c = colorCloud(baseFor(st.seed, st.n), st.sxx, st.sxy, st.syy);
    xs = c.xs.map(v => st.baseMeanX + st.baseScaleX * v);
    ys = c.ys.map(v => st.baseMeanY + st.baseScaleY * v);
  }
  const fx = FACTORS[st.xUnit], fy = FACTORS[st.yUnit];
  return { xs: xs.map(v => v * fx), ys: ys.map(v => v * fy) };
}

export function render(state) {
  const st = { ...defaults, ...state };
  const { idKey, labels } = st;
  const id = s => `sb-${idKey}-${s}`;
  const plot = { x0: MARGIN.l, y0: MARGIN.t, x1: W - MARGIN.r, y1: H - MARGIN.b };
  const parts = [];

  const { xs, ys } = currentData(st);
  const mx = mean(xs), my = mean(ys);
  const sxx = covariance(xs, xs), syy = covariance(ys, ys), sxy = covariance(xs, ys);
  const r = corr(xs, ys);

  // isotropic half-extent: whichever axis is numerically wilder wins the frame
  const spread = (arr, m) => Math.max(...arr.map(v => Math.abs(v - m)));
  const e = ellipseParams(sxx, sxy, syy, K);
  const HALF = 1.15 * Math.max(spread(xs, mx), spread(ys, my), e.rx);
  const side = Math.min(plot.x1 - plot.x0, plot.y1 - plot.y0);
  const s = side / (2 * HALF);
  const cx = (plot.x0 + plot.x1) / 2, cy = (plot.y0 + plot.y1) / 2;
  const X = v => cx + (v - mx) * s;
  const Y = v => cy - (v - my) * s;

  parts.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="'IBM Plex Sans', Arial, sans-serif">`);
  parts.push(`<title>The same point cloud under switchable units: covariance entries leap by powers of ten, the correlation holds still, and the numerically true aspect ratio squashes the cloud flat.</title>`);
  parts.push(`<defs><clipPath id="${id('clip')}"><rect x="${plot.x0}" y="${plot.y0}" width="${plot.x1 - plot.x0}" height="${plot.y1 - plot.y0}"/></clipPath></defs>`);
  parts.push(`<rect x="${plot.x0}" y="${plot.y0}" width="${plot.x1 - plot.x0}" height="${plot.y1 - plot.y0}" fill="none" stroke="var(--border)" stroke-width="1.5"/>`);
  parts.push(`<text x="${plot.x0}" y="26" font-size="14" fill="var(--text)" font-family="'IBM Plex Serif', Georgia, serif" font-style="italic">${labels.title}</text>`);

  for (const t of niceTicks(mx - HALF, mx + HALF)) {
    const px = X(t);
    if (px < plot.x0 || px > plot.x1) continue;
    parts.push(`<line x1="${F(px)}" y1="${plot.y1}" x2="${F(px)}" y2="${plot.y1 + 5}" stroke="var(--border)" stroke-width="1.5"/>`);
    parts.push(`<text x="${F(px)}" y="${plot.y1 + 19}" text-anchor="middle" font-size="11" fill="var(--text-light)">${fmtTick(t)}</text>`);
  }
  for (const t of niceTicks(my - HALF, my + HALF)) {
    const py = Y(t);
    if (py < plot.y0 || py > plot.y1) continue;
    parts.push(`<line x1="${plot.x0 - 5}" y1="${F(py)}" x2="${plot.x0}" y2="${F(py)}" stroke="var(--border)" stroke-width="1.5"/>`);
    parts.push(`<text x="${plot.x0 - 8}" y="${F(py + 4)}" text-anchor="end" font-size="11" fill="var(--text-light)">${fmtTick(t)}</text>`);
  }
  parts.push(`<text x="${(plot.x0 + plot.x1) / 2}" y="${H - 10}" text-anchor="middle" font-size="13" fill="var(--text)">${st.xName} (${st.xUnit})</text>`);
  parts.push(`<text x="18" y="${(plot.y0 + plot.y1) / 2}" text-anchor="middle" font-size="13" fill="var(--text)" transform="rotate(-90 18 ${(plot.y0 + plot.y1) / 2})">${st.yName} (${st.yUnit})</text>`);

  // cloud + ellipse, numerically true aspect
  parts.push(`<g clip-path="url(#${id('clip')})">`);
  for (let i = 0; i < xs.length; i++) {
    parts.push(`<circle data-role="pt" cx="${F(X(xs[i]))}" cy="${F(Y(ys[i]))}" r="2.5" fill="var(--heading)"/>`);
  }
  const deg = -e.angle * 180 / Math.PI;
  parts.push(`<g transform="translate(${F(cx)} ${F(cy)}) rotate(${F(deg)})">`);
  parts.push(`<ellipse data-role="ellipse" rx="${F(e.rx * s)}" ry="${F(Math.max(e.ry * s, 0.75))}" fill="none" stroke="var(--ink)" stroke-width="2.5"/>`);
  parts.push(`</g></g>`);

  // the big matrix
  const px0 = W - MARGIN.r + 34, py0 = 150;
  const colW = 84, rowH = 40;
  parts.push(`<g font-family="'IBM Plex Mono', Consolas, monospace" font-size="16">`);
  parts.push(`<text x="${px0 + colW}" y="${py0 - 58}" text-anchor="middle" font-family="'IBM Plex Sans', Arial, sans-serif" font-size="12" fill="var(--text-light)">covariance matrix (${st.xUnit}, ${st.yUnit})</text>`);
  parts.push(`<path d="M${px0 - 12} ${py0 - 26}h-8v${rowH * 2 + 16}h8" stroke="var(--ink)" stroke-width="2" fill="none"/>`);
  parts.push(`<path d="M${px0 + colW * 2 + 10} ${py0 - 26}h8v${rowH * 2 + 16}h-8" stroke="var(--ink)" stroke-width="2" fill="none"/>`);
  const cells = [[sxx, 0, 0], [sxy, 1, 0], [sxy, 0, 1], [syy, 1, 1]];
  for (const [v, col, row] of cells) {
    parts.push(`<text data-role="cov-entry" x="${px0 + col * colW + colW / 2}" y="${py0 + row * rowH}" text-anchor="middle" fill="var(--heading)">${fmtSig(v)}</text>`);
  }
  parts.push(`</g>`);
  parts.push(`<text data-role="corr" x="${px0 + colW}" y="${py0 + rowH * 2 + 34}" text-anchor="middle" font-size="19" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--heading)">r = ${r.toFixed(3)}</text>`);

  parts.push(`</svg>`);
  return parts.join('\n');
}

export function applyDrag() { return {}; }
