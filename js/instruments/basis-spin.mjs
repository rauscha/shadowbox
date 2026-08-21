// basis-spin - the same cloud, described in a different pair of directions.
// Slide t from 0 to 1 and the cloud turns by the PC1 angle: at t = 1 the
// horizontal axis IS PC1, the ellipse is straight, and the off-diagonal of the
// covariance matrix has gone to zero. Nothing about the data changed - no point
// moved relative to any other, the total variance is untouched - only the pair
// of directions we chose to quote it in. The old x and y axes stay on screen,
// tilting away, so you can see where they went.
// The frame's half-extent is radial (js/lib/frame.mjs), which a rotation cannot
// change, so the picture does not breathe while the slider moves.

import { mean, variance, covariance, eigSym2 } from '../math/core.mjs';
import { colorCloud, ellipseParams } from '../lib/cloud.mjs';
import { baseFor } from './cloud-ellipse.mjs';
import { isoFrame, niceTicks, F } from '../lib/frame.mjs';

export const name = 'basis-spin';

export const defaults = {
  idKey: 'basis-spin',
  xs: null, ys: null,
  sxx: 1.6, sxy: 0.84, syy: 0.9,
  seed: 5, n: 80,
  t: 0,                                // 0 = data coordinates, 1 = PC coordinates
  note: '',
  labels: { x: 'x', y: 'y', pc1: 'PC1', pc2: 'PC2', title: 'same cloud. new pair of directions.' },
};

export const posterState = { ...defaults, idKey: 'basis-spin', t: 1 };

export const controls = [
  { id: 't', kind: 'slider', min: 0, max: 1, step: 0.01, label: 'spin into PC coordinates' },
];

const W = 640, H = 460;
const MARGIN = { l: 56, r: 196, t: 44, b: 48 };
const PANEL = { x0: 460, x1: 622 };
const K = 2;                                        // ellipse at 2 standard deviations

const num = (v, d = 2) => { const r = +v.toFixed(d); return (Object.is(r, -0) ? 0 : r).toFixed(d); };
const clamp01 = v => Math.min(Math.max(v, 0), 1);

export function cloudOf(state) {
  const st = { ...defaults, ...state };
  if (st.xs && st.ys) return { xs: st.xs, ys: st.ys };
  return colorCloud(baseFor(st.seed, st.n), st.sxx, st.sxy, st.syy);
}

export function layout(state) {
  const plot = { x0: MARGIN.l, y0: MARGIN.t, x1: W - MARGIN.r, y1: H - MARGIN.b };
  const { xs, ys } = cloudOf(state);
  const L = isoFrame(xs, ys, plot);
  // the ellipse can reach past the outermost point; keep it inside the frame
  const { sxx, sxy, syy } = sampleCov(xs, ys);
  const e = ellipseParams(sxx, sxy, syy, K);
  return isoFrame(xs, ys, plot, { minHalf: Math.max(L.half, 1.06 * e.rx) });
}

export function sampleCov(xs, ys) {
  return { sxx: variance(xs), sxy: covariance(xs, ys), syy: variance(ys) };
}

// The cloud in the partially-turned basis. At t = 1 these ARE the PC scores:
// covariance(zx, zy) = 0 and the variances are the eigenvalues.
export function rotated(state) {
  const st = { ...defaults, ...state };
  const { xs, ys } = cloudOf(st);
  const mx = mean(xs), my = mean(ys);
  const { sxx, sxy, syy } = sampleCov(xs, ys);
  const { angle, values } = eigSym2(sxx, sxy, syy);
  const t = clamp01(st.t);
  const phi = -angle * t;
  const c = Math.cos(phi), s = Math.sin(phi);
  const zx = [], zy = [];
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    zx.push(c * dx - s * dy);
    zy.push(s * dx + c * dy);
  }
  return { zx, zy, angle, values, phi, t, mx, my, sxx, sxy, syy };
}

function matrixPanel(st, R) {
  const sxx = variance(R.zx), syy = variance(R.zy), sxy = covariance(R.zx, R.zy);
  const px = PANEL.x0 + 8, py = 132, colW = 66, rowH = 34;
  const parts = [];
  parts.push(`<text x="${px + colW}" y="${py - 44}" text-anchor="middle" font-size="12" fill="var(--text-light)">covariance in these directions</text>`);
  parts.push(`<path d="M${px - 10} ${py - 24}h-7v${rowH * 2 + 14}h7" stroke="var(--ink)" stroke-width="2" fill="none"/>`);
  parts.push(`<path d="M${px + colW * 2 + 8} ${py - 24}h7v${rowH * 2 + 14}h-7" stroke="var(--ink)" stroke-width="2" fill="none"/>`);
  const cells = [[sxx, 0, 0], [sxy, 1, 0], [sxy, 0, 1], [syy, 1, 1]];
  parts.push(`<g font-family="'IBM Plex Mono', Consolas, monospace" font-size="15" fill="var(--heading)">`);
  for (const [v, col, row] of cells) {
    const role = col === row ? 'cov-diag' : 'cov-off';
    parts.push(`<text data-role="${role}" x="${px + col * colW + colW / 2}" y="${py + row * rowH}" text-anchor="middle">${num(v)}</text>`);
  }
  parts.push(`</g>`);
  // the off-diagonal is the tilt, so name it and box it rather than tint it
  parts.push(`<rect x="${px + colW - 4}" y="${py - 18}" width="${colW + 8}" height="22" fill="none" stroke="var(--ink)" stroke-width="1.25" stroke-dasharray="3 3"/>`);
  parts.push(`<rect x="${px - 4}" y="${py + rowH - 18}" width="${colW + 8}" height="22" fill="none" stroke="var(--ink)" stroke-width="1.25" stroke-dasharray="3 3"/>`);
  parts.push(`<text x="${PANEL.x0}" y="${py + rowH * 2 + 4}" font-size="11" fill="var(--text-light)">boxed: the off-diagonal, which is</text>`);
  parts.push(`<text x="${PANEL.x0}" y="${py + rowH * 2 + 18}" font-size="11" fill="var(--text-light)">the tilt. it reaches 0 at t = 1.</text>`);
  return parts.join('\n');
}

export function render(state) {
  const st = { ...defaults, ...state };
  const { idKey, labels } = st;
  const id = s => `sb-${idKey}-${s}`;
  const L = layout(st);
  const { plot } = L;
  const R = rotated(st);
  const t = R.t;
  const parts = [];

  parts.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="'IBM Plex Sans', Arial, sans-serif">`);
  parts.push(`<title>A point cloud and its covariance ellipse turning from data coordinates into principal component coordinates; the old x and y axes tilt away with the cloud and the off-diagonal of the covariance matrix falls to zero.</title>`);
  parts.push(`<defs><clipPath id="${id('clip')}"><rect x="${plot.x0}" y="${plot.y0}" width="${plot.x1 - plot.x0}" height="${plot.y1 - plot.y0}"/></clipPath></defs>`);

  parts.push(`<rect x="${plot.x0}" y="${plot.y0}" width="${plot.x1 - plot.x0}" height="${plot.y1 - plot.y0}" fill="none" stroke="var(--border)" stroke-width="1.5"/>`);
  for (const v of niceTicks(-L.half, L.half)) {
    const px = L.cx + v * L.s, py = L.cy - v * L.s;
    if (px > plot.x0 + 1 && px < plot.x1 - 1) {
      parts.push(`<line x1="${F(px)}" y1="${plot.y1}" x2="${F(px)}" y2="${plot.y1 + 5}" stroke="var(--border)" stroke-width="1.5"/>`);
      parts.push(`<text x="${F(px)}" y="${plot.y1 + 19}" text-anchor="middle" font-size="11" fill="var(--text-light)">${+v.toPrecision(3)}</text>`);
    }
    if (py > plot.y0 + 1 && py < plot.y1 - 1) {
      parts.push(`<line x1="${plot.x0 - 5}" y1="${F(py)}" x2="${plot.x0}" y2="${F(py)}" stroke="var(--border)" stroke-width="1.5"/>`);
      parts.push(`<text x="${plot.x0 - 8}" y="${F(py + 4)}" text-anchor="end" font-size="11" fill="var(--text-light)">${+v.toPrecision(3)}</text>`);
    }
  }
  parts.push(`<text x="${plot.x0}" y="26" font-size="14" fill="var(--text)" font-family="'IBM Plex Serif', Georgia, serif" font-style="italic">${labels.title}</text>`);
  if (st.note) parts.push(`<text data-role="note" x="${plot.x1}" y="26" text-anchor="end" font-size="11" fill="var(--text-light)">${st.note}</text>`);

  // axis captions name what the frame currently holds, in words not colour.
  // Both bases are read off the mean, so say so when the mean is not the origin.
  const off = Math.abs(R.mx) > 1e-9 || Math.abs(R.my) > 1e-9 ? ', from the mean' : '';
  const cap = (a, b) => (t < 0.02 ? a : t > 0.98 ? b : `${a} turning into ${b}, ${Math.round(t * 100)}%`) + off;
  parts.push(`<text data-role="x-caption" x="${(plot.x0 + plot.x1) / 2}" y="${H - 10}" text-anchor="middle" font-size="13" fill="var(--text)">${cap(labels.x, labels.pc1)}</text>`);
  parts.push(`<text data-role="y-caption" x="16" y="${(plot.y0 + plot.y1) / 2}" text-anchor="middle" font-size="13" fill="var(--text)" transform="rotate(-90 16 ${(plot.y0 + plot.y1) / 2})">${cap(labels.y, labels.pc2)}</text>`);

  parts.push(`<g clip-path="url(#${id('clip')})">`);
  parts.push(`<line x1="${plot.x0}" y1="${F(L.cy)}" x2="${plot.x1}" y2="${F(L.cy)}" stroke="var(--border)" stroke-width="1"/>`);
  parts.push(`<line x1="${F(L.cx)}" y1="${plot.y0}" x2="${F(L.cx)}" y2="${plot.y1}" stroke="var(--border)" stroke-width="1"/>`);

  // where the original axes went: a dashed cross turning with the cloud
  const arm = L.half * 0.94;
  const c = Math.cos(R.phi), s = Math.sin(R.phi);
  const olds = [
    { key: 'x', vx: c, vy: s, label: labels.x },
    { key: 'y', vx: -s, vy: c, label: labels.y },
  ];
  for (const o of olds) {
    const ex = L.cx + o.vx * arm * L.s, ey = L.cy - o.vy * arm * L.s;
    parts.push(`<line data-role="old-axis-${o.key}" x1="${F(L.cx - o.vx * arm * L.s)}" y1="${F(L.cy + o.vy * arm * L.s)}" x2="${F(ex)}" y2="${F(ey)}" stroke="var(--text-light)" stroke-width="1.5" stroke-dasharray="7 5"/>`);
    parts.push(`<text x="${F(ex + 7 * o.vx)}" y="${F(ey - 7 * o.vy + 4)}" text-anchor="middle" font-size="12" fill="var(--text-light)" stroke="var(--bg)" stroke-width="3" paint-order="stroke">${o.label}</text>`);
  }

  // the ellipse, drawn throughout: it straightens as the frame catches up
  const e = ellipseParams(R.sxx, R.sxy, R.syy, K);
  const deg = -(e.angle + R.phi) * 180 / Math.PI;              // svg y is down
  parts.push(`<g transform="translate(${F(L.cx)} ${F(L.cy)}) rotate(${F(deg)})">`);
  parts.push(`<ellipse data-role="ellipse" rx="${F(e.rx * L.s)}" ry="${F(e.ry * L.s)}" fill="none" stroke="var(--ink)" stroke-width="3"/>`);
  for (const off of [-0.5, 0, 0.5]) {
    const oy = off * e.ry * L.s;
    const hw = e.rx * L.s * Math.sqrt(Math.max(1 - off * off, 0)) * 0.92;
    parts.push(`<line data-role="pc1-stripe" x1="${F(-hw)}" y1="${F(oy)}" x2="${F(hw)}" y2="${F(oy)}" stroke="var(--text-light)" stroke-width="1.25"/>`);
  }
  parts.push(`</g>`);

  for (let i = 0; i < R.zx.length; i++) {
    parts.push(`<circle data-role="pt" cx="${F(L.cx + R.zx[i] * L.s)}" cy="${F(L.cy - R.zy[i] * L.s)}" r="3" fill="var(--heading)"/>`);
  }
  parts.push(`</g>`);

  // drag the tip of the turning x axis to scrub t, keyboard included
  const hx = L.cx + c * arm * L.s, hy = L.cy - s * arm * L.s;
  parts.push(`<circle data-drag="spin" tabindex="0" aria-label="spin: drag or use arrow keys to turn the cloud into principal component coordinates" cx="${F(hx)}" cy="${F(hy)}" r="8" fill="var(--bg)" stroke="var(--ink)" stroke-width="2.5" style="cursor:grab"/>`);

  // readouts
  parts.push(`<text data-role="t" x="${PANEL.x0}" y="64" font-size="16" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--heading)">t = ${num(t)}</text>`);
  parts.push(`<text x="${PANEL.x0}" y="82" font-size="11" fill="var(--text-light)">turned ${Math.round(Math.abs(R.phi) * 180 / Math.PI)}° of ${Math.round(Math.abs(R.angle) * 180 / Math.PI)}°</text>`);
  parts.push(matrixPanel(st, R));
  parts.push(`<text x="${PANEL.x0}" y="288" font-size="12" fill="var(--text)">eigenvalues of the cloud</text>`);
  parts.push(`<text data-role="eigs" x="${PANEL.x0}" y="310" font-size="14" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--heading)">${num(R.values[0])} and ${num(R.values[1])}</text>`);
  parts.push(`<text x="${PANEL.x0}" y="330" font-size="11" fill="var(--text-light)">the diagonal it is heading for</text>`);
  parts.push(`<line x1="${PANEL.x0}" y1="346" x2="${PANEL.x1}" y2="346" stroke="var(--border)" stroke-width="1.5"/>`);
  parts.push(`<text data-role="trace" x="${PANEL.x0}" y="366" font-size="12" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--heading)">total = ${num(R.sxx + R.syy)}, unmoved</text>`);

  parts.push(`</svg>`);
  return parts.join('\n');
}

// The handle rides the turning x axis, so the angle you drag it to reads back
// as a fraction of the full PC1 rotation.
export function applyDrag(state, { id, x, y }) {
  if (id !== 'spin') return {};
  const st = { ...defaults, ...state };
  const L = layout(st);
  const R = rotated(st);
  if (Math.abs(R.angle) < 1e-9) return {};
  const dx = x - L.cx, dy = L.cy - y;
  if (Math.hypot(dx, dy) < 1e-9) return {};
  let phi = Math.atan2(dy, dx);
  // pick the representative nearest the current rotation, so the handle never jumps
  while (phi - R.phi > Math.PI) phi -= 2 * Math.PI;
  while (R.phi - phi > Math.PI) phi += 2 * Math.PI;
  return { t: clamp01(-phi / R.angle) };
}

export function applyControl(state, id, value) {
  if (id === 't') return { t: clamp01(Number(value)) };
  return { [id]: value };
}
