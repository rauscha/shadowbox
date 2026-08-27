// seed-roulette - the direct callback to restart-roulette. Six seeds, the same
// data, the same number of neighbours, drawn as six small multiples on one
// shared frame.
//
// This is where lesson 5's central honest claim lives, and it is the claim the
// measurements support most strongly: LOCAL structure is stable to the seed and
// GLOBAL structure is not. On biometry the local number moves by 0.009 across
// ten seeds while the global one moves by 0.379.
//
// Two design rules, both load-bearing:
//   - No panel is ranked and no panel wins. restart-roulette marks a cheapest
//     because k-means has a cost to be cheapest ON. Six embeddings have no such
//     ordering, and inventing one would teach that some seeds are right.
//   - The six panels must not read as instability theatre. The local numbers
//     barely move. What the six different-looking pictures show is that the
//     UNSTABLE part is the part you were never supposed to read. Spec §11.
//
// Pure: render(state) -> SVG string. No step().

import { umap } from '../math/umap.mjs';
import { knnRecall, distanceSpearman } from '../lib/embed-metrics.mjs';
import { zscoreColumns } from '../math/kmeans.mjs';
import { isoFrame, F } from '../lib/frame.mjs';
import { markPath, markFor } from '../lib/marks.mjs';

export const name = 'seed-roulette';
export const RUNS = 6;
export const N_EPOCHS = 200;
export const seedOf = i => i + 1;

export const DATASETS = {
  blobs:     { standardize: false, note: '150 generated points, three blobs' },
  crescents: { standardize: false, note: '150 generated points, two crescents' },
  uniform:   { standardize: false, note: '150 generated points, no structure at all' },
  biometry:  { standardize: true,  note: '350 simulated scans, four measurements' },
};

export const defaults = {
  idKey: 'seed-roulette',
  dataset: 'blobs',
  columns: null, truth: null,
  k: 15,
  showTruth: false,
  note: '',
  // States only what is always true: six seeds, same data, same neighbours.
  // Whether they agree is a fact about the runs, not a promise the title makes;
  // the line under it says what they actually did, computed, every time.
  labels_: { title: 'six seeds. same data, same neighbours.' },
};

export const posterState = null;

export const controls = [
  { id: 'k', kind: 'slider', label: 'how many neighbours (k)', min: 2, max: 50, step: 1 },
  { id: 'showTruth', kind: 'toggle', label: 'show the true groups', on: true, off: false, needsTruth: true },
  { id: 'use-blobs', kind: 'action', label: 'blobs' },
  { id: 'use-crescents', kind: 'action', label: 'crescents' },
  // The structureless square, one button away, because the honest failure has to
  // be reachable rather than merely described. Spec §8, ruled 2026-08-27.
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

export function panels(st) {
  const X = rowsOf(st);
  const out = [];
  for (let i = 0; i < RUNS; i++) {
    const seed = seedOf(i);
    const { Y } = umap(X, { k: st.k, seed, nEpochs: N_EPOCHS });
    out.push({
      seed, Y,
      local: knnRecall(X, Y, Math.min(st.k, 15)),
      global: distanceSpearman(X, Y),
    });
  }
  return out;
}

// Computed, never asserted. The title says only what is always true; this line
// says what these six actually did. restart-roulette learned the rule the hard
// way: a title promising six different answers while drawing six identical ones
// teaches the opposite of its point.
export function spreadText(ps) {
  const loc = ps.map(p => p.local), glo = ps.map(p => p.global);
  const ls = Math.max(...loc) - Math.min(...loc);
  const gs = Math.max(...glo) - Math.min(...glo);
  return `who is near whom moved by ${ls.toFixed(2)} across these six. how far apart things look moved by ${gs.toFixed(2)}.`;
}

export function setDataset(st, dataset, { columns, truth = null }) {
  return { dataset, columns, truth, note: DATASETS[dataset].note };
}

export function applyControl(st, id, value) { return { [id]: value }; }
export function applyDrag() { return {}; }

// ---------------------------------------------------------------- render

// Same grid as restart-roulette: three across, two down, one shared frame. Six
// layouts at six scales would not be a comparison - a reader would read a
// difference that is only a difference in zoom - so the frame is computed ONCE
// from every panel's coordinates pooled together, and nothing in the per-panel
// loop rescales.
const W = 640, H = 460;
const CELL_W = 196, CELL_H = 176, GUTTER = 12;
const GRID_X = 28, GRID_Y = 74;
const COLS = 3;
const LOCAL_PLOT = { x0: 6, y0: 20, x1: CELL_W - 6, y1: CELL_H - 20 };

export function render(state) {
  const st = { ...defaults, ...state };
  const { idKey } = st;
  const id = s => `sb-${idKey}-${s}`;
  const P = panels(st);

  // The one shared frame, pooled across all six layouts.
  const allX = [], allY = [];
  for (const p of P) for (const q of p.Y) { allX.push(q[0]); allY.push(q[1]); }
  const frame = isoFrame(allX, allY, LOCAL_PLOT);

  const parts = [];
  parts.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="'IBM Plex Sans', Arial, sans-serif">`);
  parts.push(`<title>Six UMAP layouts of the same data at the same number of neighbours, differing only in the random seed, drawn as six small pictures on one shared scale. Each is labelled with how much of the local neighbourhood survived and how well the distances between far-apart points survived.</title>`);
  parts.push(`<defs><clipPath id="${id('clip')}"><rect x="${LOCAL_PLOT.x0}" y="${LOCAL_PLOT.y0}" width="${LOCAL_PLOT.x1 - LOCAL_PLOT.x0}" height="${LOCAL_PLOT.y1 - LOCAL_PLOT.y0}"/></clipPath></defs>`);

  parts.push(`<text x="${GRID_X}" y="26" font-size="14" fill="var(--text)" font-family="'IBM Plex Serif', Georgia, serif" font-style="italic">${st.labels_.title}</text>`);
  parts.push(`<text data-role="spread" x="${GRID_X}" y="44" font-size="12.5" fill="var(--heading)">${spreadText(P)}</text>`);
  // The key. "near" and "far" are two numbers the reader meets for the first
  // time here, and neither is a colour, so the key is words rather than swatches.
  parts.push(`<text data-role="key" x="${GRID_X}" y="60" font-size="10.5" fill="var(--text-light)">near = how much of each point's own neighbourhood survived. far = how well the distances between far-apart points survived. both run 0 to 1.</text>`);

  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    const col = i % COLS, row = Math.floor(i / COLS);
    const gx = GRID_X + col * (CELL_W + GUTTER);
    const gy = GRID_Y + row * (CELL_H + GUTTER);
    const aria = `seed ${p.seed}, near ${p.local.toFixed(2)}, far ${p.global.toFixed(2)}`;

    // No rank, no winner glyph, no heavier frame. restart-roulette marks a
    // cheapest because k-means has a cost to be cheapest ON. Six embeddings have
    // no such ordering, and inventing one would teach that some seeds are right.
    parts.push(`<g data-role="panel" data-panel="${i}" data-seed="${p.seed}" role="img" aria-label="${aria}" transform="translate(${gx} ${gy})">`);
    parts.push(`<rect x="0" y="0" width="${CELL_W}" height="${CELL_H}" fill="none" stroke="var(--border)" stroke-width="1.5"/>`);
    parts.push(`<text data-role="panel-local" x="8" y="14" font-size="10.5" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--heading)">near ${p.local.toFixed(2)}</text>`);
    parts.push(`<text data-role="panel-global" x="${CELL_W - 8}" y="14" text-anchor="end" font-size="10.5" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--heading)">far ${p.global.toFixed(2)}</text>`);

    parts.push(`<g clip-path="url(#${id('clip')})">`);
    for (let j = 0; j < p.Y.length; j++) {
      const kind = st.showTruth && st.truth ? markFor(st.truth[j]) : 'circle';
      const { d, filled } = markPath(kind, frame.x(p.Y[j][0]), frame.y(p.Y[j][1]), 1.9);
      parts.push(`<path data-role="pt" d="${d}" ${filled ? `fill="var(--heading)"` : `fill="none" stroke="var(--heading)" stroke-width="1"`}/>`);
    }
    parts.push(`</g>`);
    parts.push(`<text data-role="panel-seed" x="8" y="${CELL_H - 6}" font-size="10" fill="var(--text)">seed ${p.seed}</text>`);
    parts.push(`</g>`);
  }

  if (st.note) parts.push(`<text data-role="note" x="${GRID_X}" y="${H - 8}" font-size="11" fill="var(--text-light)">${st.note}</text>`);
  parts.push(`</svg>`);
  return parts.join('\n');
}
