// loss-bowl - the (slope, intercept) plane with total error as a graduated
// ink halftone plus drawn contour rings: a bowl whose bottom is bare paper.
// Dot area is linear in the loss, so this instrument and fit-scatter make the
// same statement in the same ink: error is how much of the page you darken,
// and the best line is the least-inked point. Linked to fit-scatter by
// sharing slope/intercept in one store; the draggable marker IS the line.
// The surface markup is memoised per dataset - drag frames only move overlays.

import { ols, sse, sae, lossSurface } from '../math/core.mjs';
import { isoSegments } from '../lib/contours.mjs';
import { halftoneDots } from '../lib/halftone.mjs';

export const name = 'loss-bowl';

export const defaults = {
  idKey: 'loss-bowl',
  xs: [], ys: [],
  slope: 0.5, intercept: 1,
  loss: 'squared',
  labels: { x: 'slope', y: 'intercept', title: 'every line you could draw is one point in this plane' },
};

export const posterState = null;
export const controls = [];          // driven by drag + the linked fit-scatter

const W = 640, H = 460;
const MARGIN = { l: 64, r: 14, t: 44, b: 48 };
const GRID_N = 48;

export function ranges(state) {
  const fit = ols(state.xs, state.ys);
  const sR = 1.5;
  const bR = Math.max(2, 3 * Math.sqrt(fit.sse / (state.xs.length - 1)));
  return { s0: fit.slope - sR, s1: fit.slope + sR, b0: fit.intercept - bR, b1: fit.intercept + bR, fit };
}

export function layout(state) {
  const plot = { x0: MARGIN.l, y0: MARGIN.t, x1: W - MARGIN.r, y1: H - MARGIN.b };
  const r = ranges(state);
  const x = v => plot.x0 + (v - r.s0) / (r.s1 - r.s0) * (plot.x1 - plot.x0);
  const y = v => plot.y1 - (v - r.b0) / (r.b1 - r.b0) * (plot.y1 - plot.y0);
  const invX = px => r.s0 + (px - plot.x0) / (plot.x1 - plot.x0) * (r.s1 - r.s0);
  const invY = py => r.b0 + (plot.y1 - py) / (plot.y1 - plot.y0) * (r.b1 - r.b0);
  return { x, y, invX, invY, plot, ranges: r };
}

const F = v => +v.toFixed(2);
const fmtTick = v => String(+v.toFixed(2));

function niceTicks(min, max, target = 4.5) {
  const raw = (max - min) / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => s >= raw) || raw;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(v);
  return out;
}

// Surface markup cache: WeakMap on the xs array identity, inner key = loss kind.
const surfaceCache = new WeakMap();

function surfaceMarkup(state, L) {
  let inner = surfaceCache.get(state.xs);
  if (inner && inner.has(state.loss)) return inner.get(state.loss);
  if (!inner) { inner = new Map(); surfaceCache.set(state.xs, inner); }

  const { plot, ranges: r } = L;
  const grid = lossSurface(state.xs, state.ys, { s0: r.s0, s1: r.s1, b0: r.b0, b1: r.b1, n: GRID_N, loss: state.loss });
  const cellW = (plot.x1 - plot.x0) / (GRID_N - 1);
  const cellH = (plot.y1 - plot.y0) / (GRID_N - 1);
  const gx = i => plot.x0 + i * cellW;                     // grid i -> px (slope axis)
  const gy = j => plot.y1 - j * cellH;                     // grid j -> px (intercept axis, j up)
  const parts = [`<g data-role="surface">`];

  // graduated halftone: dot area linear in loss, bare paper at the minimum
  parts.push(`<g fill="var(--ink-dot)">`);
  for (const d of halftoneDots(grid, plot)) {
    parts.push(`<circle data-role="dot" cx="${F(d.x)}" cy="${F(d.y)}" r="${F(d.r)}"/>`);
  }
  parts.push(`</g>`);

  // contour rings crowding the bottom of the bowl (t^2 spacing); paper casing
  // under ink line keeps them legible on light and fused ground alike
  const ts = [0.15, 0.3, 0.5, 0.7, 0.9];
  for (const t of ts) {
    const level = grid.min + (grid.max - grid.min) * t * t;
    const segs = isoSegments(grid, level);
    if (!segs.length) continue;
    const dpath = segs.map(([x0, y0, x1, y1]) =>
      `M${F(gx(x0))} ${F(gy(y0))}L${F(gx(x1))} ${F(gy(y1))}`).join('');
    parts.push(`<path d="${dpath}" stroke="var(--bg)" stroke-width="3.25" fill="none"/>`);
    parts.push(`<path data-role="contour" d="${dpath}" stroke="var(--ink)" stroke-width="1.25" fill="none"/>`);
    if (t >= 0.7) {
      const [sx, sy] = segs[0];
      const label = level >= 100 ? Math.round(level) : +level.toFixed(1);
      parts.push(`<text x="${F(gx(sx) + 4)}" y="${F(gy(sy) - 4)}" font-size="11" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--ink)" stroke="var(--bg)" stroke-width="3" paint-order="stroke">${label}</text>`);
    }
  }

  // the true minimum: x glyph + welded label on the bare-paper basin
  const mx = L.x(grid.minAt[0]), my = L.y(grid.minAt[1]);
  parts.push(`<path data-role="minimum" d="M${F(mx - 6)} ${F(my - 6)}L${F(mx + 6)} ${F(my + 6)}M${F(mx - 6)} ${F(my + 6)}L${F(mx + 6)} ${F(my - 6)}" stroke="var(--ink)" stroke-width="2.5" fill="none"/>`);
  parts.push(`<text x="${F(mx + 10)}" y="${F(my + 4)}" font-size="12" fill="var(--ink)" stroke="var(--bg)" stroke-width="3" paint-order="stroke">bottom of the bowl</text>`);

  parts.push(`</g>`);
  const markup = parts.join('\n');
  inner.set(state.loss, markup);
  return markup;
}

export function render(state) {
  const { idKey, xs, ys, slope, intercept, loss, labels } = state;
  const L = layout(state);
  const { plot, ranges: r } = L;
  const id = s => `sb-${idKey}-${s}`;
  const parts = [];

  parts.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="'IBM Plex Sans', Arial, sans-serif">`);
  parts.push(`<title>The plane of all candidate lines: slope across, intercept up, total error as a halftone bowl - ink dots grow with the error, bare paper at the minimum - with contour rings. A draggable marker picks the line.</title>`);
  parts.push(`<defs><clipPath id="${id('clip')}"><rect x="${plot.x0}" y="${plot.y0}" width="${plot.x1 - plot.x0}" height="${plot.y1 - plot.y0}"/></clipPath></defs>`);

  parts.push(`<g clip-path="url(#${id('clip')})">`);
  parts.push(surfaceMarkup(state, L));
  parts.push(`</g>`);

  // frame + ticks over the surface
  parts.push(`<rect x="${plot.x0}" y="${plot.y0}" width="${plot.x1 - plot.x0}" height="${plot.y1 - plot.y0}" fill="none" stroke="var(--border)" stroke-width="1.5"/>`);
  for (const t of niceTicks(r.s0, r.s1)) {
    const px = F(L.x(t));
    parts.push(`<line x1="${px}" y1="${plot.y1}" x2="${px}" y2="${plot.y1 + 5}" stroke="var(--border)" stroke-width="1.5"/>`);
    parts.push(`<text x="${px}" y="${plot.y1 + 19}" text-anchor="middle" font-size="12" fill="var(--text-light)">${fmtTick(t)}</text>`);
  }
  for (const t of niceTicks(r.b0, r.b1)) {
    const py = F(L.y(t));
    parts.push(`<line x1="${plot.x0 - 5}" y1="${py}" x2="${plot.x0}" y2="${py}" stroke="var(--border)" stroke-width="1.5"/>`);
    parts.push(`<text x="${plot.x0 - 9}" y="${py + 4}" text-anchor="end" font-size="12" fill="var(--text-light)">${fmtTick(t)}</text>`);
  }
  parts.push(`<text x="${(plot.x0 + plot.x1) / 2}" y="${H - 10}" text-anchor="middle" font-size="13" fill="var(--text)">${labels.x}</text>`);
  parts.push(`<text x="18" y="${(plot.y0 + plot.y1) / 2}" text-anchor="middle" font-size="13" fill="var(--text)" transform="rotate(-90 18 ${(plot.y0 + plot.y1) / 2})">${labels.y}</text>`);
  parts.push(`<text x="${plot.x0}" y="26" font-size="14" fill="var(--text)" font-family="'IBM Plex Serif', Georgia, serif" font-style="italic">${labels.title}</text>`);

  // the current line as a point: crosshair + double-stroked marker (visible on any band)
  const cx = Math.min(Math.max(L.x(slope), plot.x0), plot.x1);
  const cy = Math.min(Math.max(L.y(intercept), plot.y0), plot.y1);
  parts.push(`<g clip-path="url(#${id('clip')})">`);
  parts.push(`<line x1="${F(cx)}" y1="${plot.y0}" x2="${F(cx)}" y2="${plot.y1}" stroke="var(--bg)" stroke-width="3"/>`);
  parts.push(`<line x1="${F(cx)}" y1="${plot.y0}" x2="${F(cx)}" y2="${plot.y1}" stroke="var(--heading)" stroke-width="1" stroke-dasharray="3 4"/>`);
  parts.push(`<line x1="${plot.x0}" y1="${F(cy)}" x2="${plot.x1}" y2="${F(cy)}" stroke="var(--bg)" stroke-width="3"/>`);
  parts.push(`<line x1="${plot.x0}" y1="${F(cy)}" x2="${plot.x1}" y2="${F(cy)}" stroke="var(--heading)" stroke-width="1" stroke-dasharray="3 4"/>`);
  parts.push(`</g>`);
  parts.push(`<circle cx="${F(cx)}" cy="${F(cy)}" r="9" fill="none" stroke="var(--bg)" stroke-width="5"/>`);
  parts.push(`<circle data-drag="marker" tabindex="0" aria-label="candidate line: slope and intercept" cx="${F(cx)}" cy="${F(cy)}" r="9" fill="none" stroke="var(--heading)" stroke-width="2.5"/>`);

  // readout
  const total = loss === 'squared' ? sse(xs, ys, slope, intercept) : sae(xs, ys, slope, intercept);
  const label = loss === 'squared' ? 'SSE' : 'Σ |r|';
  parts.push(`<text x="${plot.x1}" y="26" text-anchor="end" font-size="15" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--heading)">${label} = ${total >= 100 ? Math.round(total) : total.toFixed(1)}</text>`);

  parts.push(`</svg>`);
  return parts.join('\n');
}

export function applyDrag(state, { id, x, y }) {
  if (id !== 'marker') return {};
  const L = layout(state);
  const r = L.ranges;
  const slope = Math.min(Math.max(L.invX(x), r.s0), r.s1);
  const intercept = Math.min(Math.max(L.invY(y), r.b0), r.b1);
  return { slope, intercept };
}
