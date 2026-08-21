// fit-scatter - a draggable line over a scatter, residuals drawn as literal
// dot-screened squares. Total squared error = total ink: the dot pattern is
// fixed in page units (userSpaceOnUse), so a bigger square carries more dots,
// and dragging toward the best fit visibly de-inks the page.
// Pure: render(state) -> SVG string; applyDrag(state, drag) -> partial state.

import { sse, sae } from '../math/core.mjs';

export const name = 'fit-scatter';

export const defaults = {
  idKey: 'fit-scatter',
  xs: [], ys: [],
  slope: 0.5, intercept: 1,
  loss: 'squared',            // 'squared' | 'absolute'
  truth: null,                // {slope, intercept} | null
  showTruth: false,
  residuals: true,            // dense datasets start with the ink off
  domain: null,               // {x0,x1,y0,y1} | null -> padded data extent
  labels: { x: 'x', y: 'y', title: 'drag the line. drag the points.' },
};

export const posterState = null; // set per page in tools/poster.mjs

export const controls = [
  { id: 'loss', kind: 'toggle', label: 'absolute error', on: 'absolute', off: 'squared' },
  { id: 'showTruth', kind: 'toggle', label: 'show the true line', on: true, off: false },
  { id: 'residuals', kind: 'toggle', label: 'show the squares', on: true, off: false },
  { id: 'resample', kind: 'action', label: 'resample' },
];

const W = 640, H = 460;
const MARGIN = { l: 56, r: 14, t: 44, b: 48 };

export function layout(state) {
  const plot = { x0: MARGIN.l, y0: MARGIN.t, x1: W - MARGIN.r, y1: H - MARGIN.b };
  let d = state.domain;
  if (!d) {
    const xmin = Math.min(...state.xs), xmax = Math.max(...state.xs);
    const ymin = Math.min(...state.ys), ymax = Math.max(...state.ys);
    const px = (xmax - xmin || 1) * 0.12, py = (ymax - ymin || 1) * 0.12;
    d = { x0: xmin - px, x1: xmax + px, y0: ymin - py, y1: ymax + py };
  }
  const x = v => plot.x0 + (v - d.x0) / (d.x1 - d.x0) * (plot.x1 - plot.x0);
  const y = v => plot.y1 - (v - d.y0) / (d.y1 - d.y0) * (plot.y1 - plot.y0);
  const invX = px_ => d.x0 + (px_ - plot.x0) / (plot.x1 - plot.x0) * (d.x1 - d.x0);
  const invY = py_ => d.y0 + (plot.y1 - py_) / (plot.y1 - plot.y0) * (d.y1 - d.y0);
  return { x, y, invX, invY, plot, domain: d };
}

function niceTicks(min, max, target = 4.5) {
  const span = max - min;
  const raw = span / target;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => s >= raw) || raw;
  const out = [];
  for (let v = Math.ceil(min / step) * step; v <= max + 1e-9; v += step) out.push(v);
  return out;
}

const F = v => +v.toFixed(2);
const fmtTick = v => Math.abs(v) >= 1000 ? String(Math.round(v)) : String(+v.toFixed(2));

export function render(state) {
  const { idKey, xs, ys, slope, intercept, loss, truth, showTruth, labels } = state;
  const L = layout(state);
  const { plot, domain: d } = L;
  const id = s => `sb-${idKey}-${s}`;
  const parts = [];

  parts.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="'IBM Plex Sans', Arial, sans-serif">`);
  parts.push(`<title>Scatter plot with a draggable fitted line; residuals drawn as dotted squares whose total area is the squared error.</title>`);
  parts.push(`<defs>`
    + `<pattern id="${id('dots')}" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.5" fill="var(--ink-dot)"/></pattern>`
    + `<clipPath id="${id('clip')}"><rect x="${plot.x0}" y="${plot.y0}" width="${plot.x1 - plot.x0}" height="${plot.y1 - plot.y0}"/></clipPath>`
    + `</defs>`);

  // frame + ticks
  parts.push(`<rect x="${plot.x0}" y="${plot.y0}" width="${plot.x1 - plot.x0}" height="${plot.y1 - plot.y0}" fill="none" stroke="var(--border)" stroke-width="1.5"/>`);
  for (const t of niceTicks(d.x0, d.x1)) {
    const px = F(L.x(t));
    parts.push(`<line x1="${px}" y1="${plot.y1}" x2="${px}" y2="${plot.y1 + 5}" stroke="var(--border)" stroke-width="1.5"/>`);
    parts.push(`<text x="${px}" y="${plot.y1 + 19}" text-anchor="middle" font-size="12" fill="var(--text-light)">${fmtTick(t)}</text>`);
  }
  for (const t of niceTicks(d.y0, d.y1)) {
    const py = F(L.y(t));
    parts.push(`<line x1="${plot.x0 - 5}" y1="${py}" x2="${plot.x0}" y2="${py}" stroke="var(--border)" stroke-width="1.5"/>`);
    parts.push(`<text x="${plot.x0 - 9}" y="${py + 4}" text-anchor="end" font-size="12" fill="var(--text-light)">${fmtTick(t)}</text>`);
  }
  parts.push(`<text x="${(plot.x0 + plot.x1) / 2}" y="${H - 10}" text-anchor="middle" font-size="13" fill="var(--text)">${labels.x}</text>`);
  parts.push(`<text x="16" y="${(plot.y0 + plot.y1) / 2}" text-anchor="middle" font-size="13" fill="var(--text)" transform="rotate(-90 16 ${(plot.y0 + plot.y1) / 2})">${labels.y}</text>`);
  parts.push(`<text x="${plot.x0}" y="26" font-size="14" fill="var(--text)" font-family="'IBM Plex Serif', Georgia, serif" font-style="italic">${labels.title}</text>`);

  // truth line (dashed + direct label - never hue alone)
  if (truth && showTruth) {
    const ty0 = L.y(truth.slope * d.x0 + truth.intercept);
    const ty1 = L.y(truth.slope * d.x1 + truth.intercept);
    parts.push(`<g clip-path="url(#${id('clip')})"><line x1="${plot.x0}" y1="${F(ty0)}" x2="${plot.x1}" y2="${F(ty1)}" stroke="var(--text-light)" stroke-width="2" stroke-dasharray="8 5"/></g>`);
    const labelY = Math.min(Math.max(ty1, plot.y0 + 12), plot.y1 - 6);
    parts.push(`<text x="${plot.x1 - 6}" y="${F(labelY - 8)}" text-anchor="end" font-size="12" fill="var(--text-light)">truth</text>`);
  }

  // residuals: squares (squared loss) or sticks (absolute loss), dot-screened
  parts.push(`<g clip-path="url(#${id('clip')})">`);
  for (let i = 0; state.residuals !== false && i < xs.length; i++) {
    const px = L.x(xs[i]);
    const py = L.y(ys[i]);
    const phat = L.y(slope * xs[i] + intercept);
    const side = Math.abs(py - phat);
    const top = Math.min(py, phat);
    if (loss === 'squared') {
      parts.push(`<rect data-role="residual-square" x="${px}" y="${top}" width="${side}" height="${side}" fill="url(#${id('dots')})" stroke="var(--ink)" stroke-width="2"/>`);
    } else {
      parts.push(`<rect data-role="residual-stick" x="${px - 5}" y="${top}" width="10" height="${side}" fill="url(#${id('dots')})" stroke="var(--ink)" stroke-width="2"/>`);
    }
  }
  parts.push(`</g>`);

  // fitted line: fat invisible hit area + visible line + welded label + handles
  const fy0 = L.y(slope * d.x0 + intercept);
  const fy1 = L.y(slope * d.x1 + intercept);
  parts.push(`<g clip-path="url(#${id('clip')})">`);
  parts.push(`<line data-drag="line-move" x1="${plot.x0}" y1="${F(fy0)}" x2="${plot.x1}" y2="${F(fy1)}" stroke="transparent" stroke-width="20"/>`);
  parts.push(`<line x1="${plot.x0}" y1="${F(fy0)}" x2="${plot.x1}" y2="${F(fy1)}" stroke="var(--accent)" stroke-width="3.5" pointer-events="none"/>`);
  parts.push(`</g>`);
  const fitLabelY = Math.min(Math.max(fy1, plot.y0 + 14), plot.y1 - 8);
  parts.push(`<text x="${plot.x1 - 6}" y="${F(fitLabelY + 16)}" text-anchor="end" font-size="12" font-weight="500" fill="var(--accent)">fit</text>`);
  for (const [idx, frac] of [[0, 0.2], [1, 0.8]]) {
    const hx = d.x0 + frac * (d.x1 - d.x0);
    const hyRaw = L.y(slope * hx + intercept);
    const hy = Math.min(Math.max(hyRaw, plot.y0 + 8), plot.y1 - 8);
    parts.push(`<circle data-drag="line-rot" data-index="${idx}" tabindex="0" aria-label="line handle ${idx + 1}" cx="${F(L.x(hx))}" cy="${F(hy)}" r="8" fill="var(--accent)" stroke="var(--bg)" stroke-width="2"/>`);
  }

  // data points (dense sets: smaller glyphs, not individually tabbable - tab exhaustion)
  const tab = xs.length <= 30 ? ' tabindex="0"' : '';
  const r = xs.length <= 60 ? 4.5 : 2.5;
  for (let i = 0; i < xs.length; i++) {
    parts.push(`<circle data-drag="points" data-index="${i}"${tab} aria-label="data point ${i + 1}" cx="${F(L.x(xs[i]))}" cy="${F(L.y(ys[i]))}" r="${r}" fill="var(--heading)"/>`);
  }

  // readout (in-SVG so posters carry it)
  const total = loss === 'squared' ? sse(xs, ys, slope, intercept) : sae(xs, ys, slope, intercept);
  const label = loss === 'squared' ? 'Σ squares' : 'Σ |r|';
  parts.push(`<text x="${plot.x1}" y="26" text-anchor="end" font-size="15" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--heading)">${label} = ${total >= 100 ? Math.round(total) : total.toFixed(1)}</text>`);

  parts.push(`</svg>`);
  return parts.join('\n');
}

export function applyDrag(state, { id, index, x, y }) {
  const L = layout(state);
  const d = L.domain;
  const clampX = v => Math.min(Math.max(v, d.x0), d.x1);
  const clampY = v => Math.min(Math.max(v, d.y0), d.y1);

  if (id === 'points') {
    const xs = state.xs.slice(), ys = state.ys.slice();
    xs[index] = clampX(L.invX(x));
    ys[index] = clampY(L.invY(y));
    return { xs, ys };
  }
  if (id === 'line-move') {
    return { intercept: L.invY(y) - state.slope * L.invX(x) };
  }
  if (id === 'line-rot') {
    const ax = d.x0 + (index === 0 ? 0.8 : 0.2) * (d.x1 - d.x0);   // anchor = the other handle
    const ay = state.slope * ax + state.intercept;
    const cx = L.invX(x), cy = L.invY(y);
    if (Math.abs(cx - ax) < 1e-6) return {};
    let m = (cy - ay) / (cx - ax);
    m = Math.min(Math.max(m, -30), 30);
    return { slope: m, intercept: ay - m * ax };
  }
  return {};
}
