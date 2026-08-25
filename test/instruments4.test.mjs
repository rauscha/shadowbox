// Render and geometry tests for the four lesson-4 instruments, plus the shared
// marks module. Same shape as test/instruments3.test.mjs: assert on data-role
// attributes so the tests describe what the reader sees rather than how the SVG
// string happens to be assembled.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MARK_KINDS, MAX_MARKS, markPath, markFor, partitionSegments } from '../js/lib/marks.mjs';

const EM_DASH = String.fromCharCode(0x2014);   // never typed literally, only tested for
const roles = (svg, role) => (svg.match(new RegExp(`data-role="${role}"`, 'g')) || []).length;
const attrs = (svg, role) =>
  [...svg.matchAll(new RegExp(`<[a-z]+ data-role="${role}"[^>]*>`, 'g'))].map(m => {
    const o = {};
    for (const a of m[0].matchAll(/([a-z0-9-]+)="([^"]*)"/g)) o[a[1]] = a[2];
    return o;
  });
const texts = (svg, role) =>
  [...svg.matchAll(new RegExp(`data-role="${role}"[^>]*>([^<]*)<`, 'g'))].map(m => m[1]);

// ------------------------------------------------------------------- marks

test('there are exactly six mark kinds and they are all different paths', () => {
  assert.equal(MARK_KINDS.length, 6);
  assert.equal(MAX_MARKS, 6);
  const ds = MARK_KINDS.map(k => markPath(k, 10, 10, 4).d);
  assert.equal(new Set(ds).size, 6, 'two marks share a path, so two clusters would look identical');
});

test('four marks are filled silhouettes and two are stroke-only line marks', () => {
  const filled = MARK_KINDS.filter(k => markPath(k, 0, 0, 3).filled);
  assert.deepEqual(filled, ['circle', 'square', 'triangle', 'diamond']);
  assert.deepEqual(MARK_KINDS.filter(k => !markPath(k, 0, 0, 3).filled), ['plus', 'cross']);
});

test('a mark is centred where it is drawn and scales with its radius', () => {
  // Both checks are parity-free on purpose. An SVG path interleaves coordinates
  // with arc radii and flags, and H and V take a single coordinate, so reading
  // the numbers as alternating x and y is wrong: it misreads the plus mark's
  // `H` and `V` operands as a y of 100.
  const nums = d => d.match(/-?\d+(\.\d+)?/g).map(Number);
  for (const kind of MARK_KINDS) {
    // Drawn far from the origin, every coordinate-sized number must sit near the
    // centre it was asked for. Radii and flags stay small and are skipped.
    for (const v of nums(markPath(kind, 1000, 1000, 4).d).filter(v => Math.abs(v) >= 100)) {
      assert.ok(v >= 994 && v <= 1006, `${kind} drawn away from its centre: ${v}`);
    }
    // Doubling r doubles the mark's reach, whatever commands it is built from.
    const reach = r => Math.max(...nums(markPath(kind, 0, 0, r).d).map(Math.abs));
    assert.ok(Math.abs(reach(8) - 2 * reach(4)) < 1e-9,
      `${kind} must scale with r: ${reach(4)} then ${reach(8)}`);
  }
});

test('markFor maps a cluster index to a kind and refuses to go past six', () => {
  assert.equal(markFor(0), 'circle');
  assert.equal(markFor(5), 'cross');
  assert.throws(() => markFor(6), /six/i, 'the shape budget must fail loudly, not wrap around');
});

test('two centers give a straight boundary on their perpendicular bisector', () => {
  const frame = {
    plot: { x0: 0, y0: 0, x1: 200, y1: 200 },
    invX: px => (px - 100) / 20,          // data 0 sits at screen x 100
    invY: py => (100 - py) / 20,
    x: v => 100 + v * 20,
    y: v => 100 - v * 20,
  };
  const segs = partitionSegments([[-1, 0], [1, 0]], frame, { n: 40 });
  assert.ok(segs.length > 10, 'a wall across the plot should be many short segments');
  for (const [x0, y0, x1, y1] of segs) {
    assert.ok(Math.abs(x0 - 100) < 3 && Math.abs(x1 - 100) < 3,
      `the bisector of (-1,0) and (1,0) is the vertical line x=0: got ${x0}, ${x1}`);
    assert.ok(y0 >= 0 && y1 <= 200);
  }
});

test('one center has no boundary at all', () => {
  const frame = {
    plot: { x0: 0, y0: 0, x1: 100, y1: 100 },
    invX: px => px, invY: py => py, x: v => v, y: v => v,
  };
  assert.deepEqual(partitionSegments([[50, 50]], frame, { n: 20 }), []);
});

test('the partition is drawn once, not once per side', () => {
  const frame = {
    plot: { x0: 0, y0: 0, x1: 200, y1: 200 },
    invX: px => (px - 100) / 20, invY: py => (100 - py) / 20,
    x: v => 100 + v * 20, y: v => 100 - v * 20,
  };
  const segs = partitionSegments([[-1, -1], [1, -1], [0, 1]], frame, { n: 48 });
  const keys = segs.map(s => [Math.round(s[0] + s[2]), Math.round(s[1] + s[3])].join(':'));
  assert.equal(new Set(keys).size, keys.length, 'a wall traced from both sides would double every segment');
});

// ------------------------------------------------------------- kmeans-step

import * as KS from '../js/instruments/kmeans-step.mjs';
import { mulberry32 } from '../js/math/core.mjs';
import { kmeansRun } from '../js/math/kmeans.mjs';

const BLOBS = JSON.parse(readFileSync(new URL('../data/blobs.json', import.meta.url), 'utf8'));
const blobState = (over = {}) => {
  const c = BLOBS.configs.blobs;
  return { ...KS.defaults, idKey: 'ks1', dataset: 'blobs', xs: c.xs, ys: c.ys, truth: c.labels, k: 3, ...over };
};

test('kmeans-step draws every point, every center, and a partition wall', () => {
  // Stepped once on purpose. A wall only exists once membership does, and the
  // very next test pins that a fresh restart draws no wall at all.
  const base = blobState();
  let s = { ...base, ...KS.restart(base, 1) };
  s = { ...s, ...KS.step(s) };
  const svg = KS.render(s);
  assert.match(svg, /^<svg[^>]*viewBox="0 0 640 460"/);
  assert.match(svg, /<\/svg>\s*$/);
  assert.equal(roles(svg, 'pt'), 150);
  assert.equal(roles(svg, 'center'), 3);
  assert.ok(roles(svg, 'wall') > 10, 'the partition must be drawn, not implied');
  assert.ok(svg.includes('sb-ks1-'), 'every id is namespaced to the instance');
});

test('kmeans-step opens before the first Step with nothing assigned', () => {
  const s = { ...blobState(), ...KS.restart(blobState(), 1) };
  assert.equal(s.phase, 'assign');
  assert.ok(s.labels.every(l => l === -1));
  const svg = KS.render(s);
  assert.equal(texts(svg, 'phase')[0], 'press Step to assign every point to its nearest center');
  assert.equal(roles(svg, 'wall'), 0, 'no wall before anything is assigned');
});

test('one Step assigns and freezes the centers; the next moves the centers and freezes membership', () => {
  const base = blobState();
  const s0 = { ...base, ...KS.restart(base, 1) };
  const s1 = { ...s0, ...KS.step(s0) };
  assert.equal(s1.phase, 'update');
  assert.deepEqual(s1.centers, s0.centers);
  assert.ok(s1.labels.every(l => l >= 0));
  const s2 = { ...s1, ...KS.step(s1) };
  assert.equal(s2.phase, 'assign');
  assert.deepEqual(s2.labels, s1.labels);
  assert.notDeepEqual(s2.centers, s1.centers);
});

test('the cost readout falls on every recompute and is never negative', () => {
  let s = { ...blobState(), ...KS.restart(blobState(), 3) };
  let prev = Infinity, guard = 0;
  while (!s.done && guard++ < 60) {
    s = { ...s, ...KS.step(s) };
    if (s.phase === 'assign') {                       // a full iteration just finished
      const cost = KS.stats(s).cost;
      assert.ok(cost <= prev + 1e-9, `cost rose from ${prev} to ${cost}`);
      assert.ok(cost >= 0);
      prev = cost;
    }
  }
  assert.ok(s.done, 'blobs at k=3 must converge well inside 30 iterations');
});

test('every cluster gets its own mark, and the legend names all of them', () => {
  // Stepped once, so every cluster has members and every mark is on the page.
  // Seed 5 at k=6 on blobs was measured to populate all six clusters.
  const base = blobState({ k: 6 });
  let s = { ...base, ...KS.restart(base, 5) };
  s = { ...s, ...KS.step(s) };
  const svg = KS.render(s);
  assert.equal(roles(svg, 'legend-mark'), 6);
  const kinds = attrs(svg, 'pt').map(a => a['data-mark']);
  assert.equal(new Set(kinds).size, 6, 'membership must be visible as shape, one kind per cluster');
  for (const kind of new Set(kinds)) assert.ok(MARK_KINDS.includes(kind));
});

test('k is capped at the shape budget on this instrument', () => {
  const slider = KS.controls.find(c => c.id === 'k');
  assert.equal(slider.min, 2);
  assert.equal(slider.max, MAX_MARKS, 'k must not exceed the number of distinguishable marks');
});

test('changing k, the dataset or the seeding restarts the run rather than half-updating it', () => {
  const base = { ...blobState(), ...KS.restart(blobState(), 1) };
  const stepped = { ...base, ...KS.step(base) };
  for (const [id, value] of [['k', 4], ['plusplus', true]]) {
    const out = KS.applyControl(stepped, id, value);
    assert.equal(out.phase, 'assign', `${id} must reset the phase`);
    assert.ok(out.labels.every(l => l === -1), `${id} must clear membership`);
    assert.equal(out.done, false);
  }
  const cr = BLOBS.configs.crescents;
  const swapped = KS.setDataset(stepped, 'crescents', { xs: cr.xs, ys: cr.ys, truth: cr.labels });
  assert.equal(swapped.xs.length, 150);
  assert.equal(swapped.xs[0], cr.xs[0], 'the new run must be seeded from the NEW cloud');
  assert.equal(swapped.k, 2, 'each dataset carries the k the spec chose for it');
  assert.ok(swapped.labels.every(l => l === -1));
});

test('stepping to rest lands exactly where kmeansRun lands', () => {
  // The load-bearing invariant of the whole lesson: the picture the reader steps
  // their way to must be the same answer the claims test computes. done is
  // raised during assign and the trailing update still has to run, so a step()
  // that stopped on done alone would rest one half-step short.
  const base = blobState();
  let s = { ...base, ...KS.restart(base, 1) };
  let guard = 0;
  while (Object.keys(KS.step(s)).length && guard++ < 120) s = { ...s, ...KS.step(s) };
  const run = kmeansRun(KS.rowsOf(base), 3, mulberry32(1), { plusplus: false });
  assert.deepEqual(s.labels, run.labels);
  assert.deepEqual(s.centers, run.centers);
  assert.ok(Math.abs(KS.stats(s).cost - run.wcss) < 1e-9);
  assert.equal(s.phase, 'assign', 'it rests after the trailing update, ready to be stepped again inertly');
});

test('kmeans-step carries no em-dash and never writes the acronym', () => {
  const svg = KS.render({ ...blobState(), ...KS.restart(blobState(), 1) });
  assert.ok(!svg.includes(EM_DASH));
  assert.ok(!/WCSS/i.test(svg), 'the page calls it the total squared distance, in words');
});
