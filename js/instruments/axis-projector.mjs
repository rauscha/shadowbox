// axis-projector - one line through the cloud, turned by hand, with both of
// PCA's stories on screen at once: the variance of the points' shadows ALONG
// the line, and the total squared distance ACROSS to it. Turn the line and one
// number climbs exactly as fast as the other falls, because they are the two
// shares of a fixed budget: var(along) + var(across) = var(x) + var(y), always.
// So the angle that maximises the first is forced to be the angle that
// minimises the second. They are not two criteria that happen to agree - they
// are one criterion seen from two sides, and that angle is PC1.
// Pure: render(state) -> SVG string; applyDrag(state, drag) -> partial state.

import { mean, variance, covariance, eigSym2 } from '../math/core.mjs';
import { colorCloud } from '../lib/cloud.mjs';
import { baseFor } from './cloud-ellipse.mjs';
import { isoFrame, niceTicks, clipToRect, F } from '../lib/frame.mjs';

export const name = 'axis-projector';

export const defaults = {
  idKey: 'axis-projector',
  xs: null, ys: null,                 // real data, or null to build from Σ
  sxx: 1.6, sxy: 0.84, syy: 0.9,      // rho 0.7 on these spreads
  seed: 5, n: 80,
  angleDeg: 0,                        // the line's angle, degrees, y up
  drops: true,                        // draw the perpendicular drop-lines
  showBest: false,                    // reveal PC1 as a dashed guide
  note: '',
  labels: { x: 'x', y: 'y', title: 'turn the line. the two numbers trade.' },
};

// A deliberately wrong line: flat along x, with fat drops and a lopsided budget.
export const posterState = { ...defaults, idKey: 'axis-projector', angleDeg: 0 };

export const controls = [
  { id: 'angleDeg', kind: 'slider', min: 0, max: 180, step: 1, label: 'angle (degrees)' },
  { id: 'drops', kind: 'toggle', label: 'perpendicular drops', on: true, off: false },
  { id: 'showBest', kind: 'toggle', label: 'show PC1', on: true, off: false },
];

const W = 640, H = 460;
const MARGIN = { l: 56, r: 208, t: 44, b: 48 };
const PANEL = { x0: 452, x1: 622 };

const num = (v, d = 2) => { const r = +v.toFixed(d); return (Object.is(r, -0) ? 0 : r).toFixed(d); };
const wrap180 = deg => ((deg % 180) + 180) % 180;

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

// Everything the two readouts need, exactly. Because the shadows are centred,
// varAlong + varAcross is the trace of Σ to machine precision.
export function stats(state) {
  const st = { ...defaults, ...state };
  const { xs, ys } = cloudOf(st);
  const theta = st.angleDeg * Math.PI / 180;
  const c = Math.cos(theta), s = Math.sin(theta);
  const mx = mean(xs), my = mean(ys);
  const t = [], d = [];
  let projSS = 0, perpSS = 0;
  for (let i = 0; i < xs.length; i++) {
    const dx = xs[i] - mx, dy = ys[i] - my;
    const ti = dx * c + dy * s, di = -dx * s + dy * c;
    t.push(ti); d.push(di);
    projSS += ti * ti; perpSS += di * di;
  }
  const nm1 = xs.length - 1;
  return {
    xs, ys, mx, my, t, d, theta, c, s,
    projSS, perpSS,
    varAlong: projSS / nm1,
    varAcross: perpSS / nm1,
    total: variance(xs) + variance(ys),
  };
}

// The angle both readouts agree on, straight from the closed-form 2x2 eigen.
export function bestAngleDeg(state) {
  const { xs, ys } = cloudOf({ ...defaults, ...state });
  const { angle } = eigSym2(variance(xs), covariance(xs, ys), variance(ys));
  return wrap180(angle * 180 / Math.PI);
}

function budgetBar(id, st, S) {
  const x0 = PANEL.x0, w = PANEL.x1 - PANEL.x0, y = 262, h = 22;
  const frac = Math.min(Math.max(S.varAlong / S.total, 0), 1);
  const cut = w * frac;
  const parts = [];
  parts.push(`<text x="${x0}" y="252" font-size="11" fill="var(--text-light)">one budget, two shares</text>`);
  parts.push(`<rect data-role="budget-along" x="${x0}" y="${y}" width="${F(cut)}" height="${h}" fill="url(#${id('screen')})" stroke="var(--ink)" stroke-width="2"/>`);
  parts.push(`<rect data-role="budget-across" x="${F(x0 + cut)}" y="${y}" width="${F(w - cut)}" height="${h}" fill="url(#${id('hatch')})" stroke="var(--ink)" stroke-width="2"/>`);
  parts.push(`<text x="${x0}" y="${y + h + 16}" font-size="11" fill="var(--text)">along ${num(S.varAlong)}</text>`);
  parts.push(`<text x="${PANEL.x1}" y="${y + h + 16}" text-anchor="end" font-size="11" fill="var(--text)">across ${num(S.varAcross)}</text>`);
  parts.push(`<text data-role="total" x="${x0}" y="${y + h + 40}" font-size="12" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--heading)">sum = ${num(S.total)}, always</text>`);
  return parts.join('\n');
}

export function render(state) {
  const st = { ...defaults, ...state };
  const { idKey, labels } = st;
  const id = s => `sb-${idKey}-${s}`;
  const L = layout(st);
  const { plot } = L;
  const S = stats(st);
  const parts = [];

  parts.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="'IBM Plex Sans', Arial, sans-serif">`);
  parts.push(`<title>A point cloud with one rotatable line through it: each point casts a shadow onto the line and drops a perpendicular to it, and two readouts show the variance of the shadows and the total squared distance of the drops, which always sum to the same total.</title>`);
  parts.push(`<defs>`
    + `<clipPath id="${id('clip')}"><rect x="${plot.x0}" y="${plot.y0}" width="${plot.x1 - plot.x0}" height="${plot.y1 - plot.y0}"/></clipPath>`
    + `<pattern id="${id('screen')}" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.2" fill="var(--ink)"/></pattern>`
    + `<pattern id="${id('hatch')}" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M-1 1L1 -1M0 6L6 0M5 7L7 5" stroke="var(--ink)" stroke-width="1.4"/></pattern>`
    + `</defs>`);

  // frame, ticks, captions
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

  const cx = L.x(L.mx), cy = L.y(L.my);
  const sdx = S.c * L.s, sdy = -S.s * L.s;             // the line's screen direction
  const seg = clipToRect(cx, cy, sdx, sdy, plot);

  parts.push(`<g clip-path="url(#${id('clip')})">`);

  // PC1 revealed: dashed guide plus a welded label, never hue alone
  if (st.showBest) {
    const bTheta = bestAngleDeg(st) * Math.PI / 180;
    const b = clipToRect(cx, cy, Math.cos(bTheta) * L.s, -Math.sin(bTheta) * L.s, plot);
    if (b) {
      parts.push(`<line data-role="pc1-guide" x1="${F(b.x0)}" y1="${F(b.y0)}" x2="${F(b.x1)}" y2="${F(b.y1)}" stroke="var(--text-light)" stroke-width="2" stroke-dasharray="9 6"/>`);
      parts.push(`<text x="${F(b.x1 - 6)}" y="${F(b.y1 + 16)}" text-anchor="end" font-size="12" fill="var(--text-light)" stroke="var(--bg)" stroke-width="3" paint-order="stroke">PC1</text>`);
    }
  }

  // drop-lines: what "across" measures, drawn thin so the ticks stay on top
  if (st.drops !== false) {
    for (let i = 0; i < S.xs.length; i++) {
      const fx = L.x(L.mx + S.t[i] * S.c), fy = L.y(L.my + S.t[i] * S.s);
      parts.push(`<line data-role="drop" x1="${F(L.x(S.xs[i]))}" y1="${F(L.y(S.ys[i]))}" x2="${F(fx)}" y2="${F(fy)}" stroke="var(--text-light)" stroke-width="1"/>`);
    }
  }

  // the line itself: heavy outline carries the structure
  if (seg) {
    parts.push(`<line data-drag="angle" x1="${F(seg.x0)}" y1="${F(seg.y0)}" x2="${F(seg.x1)}" y2="${F(seg.y1)}" stroke="transparent" stroke-width="22" style="cursor:grab"/>`);
    parts.push(`<line data-role="axis" x1="${F(seg.x0)}" y1="${F(seg.y0)}" x2="${F(seg.x1)}" y2="${F(seg.y1)}" stroke="var(--ink)" stroke-width="3" pointer-events="none"/>`);
  }

  // the shadows: a heavy tick across the line at every projected point
  const e = 6 / L.s;                                   // 6 px, expressed in numeric units
  for (let i = 0; i < S.xs.length; i++) {
    const bx = L.mx + S.t[i] * S.c, by = L.my + S.t[i] * S.s;
    const ax = -S.s * e, ay = S.c * e;
    parts.push(`<line data-role="shadow-tick" x1="${F(L.x(bx - ax))}" y1="${F(L.y(by - ay))}" x2="${F(L.x(bx + ax))}" y2="${F(L.y(by + ay))}" stroke="var(--ink)" stroke-width="2"/>`);
  }

  // the points last, so they read as the thing casting the shadow
  for (let i = 0; i < S.xs.length; i++) {
    parts.push(`<circle data-role="pt" cx="${F(L.x(S.xs[i]))}" cy="${F(L.y(S.ys[i]))}" r="3" fill="var(--heading)" stroke="var(--bg)" stroke-width="1"/>`);
  }
  parts.push(`</g>`);

  // angle arc at the centroid, so the number in the panel has a picture
  const deg = wrap180(st.angleDeg);
  if (deg > 4) {
    const r = 34;
    const ex = cx + r * Math.cos(S.theta), ey = cy - r * Math.sin(S.theta);
    parts.push(`<path data-role="angle-arc" d="M${F(cx + r)} ${F(cy)}A${r} ${r} 0 0 0 ${F(ex)} ${F(ey)}" fill="none" stroke="var(--text-light)" stroke-width="1.5"/>`);
  }

  // the rotation handle: a diamond at the line's tip, draggable and tabbable
  const hr = L.half * 0.86;
  const hx = L.x(L.mx + hr * S.c), hy = L.y(L.my + hr * S.s);
  parts.push(`<path data-drag="angle" tabindex="0" aria-label="line angle: drag or use arrow keys to turn the line" d="M${F(hx)} ${F(hy - 9)}L${F(hx + 9)} ${F(hy)}L${F(hx)} ${F(hy + 9)}L${F(hx - 9)} ${F(hy)}Z" fill="var(--bg)" stroke="var(--ink)" stroke-width="2.5" style="cursor:grab"/>`);

  // the two readouts, side by side, each welded to the geometry it describes
  parts.push(`<text data-role="angle" x="${PANEL.x0}" y="64" font-size="16" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--heading)">angle = ${Math.round(deg)}°</text>`);

  parts.push(`<rect x="${PANEL.x0}" y="82" width="16" height="16" fill="url(#${id('screen')})" stroke="var(--ink)" stroke-width="1.5"/>`);
  parts.push(`<text x="${PANEL.x0 + 24}" y="95" font-size="12" fill="var(--text)">ALONG the line</text>`);
  parts.push(`<text data-role="var-along" x="${PANEL.x0}" y="126" font-size="26" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--heading)">${num(S.varAlong)}</text>`);
  parts.push(`<text x="${PANEL.x0}" y="143" font-size="11" fill="var(--text-light)">variance of the shadows</text>`);

  parts.push(`<rect x="${PANEL.x0}" y="164" width="16" height="16" fill="url(#${id('hatch')})" stroke="var(--ink)" stroke-width="1.5"/>`);
  parts.push(`<text x="${PANEL.x0 + 24}" y="177" font-size="12" fill="var(--text)">ACROSS to the line</text>`);
  parts.push(`<text data-role="perp-ss" x="${PANEL.x0}" y="208" font-size="26" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--heading)">${num(S.perpSS, 1)}</text>`);
  parts.push(`<text x="${PANEL.x0}" y="225" font-size="11" fill="var(--text-light)">sum of squared drops</text>`);

  parts.push(`<line x1="${PANEL.x0}" y1="238" x2="${PANEL.x1}" y2="238" stroke="var(--border)" stroke-width="1.5"/>`);
  parts.push(budgetBar(id, st, S));

  if (st.showBest) {
    parts.push(`<text x="${PANEL.x0}" y="352" font-size="12" fill="var(--text)">PC1 sits at ${Math.round(bestAngleDeg(st))}°</text>`);
    parts.push(`<text x="${PANEL.x0}" y="368" font-size="12" fill="var(--text)">where ALONG is largest</text>`);
    parts.push(`<text x="${PANEL.x0}" y="384" font-size="12" fill="var(--text)">and ACROSS is smallest</text>`);
  }

  parts.push(`</svg>`);
  return parts.join('\n');
}

// One handle, one meaning: wherever the pointer goes, the line points at it.
// Keyboard nudges arrive here too (hydrate feeds the handle's moved centre).
export function applyDrag(state, { id, x, y }) {
  if (id !== 'angle') return {};
  const st = { ...defaults, ...state };
  const L = layout(st);
  const dx = L.invX(x) - L.mx, dy = L.invY(y) - L.my;
  if (Math.hypot(dx, dy) < 1e-9) return {};
  return { angleDeg: wrap180(Math.atan2(dy, dx) * 180 / Math.PI) };
}

export function applyControl(state, id, value) {
  if (id === 'angleDeg') return { angleDeg: wrap180(Number(value)) };
  return { [id]: value };
}
