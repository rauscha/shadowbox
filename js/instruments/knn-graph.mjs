// knn-graph - stage one, and the idea the lesson has to teach before anything
// else. Scatter plus the drawn k-nearest-neighbour edges, with each edge's
// membership strength as its line weight, so "neighbour" reads as a matter of
// degree rather than a yes/no relation.
//
// One slider, and it is named NEIGHBOURS. Lesson 4's k counted groups; this k
// counts neighbours, and a reader arriving straight from that page will carry
// the wrong one over unless every label says so.
//
// There is no seed control, and the absence is the point: given the rows and the
// number of neighbours there is exactly one graph. Every run-to-run difference
// the reader is about to see in layout-play comes from the next stage alone.
//
// Pure: render(state) -> SVG string. No step().

import { fuzzyGraph } from '../math/umap.mjs';
import { zscoreColumns } from '../math/kmeans.mjs';
import { isoFrame, F } from '../lib/frame.mjs';
import { markPath, markFor } from '../lib/marks.mjs';

export const name = 'knn-graph';

// pos names the two columns the points are DRAWN at. For the synthetic sets that
// is the whole of the data. For biometry it is head circumference against
// abdominal circumference - the pair kmeans-step already uses - while the graph
// is computed on all four standardized columns. Some edges will cross the
// picture in ways the picture cannot justify, because they are four-dimensional
// neighbours seen in a shadow. That is the figure's job, not a defect.
export const DATASETS = {
  blobs:     { pos: [0, 1], standardize: false, k: 5,  note: '150 generated points, three blobs' },
  crescents: { pos: [0, 1], standardize: false, k: 5,  note: '150 generated points, two crescents' },
  uniform:   { pos: [0, 1], standardize: false, k: 5,  note: '150 generated points, no structure at all' },
  biometry:  { pos: [1, 2], standardize: true,  k: 5,
    note: '350 simulated scans. neighbours found on all four measurements, drawn on two of them' },
};

export const defaults = {
  idKey: 'knn-graph',
  dataset: 'crescents',
  columns: null,          // [xs, ys] or [bpd, hc, ac, fl]
  truth: null,
  k: 5,
  showTruth: false,
  note: '',
  labels_: { title: 'who is near whom. no seed, no restart, one answer.' },
};

export const posterState = null;

export const controls = [
  // Named "neighbours", never a bare k. Lesson 4's k counted groups.
  { id: 'k', kind: 'slider', label: 'how many neighbours (k)', min: 1, max: 30, step: 1 },
  { id: 'showTruth', kind: 'toggle', label: 'show the true groups', on: true, off: false, needsTruth: true },
  { id: 'use-blobs', kind: 'action', label: 'blobs' },
  { id: 'use-crescents', kind: 'action', label: 'crescents' },
  { id: 'use-uniform', kind: 'action', label: 'uniform' },
  { id: 'use-biometry', kind: 'action', label: 'biometry' },
];

const cfgOf = st => DATASETS[st.dataset] || DATASETS.crescents;

// The rows the GRAPH sees: every column, standardized where the columns are in
// different units.
export function rowsOf(st) {
  const cfg = cfgOf(st);
  const cols = cfg.standardize ? zscoreColumns(st.columns) : null;
  if (cols) return cols;
  const n = st.columns[0].length, out = [];
  for (let i = 0; i < n; i++) out.push(st.columns.map(c => c[i]));
  return out;
}

// The coordinates the points are DRAWN at. Two of the same rows the graph saw,
// so an edge always joins the two dots it belongs to.
export function positionsOf(st) {
  const [a, b] = cfgOf(st).pos;
  return rowsOf(st).map(r => [r[a], r[b]]);
}

export function graphOf(st) { return fuzzyGraph(rowsOf(st), st.k); }

export function setDataset(st, dataset, { columns, truth = null }) {
  const cfg = DATASETS[dataset];
  return { dataset, columns, truth, k: cfg.k, note: cfg.note };
}

export function applyControl(st, id, value) { return { [id]: value }; }
export function applyDrag() { return {}; }

// ---------------------------------------------------------------- render

const W = 640, H = 460;
const PLOT = { x0: 40, y0: 62, x1: W - 40, y1: H - 52 };

// Membership strength as ink weight. Linear in the weight, floored so the
// weakest edge is still visible - an edge drawn at zero width is an edge the
// reader never sees, and the whole point is that weak edges exist.
const EDGE_MIN = 0.35, EDGE_MAX = 2.2;

export function render(state) {
  const st = { ...defaults, ...state };
  const { idKey } = st;
  const id = s => `sb-${idKey}-${s}`;
  const P = positionsOf(st);
  const g = graphOf(st);
  const frame = isoFrame(P.map(p => p[0]), P.map(p => p[1]), PLOT);

  const wMax = Math.max(...g.weight), wMin = Math.min(...g.weight);
  const span = wMax - wMin || 1;
  const widthOf = w => F(EDGE_MIN + ((w - wMin) / span) * (EDGE_MAX - EDGE_MIN));

  const parts = [];
  parts.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="'IBM Plex Sans', Arial, sans-serif">`);
  parts.push(`<title>The k-nearest-neighbour graph of ${P.length} points at ${st.k} neighbours each, drawn as ${g.head.length} lines whose thickness is how strongly the two points count as neighbours. The graph does not depend on any random seed.</title>`);
  parts.push(`<defs><clipPath id="${id('clip')}"><rect x="${PLOT.x0}" y="${PLOT.y0}" width="${F(PLOT.x1 - PLOT.x0)}" height="${F(PLOT.y1 - PLOT.y0)}"/></clipPath></defs>`);

  parts.push(`<text x="${PLOT.x0}" y="26" font-size="14" fill="var(--text)" font-family="'IBM Plex Serif', Georgia, serif" font-style="italic">${st.labels_.title}</text>`);
  parts.push(`<text data-role="count" x="${PLOT.x0}" y="46" font-size="12.5" fill="var(--heading)">${st.k} neighbours each, ${g.head.length} lines. change the slider and this is the only thing that moves.</text>`);

  parts.push(`<rect x="${PLOT.x0}" y="${PLOT.y0}" width="${F(PLOT.x1 - PLOT.x0)}" height="${F(PLOT.y1 - PLOT.y0)}" fill="none" stroke="var(--border)" stroke-width="1.5"/>`);
  parts.push(`<g clip-path="url(#${id('clip')})">`);

  // Edges first, so every point sits on top of its own lines.
  for (let e = 0; e < g.head.length; e++) {
    const i = g.head[e], j = g.tail[e];
    parts.push(`<line data-role="edge" x1="${F(frame.x(P[i][0]))}" y1="${F(frame.y(P[i][1]))}" x2="${F(frame.x(P[j][0]))}" y2="${F(frame.y(P[j][1]))}" stroke="var(--ink)" stroke-width="${widthOf(g.weight[e])}"/>`);
  }

  for (let i = 0; i < P.length; i++) {
    const cx = frame.x(P[i][0]), cy = frame.y(P[i][1]);
    const kind = st.showTruth && st.truth ? markFor(st.truth[i]) : 'circle';
    const { d, filled } = markPath(kind, cx, cy, 2.6);
    parts.push(`<path data-role="pt" d="${d}" ${filled ? `fill="var(--heading)"` : `fill="none" stroke="var(--heading)" stroke-width="1.3"`}/>`);
  }
  parts.push(`</g>`);

  // st.note is what setDataset stashes for a caller that only reads state; a
  // state built by hand (as the tests do) never populates it, so fall back to
  // the same DATASETS note setDataset would have copied. Either way it is the
  // one place the reader is told the biometry graph saw four columns, not two.
  const note = st.note || cfgOf(st).note;
  if (note) parts.push(`<text data-role="note" x="${PLOT.x0}" y="${H - 14}" font-size="11" fill="var(--text-light)">${note}</text>`);
  parts.push(`</svg>`);
  return parts.join('\n');
}
