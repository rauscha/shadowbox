// label-vs-truth - the closer, and the handoff to lesson 5. Cluster the four
// biometry measurements, then lay the clusters out against gestational age,
// which the algorithm never saw. The bands very nearly tile the interval: the
// clusters are gestational age wearing a costume.
// Same punchline as PC1 in lesson 3, reached by completely unrelated machinery,
// which is the part worth saying out loud. And because this is four dimensions,
// the reader cannot check it by eye. That discomfort is what lesson 5 is for.
//
// Never writes "eta-squared". The quantity is the share of the variation in
// gestational age that the labels account for, and it is written that way.
// Pure: render(state) -> SVG string.

import { mulberry32 } from '../math/core.mjs';
import { kmeansRun, zscoreColumns, eta2 } from '../math/kmeans.mjs';
import { markPath, markFor, MAX_MARKS } from '../lib/marks.mjs';
import { niceTicks, F } from '../lib/frame.mjs';

export const name = 'label-vs-truth';

export const SEED = 11;

export const defaults = {
  idKey: 'label-vs-truth',
  columns: null,              // [BPD, HC, AC, FL]
  names: null,
  outcome: null,              // gestational age, which the algorithm never sees
  outcomeName: 'gestational age (weeks)',
  k: 3,
  note: '',
  labels_: { title: 'the algorithm never saw the dates. look what it found.' },
};

export const posterState = null;

export const controls = [
  // 2 to 5: inside the shape budget, and the measured share only runs that far.
  { id: 'k', kind: 'slider', label: 'how many groups (k)', min: 2, max: 5, step: 1 },
];

export function bands(st) {
  const X = zscoreColumns(st.columns);
  const { labels } = kmeansRun(X, st.k, mulberry32(SEED), { plusplus: true });
  const raw = [];
  for (let j = 0; j < st.k; j++) {
    const g = st.outcome.filter((_, i) => labels[i] === j);
    if (!g.length) continue;
    raw.push({
      cluster: j, n: g.length,
      mean: g.reduce((a, b) => a + b, 0) / g.length,
      min: Math.min(...g), max: Math.max(...g),
    });
  }
  raw.sort((a, b) => a.mean - b.mean);
  return {
    labels,
    share: eta2(st.outcome, labels, st.k),
    bands: raw.map((b, row) => ({ ...b, mark: markFor(b.cluster) })),
  };
}

export function applyControl(st, id, value) { return { [id]: value }; }
export function applyDrag() { return {}; }

// ---------------------------------------------------------------- render

const W = 640, H = 460;
const MARGIN = { l: 64, r: 40, t: 56, b: 72 };

const fmtNum = v => Math.abs(v) >= 1000 ? String(Math.round(v))
  : (Number.isInteger(v) ? String(v) : String(+v.toFixed(1)));

// "A, B, C and D" - no oxford comma, matching the caption's exact voice.
function listNames(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function render(state) {
  const st = { ...defaults, ...state };
  const { idKey } = st;
  const id = s => `sb-${idKey}-${s}`;
  const names = st.names && st.names.length ? st.names : ['BPD', 'HC', 'AC', 'FL'];

  const { labels, share, bands: sorted } = bands(st);
  // Displayed tallest (largest mean) to the top, so the vertical stacking rises
  // the same direction the x-axis does: scanning top to bottom, the bands march
  // in lockstep with gestational age, which is the whole point of the figure.
  const rows = [...sorted].reverse();
  const k = rows.length;

  const plot = { x0: MARGIN.l, y0: MARGIN.t, x1: W - MARGIN.r, y1: H - MARGIN.b };

  // x domain: the measured range of gestational age itself, padded just enough
  // that a mark or an end cap sitting exactly at the extreme never clips
  // against the plot border. A wide pad would leave the bands visibly short of
  // the frame's edges, undercutting the "very nearly tiles the interval" point.
  const lo = Math.min(...st.outcome), hi = Math.max(...st.outcome);
  const pad = (hi - lo || 1) * 0.05;
  const d0 = lo - pad, d1 = hi + pad;
  const xAt = v => plot.x0 + (v - d0) / (d1 - d0) * (plot.x1 - plot.x0);

  // Rows stack with generous, fixed vertical offsets from each row's own
  // centre (mean label above the rule, the rule and its end caps at centre,
  // the count below) so none of the three ever competes with a scan mark
  // drawn at any x - measured to clear even the k=5, six-row case.
  const rowH = (plot.y1 - plot.y0) / k;
  const yOfRow = r => plot.y0 + rowH * (r + 0.5);

  const parts = [];
  parts.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="'IBM Plex Sans', Arial, sans-serif">`);
  parts.push(`<title>Each of the ${k} k-means clusters found on four biometry measurements, drawn as a horizontal band against gestational age, a variable the clustering never saw. The bands sort by mean and very nearly tile the measured interval.</title>`);
  parts.push(`<defs><clipPath id="${id('clip')}"><rect x="${plot.x0}" y="${plot.y0}" width="${F(plot.x1 - plot.x0)}" height="${F(plot.y1 - plot.y0)}"/></clipPath></defs>`);

  // plot frame
  parts.push(`<rect x="${plot.x0}" y="${plot.y0}" width="${F(plot.x1 - plot.x0)}" height="${F(plot.y1 - plot.y0)}" fill="none" stroke="var(--border)" stroke-width="1.5"/>`);

  // x ticks, on the measured gestational-age range
  for (const t of niceTicks(d0, d1)) {
    const px = F(xAt(t));
    parts.push(`<line x1="${px}" y1="${plot.y1}" x2="${px}" y2="${F(plot.y1 + 5)}" stroke="var(--border)" stroke-width="1.5"/>`);
    parts.push(`<text x="${px}" y="${F(plot.y1 + 18)}" text-anchor="middle" font-size="11" fill="var(--text-light)">${fmtNum(t)}</text>`);
  }
  parts.push(`<text x="${F((plot.x0 + plot.x1) / 2)}" y="${F(plot.y1 + 36)}" text-anchor="middle" font-size="11.5" fill="var(--text)">${st.outcomeName}</text>`);

  // title + the computed share, printed directly under it - the share is a
  // number in text, never only the picture the bands make of it.
  parts.push(`<text x="${plot.x0}" y="26" font-size="14" fill="var(--text)" font-family="'IBM Plex Serif', Georgia, serif" font-style="italic">${st.labels_.title}</text>`);
  parts.push(`<text data-role="share" x="${plot.x0}" y="47" font-size="12.5" fill="var(--heading)">the labels account for ${share.toFixed(3)} of the variation in gestational age</text>`);

  parts.push(`<g clip-path="url(#${id('clip')})">`);
  for (let r = 0; r < rows.length; r++) {
    const b = rows[r];
    const cy = yOfRow(r);
    const xMin = F(xAt(b.min)), xMax = F(xAt(b.max)), mx = F(xAt(b.mean));

    // the range: a ruled line spanning [min, max], with a short perpendicular
    // cap at each end so the boundary reads as a measured extent, not a guess.
    parts.push(`<line data-role="band" data-cluster="${b.cluster}" x1="${xMin}" y1="${F(cy)}" x2="${xMax}" y2="${F(cy)}" stroke="var(--ink)" stroke-width="2"/>`);
    parts.push(`<line x1="${xMin}" y1="${F(cy - 4)}" x2="${xMin}" y2="${F(cy + 4)}" stroke="var(--ink)" stroke-width="2"/>`);
    parts.push(`<line x1="${xMax}" y1="${F(cy - 4)}" x2="${xMax}" y2="${F(cy + 4)}" stroke="var(--ink)" stroke-width="2"/>`);

    // the mean: a taller tick through the rule, labelled above it
    parts.push(`<line x1="${mx}" y1="${F(cy - 10)}" x2="${mx}" y2="${F(cy + 10)}" stroke="var(--heading)" stroke-width="1.75"/>`);
    parts.push(`<text data-role="band-mean" x="${mx}" y="${F(cy - 14)}" text-anchor="middle" font-size="11" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--heading)">${b.mean.toFixed(1)} wk</text>`);

    // the count: fixed at the left of the row, well clear of the rule and of
    // every scan's jitter, whatever this band's own min and max happen to be
    parts.push(`<text data-role="band-n" x="${F(plot.x0 + 6)}" y="${F(cy + 22)}" font-size="10.5" fill="var(--text)">n = ${b.n}</text>`);

    // every scan in this band, shaped by its cluster, jittered by a
    // deterministic function of its own index - never the rng, so the poster
    // and the live view always draw the identical swarm.
    for (let i = 0; i < labels.length; i++) {
      if (labels[i] !== b.cluster) continue;
      const cx = F(xAt(st.outcome[i]));
      const jitter = (i % 7 - 3) * 1.6;
      const py = F(cy + jitter);
      const { d, filled } = markPath(b.mark, cx, py, 3);
      parts.push(`<path data-role="pt" data-cluster="${b.cluster}" d="${d}" ${filled ? `fill="var(--heading)"` : `fill="none" stroke="var(--heading)" stroke-width="1.4"`}/>`);
    }
  }
  parts.push(`</g>`);

  // The caption is the one line the brief's render table actually asks for.
  // Its baseline is spaced from the axis label using real getBBox() clearance
  // measured in a browser (see task-9-report.md), not an assumed font metric -
  // the assumed one undershot by about half a pixel where the two are tightest
  // (the tick row and the axis label). st.note is intentionally not drawn:
  // it is not one of the seven required elements, and scree.mjs is already a
  // precedent for an instrument that carries `note` in defaults without ever
  // rendering it. Task 10's poster config may still set st.note harmlessly.
  parts.push(`<text x="${plot.x0}" y="${F(plot.y1 + 54)}" font-size="10.5" fill="var(--text-light)">clustered on ${listNames(names)}. gestational age was never shown to the algorithm.</text>`);

  parts.push(`</svg>`);
  return parts.join('\n');
}
