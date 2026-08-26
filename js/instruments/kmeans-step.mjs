// kmeans-step - the mechanism, and only the mechanism. One click of Step is one
// half-step: assign redraws membership with the centers frozen, recompute moves
// the centers with membership frozen. Andrew ruled on this 2026-08-25, and it
// doubles the clicks to convergence on purpose, because the two moves being
// separable IS the algorithm.
// Membership is shape, never hue. The partition is a heavy outline traced from
// the label field. k caps at 6, the shape budget.
// Pure: render(state) -> SVG string. step(state) -> partial state.

import { mulberry32 } from '../math/core.mjs';
import {
  startState, kmeansStep, totalSquaredDistance, zscoreColumns,
} from '../math/kmeans.mjs';
import { markPath, markFor, partitionSegments, MAX_MARKS } from '../lib/marks.mjs';
import { isoFrame, F } from '../lib/frame.mjs';

export const name = 'kmeans-step';

// Each dataset carries the k the spec chose for it, and whether it is 2D raw or
// standardized. births and biometry are standardized because their columns are
// in different units; the synthetic sets are already on one scale.
export const DATASETS = {
  blobs:     { k: 3, standardize: false, note: '150 generated points, three blobs' },
  crescents: { k: 2, standardize: false, note: '150 generated points, two crescents' },
  uniform:   { k: 3, standardize: false, note: '150 generated points, no structure at all' },
  births:    { k: 3, standardize: true,  note: '400 births, gestational age against birthweight' },
  biometry:  { k: 3, standardize: true,  note: '350 simulated scans, head circumference against abdominal circumference' },
};

export const defaults = {
  idKey: 'kmeans-step',
  dataset: 'blobs',
  xs: null, ys: null, truth: null,
  k: 3,
  plusplus: false,
  seed: 1,
  centers: null, labels: null, phase: 'assign', iter: 0, done: false,
  showTruth: false, showWall: true, play: false,
  labels_: { title: 'press Step. watch which half of the algorithm moves.' },
};

export const posterState = null;      // set per page in tools/poster.mjs

export const controls = [
  { id: 'k', kind: 'slider', label: 'how many groups (k)', min: 2, max: MAX_MARKS, step: 1 },
  { id: 'step', kind: 'action', label: 'Step' },
  { id: 'play', kind: 'toggle', label: 'Play', on: true, off: false },
  { id: 'reset', kind: 'action', label: 'Start over from new centers' },
  { id: 'plusplus', kind: 'toggle', label: 'seed the centers far apart (k-means++)', on: true, off: false },
  { id: 'showTruth', kind: 'toggle', label: 'show the true groups', on: true, off: false, needsTruth: true },
  { id: 'showWall', kind: 'toggle', label: 'show the boundary', on: true, off: false },
  // Five named buttons rather than a slider over a categorical. hydrate supports
  // slider, toggle and action only, and five buttons are keyboard-operable for
  // free. The page wires each to setDataset.
  { id: 'use-blobs', kind: 'action', label: 'blobs' },
  { id: 'use-crescents', kind: 'action', label: 'crescents' },
  { id: 'use-uniform', kind: 'action', label: 'uniform' },
  { id: 'use-births', kind: 'action', label: 'births' },
  { id: 'use-biometry', kind: 'action', label: 'biometry' },
];

// The rows the algorithm actually sees. Kept out of the store so state stays
// small and serializable; derived the same way by render, step and the tests.
export function rowsOf(st) {
  const cfg = DATASETS[st.dataset] || DATASETS.blobs;
  return cfg.standardize ? zscoreColumns([st.xs, st.ys]) : st.xs.map((x, i) => [x, st.ys[i]]);
}

export function restart(st, seed = st.seed) {
  const X = rowsOf(st);
  const s = startState(X, st.k, mulberry32(seed), { plusplus: st.plusplus === true });
  return { seed, centers: s.centers, labels: s.labels, phase: 'assign', iter: 0, done: false, play: false };
}

// The instrument never fetches, so the caller hands the new data in. Taking it
// as an explicit argument rather than reading it off st is what makes this
// correct: restart() derives its rows from the state it is given, and a state
// still holding the OLD xs / ys would seed the new run from the old cloud.
export function setDataset(st, dataset, { xs, ys, truth = null }) {
  const cfg = DATASETS[dataset];
  const next = { ...st, dataset, k: cfg.k, xs, ys, truth };
  return { dataset, k: cfg.k, xs, ys, truth, ...restart(next) };
}

export function applyControl(st, id, value) {
  // k, the seeding rule and the data are all upstream of the whole run, so
  // changing any of them starts over rather than leaving a half-updated state
  // that no sequence of Steps could have produced.
  if (id === 'k' || id === 'plusplus') {
    const next = { ...st, [id]: value };
    return { [id]: value, ...restart(next) };
  }
  return { [id]: value };
}

// Returns an empty partial when there is nothing left to do, which is how the
// Play loop learns to stop. The guard is done AND phase 'assign', not done
// alone: done is raised during the assign half-step, and the trailing update
// half-step still has to run, exactly as kmeansRun does. Guarding on done alone
// would leave the instrument resting one half-step short of the centers the
// claims test computes, so the page and the tests would disagree about where
// the algorithm ends up.
export function step(st) {
  if (st.done && st.phase === 'assign') return {};
  const s = kmeansStep({ X: rowsOf(st), k: st.k, centers: st.centers, labels: st.labels, phase: st.phase, iter: st.iter, done: st.done });
  return { centers: s.centers, labels: s.labels, phase: s.phase, iter: s.iter, done: s.done };
}

export function stats(st) {
  const X = rowsOf(st);
  const assigned = st.labels && st.labels.some(l => l >= 0);
  return {
    X, k: st.k, centers: st.centers, labels: st.labels,
    phase: st.phase, iter: st.iter, done: st.done, assigned,
    cost: assigned ? totalSquaredDistance(X, st.labels, st.centers) : null,
  };
}

// ---------------------------------------------------------------- render

// W/H/MARGIN match the isotropic layout used across the site (units-trap,
// axis-projector): a plot on the left, a narrow column on the right. Nothing
// here draws ticks or axis names - this figure is the mechanism, not the
// numbers on either axis, and every reader-facing sentence below needs the
// full canvas width anyway (PHASE_TEXT.update alone runs 82 characters, far
// more than a 200px column could hold at a legible size).
const W = 640, H = 460;
const MARGIN = { l: 56, r: 200, t: 44, b: 48 };

// Fixed interaction copy, asserted character for character by the tests.
// Names the move about to happen, not the one just made: a reader who only
// ever sees "Step advances one half-step" learns nothing about which half
// comes next, which is the one thing this figure exists to teach.
const PHASE_TEXT = {
  fresh:  'press Step to assign every point to its nearest center',
  update: 'now press Step again to move each center to the middle of the points that chose it',
  assign: 'press Step to reassign every point to its nearest center',
  done:   'nothing moved on the last pass, so this is where it stops',
};

// Shared paint rule for every shaped mark on the page: filled kinds get a
// flat fill, the two stroke-only kinds (plus, cross) get a stroke instead.
// One rule, reused by points, centers and the legend, so all three always
// agree on how a shape reads.
const paint = (filled, color, strokeWidth = 1.6) =>
  filled ? `fill="${color}"` : `fill="none" stroke="${color}" stroke-width="${strokeWidth}"`;

export function render(state) {
  const st = { ...defaults, ...state };
  const { idKey } = st;
  const id = s => `sb-${idKey}-${s}`;
  const plot = { x0: MARGIN.l, y0: MARGIN.t, x1: W - MARGIN.r, y1: H - MARGIN.b };
  const S = stats(st);
  const frame = isoFrame(S.X.map(r => r[0]), S.X.map(r => r[1]), plot);
  const parts = [];

  parts.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="'IBM Plex Sans', Arial, sans-serif">`);
  parts.push(`<title>One click of Step runs one half of k-means: assign every point to its nearest center with the centers frozen, or move every center to the middle of the points that chose it with membership frozen, never both at once.</title>`);
  parts.push(`<defs><clipPath id="${id('clip')}"><rect x="${plot.x0}" y="${plot.y0}" width="${plot.x1 - plot.x0}" height="${plot.y1 - plot.y0}"/></clipPath></defs>`);

  parts.push(`<rect x="${plot.x0}" y="${plot.y0}" width="${plot.x1 - plot.x0}" height="${plot.y1 - plot.y0}" fill="none" stroke="var(--border)" stroke-width="1.5"/>`);
  parts.push(`<text x="${plot.x0}" y="26" font-size="14" fill="var(--text)" font-family="'IBM Plex Serif', Georgia, serif" font-style="italic">${st.labels_.title}</text>`);

  parts.push(`<g clip-path="url(#${id('clip')})">`);

  // partition wall: the heaviest mark on the page, drawn first so everything
  // that identifies a point or a center sits visibly on top of it.
  if (S.assigned && st.showWall) {
    for (const [wx0, wy0, wx1, wy1] of partitionSegments(st.centers, frame, { n: 56 })) {
      parts.push(`<line data-role="wall" x1="${wx0}" y1="${wy0}" x2="${wx1}" y2="${wy1}" stroke="var(--ink)" stroke-width="2.5"/>`);
    }
  }

  // true-group rings: a neutral marker behind each point. Deliberately not
  // shaped by the true label - membership's shape channel is spoken for, and
  // a second shape here would compete with it rather than support it.
  if (st.showTruth && st.truth) {
    for (let i = 0; i < S.X.length; i++) {
      parts.push(`<circle data-role="truth-ring" cx="${F(frame.x(S.X[i][0]))}" cy="${F(frame.y(S.X[i][1]))}" r="5" fill="none" stroke="var(--border)"/>`);
    }
  }

  // every point: unassigned draws a small plain dot; assigned draws its
  // cluster's shape at full size. Shape is the only channel that ever carries
  // membership, so an unassigned point looks deliberately unshaped, not just
  // differently colored.
  for (let i = 0; i < S.X.length; i++) {
    const cx = frame.x(S.X[i][0]), cy = frame.y(S.X[i][1]);
    const label = st.labels ? st.labels[i] : -1;
    if (label >= 0) {
      const kind = markFor(label);
      const { d, filled } = markPath(kind, cx, cy, 4.5);
      parts.push(`<path data-role="pt" data-cluster="${label}" data-mark="${kind}" d="${d}" ${paint(filled, 'var(--heading)')}/>`);
    } else {
      const { d } = markPath('circle', cx, cy, 3);
      parts.push(`<path data-role="pt" data-cluster="-1" data-mark="circle" d="${d}" fill="var(--text-light)"/>`);
    }
  }

  // centers: the same shape as their cluster, larger, with a background-colored
  // halo drawn first so the ink outline still reads sitting on top of a crowd
  // of its own members drawn in the same shape.
  for (let j = 0; j < st.k; j++) {
    const cx = frame.x(st.centers[j][0]), cy = frame.y(st.centers[j][1]);
    const kind = markFor(j);
    const { d, filled } = markPath(kind, cx, cy, 9);
    parts.push(`<path d="${d}" fill="${filled ? 'var(--bg)' : 'none'}" stroke="var(--bg)" stroke-width="7"/>`);
    parts.push(`<path data-role="center" data-cluster="${j}" data-mark="${kind}" d="${d}" fill="${filled ? 'var(--heading)' : 'none'}" stroke="var(--ink)" stroke-width="3"/>`);
  }

  parts.push(`</g>`);

  // the interaction sentence: names the move about to happen, not the one
  // just made. It and the note both run the full canvas width below the plot
  // rather than the narrow legend column, because the longest of the four
  // fixed strings is 82 characters.
  const phaseKey = !S.assigned ? 'fresh' : st.done ? 'done' : st.phase;
  parts.push(`<text data-role="phase" x="32" y="424" font-size="12" fill="var(--heading)">${PHASE_TEXT[phaseKey]}</text>`);
  parts.push(`<text data-role="iter" x="32" y="440" font-size="11" fill="var(--text)">iteration ${st.iter}</text>`);
  const costText = S.cost === null ? 'not assigned yet' : `total squared distance ${S.cost.toFixed(1)}`;
  parts.push(`<text data-role="cost" x="166" y="440" font-size="11" fill="var(--text)">${costText}</text>`);
  const cfg = DATASETS[st.dataset] || DATASETS.blobs;
  if (cfg.note) parts.push(`<text data-role="note" x="32" y="454" font-size="11" fill="var(--text-light)">${cfg.note}</text>`);

  // legend: one row per cluster, the shape first so the count reads as that
  // shape's count. Always k rows, even before anything is assigned (n = 0).
  const panelX = plot.x1 + 20;
  parts.push(`<text x="${panelX}" y="60" font-size="11" fill="var(--text-light)">each group, by shape</text>`);
  for (let j = 0; j < st.k; j++) {
    const cy = 90 + j * 30;
    const kind = markFor(j);
    const { d, filled } = markPath(kind, panelX + 9, cy, 8);
    const count = st.labels ? st.labels.filter(l => l === j).length : 0;
    parts.push(`<g data-role="legend-mark">`);
    parts.push(`<path d="${d}" ${paint(filled, 'var(--heading)')}/>`);
    parts.push(`<text x="${panelX + 28}" y="${cy + 4}" font-size="12" fill="var(--text)">group ${j + 1}, n = ${count}</text>`);
    parts.push(`</g>`);
  }

  parts.push(`</svg>`);
  return parts.join('\n');
}

export function applyDrag() { return {}; }
