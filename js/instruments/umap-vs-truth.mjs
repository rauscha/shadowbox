// umap-vs-truth - the closer, and the third route to the same answer.
//
// Embed the four biometry measurements, then draw the embedding with each point
// sized by gestational age, which the algorithm never saw.
//   - PCA's first component was gestational age in disguise (lesson 3).
//   - k-means' cluster labels were gestational age wearing a costume (lesson 4).
//   - The embedding recovers gestational age at 0.973 against a ceiling of 0.972.
// Three unrelated machines, one answer, and the page says so plainly.
//
// The number is a NEIGHBOURHOOD measure - predict each scan's gestational age
// from the mean age of its fifteen neighbours in the embedding - not a straight
// line fitted to the two coordinates. The linear reading gives 0.261 to 0.971
// depending on the seed, which reads as wild instability and is nothing of the
// sort: it is a line fitted to a curved arc. Spec §2(c). Approved 2026-08-27:
// this figure carries the neighbourhood number ALONE, and the linear failure is
// taught in the prose rather than given equal footing here.
//
// Gestational age is continuous, so it cannot be a mark shape. It is graduated
// dot area, area linear in the value, smallest dot at the youngest scan - the
// owner's Lichtenstein rule of 2026-08-20, the same one halftone.mjs follows.
//
// Pure: render(state) -> SVG string.

import { umap } from '../math/umap.mjs';
import { gaFromNeighbours } from '../lib/embed-metrics.mjs';
import { zscoreColumns } from '../math/kmeans.mjs';
import { isoFrame, F } from '../lib/frame.mjs';

export const name = 'umap-vs-truth';

// Fixed, and shared with the poster config in tools/poster.mjs. A poster drawn
// from one seed beside a live mount that starts from another makes the page jump
// the moment JS loads.
export const SEED = 1;
export const N_EPOCHS = 200;
export const NEIGHBOURS_FOR_RECOVERY = 15;

export const R_MIN = 1.3, R_MAX = 5.2;

export const defaults = {
  idKey: 'umap-vs-truth',
  columns: null,                 // [BPD, HC, AC, FL]
  names: null,
  outcome: null,                 // gestational age, which the algorithm never sees
  k: 15,
  note: '',
  labels_: { title: 'the algorithm never saw the dates. again.' },
};

export const posterState = null;

export const controls = [
  // commit: 'change' - this slider recomputes a whole 200-epoch embedding, 96 ms
  // in Node and 2 to 3x that in Safari. On 'input' that fires per pixel of drag.
  { id: 'k', kind: 'slider', label: 'how many neighbours (k)', min: 5, max: 50, step: 5, commit: 'change' },
];

// Area linear in the value, so the radius goes as the square root. The smallest
// dot is the minimum of the range, never zero - a scan drawn at zero radius is a
// scan the reader cannot count.
export function radiusOf(v, lo, hi) {
  const t = hi > lo ? (v - lo) / (hi - lo) : 0;
  return Math.sqrt(R_MIN * R_MIN + t * (R_MAX * R_MAX - R_MIN * R_MIN));
}

export function embedding(st) {
  const X = zscoreColumns(st.columns);
  const { Y } = umap(X, { k: st.k, seed: SEED, nEpochs: N_EPOCHS });
  return {
    Y,
    recovered: gaFromNeighbours(Y, st.outcome, NEIGHBOURS_FOR_RECOVERY),
    ceiling: gaFromNeighbours(X, st.outcome, NEIGHBOURS_FOR_RECOVERY),
  };
}

export function applyControl(st, id, value) { return { [id]: value }; }
export function applyDrag() { return {}; }

// ---------------------------------------------------------------- render

const W = 640, H = 460;
const PLOT = { x0: 40, y0: 66, x1: W - 40, y1: H - 56 };

// "A, B, C and D" - no oxford comma, matching label-vs-truth's caption voice.
function listNames(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function render(state) {
  const st = { ...defaults, ...state };
  const { idKey } = st;
  const id = s => `sb-${idKey}-${s}`;
  const names = st.names && st.names.length ? st.names : ['BPD', 'HC', 'AC', 'FL'];
  const { Y, recovered, ceiling } = embedding(st);

  const lo = Math.min(...st.outcome), hi = Math.max(...st.outcome);
  const frame = isoFrame(Y.map(p => p[0]), Y.map(p => p[1]), PLOT);

  const parts = [];
  parts.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="'IBM Plex Sans', Arial, sans-serif">`);
  parts.push(`<title>A UMAP embedding of ${Y.length} scans built from four biometry measurements, with each scan drawn as a dot whose area is its gestational age - a number the algorithm never saw. The scans lie along an arc that runs from the youngest to the oldest.</title>`);
  parts.push(`<defs><clipPath id="${id('clip')}"><rect x="${PLOT.x0}" y="${PLOT.y0}" width="${F(PLOT.x1 - PLOT.x0)}" height="${F(PLOT.y1 - PLOT.y0)}"/></clipPath></defs>`);

  parts.push(`<text x="${PLOT.x0}" y="26" font-size="14" fill="var(--text)" font-family="'IBM Plex Serif', Georgia, serif" font-style="italic">${st.labels_.title}</text>`);
  // The number in text, never only as the picture the arc makes of it. Both
  // halves of the claim in one sentence: a recovered value without the ceiling
  // it is measured against is not a claim, it is a decoration.
  parts.push(`<text data-role="recovered" x="${PLOT.x0}" y="47" font-size="12.5" fill="var(--heading)">a scan's neighbours here predict its age to ${recovered.toFixed(3)}. the four raw measurements themselves reach ${ceiling.toFixed(3)}.</text>`);
  parts.push(`<text data-role="axes-warning" x="${PLOT.x0}" y="62" font-size="11" fill="var(--text-light)">neither axis means anything. the arc does.</text>`);

  parts.push(`<rect x="${PLOT.x0}" y="${PLOT.y0}" width="${F(PLOT.x1 - PLOT.x0)}" height="${F(PLOT.y1 - PLOT.y0)}" fill="none" stroke="var(--border)" stroke-width="1.5"/>`);
  parts.push(`<g clip-path="url(#${id('clip')})">`);
  for (let i = 0; i < Y.length; i++) {
    const r = radiusOf(st.outcome[i], lo, hi);
    // A plain circle, sized. No mark shape: shape is membership in this codebase
    // and there is no membership here. No partition wall and no centres either -
    // the biometry has a gradient, not groups, and nothing in this figure may do
    // the reader's cutting for them. Spec §8.
    parts.push(`<circle data-role="pt" cx="${F(frame.x(Y[i][0]))}" cy="${F(frame.y(Y[i][1]))}" r="${F(r)}" fill="var(--heading)"/>`);
  }
  parts.push(`</g>`);

  // Size key, bottom right, on an opaque chip so it reads over the cloud - the
  // same trick restart-roulette's cheapest badge uses. Dot area is a channel the
  // reader has to be taught, and it is taught with numbers, not a gradient bar.
  {
    const kx = PLOT.x1 - 150, ky = PLOT.y1 - 34;
    parts.push(`<g data-role="key">`);
    parts.push(`<rect x="${F(kx - 8)}" y="${F(ky - 16)}" width="150" height="30" fill="var(--bg)"/>`);
    const stops = [lo, (lo + hi) / 2, hi];
    stops.forEach((v, i) => {
      const cx = kx + 14 + i * 44;
      parts.push(`<circle data-role="key-dot" cx="${F(cx)}" cy="${F(ky - 2)}" r="${F(radiusOf(v, lo, hi))}" fill="var(--heading)"/>`);
      parts.push(`<text data-role="key-label" x="${F(cx)}" y="${F(ky + 12)}" text-anchor="middle" font-size="9.5" fill="var(--text)">${Math.round(v)} wk</text>`);
    });
    parts.push(`</g>`);
  }

  parts.push(`<text x="${PLOT.x0}" y="${F(PLOT.y1 + 20)}" font-size="10" fill="var(--text-light)">embedded from ${listNames(names)}. gestational age was never shown to the algorithm.</text>`);
  if (st.note) parts.push(`<text data-role="note" x="${PLOT.x0}" y="${F(PLOT.y1 + 36)}" font-size="11" fill="var(--text-light)">${st.note}</text>`);
  parts.push(`</svg>`);
  return parts.join('\n');
}
