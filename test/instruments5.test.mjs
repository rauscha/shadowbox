// Render and geometry tests for the four lesson-5 instruments. Same shape as
// test/instruments4.test.mjs: assert on data-role attributes so the tests
// describe what the reader sees rather than how the SVG string is assembled.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const EM_DASH = String.fromCharCode(0x2014);
const roles = (svg, role) => (svg.match(new RegExp(`data-role="${role}"`, 'g')) || []).length;
const attrs = (svg, role) =>
  [...svg.matchAll(new RegExp(`<[a-z]+ data-role="${role}"[^>]*>`, 'g'))].map(m => {
    const o = {};
    for (const a of m[0].matchAll(/([a-z0-9-]+)="([^"]*)"/g)) o[a[1]] = a[2];
    return o;
  });
const texts = (svg, role) =>
  [...svg.matchAll(new RegExp(`data-role="${role}"[^>]*>([^<]*)<`, 'g'))].map(m => m[1]);

const read = p => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), 'utf8'));
const BLOBS = read('blobs.json');
const BIO = read('biometry.json');

// --------------------------------------------------------------- knn-graph

import * as KG from '../js/instruments/knn-graph.mjs';

const kgState = (over = {}) => {
  const c = BLOBS.configs.crescents;
  return { ...KG.defaults, idKey: 'kg1', dataset: 'crescents',
    columns: [c.xs, c.ys], truth: c.labels, k: 5, ...over };
};

test('knn-graph draws every point and every edge of the graph', () => {
  const st = kgState();
  const svg = KG.render(st);
  assert.match(svg, /^<svg[^>]*viewBox="0 0 640 460"/);
  assert.match(svg, /<\/svg>\s*$/);
  assert.equal(roles(svg, 'pt'), 150);
  assert.equal(roles(svg, 'edge'), KG.graphOf(st).head.length);
});

test('knn-graph has no seed control at all, and that absence is the lesson', () => {
  const ids = KG.controls.map(c => c.id);
  assert.ok(!ids.includes('seed'), 'the graph does not depend on a seed, so it must not offer one');
  assert.ok(!ids.includes('reset'), 'there is nothing to restart');
});

test('the same data and the same neighbours give byte-identical markup', () => {
  assert.equal(KG.render(kgState()), KG.render(kgState()));
});

test('edge weight is drawn as line weight, and the strongest edge is the heaviest', () => {
  const st = kgState();
  const g = KG.graphOf(st);
  const drawn = attrs(KG.render(st), 'edge').map(e => Number(e['stroke-width']));
  assert.equal(drawn.length, g.weight.length);
  const strongest = g.weight.indexOf(Math.max(...g.weight));
  const weakest = g.weight.indexOf(Math.min(...g.weight));
  assert.ok(drawn[strongest] > drawn[weakest],
    'membership strength must read as ink weight, or "neighbour" looks like a yes/no relation');
  assert.ok(Math.min(...drawn) > 0, 'an edge drawn at zero width is an edge the reader never sees');
});

test('more neighbours means more edges, on every dataset', () => {
  for (const name of ['blobs', 'crescents', 'uniform']) {
    const c = BLOBS.configs[name];
    const at = k => KG.graphOf(kgState({ dataset: name, columns: [c.xs, c.ys], truth: c.labels, k })).head.length;
    assert.ok(at(3) < at(10) && at(10) < at(25), `${name}: the edge count must climb with k`);
  }
});

test('at few neighbours the crescents graph stays inside each arc; at many it bridges them', () => {
  // The single picture behind every crescents result in the claims table, and
  // the reason the answer depends on a number the reader chose.
  const c = BLOBS.configs.crescents;
  const bridges = k => {
    const st = kgState({ k, dataset: 'crescents', columns: [c.xs, c.ys], truth: c.labels });
    const g = KG.graphOf(st);
    let n = 0;
    for (let e = 0; e < g.head.length; e++) if (c.labels[g.head[e]] !== c.labels[g.tail[e]]) n++;
    return n / g.head.length;
  };
  const few = bridges(3), many = bridges(30);
  assert.ok(few < many, `bridging must grow with k: ${few.toFixed(3)} at k=3, ${many.toFixed(3)} at k=30`);
  assert.ok(few < 0.05, `at k=3 the graph should almost never cross arcs, got ${few.toFixed(3)}`);
});

test('biometry computes its neighbours on all four measurements, not on the two it draws', () => {
  // The decision recorded in the plan's File Structure section. The neighbours
  // are four-dimensional; the picture is a shadow of them, and some edges will
  // visibly cross it. That discomfort is lesson 4's closer made literal.
  const st = kgState({ dataset: 'biometry',
    columns: [BIO.bpd, BIO.hc, BIO.ac, BIO.fl], truth: null, k: 5 });
  assert.equal(KG.rowsOf(st)[0].length, 4, 'the graph must see four columns');
  assert.equal(KG.positionsOf(st)[0].length, 2, 'the drawing must see two');

  const svg = KG.render(st);
  assert.equal(roles(svg, 'pt'), 350);
  assert.match(texts(svg, 'note').join(' '), /four/i,
    'the figure must say out loud that the neighbours were found on all four measurements');

  // At least one drawn edge is much longer than the typical one: a
  // four-dimensional neighbour that the two-dimensional picture cannot justify.
  const len = attrs(svg, 'edge').map(e =>
    Math.hypot(Number(e.x2) - Number(e.x1), Number(e.y2) - Number(e.y1)));
  const sorted = [...len].sort((a, b) => a - b);
  const med = sorted[sorted.length >> 1];
  // Measured, not guessed: on this fixture the ratio is 4.425 (max 38.700,
  // median 8.746, over 1200 edges), so the 4x threshold clears with roughly
  // 10 percent of headroom, not a comfortable margin. That is safe rather than
  // fragile because the quantity is exactly reproducible: knn/fuzzyGraph in
  // js/math/umap.mjs take no seed (see that file's header comment), and
  // data/biometry.json is a committed fixture generated with a fixed seed, so
  // rerunning this test can never move the ratio. If this assertion ever
  // fails, it means the kNN/fuzzy-graph algorithm, the default k, or the
  // biometry fixture changed underneath it - a real signal worth having, not
  // flakiness to paper over.
  assert.ok(Math.max(...len) > 4 * med,
    'if no edge looks wrong in the shadow, the figure is not teaching what it was chosen to teach');
});

test('knn-graph refuses a k the data cannot support', () => {
  assert.throws(() => KG.graphOf(kgState({ k: 200 })), /k/);
});

// ------------------------------------------------------------- layout-play

import * as LP from '../js/instruments/layout-play.mjs';
import * as UMAP from '../js/math/umap.mjs';

const lpState = (over = {}) => {
  const c = BLOBS.configs.blobs;
  const base = { ...LP.defaults, idKey: 'lp1', dataset: 'blobs',
    columns: [c.xs, c.ys], truth: c.labels, k: 15, ...over };
  return { ...base, ...LP.start(base, base.seed ?? 1) };
};

test('layout-play starts from the raw initialisation and holds exactly one frame', () => {
  const st = lpState();
  assert.equal(st.frames.length, 1, 'epoch 0 is the noise the reader watches resolve');
  assert.equal(st.view, 0);
  assert.equal(st.frames[0].length, 150);
  assert.equal(st.frames[0][0].length, 2);
});

test('one step is one epoch, and it appends a frame rather than replacing one', () => {
  let st = lpState();
  const before = st.frames[0].map(p => p.slice());
  st = { ...st, ...LP.step(st) };
  assert.equal(st.frames.length, 2);
  assert.equal(st.view, 1);
  assert.deepEqual(st.frames[0], before, 'the initialisation must survive so the scrubber can go back to it');
  // Movement is checked after the SECOND step, not the first: epoch 0 is a
  // provable no-op (see the test below), so asserting movement here would be
  // asserting something that cannot be true of this optimiser. Two steps is
  // the earliest point any edge is guaranteed to have fired.
  st = { ...st, ...LP.step(st) };
  assert.notDeepEqual(st.frames[2], before, 'by the second epoch, something must have moved');
});

test('the first epoch provably moves nothing, and that is umap-learn\'s behaviour too', () => {
  // epochsPerSample(weight, nEpochs) returns max(weight) / weight[e] for every
  // edge. Since every edge's weight is <= max(weight) by definition of max,
  // every eps[e] >= 1, always, for any graph - the strongest edge attains
  // exactly eps[e] === 1, and nothing can go lower.
  //
  // start() and umap() both initialise eons (epoch_of_next_sample) to eps, and
  // optimizeEpoch skips an edge while eons[e] > epoch. At epoch === 0 that
  // requires eps[e] <= 0 to fire, which never happens. So no edge in any
  // dataset, at any k or seed, can move on the first epoch - it is a
  // mathematical invariant of epochsPerSample, not a property of this
  // fixture. umap-learn's reference optimizer uses the identical condition
  // (epoch_of_next_sample initialised to epochs_per_sample, fired on
  // epoch_of_next_sample[i] <= n), so this is not a departure this module
  // introduced; it is the algorithm working as specified.
  //
  // Folding this no-op into start() so the first Step lands on epoch 1 was
  // considered and rejected: it would shift the frames-to-epoch mapping the
  // scrubber and the bit-identical parity test both depend on, for a
  // cosmetic gain. The test records the fact instead of hiding it, so a
  // future contributor who finds a dead first click can learn from the test
  // file that it is intended, and why.
  let st = lpState();
  const before = st.frames[0].map(p => p.slice());
  st = { ...st, ...LP.step(st) };
  assert.deepEqual(st.frames[1], before, 'epoch 0 cannot fire any edge, by construction of epochsPerSample');
  st = { ...st, ...LP.step(st) };
  assert.notDeepEqual(st.frames[2], before, 'epoch 1 fires every edge whose eps === 1, so something must have moved');
});

test('step returns an empty partial once the epochs run out, which is how Play stops', () => {
  let st = lpState();
  let guard = 0;
  while (guard++ <= LP.N_EPOCHS + 5) {
    const next = LP.step(st);
    if (!Object.keys(next).length) break;
    st = { ...st, ...next };
  }
  assert.equal(st.frames.length, LP.N_EPOCHS + 1, 'epoch 0 plus every epoch run');
  assert.deepEqual(LP.step(st), {}, 'an exhausted run must return an empty partial, not a repeated frame');
});

test('the same seed gives the same trajectory and a different seed does not', () => {
  const a = lpState({ seed: 1 }), b = lpState({ seed: 1 }), c = lpState({ seed: 2 });
  assert.deepEqual(a.frames[0], b.frames[0]);
  assert.notDeepEqual(a.frames[0], c.frames[0]);
});

test('changing the neighbours slider starts the run over rather than half-updating it', () => {
  const st = lpState();
  const next = LP.applyControl(st, 'k', 30);
  assert.equal(next.k, 30);
  assert.equal(next.frames.length, 1, 'the graph changed, so no earlier frame is reachable from it');
  assert.equal(next.play, false);
});

test('the scrubber shows an earlier epoch without discarding the later ones', () => {
  let st = lpState();
  for (let i = 0; i < 20; i++) st = { ...st, ...LP.step(st) };
  const scrubbed = { ...st, ...LP.applyControl(st, 'view', 5) };
  assert.equal(scrubbed.view, 5);
  assert.equal(scrubbed.frames.length, 21, 'scrubbing back must not throw away what was computed');
  assert.notEqual(LP.render(scrubbed), LP.render(st), 'the drawn epoch must actually change');
});

test('layout-play never produces a NaN coordinate at any min_dist the slider reaches', () => {
  // A NaN embedding renders as an empty figure with no error reported anywhere.
  // Spec §2(d): this was real, it came from an undamped fitter, and it was
  // believed for twenty minutes. The guard stays.
  for (const minDist of [0, 0.1, 0.5, 0.9, 1.0]) {
    let st = lpState({ minDist });
    for (let i = 0; i < 30; i++) st = { ...st, ...LP.step(st) };
    for (const p of st.frames[st.frames.length - 1]) {
      assert.ok(Number.isFinite(p[0]) && Number.isFinite(p[1]),
        `min_dist ${minDist} produced ${p}, which draws as an empty figure and reports nothing`);
    }
  }
});

test('stepping to the end reproduces umap() exactly, so the page and the tests agree', () => {
  // start() must consume the rng in the same order umap() does - graph, a/b fit,
  // random initialisation, then epochs - or the instrument would draw a
  // trajectory no claim in test/umap-claims.test.mjs describes. Bit-identical is
  // the right bar here: both paths call the same optimizeEpoch with the same
  // schedule, so anything less means the orders diverged.
  const c = BLOBS.configs.blobs;
  const X = c.xs.map((x, i) => [x, c.ys[i]]);
  let st = lpState({ seed: 7, k: 15 });
  for (let i = 0; i < LP.N_EPOCHS; i++) st = { ...st, ...LP.step(st) };
  const direct = UMAP.umap(X, { k: 15, seed: 7, nEpochs: LP.N_EPOCHS });
  assert.deepEqual(st.frames[st.frames.length - 1], direct.Y);
});

test('layout-play draws every point and reports which epoch is on screen', () => {
  let st = lpState();
  for (let i = 0; i < 10; i++) st = { ...st, ...LP.step(st) };
  const svg = LP.render(st);
  assert.match(svg, /^<svg[^>]*viewBox="0 0 640 460"/);
  assert.equal(roles(svg, 'pt'), 150);
  assert.match(texts(svg, 'epoch').join(' '), /10/, 'the reader has to know where in the run they are');
});

// ----------------------------------------------------------- seed-roulette

import * as SR from '../js/instruments/seed-roulette.mjs';

const srState = (over = {}) => {
  const c = BLOBS.configs.blobs;
  return { ...SR.defaults, idKey: 'sr1', dataset: 'blobs',
    columns: [c.xs, c.ys], truth: c.labels, k: 15, ...over };
};

test('seed-roulette draws six panels from six different seeds', () => {
  const svg = SR.render(srState());
  assert.equal(roles(svg, 'panel'), 6);
  assert.equal(new Set(SR.panels(srState()).map(p => p.seed)).size, 6);
});

test('every panel is labelled with BOTH numbers, never just the picture', () => {
  const svg = SR.render(srState());
  assert.equal(roles(svg, 'panel-local'), 6);
  assert.equal(roles(svg, 'panel-global'), 6);
  for (const t of texts(svg, 'panel-local')) assert.match(t, /\d\.\d\d/);
  for (const t of texts(svg, 'panel-global')) assert.match(t, /\d\.\d\d/);
});

test('the six panels sit in six different grid cells', () => {
  // Renamed from a name that claimed to test the shared frame; this only checks
  // grid placement, which six independently-scaled panels would pass just as
  // well as one shared frame would. The one-shared-frame property itself is
  // checked by the next test.
  const svg = SR.render(srState());
  const panels = [...svg.matchAll(/<g data-role="panel"[^>]*transform="translate\(([\d.]+) ([\d.]+)\)"/g)];
  assert.equal(panels.length, 6);
  assert.equal(new Set(panels.map(p => `${p[1]},${p[2]}`)).size, 6, 'each panel sits in its own cell');
});

test('the six panels share one frame: no panel is free to zoom to its own extent', () => {
  // Fix round 1: the previous version of this test (grid placement, kept above
  // under its own name) only proved the six panels sit in six different cells.
  // A per-panel isoFrame(p.Y, ...) - normalising every panel to fill its own
  // cell - passes that check too, and renders six perfectly plausible-looking
  // pictures, while silently destroying the one thing this figure exists to
  // do: a reader could then read a difference that is only a difference in
  // zoom. Proven by mutation below in the fix report.
  //
  // The exact check: pick the two panels whose underlying layouts (p.Y, before
  // any framing) have the most different x-extents, so the signal is as large
  // as possible. Read each chosen panel's drawn point x-extent straight from
  // its own path data, in the panel's own local coordinate space (the panel's
  // outer translate only positions the cell; it carries no scale, so reading
  // the un-translated path coordinates is exactly the on-screen extent).
  // Under one shared frame, both panels are drawn at the same units per pixel,
  // so screenExtent(a) / screenExtent(b) equals dataExtent(a) / dataExtent(b)
  // up to markPath's 2-decimal rounding. Under a per-panel frame each panel
  // is normalised to fill its cell, so the screen ratio collapses toward 1
  // regardless of the data ratio, and the assertion below fails.
  const st = srState();
  const svg = SR.render(st);
  const ps = SR.panels(st);

  const dataExtent = Y => Math.max(...Y.map(q => q[0])) - Math.min(...Y.map(q => q[0]));
  const dataExtents = ps.map(p => dataExtent(p.Y));

  let a = 0, b = 1, bestRatio = 0;
  for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) {
    const ratio = Math.max(dataExtents[i], dataExtents[j]) / Math.min(dataExtents[i], dataExtents[j]);
    if (ratio > bestRatio) { bestRatio = ratio; a = i; b = j; }
  }
  // Measured on this fixture: the chosen pair's data extents differ by about
  // 1.44x (panels 1 and 3, seeds 2 and 4). Recorded here so a future reader
  // can see the discrimination this test relies on is real, not incidental.

  const screenXsOf = i => {
    const start = svg.indexOf(`data-panel="${i}"`);
    const end = i + 1 < ps.length ? svg.indexOf(`data-panel="${i + 1}"`) : svg.indexOf('</svg>');
    const block = svg.slice(start, end);
    return [...block.matchAll(/data-role="pt" d="M(-?[\d.]+) /g)].map(m => Number(m[1]));
  };
  const screenExtent = i => { const xs = screenXsOf(i); return Math.max(...xs) - Math.min(...xs); };

  const dataRatio = dataExtents[a] / dataExtents[b];
  const screenRatio = screenExtent(a) / screenExtent(b);
  assert.ok(Math.abs(screenRatio - dataRatio) < 0.02,
    `panels ${a} and ${b} (data extents differ by ${bestRatio.toFixed(2)}x): screen ratio ${screenRatio.toFixed(4)} should equal data ratio ${dataRatio.toFixed(4)} under one shared frame`);
});

test('local structure barely moves across the six seeds and global structure does', () => {
  // The lesson's central claim, computed on the figure the reader is looking at
  // rather than asserted beside it.
  for (const name of ['blobs', 'crescents', 'biometry']) {
    const st = name === 'biometry'
      ? srState({ dataset: 'biometry', columns: [BIO.bpd, BIO.hc, BIO.ac, BIO.fl], truth: null })
      : srState({ dataset: name, columns: [BLOBS.configs[name].xs, BLOBS.configs[name].ys], truth: BLOBS.configs[name].labels });
    const p = SR.panels(st);
    const loc = p.map(v => v.local), glo = p.map(v => v.global);
    const locSpread = Math.max(...loc) - Math.min(...loc);
    const gloSpread = Math.max(...glo) - Math.min(...glo);
    assert.ok(locSpread < gloSpread,
      `${name}: local moved ${locSpread.toFixed(3)}, global ${gloSpread.toFixed(3)} - the figure's whole point is that local moves less`);
  }
});

test('the figure reports what it found rather than asserting a headline', () => {
  // Same rule restart-roulette learned the hard way: a title that promises six
  // different answers while drawing six identical ones teaches the opposite of
  // its point.
  const st = srState();
  assert.match(SR.spreadText(SR.panels(st)), /\d\.\d\d/);
  assert.match(SR.render(st), /data-role="spread"/);
});

test('seed-roulette reaches the uniform square, so the honest failure is reachable', () => {
  // Ruled explicitly by Andrew 2026-08-27: showing the failure mode is useful,
  // and a reader has to be able to get to it rather than be told about it.
  assert.ok(SR.controls.some(c => c.id === 'use-uniform'),
    'the structureless dataset must be one button away, per spec §8');
});

test('seed-roulette is deterministic: the same state renders the same markup', () => {
  assert.equal(SR.render(srState()), SR.render(srState()));
});

// ------------------------------------------------------------ umap-vs-truth

import * as UT from '../js/instruments/umap-vs-truth.mjs';

const utState = (over = {}) => ({ ...UT.defaults, idKey: 'ut1',
  columns: [BIO.bpd, BIO.hc, BIO.ac, BIO.fl], names: ['BPD', 'HC', 'AC', 'FL'],
  outcome: BIO.ga, k: 15, ...over });

test('umap-vs-truth draws every scan', () => {
  const svg = UT.render(utState());
  assert.match(svg, /^<svg[^>]*viewBox="0 0 640 460"/);
  assert.equal(roles(svg, 'pt'), 350);
});

test('gestational age is graduated dot AREA, linear in the value, smallest at the youngest', () => {
  // The Lichtenstein rule the owner set 2026-08-20: dots that show a gradient
  // vary in size. Area linear in the value means the radius goes as its square
  // root, and the smallest dot is the minimum of the range.
  const lo = 20, hi = 40;
  const rLo = UT.radiusOf(lo, lo, hi), rMid = UT.radiusOf(30, lo, hi), rHi = UT.radiusOf(hi, lo, hi);
  assert.ok(rLo < rMid && rMid < rHi, 'the dot must grow with gestational age');
  // Area linear in t: (r(t)^2 - r(0)^2) / (r(1)^2 - r(0)^2) === t
  const areaFrac = v => (UT.radiusOf(v, lo, hi) ** 2 - rLo ** 2) / (rHi ** 2 - rLo ** 2);
  assert.ok(Math.abs(areaFrac(30) - 0.5) < 0.01, `area at the midpoint was ${areaFrac(30)}, not 0.5`);
});

test('the closer prints the recovered number and the ceiling it is measured against', () => {
  const svg = UT.render(utState());
  const said = texts(svg, 'recovered').join(' ');
  assert.match(said, /0\.9\d\d/, 'the number has to be in text, never only in the picture');
  assert.match(said, /0\.9\d\d[\s\S]*0\.9\d\d/, 'a recovered value without its ceiling is not a claim');
});

test('the recovered value matches the measure the claims test pins', () => {
  const st = utState();
  const { Y, recovered, ceiling } = UT.embedding(st);
  assert.equal(Y.length, 350);
  assert.ok(Math.abs(recovered - 0.973) < 0.02, `recovered ${recovered}`);
  assert.ok(Math.abs(ceiling - 0.972) < 0.01, `ceiling ${ceiling}`);
});

test('the neighbours slider commits on change, because it recomputes a whole embedding', () => {
  // 96 ms in Node, 2 to 3x that in Safari. Fired per pixel of drag that is a
  // stall, not a control. Spec §11.
  const kc = UT.controls.find(c => c.id === 'k');
  assert.equal(kc.commit, 'change');
  assert.match(kc.label, /neighbour/i, 'lesson 4 spent a whole page teaching k as a count of groups');
});

test('a size key is drawn, because dot area is a channel the reader has to be taught', () => {
  const svg = UT.render(utState());
  assert.ok(roles(svg, 'key-dot') >= 3, 'at least three reference sizes');
  assert.equal(roles(svg, 'key-dot'), texts(svg, 'key-label').length, 'every key dot carries its own number');
});

test('the closer never draws a cluster: the biometry has a gradient, not groups', () => {
  // Spec §8. The embedding reproduces a gradient in gestational age and shows it
  // as an arc that a reader will be tempted to cut into groups. Nothing in this
  // figure may do the cutting for them.
  const svg = UT.render(utState());
  assert.equal(roles(svg, 'wall'), 0, 'no partition boundary belongs in this figure');
  assert.equal(roles(svg, 'center'), 0, 'and no cluster centres either');
});

test('umap-vs-truth is deterministic: the same state renders the same markup', () => {
  // SEED is a module constant, not state, so the poster frame and the live
  // mount must produce byte-identical output from the same input. Mirrors
  // knn-graph's "byte-identical markup" test and seed-roulette's own version -
  // the three lesson-5 instruments read as one family.
  assert.equal(UT.render(utState()), UT.render(utState()));
});

// ------------------------------------------------- poster and live must agree

test('the poster frame and the live mount start from the same seed', () => {
  // Spec §11: a poster generated from one seed beside a live mount that starts
  // from another makes the page visibly jump the moment JS loads. Lesson 4 could
  // not have this bug, because its poster state was fully determined by its
  // controls. This one is not.
  const poster = readFileSync(new URL('../figures/layout-play-blobs.svg', import.meta.url), 'utf8');
  const c = BLOBS.configs.blobs;
  const base = { ...LP.defaults, idKey: 'lp-blobs', dataset: 'blobs',
    columns: [c.xs, c.ys], truth: c.labels, k: 15, seed: 1,
    note: LP.DATASETS.blobs.note,
    labels_: { title: 'press Play. it starts as noise, every time.' } };
  const live = LP.render({ ...base, ...LP.start(base, 1) });
  assert.equal(poster.replace('<!-- generated by tools/poster.mjs -->\n', '').trim(), live.trim(),
    'regenerate with: node tools/poster.mjs');
});

test('the closer poster matches what the page will draw over it', () => {
  const poster = readFileSync(new URL('../figures/umap-vs-truth-biometry.svg', import.meta.url), 'utf8');
  const live = UT.render({ ...UT.defaults, idKey: 'ut-bio',
    columns: [BIO.bpd, BIO.hc, BIO.ac, BIO.fl], names: ['BPD', 'HC', 'AC', 'FL'],
    outcome: BIO.ga, k: 15,
    note: '350 simulated scans, 20-40 weeks. not patients.',
    labels_: { title: 'the algorithm never saw the dates. again.' } });
  assert.equal(poster.replace('<!-- generated by tools/poster.mjs -->\n', '').trim(), live.trim(),
    'regenerate with: node tools/poster.mjs');
});
