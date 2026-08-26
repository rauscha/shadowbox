// restart-roulette - the same question, six different answers. Six random
// initializations of the same data at the same k, as small multiples, each
// labelled with its own cost and ranked. The cheapest is marked with a drawn
// glyph and heavier weight, never with a colour.
// Three datasets, three genuinely different behaviours: blobs where the answers
// diverge loudly, crescents where every answer agrees and every answer is wrong,
// uniform where there is nothing to find and the answers scatter anyway.
// Pure: render(state) -> SVG string. No step(); only kmeans-step animates.

import { mulberry32 } from '../math/core.mjs';
import { kmeansRun, purity as purityOf, zscoreColumns } from '../math/kmeans.mjs';
import { markPath, markFor, partitionSegments, MAX_MARKS } from '../lib/marks.mjs';
import { isoFrame, F } from '../lib/frame.mjs';

export const name = 'restart-roulette';

export const RUNS = 6;
// Seeds 1 to 6, and the choice was measured rather than picked.
//
// The claims table's sweep uses mulberry32(s * 7919) over 60 seeds, where 5
// distinct optima appear and 15 percent of starts land on a bad one. Taking the
// first six of THAT scheme gives six identical panels: all 89.67. A figure
// built to show that six restarts can land on different answers, but that
// draws six identical ones instead, teaches the opposite of its point.
//
// Plain seeds 1 to 6 give five starts at 89.67 and one at 506.8. One wrong in
// six is 17 percent against a measured 15 percent, so this display sample
// reports the real rate rather than dramatising it, which is what spec §11 warns
// against. The claims table's sweep scheme is separate and unchanged; this is
// the six panels the reader sees, and the test pins the one-in-six rate so a
// drift in either direction fails loudly.
export const seedOf = i => i + 1;

export const defaults = {
  idKey: 'restart-roulette',
  dataset: 'blobs',
  xs: null, ys: null, truth: null,
  k: 3,
  plusplus: false,
  // Explicit, not left undefined. The three synthetic sets are already on one
  // scale, so this stays false for every configuration the page uses; naming it
  // here stops rowsOf reading an absent field.
  standardize: false,
  note: '',
  // States only what is always true: six starts, same data, same k. Whether
  // they agree is a fact about the run, not a promise the title gets to make;
  // the agreement line below states that, computed, every time.
  labels_: { title: 'six starts. same data, same k.' },
};

export const posterState = null;

export const controls = [
  { id: 'k', kind: 'slider', label: 'how many groups (k)', min: 2, max: MAX_MARKS, step: 1 },
  { id: 'plusplus', kind: 'toggle', label: 'seed the centers far apart (k-means++)', on: true, off: false },
  { id: 'use-blobs', kind: 'action', label: 'blobs' },
  { id: 'use-crescents', kind: 'action', label: 'crescents' },
  { id: 'use-uniform', kind: 'action', label: 'uniform' },
];

function rowsOf(st) {
  return st.standardize ? zscoreColumns([st.xs, st.ys]) : st.xs.map((x, i) => [x, st.ys[i]]);
}

export function panels(st) {
  const X = rowsOf(st);
  const runs = [];
  for (let i = 0; i < RUNS; i++) {
    const seed = seedOf(i);
    const r = kmeansRun(X, st.k, mulberry32(seed), { plusplus: st.plusplus === true });
    runs.push({
      seed, centers: r.centers, labels: r.labels, cost: r.wcss,
      purity: st.truth ? purityOf(r.labels, st.truth, st.k) : null,
      rank: 0,
    });
  }
  // Rank 1 is cheapest. Ties keep panel order, so the ranking is deterministic.
  [...runs].map((r, i) => ({ r, i }))
    .sort((a, b) => a.r.cost - b.r.cost || a.i - b.i)
    .forEach((o, n) => { o.r.rank = n + 1; });
  return runs;
}

// How many DIFFERENT answers the six starts actually found. Canonical form
// relabels by first appearance, so a pure renumbering of the same partition
// collapses to one. That matters: on blobs with ++ seeding the six panels carry
// three distinct raw label vectors but only ONE distinct partition, so counting
// raw vectors would report disagreement that is not there.
// Measured: blobs random 2, blobs ++ 1, crescents ++ 4, uniform 6.
export function distinctAnswers(runs) {
  const canon = labels => {
    const m = new Map();
    return labels.map(v => { if (!m.has(v)) m.set(v, m.size); return m.get(v); }).join(',');
  };
  return new Set(runs.map(r => canon(r.labels))).size;
}

// The figure reports what it found rather than asserting a headline, the same
// way elbow's verdict does. The title used to promise "six answers" while
// drawing five identical ones and a sixth, which is the overselling spec §11
// forbids.
export function agreementText(runs) {
  const n = distinctAnswers(runs);
  return n === 1
    ? 'all six starts found the same answer'
    : `these six starts found ${n} different answers`;
}

export function applyControl(st, id, value) { return { [id]: value }; }
export function applyDrag() { return {}; }

// ---------------------------------------------------------------- render

// Six panels, three across and two down, each the same size so one isoFrame,
// computed once from the whole dataset, is reused for every panel: only the
// outer <g transform="translate(...)"> differs. Six pictures at six scales
// would not be a comparison, so nothing here lets a panel rescale to its own
// answer.
const W = 640, H = 460;
const CELL_W = 196, CELL_H = 176, GUTTER = 12;
const GRID_X = 28, GRID_Y = 62;
const COLS = 3;
// Local, panel-relative plot rectangle: 6px on the sides, room at top for the
// rank/cost line and at bottom for the purity line, so the isoFrame's usable
// side is identical for all six panels regardless of what each one has to say.
const LOCAL_PLOT = { x0: 6, y0: 20, x1: CELL_W - 6, y1: CELL_H - 20 };

// Same paint rule as kmeans-step: filled kinds get a flat fill, the two
// stroke-only kinds (plus, cross) get a stroke instead.
const paint = (filled, color, strokeWidth = 1.1) =>
  filled ? `fill="${color}"` : `fill="none" stroke="${color}" stroke-width="${strokeWidth}"`;

export function render(state) {
  const st = { ...defaults, ...state };
  const { idKey } = st;
  const id = s => `sb-${idKey}-${s}`;
  const X = rowsOf(st);
  const P = panels(st);

  // The one shared frame. Computed once, from the whole dataset, and reused
  // by every panel below; nothing in the per-panel loop calls isoFrame again.
  const frame = isoFrame(X.map(r => r[0]), X.map(r => r[1]), LOCAL_PLOT);

  const parts = [];
  parts.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="'IBM Plex Sans', Arial, sans-serif">`);
  parts.push(`<title>Six random restarts of k-means on the same data at the same k, drawn as six small partitions ranked cheapest to costliest. The cheapest is marked with a heavier frame and a drawn glyph, never a colour.</title>`);
  parts.push(`<defs><clipPath id="${id('clip')}"><rect x="${LOCAL_PLOT.x0}" y="${LOCAL_PLOT.y0}" width="${LOCAL_PLOT.x1 - LOCAL_PLOT.x0}" height="${LOCAL_PLOT.y1 - LOCAL_PLOT.y0}"/></clipPath></defs>`);

  parts.push(`<text x="${GRID_X}" y="26" font-size="14" fill="var(--text)" font-family="'IBM Plex Serif', Georgia, serif" font-style="italic">${st.labels_.title}</text>`);

  // Computed, not asserted: the title only states what is always true (six
  // starts, same data, same k), and this line reports what they actually found.
  parts.push(`<text data-role="agreement" x="${GRID_X}" y="44" font-size="12.5" fill="var(--heading)">${agreementText(P)}</text>`);

  for (let i = 0; i < P.length; i++) {
    const p = P[i];
    const isBest = p.rank === 1;
    const col = i % COLS, row = Math.floor(i / COLS);
    const gx = GRID_X + col * (CELL_W + GUTTER);
    const gy = GRID_Y + row * (CELL_H + GUTTER);
    const aria = `start ${i + 1}, cost ${p.cost.toFixed(1)}${isBest ? ', the cheapest of the six' : ''}`;

    parts.push(`<g data-role="panel" data-panel="${i}" data-seed="${p.seed}" data-rank="${p.rank}" tabindex="0" role="button" aria-label="${aria}" transform="translate(${gx} ${gy})">`);

    // panel frame: the winner gets a heavier, darker outline. Never a colour
    // change, only weight, so the mark still reads for a colorblind reader.
    parts.push(`<rect x="0" y="0" width="${CELL_W}" height="${CELL_H}" fill="none" stroke="${isBest ? 'var(--ink)' : 'var(--border)'}" stroke-width="${isBest ? 3 : 1.5}"/>`);

    parts.push(`<text data-role="panel-rank" x="8" y="14" font-size="11" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--heading)">#${p.rank}</text>`);
    parts.push(`<text data-role="panel-cost" x="${CELL_W - 8}" y="14" text-anchor="end" font-size="11" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--heading)">${p.cost.toFixed(1)}</text>`);

    parts.push(`<g clip-path="url(#${id('clip')})">`);

    // partition wall first, so every point and center drawn after it stays on top.
    // n=32 rather than kmeans-step's 56: the panel is a fraction of the size.
    for (const [wx0, wy0, wx1, wy1] of partitionSegments(p.centers, frame, { n: 32 })) {
      parts.push(`<line data-role="wall" x1="${wx0}" y1="${wy0}" x2="${wx1}" y2="${wy1}" stroke="var(--ink)" stroke-width="1.5"/>`);
    }

    // every point, shaped by this panel's own labels. Same 150 positions in
    // every panel; only which shape each one wears changes run to run. No
    // data-cluster / data-mark here: nothing reads a single point back out of
    // this poster, and the contract asks only for the role, so the attribute
    // the reader never queries stays off 900 elements.
    for (let j = 0; j < X.length; j++) {
      const cx = frame.x(X[j][0]), cy = frame.y(X[j][1]);
      const kind = markFor(p.labels[j]);
      const { d, filled } = markPath(kind, cx, cy, 2.2);
      parts.push(`<path data-role="pt" d="${d}" ${paint(filled, 'var(--heading)')}/>`);
    }

    // centers: same shape as their cluster, larger, with a background halo so
    // the outline still reads sitting on a crowd of its own members.
    for (let j = 0; j < p.centers.length; j++) {
      const cx = frame.x(p.centers[j][0]), cy = frame.y(p.centers[j][1]);
      const kind = markFor(j);
      const { d, filled } = markPath(kind, cx, cy, 5);
      parts.push(`<path d="${d}" fill="${filled ? 'var(--bg)' : 'none'}" stroke="var(--bg)" stroke-width="4"/>`);
      parts.push(`<path data-role="center" d="${d}" fill="${filled ? 'var(--heading)' : 'none'}" stroke="var(--ink)" stroke-width="2.5"/>`);
    }

    parts.push(`</g>`);

    if (st.truth) {
      parts.push(`<text data-role="panel-purity" x="8" y="${CELL_H - 6}" font-size="10" fill="var(--text)">${Math.round(100 * p.purity)}% right</text>`);
    }

    // the cheapest panel, marked a second and third way: a filled glyph plus
    // the word itself, on an opaque chip so it reads over the point cloud
    // beneath it. Shape and words carry this, never colour.
    if (isBest) {
      const bx = CELL_W - 96, by = CELL_H - 30;
      parts.push(`<g data-role="panel-best-mark">`);
      parts.push(`<rect x="${bx}" y="${by}" width="90" height="20" fill="var(--bg)"/>`);
      const glyph = markPath('triangle', bx + 10, by + 10, 6);
      parts.push(`<path d="${glyph.d}" fill="var(--heading)"/>`);
      parts.push(`<text x="${bx + 22}" y="${by + 14}" font-size="10.5" fill="var(--heading)">cheapest</text>`);
      parts.push(`</g>`);
    }

    parts.push(`</g>`);
  }

  if (st.note) parts.push(`<text data-role="note" x="${GRID_X}" y="${H - 10}" font-size="11" fill="var(--text-light)">${st.note}</text>`);

  parts.push(`</svg>`);
  return parts.join('\n');
}
