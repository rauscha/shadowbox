// three-lines - the same cloud, three lines, three different questions.
// OLS y on x minimizes vertical error; OLS x on y minimizes horizontal error;
// PC1 minimizes perpendicular error. They are not competing estimates of one
// true line, they are answers to three questions, and the picture says which
// by the orientation of its error marks: vertical combs, horizontal combs,
// perpendicular combs. All three pass through the mean, and PC1 always lies
// between the two regressions - the bridge back to rung 1.
// Pure: render(state) -> SVG string.

import { mean, variance, covariance, ols, eigSym2 } from '../math/core.mjs';
import { colorCloud } from '../lib/cloud.mjs';
import { baseFor } from './cloud-ellipse.mjs';
import { isoFrame, niceTicks, clipToRect, F } from '../lib/frame.mjs';

export const name = 'three-lines';

export const defaults = {
  idKey: 'three-lines',
  xs: null, ys: null,
  sxx: 1.6, sxy: 0.84, syy: 0.9,
  seed: 5, n: 80,
  showYX: true, showXY: true, showPC1: true,
  ticks: true,
  note: '',
  labels: { x: 'x', y: 'y', title: 'three lines through the same points.' },
};

export const posterState = { ...defaults, idKey: 'three-lines' };

export const controls = [
  { id: 'showYX', kind: 'toggle', label: 'y on x', on: true, off: false },
  { id: 'showXY', kind: 'toggle', label: 'x on y', on: true, off: false },
  { id: 'showPC1', kind: 'toggle', label: 'PC1', on: true, off: false },
  { id: 'ticks', kind: 'toggle', label: 'error marks', on: true, off: false },
];

const W = 640, H = 460;
const MARGIN = { l: 56, r: 120, t: 44, b: 48 };
const TICK_TARGET = 14;              // error marks drawn per family, evenly sampled

const num = (v, d = 2) => { const r = +v.toFixed(d); return (Object.is(r, -0) ? 0 : r).toFixed(d); };

export function cloudOf(state) {
  const st = { ...defaults, ...state };
  if (st.xs && st.ys) return { xs: st.xs, ys: st.ys };
  return colorCloud(baseFor(st.seed, st.n), st.sxx, st.sxy, st.syy);
}

export function layout(state) {
  const plot = { x0: MARGIN.l, y0: MARGIN.t, x1: W - MARGIN.r, y1: H - MARGIN.b };
  const { xs, ys } = cloudOf(state);
  return isoFrame(xs, ys, plot);
}

// Evenly spaced sample of point indices: enough combs to read the orientation,
// few enough that three families do not fuse into a fog.
export function tickIndices(n) {
  const stride = Math.max(1, Math.ceil(n / TICK_TARGET));
  const out = [];
  for (let i = 0; i < n; i += stride) out.push(i);
  return out;
}

// The three fits, each as a direction through the centroid so a vertical line
// is representable (x on y goes vertical when the cloud is uncorrelated).
export function lines(state) {
  const st = { ...defaults, ...state };
  const { xs, ys } = cloudOf(st);
  const mx = mean(xs), my = mean(ys);
  const sxx = variance(xs), syy = variance(ys), sxy = covariance(xs, ys);
  const fit = ols(xs, ys);                        // slope sxy / sxx
  const xOnY = ols(ys, xs);                       // the inverse regression, slope sxy / syy
  const { angle, values } = eigSym2(sxx, sxy, syy);
  return {
    mx, my, sxx, sxy, syy,
    yx: { key: 'yx', name: 'y on x', dir: [1, fit.slope], slope: fit.slope, intercept: fit.intercept, orient: 'vertical' },
    xy: { key: 'xy', name: 'x on y', dir: [xOnY.slope, 1], slope: xOnY.slope === 0 ? Infinity : 1 / xOnY.slope, inverseSlope: xOnY.slope, orient: 'horizontal' },
    pc1: { key: 'pc1', name: 'PC1', dir: [Math.cos(angle), Math.sin(angle)], slope: Math.tan(angle), angle, values, orient: 'perpendicular' },
  };
}

const slopeText = s => (!Number.isFinite(s) || Math.abs(s) > 999 ? 'vertical' : `slope ${num(s)}`);

// Error marks: from each sampled point to its own line, in its own direction.
function markFor(kind, px, py, ln, LN) {
  if (kind === 'vertical') return [px, ln.slope * px + ln.intercept];        // move in y
  if (kind === 'horizontal') {                                              // move in x
    const xhat = LN.mx + ln.inverseSlope * (py - LN.my);
    return [xhat, py];
  }
  const dx = px - LN.mx, dy = py - LN.my;                                   // drop a perpendicular
  const [ux, uy] = ln.dir;
  const t = dx * ux + dy * uy;
  return [LN.mx + t * ux, LN.my + t * uy];
}

export function render(state) {
  const st = { ...defaults, ...state };
  const { idKey, labels } = st;
  const id = s => `sb-${idKey}-${s}`;
  const L = layout(st);
  const { plot } = L;
  const { xs, ys } = cloudOf(st);
  const LN = lines(st);
  const parts = [];

  parts.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="'IBM Plex Sans', Arial, sans-serif">`);
  parts.push(`<title>One point cloud with three fitted lines drawn over it: least squares of y on x with vertical error marks, least squares of x on y with horizontal error marks, and the first principal component with perpendicular error marks. Each line is labelled where it leaves the plot.</title>`);
  parts.push(`<defs><clipPath id="${id('clip')}"><rect x="${plot.x0}" y="${plot.y0}" width="${plot.x1 - plot.x0}" height="${plot.y1 - plot.y0}"/></clipPath></defs>`);

  parts.push(`<rect x="${plot.x0}" y="${plot.y0}" width="${plot.x1 - plot.x0}" height="${plot.y1 - plot.y0}" fill="none" stroke="var(--border)" stroke-width="1.5"/>`);
  for (const t of niceTicks(L.mx - L.half, L.mx + L.half)) {
    const px = L.x(t);
    if (px < plot.x0 + 1 || px > plot.x1 - 1) continue;
    parts.push(`<line x1="${F(px)}" y1="${plot.y1}" x2="${F(px)}" y2="${plot.y1 + 5}" stroke="var(--border)" stroke-width="1.5"/>`);
    parts.push(`<text x="${F(px)}" y="${plot.y1 + 19}" text-anchor="middle" font-size="11" fill="var(--text-light)">${+t.toPrecision(3)}</text>`);
  }
  for (const t of niceTicks(L.my - L.half, L.my + L.half)) {
    const py = L.y(t);
    if (py < plot.y0 + 1 || py > plot.y1 - 1) continue;
    parts.push(`<line x1="${plot.x0 - 5}" y1="${F(py)}" x2="${plot.x0}" y2="${F(py)}" stroke="var(--border)" stroke-width="1.5"/>`);
    parts.push(`<text x="${plot.x0 - 8}" y="${F(py + 4)}" text-anchor="end" font-size="11" fill="var(--text-light)">${+t.toPrecision(3)}</text>`);
  }
  parts.push(`<text x="${plot.x0}" y="26" font-size="14" fill="var(--text)" font-family="'IBM Plex Serif', Georgia, serif" font-style="italic">${labels.title}</text>`);
  if (st.note) parts.push(`<text data-role="note" x="${plot.x1}" y="26" text-anchor="end" font-size="11" fill="var(--text-light)">${st.note}</text>`);
  parts.push(`<text x="${(plot.x0 + plot.x1) / 2}" y="${H - 10}" text-anchor="middle" font-size="13" fill="var(--text)">${labels.x}</text>`);
  parts.push(`<text x="16" y="${(plot.y0 + plot.y1) / 2}" text-anchor="middle" font-size="13" fill="var(--text)" transform="rotate(-90 16 ${(plot.y0 + plot.y1) / 2})">${labels.y}</text>`);

  // Each family gets its own stroke, dash and error-mark orientation. Three
  // channels, so none of them has to be hue.
  const families = [
    { ln: LN.yx, on: st.showYX !== false, stroke: 'var(--heading)', dash: '10 4', width: 2.6, markDash: 'none' },
    { ln: LN.xy, on: st.showXY !== false, stroke: 'var(--heading)', dash: '2 4', width: 2.6, markDash: '3 2.5' },
    { ln: LN.pc1, on: st.showPC1 !== false, stroke: 'var(--accent)', dash: 'none', width: 3.4, markDash: 'none' },
  ].filter(f => f.on);

  const idx = tickIndices(xs.length);
  parts.push(`<g clip-path="url(#${id('clip')})">`);

  // error marks first, under everything
  if (st.ticks !== false) {
    for (const f of families) {
      for (const i of idx) {
        const [qx, qy] = markFor(f.ln.orient, xs[i], ys[i], f.ln, LN);
        parts.push(`<line data-role="mark-${f.ln.key}" data-orient="${f.ln.orient}" x1="${F(L.x(xs[i]))}" y1="${F(L.y(ys[i]))}" x2="${F(L.x(qx))}" y2="${F(L.y(qy))}" stroke="${f.stroke}" stroke-width="1.4" stroke-dasharray="${f.markDash}"/>`);
      }
    }
  }

  // the points
  for (let i = 0; i < xs.length; i++) {
    parts.push(`<circle data-role="pt" cx="${F(L.x(xs[i]))}" cy="${F(L.y(ys[i]))}" r="2.8" fill="var(--heading)" stroke="var(--bg)" stroke-width="0.75"/>`);
  }

  // the lines, with a paper casing so they stay readable where they cross
  const labelStubs = [];
  for (const f of families) {
    const seg = clipToRect(L.x(LN.mx), L.y(LN.my), f.ln.dir[0] * L.s, -f.ln.dir[1] * L.s, plot);
    if (!seg) continue;
    const d = `M${F(seg.x0)} ${F(seg.y0)}L${F(seg.x1)} ${F(seg.y1)}`;
    parts.push(`<path d="${d}" stroke="var(--bg)" stroke-width="${f.width + 2.5}" fill="none"/>`);
    parts.push(`<path data-role="line-${f.ln.key}" d="${d}" stroke="${f.stroke}" stroke-width="${f.width}" stroke-dasharray="${f.dash}" fill="none"/>`);
    const exit = seg.x1 >= seg.x0 ? { x: seg.x1, y: seg.y1 } : { x: seg.x0, y: seg.y0 };
    labelStubs.push({ f, exit });
  }

  // the mean: the one point all three lines agree on
  parts.push(`<circle data-role="centroid" cx="${F(L.x(LN.mx))}" cy="${F(L.y(LN.my))}" r="5.5" fill="var(--bg)" stroke="var(--ink)" stroke-width="2.5"/>`);
  parts.push(`<text x="${F(L.x(LN.mx) - 10)}" y="${F(L.y(LN.my) + 20)}" text-anchor="end" font-size="11" fill="var(--ink)" stroke="var(--bg)" stroke-width="3" paint-order="stroke">the mean</text>`);
  parts.push(`</g>`);

  // welded end labels in the right gutter, pushed apart so none overlap
  labelStubs.sort((a, b) => a.exit.y - b.exit.y);
  let prevY = -Infinity;
  const lx = plot.x1 + 8;
  for (const stub of labelStubs) {
    let ly = Math.min(Math.max(stub.exit.y, plot.y0 + 16), plot.y1 - 20);
    if (ly - prevY < 34) ly = prevY + 34;
    prevY = ly;
    const { f } = stub;
    if (Math.hypot(lx - stub.exit.x, ly - stub.exit.y) > 16) {
      parts.push(`<path d="M${F(stub.exit.x)} ${F(stub.exit.y)}L${F(lx - 2)} ${F(ly - 4)}" stroke="var(--border)" stroke-width="1" fill="none"/>`);
    }
    // orientation glyph: the direction this line measures its error in
    const gx = lx + 5, gy = ly - 8;
    const g = f.ln.orient === 'vertical' ? `M${gx} ${gy - 6}L${gx} ${gy + 6}`
      : f.ln.orient === 'horizontal' ? `M${gx - 6} ${gy}L${gx + 6} ${gy}`
        : `M${F(gx - 6 * Math.sin(f.ln.angle))} ${F(gy - 6 * Math.cos(f.ln.angle))}L${F(gx + 6 * Math.sin(f.ln.angle))} ${F(gy + 6 * Math.cos(f.ln.angle))}`;
    parts.push(`<path data-role="glyph-${f.ln.key}" data-orient="${f.ln.orient}" d="${g}" stroke="${f.stroke}" stroke-width="2.2" fill="none"/>`);
    parts.push(`<text data-role="label-${f.ln.key}" x="${lx + 15}" y="${F(ly - 4)}" font-size="12.5" fill="${f.stroke}">${f.ln.name}</text>`);
    parts.push(`<text x="${lx}" y="${F(ly + 12)}" font-size="11" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--text-light)">${slopeText(f.ln.slope)}</text>`);
  }

  parts.push(`</svg>`);
  return parts.join('\n');
}

export function applyDrag() { return {}; }
