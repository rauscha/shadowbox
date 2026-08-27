// layout-play - stage two, and the part with the seed. The same "start from a
// guess and improve" idiom lesson 4 introduced, now with no visible truth to
// check the answer against.
//
// Runs live. 96 ms is a whole 200-epoch run on the largest committed dataset, so
// one epoch per Play tick is far inside budget and nothing is precomputed. The
// Play loop is hydrate.mjs's, unchanged: step(state) returns a partial, and an
// empty partial means the run is over. Spec §2(a) and §9.
//
// The trajectory is kept rather than thrown away, because the epoch scrubber has
// to be able to go back to the noise the layout started from. 200 epochs of 350
// points is about a megabyte, which is cheap and is not shipped - it is built in
// the reader's browser.
//
// Pure: render(state) -> SVG string. step(state) -> partial state.

import { fuzzyGraph, fitAB, epochsPerSample, randomInit, optimizeEpoch } from '../math/umap.mjs';
import { mulberry32 } from '../math/core.mjs';
import { zscoreColumns } from '../math/kmeans.mjs';
import { isoFrame, F } from '../lib/frame.mjs';
import { markPath, markFor } from '../lib/marks.mjs';

export const name = 'layout-play';
export const N_EPOCHS = 200;
export const INITIAL_ALPHA = 1.0;
export const NEG_SAMPLE_RATE = 5;

export const DATASETS = {
  blobs:     { standardize: false, note: '150 generated points, three blobs' },
  crescents: { standardize: false, note: '150 generated points, two crescents' },
  uniform:   { standardize: false, note: '150 generated points, no structure at all' },
  biometry:  { standardize: true,  note: '350 simulated scans, four measurements' },
};

export const defaults = {
  idKey: 'layout-play',
  dataset: 'blobs',
  columns: null, truth: null,
  k: 15,
  minDist: 0.1, spread: 1.0,
  seed: 1,
  run: null,            // {graph, a, b, eps, eons, eopns, rng} - never serialized
  frames: null,         // the trajectory so far; frames[0] is the raw initialisation
  view: 0,              // which epoch is on screen
  play: false,
  showTruth: false,
  note: '',
  labels_: { title: 'press Play. it starts as noise, every time.' },
};

export const posterState = null;

export const controls = [
  { id: 'play', kind: 'toggle', label: 'Play', on: true, off: false },
  { id: 'stepOnce', kind: 'action', label: 'Step' },
  { id: 'reset', kind: 'action', label: 'Start over from a new seed' },
  { id: 'k', kind: 'slider', label: 'how many neighbours (k)', min: 2, max: 50, step: 1 },
  { id: 'view', kind: 'slider', label: 'epoch', min: 0, max: N_EPOCHS, step: 1 },
  { id: 'showTruth', kind: 'toggle', label: 'show the true groups', on: true, off: false, needsTruth: true },
  { id: 'use-blobs', kind: 'action', label: 'blobs' },
  { id: 'use-crescents', kind: 'action', label: 'crescents' },
  { id: 'use-uniform', kind: 'action', label: 'uniform' },
  { id: 'use-biometry', kind: 'action', label: 'biometry' },
];

const cfgOf = st => DATASETS[st.dataset] || DATASETS.blobs;

export function rowsOf(st) {
  const cfg = cfgOf(st);
  if (cfg.standardize) return zscoreColumns(st.columns);
  const n = st.columns[0].length, out = [];
  for (let i = 0; i < n; i++) out.push(st.columns.map(c => c[i]));
  return out;
}

// Builds everything the optimiser carries between epochs. Called on load, on a
// reset, and on any control that sits upstream of the whole run.
export function start(st, seed = st.seed) {
  const X = rowsOf(st);
  const rng = mulberry32(seed);
  const graph = fuzzyGraph(X, st.k);
  const { a, b } = fitAB(st.minDist, st.spread);
  const eps = epochsPerSample(graph.weight, N_EPOCHS);
  return {
    seed,
    run: { graph, a, b, eps, eons: eps.slice(), eopns: eps.map(v => v / NEG_SAMPLE_RATE), rng },
    frames: [randomInit(X.length, rng)],
    view: 0,
    play: false,
  };
}

// One epoch. Returns {} when the run is exhausted - hydrate.mjs reads an empty
// partial as "stop", and must not be taught what "converged" means here, because
// this run does not converge, it runs out.
export function step(st) {
  const done = st.frames.length - 1;
  if (done >= N_EPOCHS) return {};
  const Y = st.frames[done].map(p => p.slice());
  const r = st.run;
  optimizeEpoch(Y, r.graph, {
    a: r.a, b: r.b, gamma: 1.0, negativeSampleRate: NEG_SAMPLE_RATE,
    alpha: INITIAL_ALPHA * (1 - done / N_EPOCHS),
    epoch: done, eps: r.eps, eons: r.eons, eopns: r.eopns, rng: r.rng,
  });
  return { frames: [...st.frames, Y], view: done + 1 };
}

export function applyControl(st, id, value) {
  // The scrubber only chooses which computed epoch to draw. It never recomputes,
  // which is why spec §11 calls it free.
  if (id === 'view') return { view: Math.max(0, Math.min(value, st.frames.length - 1)) };
  // Everything else here sits upstream of the entire run: a half-updated state
  // is one no sequence of Steps could have produced.
  if (['k', 'minDist', 'spread'].includes(id)) {
    const next = { ...st, [id]: value };
    return { [id]: value, ...start(next, st.seed) };
  }
  return { [id]: value };
}

export function setDataset(st, dataset, { columns, truth = null }) {
  const cfg = DATASETS[dataset];
  const next = { ...st, dataset, columns, truth };
  return { dataset, columns, truth, note: cfg.note, ...start(next, st.seed) };
}

export function applyDrag() { return {}; }

// ---------------------------------------------------------------- render

const W = 640, H = 460;
const PLOT = { x0: 40, y0: 66, x1: W - 40, y1: H - 52 };

export function render(state) {
  const st = { ...defaults, ...state };
  const { idKey } = st;
  const id = s => `sb-${idKey}-${s}`;
  const Y = st.frames[Math.max(0, Math.min(st.view, st.frames.length - 1))];
  const frame = isoFrame(Y.map(p => p[0]), Y.map(p => p[1]), PLOT);

  const parts = [];
  parts.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="'IBM Plex Sans', Arial, sans-serif">`);
  parts.push(`<title>A UMAP layout of ${Y.length} points after ${st.view} of ${N_EPOCHS} epochs, starting from random noise. The two axes have no meaning; only which points ended up near which others does.</title>`);
  parts.push(`<defs><clipPath id="${id('clip')}"><rect x="${PLOT.x0}" y="${PLOT.y0}" width="${F(PLOT.x1 - PLOT.x0)}" height="${F(PLOT.y1 - PLOT.y0)}"/></clipPath></defs>`);

  parts.push(`<text x="${PLOT.x0}" y="26" font-size="14" fill="var(--text)" font-family="'IBM Plex Serif', Georgia, serif" font-style="italic">${st.labels_.title}</text>`);
  parts.push(`<text data-role="epoch" x="${PLOT.x0}" y="46" font-size="12.5" fill="var(--heading)">epoch ${st.view} of ${N_EPOCHS}, seed ${st.seed}</text>`);
  // Said on the figure, not only in the prose: the axes are wherever the
  // optimiser stopped. Spec §8's last refusal.
  parts.push(`<text data-role="axes-warning" x="${PLOT.x0}" y="62" font-size="11" fill="var(--text-light)">neither axis means anything. only nearness does.</text>`);

  parts.push(`<rect x="${PLOT.x0}" y="${PLOT.y0}" width="${F(PLOT.x1 - PLOT.x0)}" height="${F(PLOT.y1 - PLOT.y0)}" fill="none" stroke="var(--border)" stroke-width="1.5"/>`);
  parts.push(`<g clip-path="url(#${id('clip')})">`);
  for (let i = 0; i < Y.length; i++) {
    const kind = st.showTruth && st.truth ? markFor(st.truth[i]) : 'circle';
    const { d, filled } = markPath(kind, frame.x(Y[i][0]), frame.y(Y[i][1]), 2.8);
    parts.push(`<path data-role="pt" d="${d}" ${filled ? `fill="var(--heading)"` : `fill="none" stroke="var(--heading)" stroke-width="1.3"`}/>`);
  }
  parts.push(`</g>`);

  if (st.note) parts.push(`<text data-role="note" x="${PLOT.x0}" y="${H - 14}" font-size="11" fill="var(--text-light)">${st.note}</text>`);
  parts.push(`</svg>`);
  return parts.join('\n');
}
