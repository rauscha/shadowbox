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
import { kmeansRun, zscoreColumns } from '../js/math/kmeans.mjs';

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
  assert.equal(roles(KS.render({ ...s, showWall: false }), 'wall'), 0, 'the toggle must actually hide the wall, not just default to on');
  assert.equal(texts(svg, 'cost')[0], 'total squared distance 744.8', 'render, not just stats(), must format the number');
  assert.equal(texts(svg, 'iter')[0], 'iteration 0');
  assert.ok(svg.includes('sb-ks1-'), 'every id is namespaced to the instance');
});

test('kmeans-step opens before the first Step with nothing assigned', () => {
  const s = { ...blobState(), ...KS.restart(blobState(), 1) };
  assert.equal(s.phase, 'assign');
  assert.ok(s.labels.every(l => l === -1));
  const svg = KS.render(s);
  assert.equal(texts(svg, 'phase')[0], 'press Step to assign every point to its nearest center');
  assert.equal(roles(svg, 'wall'), 0, 'no wall before anything is assigned');
  assert.equal(roles(svg, 'pt'), 150);
  const pts = attrs(svg, 'pt');
  assert.ok(pts.every(a => a['data-cluster'] === '-1'), 'nothing is assigned yet, so every point is cluster -1');
  assert.ok(pts.every(a => a['data-mark'] === 'circle'), 'unassigned points draw the plain circle, not a cluster shape');
});

test('the true-group ring is gated on both the toggle and the data, not either alone', () => {
  const base = { ...blobState(), ...KS.restart(blobState(), 1) };
  assert.equal(roles(KS.render(base), 'truth-ring'), 0, 'off by default, even though this dataset carries truth');
  assert.equal(roles(KS.render({ ...base, showTruth: true }), 'truth-ring'), 150, 'on, with truth data: a ring behind every point');
  assert.equal(roles(KS.render({ ...base, showTruth: true, truth: null }), 'truth-ring'), 0,
    'on, but no truth data: still nothing to ring, which is what lets the uniform dataset render with no special case');
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

// -------------------------------------------------------- restart-roulette

import * as RR from '../js/instruments/restart-roulette.mjs';

const rrState = (over = {}) => {
  const c = BLOBS.configs.blobs;
  return { ...RR.defaults, idKey: 'rr1', dataset: 'blobs', xs: c.xs, ys: c.ys, truth: c.labels, k: 3, plusplus: false, ...over };
};

test('restart-roulette runs six initializations and ranks them by cost', () => {
  const p = RR.panels(rrState());
  assert.equal(p.length, 6);
  const ranks = p.map(x => x.rank).sort((a, b) => a - b);
  assert.deepEqual(ranks, [1, 2, 3, 4, 5, 6]);
  const cheapest = p.find(x => x.rank === 1);
  for (const other of p) assert.ok(cheapest.cost <= other.cost + 1e-9);
});

test('on blobs with random seeding, the six panels do not all agree', () => {
  // This is the whole figure. If they ever all agree, the section is wrong.
  const costs = RR.panels(rrState()).map(x => +x.cost.toFixed(2));
  assert.ok(new Set(costs).size > 1, `all six restarts landed on ${costs[0]}`);
});

test('the six panels report the real divergence rate, one wrong in six, not a dramatised one', () => {
  // Measured: 15 percent of starts land on a bad optimum across 60 seeds. Five
  // panels at 89.67 and one at 506.8 is 17 percent, which reports that rate
  // honestly. Six wrong out of six would oversell it, which spec §11 forbids;
  // zero wrong out of six would teach the opposite of the figure's title.
  const costs = RR.panels(rrState()).map(x => x.cost);
  const best = Math.min(...costs);
  assert.equal(costs.filter(c => c > best * 1.02).length, 1, `costs: ${costs.map(c => c.toFixed(1))}`);
  assert.ok(Math.abs(best - 89.67) < 0.05);
});

test('k-means++ collapses the six panels onto one answer', () => {
  const costs = RR.panels(rrState({ plusplus: true })).map(x => +x.cost.toFixed(2));
  assert.equal(new Set(costs).size, 1, `++ on blobs should agree 6 of 6: ${costs}`);
});

test('crescents: all six agree and all six are 75 percent right', () => {
  const c = BLOBS.configs.crescents;
  const p = RR.panels(rrState({ dataset: 'crescents', xs: c.xs, ys: c.ys, truth: c.labels, k: 2, plusplus: true }));
  const costs = p.map(x => +x.cost.toFixed(1));
  assert.ok(Math.max(...costs) / Math.min(...costs) - 1 < 0.01, 'crescents restarts agree');
  for (const panel of p) assert.ok(Math.abs(panel.purity - 0.75) < 0.02, `purity ${panel.purity}`);
});

test('purity is null wherever there is no ground truth to score against', () => {
  const c = BLOBS.configs.uniform;
  const p = RR.panels(rrState({ dataset: 'uniform', xs: c.xs, ys: c.ys, truth: null, k: 3 }));
  for (const panel of p) assert.equal(panel.purity, null, 'a uniform square has no truth to be right about');
});

test('restart-roulette draws six labelled panels with every point in each', () => {
  const svg = RR.render(rrState());
  assert.match(svg, /^<svg[^>]*viewBox="0 0 640 460"/);
  assert.equal(roles(svg, 'panel'), 6);
  assert.equal(roles(svg, 'panel-cost'), 6);
  assert.equal(roles(svg, 'panel-rank'), 6);
  assert.equal(roles(svg, 'pt'), 900, 'six panels of 150 points, drawn honestly');
  const seeds = attrs(svg, 'panel').map(a => a['data-seed']);
  assert.equal(new Set(seeds).size, 6, 'each panel must be loadable into kmeans-step by its own seed');
});

test('the winning panel is marked by more than its position in the grid', () => {
  const svg = RR.render(rrState());
  const best = attrs(svg, 'panel').find(a => a['data-rank'] === '1');
  assert.ok(best, 'rank 1 must be identifiable in the markup');
  assert.equal(roles(svg, 'panel-best-mark'), 1, 'the cheapest answer carries a drawn mark, not a colour');
});

test('restart-roulette carries no em-dash and never writes the acronym', () => {
  const svg = RR.render(rrState());
  assert.ok(!svg.includes(EM_DASH));
  assert.ok(!/WCSS/i.test(svg));
});

test('the panels differ in the PARTITION, not merely in the number printed on them', () => {
  // Cost is the evidence, membership is the claim. Canonical form matters: raw
  // label vectors count a renumbering as a difference, and on blobs with ++ the
  // six panels carry three distinct raw vectors but only ONE distinct partition.
  // Measured canonically: blobs random 2, blobs ++ 1, uniform 6.
  assert.equal(RR.distinctAnswers(RR.panels(rrState())), 2);
  assert.equal(RR.distinctAnswers(RR.panels(rrState({ plusplus: true }))), 1);
  const u = BLOBS.configs.uniform;
  assert.equal(RR.distinctAnswers(RR.panels(rrState({ dataset: 'uniform', xs: u.xs, ys: u.ys, truth: null, k: 3 }))), 6);
});

test('the figure counts its own answers instead of promising a number in the title', () => {
  const svg = RR.render(rrState());
  assert.equal(roles(svg, 'agreement'), 1);
  assert.equal(texts(svg, 'agreement')[0], 'these six starts found 2 different answers');
  const pp = RR.render(rrState({ plusplus: true }));
  assert.equal(texts(pp, 'agreement')[0], 'all six starts found the same answer');
  assert.ok(!/six answers/.test(svg), 'the title overclaimed once; it must not again');
});

test('a dataset with no ground truth renders no purity at all', () => {
  const u = BLOBS.configs.uniform;
  const svg = RR.render(rrState({ dataset: 'uniform', xs: u.xs, ys: u.ys, truth: null, k: 3 }));
  assert.equal(roles(svg, 'panel-purity'), 0);
  assert.equal(roles(svg, 'panel'), 6);
});

test('each panel draws ITS OWN partition, not one panel repeated six times', () => {
  // distinctAnswers proves panels() COMPUTES different answers. This proves
  // render actually DRAWS them. A render loop that reused one panel's geometry
  // for all six, while cost, rank, seed and the agreement line stayed correct,
  // would pass every other test in this file and leave six identical drawings
  // with six different numbers stapled on.
  // Measured: with random seeding the divergent start draws a visibly different
  // partition (wall counts 78 78 78 91 78 78); with ++ all six agree and all six
  // draw 78.
  const perPanel = svg => svg.split(/(?=<g data-role="panel")/).slice(1)
    .map(p => (p.match(/data-role="wall"/g) || []).length);
  const rand = perPanel(RR.render(rrState()));
  assert.equal(rand.length, 6);
  assert.equal(new Set(rand).size, 2, `wall counts per panel: ${rand}`);
  const pp = perPanel(RR.render(rrState({ plusplus: true })));
  assert.equal(new Set(pp).size, 1, `++ draws one partition six times: ${pp}`);
});

// ------------------------------------------------------------------- elbow

import * as EL from '../js/instruments/elbow.mjs';

const BIO = JSON.parse(readFileSync(new URL('../data/biometry.json', import.meta.url), 'utf8'));
const BIRTHS = JSON.parse(readFileSync(new URL('../data/births.json', import.meta.url), 'utf8'));
const elState = (over = {}) => ({ ...EL.defaults, idKey: 'el1', dataset: 'blobs',
  columns: [BLOBS.configs.blobs.xs, BLOBS.configs.blobs.ys], standardize: false, ...over });

test('elbow sweeps k = 1 to 10 and is NOT capped at the shape budget', () => {
  const slider = EL.controls.find(c => c.id === 'kMax');
  assert.equal(slider.max, 10, 'elbow draws no membership, so six does not bind it');
  assert.equal(EL.curve(elState()).length, 10);
  assert.equal(EL.curve(elState()).at(-1).k, 10);
});

test('the cost falls as k rises, and the drop at k=1 is undefined', () => {
  const c = EL.curve(elState());
  assert.equal(c[0].dropPct, null, 'there is no previous k to drop from');
  for (let i = 1; i < c.length; i++) {
    assert.ok(c[i].cost <= c[i - 1].cost + 1e-9, `cost rose from k=${i} to k=${i + 1}`);
  }
});

test('blobs has the corner: the k=3 drop dwarfs the k=4 drop', () => {
  const c = EL.curve(elState());
  assert.ok(c[2].dropPct / c[3].dropPct > 3, `blobs must show a real elbow: ${c.map(x => x.dropPct)}`);
});

test('births has no corner: 40, 32, 23, 15, 14, 12 and it just keeps going', () => {
  const c = EL.curve(elState({ dataset: 'births', columns: [BIRTHS.xs, BIRTHS.ys], standardize: true }));
  const got = c.slice(1, 7).map(x => Math.round(x.dropPct));
  assert.deepEqual(got, [40, 32, 23, 15, 14, 12]);
});

test('biometry has no corner either, and its curve is not even monotone', () => {
  // 72, 52, 35, 28, 10, 21. The k=7 drop is LARGER than the k=6 drop. The prose
  // must not call this a smooth decay, and the instrument must not smooth it.
  const c = EL.curve(elState({ dataset: 'biometry', columns: [BIO.bpd, BIO.hc, BIO.ac, BIO.fl], standardize: true }));
  const got = c.slice(1, 7).map(x => Math.round(x.dropPct));
  assert.deepEqual(got, [72, 52, 35, 28, 10, 21]);
  assert.ok(got[5] > got[4], 'the bump at k=7 is real and stays drawn');
});

test('elbow draws one point and one printed drop per k', () => {
  const svg = EL.render(elState());
  assert.match(svg, /^<svg[^>]*viewBox="0 0 640 460"/);
  assert.equal(roles(svg, 'k-point'), 10);
  assert.equal(roles(svg, 'drop-label'), 9, 'every k but the first carries its drop in text');
  assert.equal(roles(svg, 'curve'), 1);
  assert.ok(texts(svg, 'drop-label').every(t => /%$/.test(t)), 'the bar is a picture of a number, the number is printed');
});

test('the verdict can say no, which is the only reason it is worth computing', () => {
  // Measured. blobs has a corner and the rule finds the true k; neither real
  // dataset has one. An earlier rule scored biometry a corner at 4.19 and would
  // have printed "there is a corner here" under prose saying there is not one.
  const blobs = EL.verdictOf(EL.curve(elState()));
  assert.equal(blobs.corner, 3, `blobs ratio ${blobs.ratio}`);
  assert.ok(blobs.ratio > 3);
  for (const [name, cols] of [['births', [BIRTHS.xs, BIRTHS.ys]], ['biometry', [BIO.bpd, BIO.hc, BIO.ac, BIO.fl]]]) {
    const v = EL.verdictOf(EL.curve(elState({ dataset: name, columns: cols, standardize: true })));
    assert.equal(v.corner, null, `${name} claimed a corner at k=${v.corner}, ratio ${v.ratio}`);
    assert.match(v.text, /^no corner\./);
  }
});

test('elbow carries no em-dash and never writes the acronym', () => {
  const svg = EL.render(elState());
  assert.ok(!svg.includes(EM_DASH));
  assert.ok(!/WCSS/i.test(svg));
  assert.match(svg, /total squared distance/, 'the axis is named in words, not in an acronym');
});

test('the verdict clears the k=1 marker, which always sits in the plot corner', () => {
  // The one geometry test in this lesson, and it exists because a collision
  // shipped here under a "zero collisions" self-check. The check measured
  // clearance against the plot RECTANGLE; the k=1 marker pokes above that
  // rectangle, because cost/maxCost is 1 at k=1 by definition and the marker has
  // a radius. Coordinates are read straight off the emitted SVG, so this runs in
  // node with no DOM.
  const attr = (svg, role, name) => {
    const tag = svg.match(new RegExp('<[a-z]+ data-role="' + role + '"[^>]*>'))[0];
    const m = tag.match(new RegExp('\\s' + name + '="([-0-9.]+)"'));
    return m ? Number(m[1]) : NaN;
  };
  for (const st of [elState(),
                    elState({ dataset: 'births', columns: [BIRTHS.xs, BIRTHS.ys], standardize: true })]) {
    const svg = EL.render(st);
    const markerTop = attr(svg, 'k-point', 'cy') - attr(svg, 'k-point', 'r');
    const fs = attr(svg, 'verdict', 'font-size') || 11;
    const inkBottom = attr(svg, 'verdict', 'y') + fs * 0.25;   // baseline plus descent
    assert.ok(inkBottom < markerTop - 1,
      `${st.dataset}: verdict ink reaches y=${inkBottom.toFixed(1)} but the k=1 marker starts at y=${markerTop}`);
  }
});

// ------------------------------------------------------------ label-vs-truth

import * as LT from '../js/instruments/label-vs-truth.mjs';

const ltState = (over = {}) => ({ ...LT.defaults, idKey: 'lt1',
  columns: [BIO.bpd, BIO.hc, BIO.ac, BIO.fl], names: ['BPD', 'HC', 'AC', 'FL'],
  outcome: BIO.ga, k: 3, ...over });

test('label-vs-truth reproduces the claims table: 0.719 / 0.871 / 0.916 / 0.941', () => {
  [2, 3, 4, 5].forEach((k, i) => {
    const share = LT.bands(ltState({ k })).share;
    assert.ok(Math.abs(share - [0.719, 0.871, 0.916, 0.941][i]) < 0.002, `k=${k} share ${share}`);
  });
});

test('at k=3 the three bands are 22.8, 28.7 and 35.7 weeks and they come out ordered', () => {
  const b = LT.bands(ltState()).bands;
  assert.equal(b.length, 3);
  [22.8, 28.7, 35.7].forEach((w, i) => assert.ok(Math.abs(b[i].mean - w) < 0.05, `band ${i} ${b[i].mean}`));
  for (let i = 1; i < b.length; i++) assert.ok(b[i].mean > b[i - 1].mean, 'bands must be sorted by mean');
});

test('the bands very nearly tile the gestational-age interval, which is the whole punchline', () => {
  const b = LT.bands(ltState()).bands;
  for (let i = 1; i < b.length; i++) {
    const gap = b[i].min - b[i - 1].max;
    assert.ok(gap < 1.5, `bands ${i - 1} and ${i} leave a gap of ${gap} weeks`);
  }
  assert.deepEqual(b.map(x => x.n).reduce((a, c) => a + c, 0), 350, 'every scan lands in exactly one band');
});

test('label-vs-truth draws every scan as its cluster mark, on one gestational-age axis', () => {
  const svg = LT.render(ltState());
  assert.match(svg, /^<svg[^>]*viewBox="0 0 640 460"/);
  assert.equal(roles(svg, 'pt'), 350);
  assert.equal(roles(svg, 'band'), 3);
  assert.equal(roles(svg, 'band-mean'), 3);
  assert.equal(roles(svg, 'share'), 1);
  // Not just /gestational age/: that phrase also appears in the share readout
  // and the caption, so deleting the axis label itself would still pass a bare
  // regex test. Anchor on the axis label's own exact markup and text.
  assert.match(svg, /<text x="[\d.]+" y="[\d.]+" text-anchor="middle" font-size="10" fill="var\(--text\)">gestational age \(weeks\)<\/text>/,
    'the axis itself must be labelled, not merely mentioned elsewhere on the page');
});

test('the share is written out in words, never as an acronym or a symbol', () => {
  const svg = LT.render(ltState());
  assert.ok(!/eta/i.test(svg), 'the page says "the share of the variation ... that the labels account for"');
  assert.ok(!/WCSS/i.test(svg));
  assert.ok(!svg.includes(EM_DASH));
  assert.match(texts(svg, 'share')[0], /0\.87/, 'the number is printed, not only drawn');
});

test('k stays inside the shape budget and inside the measured range', () => {
  const slider = LT.controls.find(c => c.id === 'k');
  assert.equal(slider.min, 2);
  assert.equal(slider.max, 5);
  assert.ok(slider.max <= MAX_MARKS);
});

// Fix round 1 (review task-9-review.md). Findings A1/A3, B4, B5, B6, B7, B9.

test('st.note draws its own line, following scree.mjs\'s shape - not the lesson-3 corner, which this title would cross', () => {
  const withNote = LT.render(ltState({ note: '350 simulated scans, 20-40 weeks' }));
  assert.equal(roles(withNote, 'note'), 1);
  assert.equal(texts(withNote, 'note')[0], '350 simulated scans, 20-40 weeks');
  assert.equal(roles(LT.render(ltState()), 'note'), 0, 'an empty note (the default) draws nothing');
});

test('bands are stacked tallest to the top: the largest mean is drawn first, each next row strictly below it', () => {
  const svg = LT.render(ltState());
  assert.deepEqual(texts(svg, 'band-mean'), ['35.7 wk', '28.7 wk', '22.8 wk'],
    'largest-mean band must read first in the markup, i.e. drawn at the top');
  const ys = attrs(svg, 'band-mean').map(a => Number(a.y));
  for (let i = 1; i < ys.length; i++) {
    assert.ok(ys[i] > ys[i - 1], `row ${i} (y=${ys[i]}) must sit below row ${i - 1} (y=${ys[i - 1]})`);
  }
});

test('the ++ seeding is load-bearing, not just numerically close to random init on this data', () => {
  // eta-squared cannot tell the two schemes apart here - they differ by at
  // most 0.0014 at every k, inside the 0.002 tolerance the claims-table test
  // above uses - so pin bands()'s actual labels against an independently
  // computed kmeansRun with plusplus explicit, rather than tightening that
  // tolerance into brittleness for no real coverage.
  const st = ltState();
  const X = zscoreColumns(st.columns);
  const expected = kmeansRun(X, st.k, mulberry32(LT.SEED), { plusplus: true }).labels;
  assert.deepEqual(LT.bands(st).labels, expected);
});

test('the count, the caption, the title and the id prefix are all pinned, not just the geometry roles', () => {
  const svg = LT.render(ltState());
  assert.equal(roles(svg, 'band-n'), 3);
  assert.deepEqual(texts(svg, 'band-n'), ['n = 132', 'n = 117', 'n = 101']);
  assert.match(svg, /clustered on BPD, HC, AC and FL\. gestational age was never shown to the algorithm\./);
  assert.match(svg, /the algorithm never saw the dates\. look what it found\./);
  assert.ok(svg.includes('sb-lt1-'), 'every id is namespaced to the instance');
});

test('every band draws its OWN mark shape - shape is the only channel a colorblind reader gets', () => {
  // Reverses markPath's own output back to a kind, via the real MARK_KINDS
  // and markFor - not a guess at what a circle's path "looks like" - so this
  // is checking what the shipped marks module actually draws, position aside.
  const markKindOf = (() => {
    const table = new Map(MARK_KINDS.map(kind => [markPath(kind, 0, 0, 3).d.replace(/-?[\d.]+/g, '#'), kind]));
    return d => table.get(d.replace(/-?[\d.]+/g, '#'));
  })();
  const svg = LT.render(ltState());
  const shapeByCluster = new Map();
  for (const p of attrs(svg, 'pt')) {
    const kind = markKindOf(p.d);
    assert.ok(kind, `pt path does not normalize to any known mark shape: ${p.d}`);
    const prev = shapeByCluster.get(p['data-cluster']);
    if (prev) assert.equal(prev, kind, `cluster ${p['data-cluster']} drew two different shapes on different scans`);
    else shapeByCluster.set(p['data-cluster'], kind);
  }
  assert.equal(shapeByCluster.size, 3, 'k=3 must produce three distinct clusters, each with a mark');
  assert.equal(new Set(shapeByCluster.values()).size, 3, 'two different clusters must never share a mark shape');
});

test('geometry: at k=5 (the row that draws a stroke-only plus mark) no label collides with the swarm beside it', () => {
  // getBBox() in a browser excludes stroke width, which undercounts a
  // stroke-only mark's real visual extent (see task-9-report.md's Fix round 1
  // section). Every number below is read straight off the rendered markup -
  // each scan's actual drawn centre from its own "pt" element's data-cy, its
  // actual radius from data-r, stroke width from a real stroke-only element -
  // rather than recomputed from the brief's jitter formula. A first draft of
  // this test recomputed the expected jitter from (i % 7 - 3) * 1.6 instead of
  // reading data-cy, so it never actually looked at what got drawn: widening
  // the real jitter to * 12, or growing the real radius from 3 to 12, both
  // left it green (see task-9-report.md for the mutation that caught this).
  const st = ltState({ k: 5 });
  const svg = LT.render(st);
  const bandLines = attrs(svg, 'band');
  const means = attrs(svg, 'band-mean');
  const ns = attrs(svg, 'band-n');
  const pts = attrs(svg, 'pt');
  const plotTag = svg.match(/<rect x="[\d.]+" y="([\d.]+)" width="[\d.]+" height="([\d.]+)" fill="none" stroke="var\(--border\)"/);
  const plotY0 = Number(plotTag[1]), plotY1 = plotY0 + Number(plotTag[2]);

  assert.equal(bandLines.length, 5, 'k=5 must produce five bands to exercise the tightest row');

  // Conservative (pessimistic) ink-extent constants: real, browser-measured
  // ascent for this font runs close to 1.0x the font-size and descent runs
  // close to 0.29x (task-9-report.md), so 0.9x ascent / 0.3x descent already
  // overestimates real ink reach in the direction that matters for a
  // clearance check - a false RED here means measure again, not loosen this.
  const inkBottom = (y, size) => y + size * 0.3;
  const inkTop = (y, size) => y - size * 0.9;

  for (let r = 0; r < bandLines.length; r++) {
    const cluster = bandLines[r]['data-cluster'];
    const rowPts = pts.filter(p => p['data-cluster'] === cluster);
    assert.ok(rowPts.length > 0, `cluster ${cluster} has no drawn scans`);
    const strokeW = rowPts[0]['stroke-width'] ? Number(rowPts[0]['stroke-width']) : 0;
    const halfExtra = strokeW / 2;

    const cys = rowPts.map(p => Number(p['data-cy']));
    const rs = rowPts.map(p => Number(p['data-r']));
    const swarmTop = Math.min(...cys.map((cy, j) => cy - rs[j])) - halfExtra;
    const swarmBottom = Math.max(...cys.map((cy, j) => cy + rs[j])) + halfExtra;

    const meanSize = Number(means[r]['font-size']), meanY = Number(means[r].y);
    const meanTop = inkTop(meanY, meanSize), meanBottom = inkBottom(meanY, meanSize);
    const nSize = Number(ns[r]['font-size']), nY = Number(ns[r].y);
    const nTop = inkTop(nY, nSize), nBottom = inkBottom(nY, nSize);

    assert.ok(swarmTop > meanBottom,
      `cluster ${cluster}: mean label (ink bottom ${meanBottom.toFixed(1)}) collides with the swarm (top ${swarmTop.toFixed(1)})`);
    assert.ok(nTop > swarmBottom,
      `cluster ${cluster}: swarm (bottom ${swarmBottom.toFixed(1)}) collides with the count (ink top ${nTop.toFixed(1)})`);

    // Only the outermost rows can ever touch the frame - a middle row's
    // "outward" direction is bounded by its neighbour's row, not the border.
    if (r === 0) assert.ok(meanTop > plotY0, `top row's mean label (ink top ${meanTop.toFixed(1)}) pokes above the plot frame (${plotY0})`);
    if (r === bandLines.length - 1) assert.ok(nBottom < plotY1, `bottom row's count (ink bottom ${nBottom.toFixed(1)}) pokes below the plot frame (${plotY1})`);
  }
});
