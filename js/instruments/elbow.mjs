// elbow - the method people actually use, shown failing on their own data. The
// total squared distance against k, with the drop at each step printed as text
// beside the point, because a bar is a picture of a number and never the only
// copy of it. Structural callback to scree in lesson 3: same left-hand shape,
// same insistence that the number is written out.
//
// NOT capped at six. This instrument draws a curve and no cluster identity, so
// the shape budget does not bind it. Capping it would cripple the one figure
// whose whole job is the shape of the curve across k; two cold readers caught
// exactly that in the first draft of the design.
//
// Seed fixed at 3 with ++ seeding, matching test/kmeans-claims.test.mjs. A curve
// that jitters while the reader is not touching anything teaches restarts, which
// is restart-roulette's job, not this one's.
// Pure: render(state) -> SVG string.

import { mulberry32 } from '../math/core.mjs';
import { kmeansRun, zscoreColumns } from '../math/kmeans.mjs';
import { niceTicks, F } from '../lib/frame.mjs';

export const name = 'elbow';

export const SEED = 3;

export const defaults = {
  idKey: 'elbow',
  dataset: 'blobs',
  columns: null,            // [[...], [...]] one array per variable
  standardize: false,
  kMax: 10,
  note: '',
  labels_: { title: 'the cost always falls. that is the problem.' },
};

export const posterState = null;

export const controls = [
  { id: 'kMax', kind: 'slider', label: 'how far to look (k)', min: 4, max: 10, step: 1 },
  { id: 'use-blobs', kind: 'action', label: 'blobs' },
  { id: 'use-births', kind: 'action', label: 'births' },
  { id: 'use-biometry', kind: 'action', label: 'biometry' },
];

export function curve(st) {
  const X = st.standardize
    ? zscoreColumns(st.columns)
    : st.columns[0].map((_, i) => st.columns.map(c => c[i]));
  const out = [];
  for (let k = 1; k <= st.kMax; k++) {
    const cost = kmeansRun(X, k, mulberry32(SEED), { plusplus: true }).wcss;
    const prev = out.length ? out[out.length - 1].cost : null;
    out.push({ k, cost, dropPct: prev === null ? null : 100 * (1 - cost / prev) });
  }
  return out;
}

// Measured with seed 3 and ++ seeding, k = 1 to 10:
//   blobs    sharpest fall-off 6.21, at k = 3, which is the true k
//   births   2.14, no corner
//   biometry 2.90, no corner
// An earlier version of this rule compared the first drop to the median of the
// rest. It scored biometry at 4.19 and would have printed "there is a corner
// here" on the very dataset this lesson uses to show there is not one. A
// computed verdict is only worth having if it can say no.
export function verdictOf(curve) {
  const d = curve.slice(1).map(p => p.dropPct);
  let best = 0, at = -1;
  for (let i = 0; i < d.length - 1; i++) {
    const r = d[i] / d[i + 1];
    if (r > best) { best = r; at = i; }
  }
  const steady = d.every((v, i) => i === 0 || v <= d[i - 1] + 1e-9);
  if (best > 3) {
    return { corner: at + 2, ratio: best, text: `there is a corner here, and it is at k = ${at + 2}` };
  }
  return {
    corner: null, ratio: best,
    text: 'no corner. the cost keeps falling and never tells you where to stop'
      + (steady ? '' : ', and it does not even fall steadily'),
  };
}

export function applyControl(st, id, value) { return { [id]: value }; }
export function applyDrag() { return {}; }

// ---------------------------------------------------------------- render

// r=150 is not a legend column (this figure draws no membership, so there is
// nothing to key). It is headroom: the last point sits at plot.x1 and its
// printed drop runs to the right of it, so the margin exists to hold that
// text rather than clip it against the canvas edge.
const W = 640, H = 460;
// t=56, not the 44 a first draft used: the k=1 point always sits exactly at
// (plot.x0, plot.y0), because cost/maxCost is 1 at k=1 by definition, and its
// r=4 marker pokes 4px above whatever y0 is. 44 put the marker's top edge
// under the verdict text's own ink; 56 clears it with room to spare (measured:
// marker top at 52 against a verdict ink bottom around 42.8, a 9+px gap).
const MARGIN = { l: 72, r: 150, t: 56, b: 52 };

const fmtNum = v => Math.abs(v) >= 1000 ? String(Math.round(v))
  : (Number.isInteger(v) ? String(v) : String(+v.toFixed(1)));

export function render(state) {
  const st = { ...defaults, ...state };
  const plot = { x0: MARGIN.l, y0: MARGIN.t, x1: W - MARGIN.r, y1: H - MARGIN.b };

  // Computed once, reused for the curve, the points, the printed drops and the
  // verdict text below: the verdict must describe the exact curve on screen,
  // never a second, separately computed one.
  const c = curve(st);
  const maxCost = c[0].cost;
  const verdict = verdictOf(c);

  const xAt = k => plot.x0 + (st.kMax > 1 ? (k - 1) / (st.kMax - 1) : 0) * (plot.x1 - plot.x0);
  const yAt = cost => plot.y1 - (maxCost > 0 ? cost / maxCost : 0) * (plot.y1 - plot.y0);

  const parts = [];
  parts.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="'IBM Plex Sans', Arial, sans-serif">`);
  parts.push(`<title>Total squared distance from each point to its own center, plotted against k from 1 to ${st.kMax}, with the percentage drop at every step printed beside its point and a computed verdict on whether the curve shows a genuine corner.</title>`);

  // plot frame
  parts.push(`<rect x="${plot.x0}" y="${plot.y0}" width="${plot.x1 - plot.x0}" height="${plot.y1 - plot.y0}" fill="none" stroke="var(--border)" stroke-width="1.5"/>`);

  // y ticks: niceTicks over the cost domain, 0 to the k=1 cost
  for (const t of niceTicks(0, maxCost)) {
    const py = F(yAt(t));
    parts.push(`<line x1="${F(plot.x0 - 5)}" y1="${py}" x2="${plot.x0}" y2="${py}" stroke="var(--border)" stroke-width="1.5"/>`);
    parts.push(`<text x="${F(plot.x0 - 9)}" y="${F(py + 4)}" text-anchor="end" font-size="11" fill="var(--text-light)">${fmtNum(t)}</text>`);
  }

  // x ticks: one per integer k, not niceTicks - the axis IS the integers
  for (let k = 1; k <= st.kMax; k++) {
    const px = F(xAt(k));
    parts.push(`<line x1="${px}" y1="${plot.y1}" x2="${px}" y2="${F(plot.y1 + 5)}" stroke="var(--border)" stroke-width="1.5"/>`);
    parts.push(`<text x="${px}" y="${F(plot.y1 + 18)}" text-anchor="middle" font-size="11" fill="var(--text-light)">${k}</text>`);
  }

  // axis labels: the y one spelled out in words, never the acronym. Sizes and
  // offsets below were checked against real getBBox() measurements, not
  // guessed: the note can be as long as a dataset's own description, and an
  // earlier draft let it run into this label's row when both were present.
  parts.push(`<text x="${F((plot.x0 + plot.x1) / 2)}" y="${F(plot.y1 + 34)}" text-anchor="middle" font-size="11" fill="var(--text)">how many groups (k)</text>`);
  const midY = F((plot.y0 + plot.y1) / 2);
  parts.push(`<text x="18" y="${midY}" text-anchor="middle" font-size="11" fill="var(--text)" transform="rotate(-90 18 ${midY})">total squared distance from each point to its own center</text>`);

  // title + the computed verdict, directly under it. verdict runs up to about
  // 103 characters on the real data ("no corner. ... does not even fall
  // steadily"), so it is sized down from a first draft that measured as
  // overlapping the title by a hair once actually rendered.
  parts.push(`<text x="${plot.x0}" y="26" font-size="14" fill="var(--text)" font-family="'IBM Plex Serif', Georgia, serif" font-style="italic">${st.labels_.title}</text>`);
  parts.push(`<text data-role="verdict" x="${plot.x0}" y="40" font-size="11" fill="var(--heading)">${verdict.text}</text>`);

  // the curve itself: one polyline through every k
  const pts = c.map(p => `${F(xAt(p.k))},${F(yAt(p.cost))}`).join(' ');
  parts.push(`<polyline data-role="curve" points="${pts}" stroke="var(--ink)" stroke-width="2.5" fill="none"/>`);

  // one point per k, and the drop that arrived at it printed immediately to
  // its right - a bar is a picture of a number, never the only copy of it.
  for (const p of c) {
    const px = F(xAt(p.k)), py = F(yAt(p.cost));
    parts.push(`<circle data-role="k-point" data-k="${p.k}" cx="${px}" cy="${py}" r="4" fill="var(--heading)"/>`);
    if (p.dropPct !== null) {
      parts.push(`<text data-role="drop-label" x="${F(px + 8)}" y="${F(py + 4)}" font-size="11" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--heading)">${Math.round(p.dropPct)}%</text>`);
    }
  }

  if (st.note) parts.push(`<text data-role="note" x="${plot.x0}" y="${H - 5}" font-size="10" fill="var(--text-light)">${st.note}</text>`);

  parts.push(`</svg>`);
  return parts.join('\n');
}
