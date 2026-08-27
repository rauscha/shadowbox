# M7 - lesson 5 (UMAP) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `umap.html` - lesson 5 of shadowbox - with four live instruments, committed poster frames, and every prose number pinned by a test.

**Architecture:** The math core (`js/math/umap.mjs`) is already built, committed and pinned
against umap-learn 0.5.12. This plan adds a measurement pass that completes the spec's
claims table, a claims test written before any prose, four pure `render(state)` instruments
that consume the existing core, a page, and the poster frames. Nothing precomputes an
embedding: UMAP runs live at 96 ms worst case, so `layout-play` drives `optimizeEpoch`
through the Play loop `hydrate.mjs` already has.

**Tech Stack:** Vanilla ES modules, no dependencies, no build. `node --test` (Node 24) for
tests. Hand-run scripts with committed output (`tools/poster.mjs`,
`reference/umap-measure.mjs`). Python + `uv` only for the umap-learn ground-truth probe,
which is already committed and is not re-run by this plan.

**Spec:** `docs/superpowers/specs/2026-08-27-shadowbox-umap-design.md` (approved 2026-08-27;
read its **Status** block and §2 before starting).

## Global Constraints

Every task's requirements implicitly include this section. Values are copied verbatim from
the spec and `CLAUDE.md`.

- **Zero runtime dependencies. No node_modules, no build step.** Instruments are ES modules
  loaded directly by the page.
- **Tests:** `node --test`, Node 24. The suite is 195 tests / 405 ms today. This plan adds
  heavy sweeps; keep the whole suite under **60 seconds**.
- **`render(state)` is pure** and returns one complete `<svg>` string, always
  `viewBox="0 0 640 460"`, always containing exactly one `<svg>` and one `<title>`.
- **Every SVG id is prefixed `sb-${idKey}-`**, unique idKey per instrument instance per
  page. Every `url(#...)` must resolve to an id emitted in the same render.
- **Never an em-dash** (U+2014), in prose or in source. Spaced hyphen instead.
- **Nothing rides on hue.** Membership is mark shape (`js/lib/marks.mjs`), structure is a
  heavy drawn outline, magnitude is graduated dot area, edge strength is line weight. No
  translucent fills for meaning. The owner is colorblind and this is a hard constraint.
- **Controls are `slider`, `toggle` or `action` only.** `hydrate.mjs` keys control identity
  on `kind:id` and renders no other kind; any other kind never draws AND forces a full
  controls rebuild every frame, silently reintroducing the mobile drag bug fixed in
  `c397076`.
- **Page vocabulary, from spec §5.** Never write **"fuzzy simplicial set"** on the page - it
  is *the graph of who is near whom, with a weight saying how near*. Never write
  **"n_neighbors"**. Do not write **"manifold"** without earning it. Gloss **min_dist**
  before any control asks the reader to care.
- **`k` means neighbours in this lesson and groups in lesson 4.** Every control that has a
  `k` names it *neighbours* in its label. The page states out loud that the two k's are
  unrelated. Andrew flagged this on 2026-08-27 as a real comprehension hazard, not
  pedantry.
- **Embedding claims are ranges over seeds, never point values.** A single embedding number
  is not a reproducible fact.
- **Posters and the live view must start from the same seed.** A poster generated from one
  seed and a live mount that starts from another makes the page visibly jump when JS loads.
- **`data/births.json` is excluded from this lesson only** (spec §2b). It stays in lessons
  1, 2 and 4. Nothing in this plan may read it.
- **`pca.html:888` keeps "gestational age wearing a disguise"** by explicit ruling
  (`PROSE-GUIDE.md` rule 14). Do not sweep it out for consistency.

### Landmine: `epochsPerSample` ignores its `nEpochs` argument, and that is correct

`export function epochsPerSample(weight, nEpochs)` never reads `nEpochs`. This is not a
bug and must not be "fixed". umap-learn computes `n_samples = n_epochs * (w / w.max())`
then `result = n_epochs / n_samples`, and the `n_epochs` cancels exactly, leaving
`w.max() / w`. The module already returns that. The unused parameter is kept so the call
site reads like umap-learn's.

---

## File Structure

**Created:**

| file | responsibility |
|---|---|
| `js/lib/embed-metrics.mjs` | The three shared measures: local structure kept, global distance agreement, outcome recovered from neighbours. Imported by the instruments, the harness and the claims test, so a page number cannot drift from a measured one. |
| `js/instruments/knn-graph.mjs` | Stage one. Scatter plus drawn kNN edges, membership strength as line weight. One slider (neighbours). No seed control, and the absence is the point. |
| `js/instruments/layout-play.mjs` | Stage two. Live `optimizeEpoch` through the Play loop, epoch scrubber, reset-with-new-seed. Owns the only `step()` in the lesson. |
| `js/instruments/seed-roulette.mjs` | Six seeds, same data, same neighbours, as small multiples. Two measured numbers per panel. |
| `js/instruments/umap-vs-truth.mjs` | The closer. Embedding drawn against gestational age as graduated dot area. |
| `test/embed-metrics.test.mjs` | Hand-computable cases pinning what each measure means. |
| `test/instruments5.test.mjs` | Render and geometry tests for the four new instruments, plus the house-rules sweep over all four. |
| `test/umap-claims.test.mjs` | Pins every row of spec §7 against the same code the page runs. |
| `umap.html` | The lesson page. |
| `figures/*.svg` (four) | Committed poster frames, generated by `tools/poster.mjs`. |
| `results/umap-measure.log` | Committed output of the hand-run measurement harness. |

**Modified:**

| file | change |
|---|---|
| `js/math/umap.mjs` | Header comment only (lines 14-18). It claims a `trajectory()` export exists and that SGD is "far too slow to run per animation frame". Neither is true, and the second is what spec §2(a) reversed. |
| `js/lib/hydrate.mjs` | One additive option: a slider descriptor may declare `commit: 'change'`, binding the `change` event instead of `input`. |
| `reference/umap-measure.mjs` | Add the measures §7 cites but the harness does not compute. |
| `tools/poster.mjs` | Four new poster configs under a new `umap.html` entry. |
| `index.html`, `least-squares.html`, `covariance.html`, `pca.html`, `kmeans.html` | Trellis nav and the index lesson list go to five lessons. |
| `docs/superpowers/specs/2026-08-27-shadowbox-umap-design.md` | Only if measurement disagrees with §7. Measurement wins. |

### Two decisions this plan makes, flagged for Andrew

**1. `knn-graph` on biometry draws HC against AC while computing neighbours on all four
columns.** Spec §3.1 gives the instrument a dataset selector including biometry, but
biometry is four measurements and the figure draws a plane. Positioning on head
circumference against abdominal circumference reuses the pair `kmeans-step` already uses.
Some edges will visibly cross the picture, because they are four-dimensional neighbours
seen in a shadow - the same discomfort lesson 4's closer ends on, made literal. Task 4
pins it with a test. If Andrew would rather the selector drop biometry, that is a one-line
change to `DATASETS` plus deleting that test.

**2. `hydrate.mjs` gains an additive `commit: 'change'` option on sliders.** Spec §9 says
"no contract change", and no *instrument* contract changes. But §11 requires the closer's
k slider to recompute on `change` rather than `input`, and `hydrate.mjs` binds `input`
unconditionally today. A 96 ms recompute fired per pixel of drag - 2 to 3x that in Safari -
is the difference between a control and a stall. This is one line in `bindControls` plus a
test, and no existing instrument is affected.

---

## Task 1: Complete the measurement harness, then reconcile the spec to it

Nothing else may start until every number in §7 is reproducible from committed code. Three
groups of §7 rows are **not computed by anything committed today**: the neighbourhood GA
measure (0.972 and 0.971-0.974), the 30-seed crescents sweep, and the runtime row. They
were measured in-session and pasted into the spec.

**Files:**
- Create: `js/lib/embed-metrics.mjs`
- Create: `test/embed-metrics.test.mjs`
- Modify: `reference/umap-measure.mjs`
- Modify: `js/math/umap.mjs` (header comment, lines 14-18)
- Create: `results/umap-measure.log` (generated, committed)
- Modify: `docs/superpowers/specs/2026-08-27-shadowbox-umap-design.md` §7 (only if a number moved)

**Interfaces:**
- Consumes: `knn`, `euclidean`, `umap`, `fuzzyGraph` from `js/math/umap.mjs`; `zscoreColumns`, `kmeansRun`, `purity` from `js/math/kmeans.mjs`; `mulberry32` from `js/math/core.mjs`.
- Produces:
  - `knnRecall(X, Y, k) -> number` in [0,1]. Fraction of each point's k original neighbours still neighbours in the layout.
  - `distanceSpearman(X, Y) -> number` in [-1,1]. Rank correlation over all pairwise distances.
  - `gaFromNeighbours(P, y, k) -> number`. Share of the variation in `y` accounted for by predicting each point from the mean `y` of its k nearest neighbours **in P**. Pass raw rows for the ceiling, the 2D embedding for the result.
  - `rank(v) -> number[]`, `pearson(a, b) -> number` (exported for reuse; the harness already uses both).

- [ ] **Step 1: Write the failing test for the three measures**

Create `test/embed-metrics.test.mjs`:

```js
// The three measures lesson 5 quotes. Hand-computable cases only: the point is
// that each measure has a known answer at its extremes, so a refactor that
// quietly changes what "local structure kept" means fails here rather than as a
// wrong number on the page.
import test from 'node:test';
import assert from 'node:assert/strict';
import { knnRecall, distanceSpearman, gaFromNeighbours } from '../js/lib/embed-metrics.mjs';

test('local structure kept is 1 when the layout is the data itself', () => {
  const X = [[0, 0], [1, 0], [0, 1], [5, 5], [6, 5], [5, 6]];
  assert.equal(knnRecall(X, X.map(p => p.slice()), 2), 1);
});

test('local structure kept collapses when the layout interleaves two clusters', () => {
  const X = [[0, 0], [1, 0], [0, 1], [10, 10], [11, 10], [10, 11]];
  // Alternating, so each point's two nearest are now from the other cluster.
  const Y = [[0, 0], [10, 0], [1, 0], [11, 0], [2, 0], [12, 0]];
  const r = knnRecall(X, Y, 2);
  assert.ok(r < 0.5, `an interleaved layout should lose most neighbours, got ${r}`);
});

test('global distance agreement is 1 for a pure rescale', () => {
  const X = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]];
  const scaled = X.map(p => [p[0] * 3, 0]);
  assert.ok(Math.abs(distanceSpearman(X, scaled) - 1) < 1e-12);
});

test('global distance agreement is negative when the order of distances reverses', () => {
  const X = [[0, 0], [1, 0], [2, 0]];
  const Y = [[0, 0], [2, 0], [1, 0]];   // the far pair in X is the near pair in Y
  assert.ok(distanceSpearman(X, Y) < 0);
});

test('outcome from neighbours is 1 when neighbours share the outcome exactly', () => {
  const P = [[0, 0], [0.1, 0], [0, 0.1], [9, 9], [9.1, 9], [9, 9.1]];
  const y = [20, 20, 20, 40, 40, 40];
  assert.ok(Math.abs(gaFromNeighbours(P, y, 2) - 1) < 1e-12);
});

test('outcome from neighbours is poor when position says nothing about the outcome', () => {
  const P = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]];
  const y = [30, 22, 38, 24, 36, 28];        // deliberately anti-correlated with position
  assert.ok(gaFromNeighbours(P, y, 2) < 0.5);
});

test('outcome from neighbours refuses a k it cannot honour', () => {
  assert.throws(() => gaFromNeighbours([[0, 0], [1, 1]], [1, 2], 5), /k/);
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/embed-metrics.test.mjs`
Expected: FAIL with `Cannot find module '../js/lib/embed-metrics.mjs'`.

- [ ] **Step 3: Write `js/lib/embed-metrics.mjs`**

`knnRecall`, `rank`, `pearson` and `distanceSpearman` move here **verbatim** from
`reference/umap-measure.mjs` - they are already correct and already produced the §7
numbers. `gaFromNeighbours` is new.

```js
// The three measures lesson 5 quotes, in one place. The instruments, the
// measurement harness and the claims test all import from here, so a number
// drawn on the page and a number asserted in a test cannot come from two
// different definitions of the same word.
//
// Naming: the page never says "kNN recall" or "Spearman". It says how much of
// the local neighbourhood survived, and how well the distances between
// far-apart points survived. The function names keep the technical term; the
// labels_ strings on each instrument carry the plain one.

import { knn, euclidean } from '../math/umap.mjs';

// Fraction of each point's k original neighbours that survive as neighbours in
// the layout. The most honest one-number summary of "did local structure
// survive the flattening".
export function knnRecall(X, Y, k) {
  const a = knn(X, k).indices, b = knn(Y, k).indices;
  let hit = 0;
  for (let i = 0; i < a.length; i++) {
    const s = new Set(b[i]);
    for (const j of a[i]) if (s.has(j)) hit++;
  }
  return hit / (a.length * k);
}

export function rank(v) {
  const idx = v.map((x, i) => [x, i]).sort((p, q) => p[0] - q[0]);
  const r = new Array(v.length);
  for (let i = 0; i < idx.length;) {
    let j = i; while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
    const avg = (i + j) / 2 + 1;
    for (let t = i; t <= j; t++) r[idx[t][1]] = avg;
    i = j + 1;
  }
  return r;
}

export function pearson(a, b) {
  const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let sab = 0, sa = 0, sb = 0;
  for (let i = 0; i < n; i++) { const da = a[i] - ma, db = b[i] - mb; sab += da * db; sa += da * da; sb += db * db; }
  return sab / Math.sqrt(sa * sb);
}

// Global structure: do pairwise distances in the layout track pairwise distances
// in the original space? Spearman, over every pair.
export function distanceSpearman(X, Y) {
  const dx = [], dy = [];
  for (let i = 0; i < X.length; i++) for (let j = i + 1; j < X.length; j++) {
    dx.push(euclidean(X[i], X[j])); dy.push(euclidean(Y[i], Y[j]));
  }
  return pearson(rank(dx), rank(dy));
}

// Predict each point's outcome from the mean outcome of its k nearest
// neighbours IN P, and report the share of the outcome's variation that
// prediction accounts for. P is the raw rows for the ceiling and the 2D
// embedding for the result.
//
// This replaces the obvious measure - regress the outcome on the two embedding
// coordinates - which reads 0.261 to 0.971 depending on the seed and looks like
// a wildly unstable result. It is not unstable. It is a straight line fitted to
// a curved arc. Spec §2(c). The linear reading stays on the page as a lesson in
// picking the wrong instrument, never as the closer's number.
export function gaFromNeighbours(P, y, k) {
  const n = P.length;
  if (!(k >= 1 && k < n)) throw new Error(`gaFromNeighbours: k must be in [1, ${n - 1}], got ${k}`);
  const { indices } = knn(P, k);
  const my = y.reduce((a, b) => a + b, 0) / n;
  let sse = 0, sst = 0;
  for (let i = 0; i < n; i++) {
    let m = 0;
    for (const j of indices[i]) m += y[j];
    m /= k;
    sse += (y[i] - m) ** 2;
    sst += (y[i] - my) ** 2;
  }
  return 1 - sse / sst;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test test/embed-metrics.test.mjs`
Expected: PASS, 7 tests.

- [ ] **Step 5: Retire the stale header comment in `js/math/umap.mjs`**

Lines 14-18 currently end with: *"Lesson 4's Play loop drives frames from a live step();
this module instead precomputes a trajectory (see trajectory()) because UMAP's SGD is far
too slow to run per animation frame."* There is no `trajectory()` export, and the claim is
the exact one spec §2(a) reversed with measurement. Replace those two sentences with:

```js
// "start from a guess and improve" idiom lesson 4 introduced. Lesson 5 runs the
// whole thing live: 96 ms worst case on the largest committed dataset (biometry,
// n=350, k=50, 200 epochs), measured before the spec was written. layout-play
// drives optimizeEpoch through hydrate.mjs's Play loop one epoch at a time and
// ships no precomputed frames. An earlier draft of this comment asserted the
// opposite, and spec §2(a) records the correction.
```

- [ ] **Step 6: Extend `reference/umap-measure.mjs` to cover every §7 row**

Delete its local `knnRecall`, `rank`, `pearson` and `distanceSpearman` and import them from
`../js/lib/embed-metrics.mjs`, along with `gaFromNeighbours`. Keep `kmeansPurity`,
`bestSilhouette`, `silhouette` and `r2OnEmbedding` where they are - `r2OnEmbedding` stays
because §7's "the linear reading of the same closer" row is measured with it.

Extend the queue-preview line at the top to name sections 8, 9 and 10, so "what is still
running?" stays answerable from the log alone. Then append:

```js
log('== 8. crescents, 30 seeds: is UMAP better than k-means, or just different? ==');
{
  const S = SETS.crescents;
  const median = v => {
    const s = [...v].sort((a, b) => a - b), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  };
  for (const k of [5, 15, 30, 50]) {
    const p = [];
    for (let seed = 1; seed <= 30; seed++) {
      const { Y } = umap(S.X, { k, seed, nEpochs: 200 });
      p.push(purity(kmeansRun(Y, 2, mulberry32(7), { plusplus: true }).labels, S.truth, 2));
    }
    log(`  [${stamp()}] k=${String(k).padEnd(3)} median ${fmt(median(p))}  perfect ${p.filter(v => v > 0.999).length}/30  worst ${fmt(Math.min(...p))}`);
  }
  log(`  [${stamp()}] for comparison, k-means on the raw crescents at k=2 is 0.747 (kmeans-claims)`);
}
log('');

log('== 9. biometry closer: GA recovered from neighbours, not from a line ==');
{
  const S = SETS.biometry, ga = bio.ga;
  log(`  [${stamp()}] ceiling, the original 4-D measurements, k=15: ${fmt(gaFromNeighbours(S.X, ga, 15))}`);
  for (const k of [5, 15, 50]) {
    const v = [];
    for (let seed = 1; seed <= 10; seed++) {
      const { Y } = umap(S.X, { k, seed, nEpochs: 200 });
      v.push(gaFromNeighbours(Y, ga, 15));
    }
    log(`  [${stamp()}] embedding k=${String(k).padEnd(3)}, 10 seeds: ${fmt(Math.min(...v))}-${fmt(Math.max(...v))}`);
  }
}
log('');

log('== 10. runtime, the claim that this can run in a browser at all ==');
for (const [name, k] of [['blobs', 15], ['blobs', 50], ['biometry', 15], ['biometry', 50]]) {
  const S = SETS[name];
  const ms = d => Number(d) / 1e6;
  const t0 = process.hrtime.bigint();
  fuzzyGraph(S.X, k);
  const t1 = process.hrtime.bigint();
  umap(S.X, { k, seed: 1, nEpochs: 200 });
  const t2 = process.hrtime.bigint();
  log(`  [${stamp()}] ${name.padEnd(9)} n=${String(S.X.length).padEnd(4)} k=${String(k).padEnd(3)} graph ${ms(t1 - t0).toFixed(0)} ms   full 200-epoch run ${ms(t2 - t1).toFixed(0)} ms`);
}
```

- [ ] **Step 7: Run the harness and commit its output**

```bash
mkdir -p results
node reference/umap-measure.mjs 2>&1 | tee results/umap-measure.log
```

Expected: every section prints, no `NaN` anywhere, section 10 reports a biometry k=50 run
near 96 ms. Node does not buffer this; if `results/umap-measure.log` is empty a minute in,
that is a buffering bug to fix now rather than nine hours later.

- [ ] **Step 8: Reconcile spec §7 against the log**

Read `results/umap-measure.log` beside spec §7 and confirm every row.

**Measurement wins.** This is the standing house rule that produced this spec: lesson 3
asserted "PC2 = head-vs-body proportion" from textbook expectation and was half wrong. If a
number moved, edit §7 to the measured value and add a line under the table naming what
moved and when. Never adjust code to reproduce a number in the table.

**Stop and report** if a §7 row moved by more than rounding. The closer's 0.973 against a
0.972 ceiling is load-bearing for the whole lesson, and a real change there is Andrew's
call, not this plan's.

- [ ] **Step 9: Run the whole suite and commit**

Run: `node --test`
Expected: 202 pass, 0 fail (195 existing + 7 new). Test counts stated anywhere in
this plan are indicative: report the actual count, and treat a mismatch as
information rather than as a target to hit.

```bash
git add js/lib/embed-metrics.mjs test/embed-metrics.test.mjs reference/umap-measure.mjs \
        js/math/umap.mjs results/umap-measure.log \
        docs/superpowers/specs/2026-08-27-shadowbox-umap-design.md
git commit -m "measure: complete the M7 claims table from committed code"
```

---

## Task 2: Pin every claim, before any instrument or prose exists

Written now, on purpose. Spec §10 requires the claims test to exist before the prose does,
so the prose is written against measured numbers rather than the other way round.

**Files:**
- Create: `test/umap-claims.test.mjs`

**Interfaces:**
- Consumes: `umap`, `fuzzyGraph` from `js/math/umap.mjs`; `knnRecall`, `distanceSpearman`, `gaFromNeighbours` from `js/lib/embed-metrics.mjs`; `zscoreColumns`, `kmeansRun`, `purity`, `eta2` from `js/math/kmeans.mjs`; `mulberry32` from `js/math/core.mjs`.
- Produces: nothing importable. It is the gate every later task runs against.

- [ ] **Step 1: Write the claims test**

Create `test/umap-claims.test.mjs`. Mirror `test/kmeans-claims.test.mjs`: recompute with
the same code the page runs, record the measured value beside each assertion, and assert
ranges rather than point values for anything an embedding produced.

```js
// The claims umap.html makes in prose, pinned so they cannot drift silently.
// Mirrors test/kmeans-claims.test.mjs and test/pca-claims.test.mjs.
//
// Measured 2026-08-27 by reference/umap-measure.mjs; results/umap-measure.log is
// the committed output. Every embedding claim is a RANGE over seeds, never a
// point value - spec §7 - because a single embedding number is not a
// reproducible fact and the page computes a fresh one on every load.
//
// Runtime: this file embeds a few hundred times. Each dataset/k/seed is embedded
// ONCE and every metric read off that one layout; recomputing per metric roughly
// triples the file's cost for nothing.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { umap, fuzzyGraph } from '../js/math/umap.mjs';
import { knnRecall, distanceSpearman, gaFromNeighbours } from '../js/lib/embed-metrics.mjs';
import { zscoreColumns, kmeansRun, purity, eta2 } from '../js/math/kmeans.mjs';
import { mulberry32 } from '../js/math/core.mjs';

const read = p => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), 'utf8'));
const BLOBS = read('blobs.json');
const BIO = read('biometry.json');

const SETS = {
  blobs:     { X: rowsOf(BLOBS.configs.blobs),     truth: BLOBS.configs.blobs.labels,     k: 3 },
  crescents: { X: rowsOf(BLOBS.configs.crescents), truth: BLOBS.configs.crescents.labels, k: 2 },
  uniform:   { X: rowsOf(BLOBS.configs.uniform),   truth: null,                           k: 3 },
  biometry:  { X: zscoreColumns([BIO.bpd, BIO.hc, BIO.ac, BIO.fl]), truth: null,          k: 3 },
};
function rowsOf(c) { return c.xs.map((x, i) => [x, c.ys[i]]); }

const inRange = (v, lo, hi, what) =>
  assert.ok(v >= lo && v <= hi, `${what}: ${v} is outside the measured ${lo} to ${hi}`);
const median = v => {
  const s = [...v].sort((a, b) => a - b), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
// One embedding per (dataset, k, seed), reused by every metric that wants it.
const embed = (name, k, seed) => umap(SETS[name].X, { k, seed, nEpochs: 200 }).Y;

// ------------------------------------------------------- the graph is not seeded

test('the graph is seed-independent: same X and same neighbours give identical edges', () => {
  for (const name of ['blobs', 'biometry']) {
    const a = fuzzyGraph(SETS[name].X, 15), b = fuzzyGraph(SETS[name].X, 15);
    assert.equal(a.head.length, b.head.length);
    assert.deepEqual(a.head, b.head);
    assert.deepEqual(a.tail, b.tail);
    assert.ok(a.weight.every((w, i) => w === b.weight[i]), `${name}: edge weights moved`);
  }
});

test('the edge counts the prose quotes: blobs 1398, biometry 3329, at 15 neighbours', () => {
  assert.equal(fuzzyGraph(SETS.blobs.X, 15).head.length, 1398);
  assert.equal(fuzzyGraph(SETS.biometry.X, 15).head.length, 3329);
});

// ------------------------------------------- local is stable, global is not (§3.3)

test('local structure is stable across ten seeds and global structure is not', () => {
  // The single most useful thing a reader can carry away about reading somebody
  // else's UMAP plot, and it is measured rather than folklore.
  const expected = {
    blobs:     { local: [0.769, 0.799], global: [0.565, 0.763] },
    crescents: { local: [0.840, 0.890], global: [0.333, 0.703] },
    uniform:   { local: [0.756, 0.805], global: [0.589, 0.881] },
    biometry:  { local: [0.646, 0.655], global: [0.586, 0.965] },
  };
  const TOL = 0.02;      // ten seeds is a small sample of a stochastic optimiser
  for (const [name, want] of Object.entries(expected)) {
    const loc = [], glo = [];
    for (let seed = 1; seed <= 10; seed++) {
      const Y = embed(name, 15, seed);
      loc.push(knnRecall(SETS[name].X, Y, 15));
      glo.push(distanceSpearman(SETS[name].X, Y));
    }
    inRange(Math.min(...loc), want.local[0] - TOL, want.local[1], `${name} local min`);
    inRange(Math.max(...loc), want.local[0], want.local[1] + TOL, `${name} local max`);
    inRange(Math.min(...glo), want.global[0] - TOL, want.global[1], `${name} global min`);
    inRange(Math.max(...glo), want.global[0], want.global[1] + TOL, `${name} global max`);

    // The claim itself: the local spread is far tighter than the global one.
    const localSpread = Math.max(...loc) - Math.min(...loc);
    const globalSpread = Math.max(...glo) - Math.min(...glo);
    assert.ok(localSpread < globalSpread,
      `${name}: local moved ${localSpread.toFixed(3)}, global moved ${globalSpread.toFixed(3)} - the lesson's central claim is that local moves less`);
  }
});

test('on biometry the numbers are 0.009 against 0.379, which is the sentence the page prints', () => {
  const loc = [], glo = [];
  for (let seed = 1; seed <= 10; seed++) {
    const Y = embed('biometry', 15, seed);
    loc.push(knnRecall(SETS.biometry.X, Y, 15));
    glo.push(distanceSpearman(SETS.biometry.X, Y));
  }
  assert.ok(Math.max(...loc) - Math.min(...loc) < 0.03, 'local structure must barely move');
  assert.ok(Math.max(...glo) - Math.min(...glo) > 0.25, 'global structure must move a lot');
});

// -------------------------------------------------- neighbours are structural (§7)

test('the number of neighbours changes the picture: blobs local structure at k=2/5/15/50', () => {
  const want = [0.680, 0.720, 0.793, 0.773];
  [2, 5, 15, 50].forEach((k, i) => {
    const v = knnRecall(SETS.blobs.X, embed('blobs', k, 1), Math.min(k, 15));
    assert.ok(Math.abs(v - want[i]) < 0.05, `k=${k}: ${v} against a measured ${want[i]}`);
  });
});

// ------------------------------------- UMAP is not a strict improvement on k-means

test('crescents: UMAP beats k-means at many neighbours and loses to it at few', () => {
  // §8 requires both numbers to appear together. The k=5 median is WORSE than the
  // 0.747 k-means gets for free; the k=50 median is perfect. The method is not an
  // upgrade, it is a different bet, and the bet depends on a number you chose.
  const KMEANS_RAW = 0.747;
  // Measured by reference/umap-measure.mjs section 8; see results/umap-measure.log.
  // Three of these moved when the harness was made to compute them rather than
  // having them pasted in: k=5 median 0.660 -> 0.657, k=15 median 0.867 -> 0.830,
  // k=50 perfect 25/30 -> 24/30. Spec §7 was corrected to match, per the standing
  // rule that measurement wins.
  const want = {
    5:  { median: 0.657, perfect: 1 },
    15: { median: 0.830, perfect: 8 },
    30: { median: 1.000, perfect: 20 },
    50: { median: 1.000, perfect: 24 },
  };
  for (const [k, w] of Object.entries(want)) {
    const p = [];
    for (let seed = 1; seed <= 30; seed++) {
      const Y = embed('crescents', Number(k), seed);
      p.push(purity(kmeansRun(Y, 2, mulberry32(7), { plusplus: true }).labels, SETS.crescents.truth, 2));
    }
    assert.ok(Math.abs(median(p) - w.median) < 0.08, `k=${k} median ${median(p)} against ${w.median}`);
    const perfect = p.filter(v => v > 0.999).length;
    assert.ok(Math.abs(perfect - w.perfect) <= 5, `k=${k} perfect ${perfect}/30 against ${w.perfect}/30`);
  }
  // The comparison the page must never drop.
  const five = [];
  for (let seed = 1; seed <= 30; seed++) {
    const Y = embed('crescents', 5, seed);
    five.push(purity(kmeansRun(Y, 2, mulberry32(7), { plusplus: true }).labels, SETS.crescents.truth, 2));
  }
  assert.ok(median(five) < KMEANS_RAW,
    `at five neighbours UMAP must come out WORSE than k-means' ${KMEANS_RAW}, or §8's refusal has nothing to stand on`);
});

// --------------------------------------------- UMAP invents structure (§8, uniform)

test('uniform: a structureless square looks MORE grouped after UMAP, not less', () => {
  // The honest failure, and it has to be reachable in the instrument rather than
  // merely described. Ruled explicitly by Andrew 2026-08-27.
  const RAW = 0.444;                                  // best k-means k=2..6 on the raw square
  for (const k of [5, 15, 50]) {
    const sil = [];
    for (let seed = 1; seed <= 5; seed++) sil.push(bestSilhouette(embed('uniform', k, seed)));
    assert.ok(Math.min(...sil) > RAW,
      `k=${k}: after UMAP the apparent grouping (${Math.min(...sil).toFixed(3)}) must exceed the raw square's ${RAW}`);
    assert.ok(Math.max(...sil) < 0.72, `k=${k}: ${Math.max(...sil)} is higher than anything measured`);
  }
});

// bestSilhouette and silhouette are copied from reference/umap-measure.mjs rather
// than imported: they are a measurement detail of THIS claim, not a page-facing
// measure, and embed-metrics.mjs stays the set of three things the page names.
function bestSilhouette(Y) {
  let best = -1;
  for (let k = 2; k <= 6; k++) {
    const { labels } = kmeansRun(Y, k, mulberry32(7), { plusplus: true });
    best = Math.max(best, silhouette(Y, labels, k));
  }
  return best;
}
function silhouette(Y, labels, k) {
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  const groups = Array.from({ length: k }, () => []);
  labels.forEach((l, i) => groups[l].push(i));
  let total = 0, counted = 0;
  for (let i = 0; i < Y.length; i++) {
    const own = groups[labels[i]];
    if (own.length < 2) continue;
    let a = 0; for (const j of own) if (j !== i) a += dist(Y[i], Y[j]);
    a /= own.length - 1;
    let b = Infinity;
    for (let g = 0; g < k; g++) {
      if (g === labels[i] || !groups[g].length) continue;
      let m = 0; for (const j of groups[g]) m += dist(Y[i], Y[j]);
      b = Math.min(b, m / groups[g].length);
    }
    total += (b - a) / Math.max(a, b); counted++;
  }
  return counted ? total / counted : 0;
}

// -------------------------------------------------------------------- the closer

test('the embedding recovers gestational age as well as the four raw measurements do', () => {
  // The punchline: 0.973 against a ceiling of 0.972. Three unrelated machines -
  // PCA's first component, k-means' labels, this embedding - land on the same
  // answer. Approved 2026-08-27 as the closer's ONLY number.
  const ga = BIO.ga;
  const ceiling = gaFromNeighbours(SETS.biometry.X, ga, 15);
  assert.ok(Math.abs(ceiling - 0.972) < 0.01, `ceiling ${ceiling} against a measured 0.972`);

  for (const k of [5, 15, 50]) {
    const v = [];
    for (let seed = 1; seed <= 10; seed++) v.push(gaFromNeighbours(embed('biometry', k, seed), ga, 15));
    inRange(Math.min(...v), 0.955, 0.975, `k=${k} low end`);
    inRange(Math.max(...v), 0.960, 0.985, `k=${k} high end`);
    assert.ok(Math.max(...v) - Math.min(...v) < 0.02,
      `k=${k}: the closer must be rock stable across seeds, spread was ${(Math.max(...v) - Math.min(...v)).toFixed(4)}`);
  }
});

test("lesson 4's cluster labels reach 0.871 on the same data, and the page says so", () => {
  const km = kmeansRun(SETS.biometry.X, 3, mulberry32(11), { plusplus: true });
  assert.ok(Math.abs(eta2(BIO.ga, km.labels, 3) - 0.871) < 0.005);
});

test('the linear reading of the same closer is unstable, which is why it is not the closer', () => {
  // Regressing GA on the two embedding coordinates gives anything from 0.261 to
  // 0.971 depending on the seed. It reads as a wildly unstable result and is not
  // one: it is a straight line fitted to a curved arc. §2(c). This stays on the
  // page as a lesson about picking the wrong instrument.
  const v = [];
  for (let seed = 1; seed <= 10; seed++) v.push(r2OnEmbedding(embed('biometry', 15, seed), BIO.ga));
  assert.ok(Math.max(...v) - Math.min(...v) > 0.3,
    `the linear reading must be visibly unstable, spread was ${(Math.max(...v) - Math.min(...v)).toFixed(3)}`);
});

// Copied from reference/umap-measure.mjs. Only this one test uses it, and it
// exists to be shown failing rather than to measure anything the page trusts.
function r2OnEmbedding(Y, y) {
  const n = Y.length, X = Y.map(p => [1, p[0], p[1]]);
  const A = Array.from({ length: 3 }, () => new Array(3).fill(0)), c = new Array(3).fill(0);
  for (let i = 0; i < n; i++) for (let r = 0; r < 3; r++) {
    c[r] += X[i][r] * y[i];
    for (let s = 0; s < 3; s++) A[r][s] += X[i][r] * X[i][s];
  }
  for (let p = 0; p < 3; p++) {
    let piv = p; for (let r = p + 1; r < 3; r++) if (Math.abs(A[r][p]) > Math.abs(A[piv][p])) piv = r;
    [A[p], A[piv]] = [A[piv], A[p]]; [c[p], c[piv]] = [c[piv], c[p]];
    if (!A[p][p]) return NaN;
    for (let r = 0; r < 3; r++) {
      if (r === p) continue;
      const f = A[r][p] / A[p][p];
      for (let s = p; s < 3; s++) A[r][s] -= f * A[p][s];
      c[r] -= f * c[p];
    }
  }
  const beta = c.map((v, i) => v / A[i][i]);
  const my = y.reduce((a, b) => a + b, 0) / n;
  let ssr = 0, sst = 0;
  for (let i = 0; i < n; i++) {
    const p = beta[0] + beta[1] * Y[i][0] + beta[2] * Y[i][1];
    ssr += (y[i] - p) ** 2; sst += (y[i] - my) ** 2;
  }
  return 1 - ssr / sst;
}

// ---------------------------------------------------------------------- runtime

test('a full embedding is fast enough to run live, which is why no frames are shipped', () => {
  // Node/V8 only. Spec §11 keeps this as an inference about browsers until the
  // real-hardware check in Task 10.
  const t0 = process.hrtime.bigint();
  umap(SETS.biometry.X, { k: 50, seed: 1, nEpochs: 200 });
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms < 400, `the worst committed case took ${ms.toFixed(0)} ms; 96 ms was measured, and past ~400 the live design in §2(a) stops being honest`);
});
```

- [ ] **Step 2: Run it and read every failure**

Run: `node --test test/umap-claims.test.mjs`

Expected on a correct implementation: PASS. Any failure here is a **finding**, not a bug to
paper over. Compare against `results/umap-measure.log`, and if the log agrees with the
test but the spec does not, fix the spec per Task 1 Step 8.

- [ ] **Step 3: Check the suite's total runtime**

Run: `node --test`
Expected: PASS, and the reported `duration_ms` under 60000.

If it is over, the fix is caching, not deletion: hoist the per-seed embeddings into a
module-level memo keyed on `${name}:${k}:${seed}` so the crescents sweep and the closer
stop re-embedding the same configurations. **Do not** cut seeds to make it fast - the whole
point of a range claim is the range.

- [ ] **Step 4: Commit**

```bash
git add test/umap-claims.test.mjs
git commit -m "test: pin every claim in the M7 spec before the prose exists"
```

---

## Task 3: Teach `hydrate.mjs` to commit a slider on `change`

Small and isolated on purpose, so the reviewer can accept or reject it without touching an
instrument. Required by spec §11: the closer's neighbours slider triggers a 96 ms
recompute, and `hydrate.mjs` binds `input`, which fires on every pixel of a drag.

**Files:**
- Modify: `js/lib/hydrate.mjs` (`bindControls`)
- Modify: `test/hydrate.test.mjs`

**Interfaces:**
- Produces: an optional `commit: 'change'` field on a `slider` control descriptor. Absent means `input`, exactly as today. `visibleControls` and `updateControls` are untouched, so control identity, the in-place update path and the mobile-drag fix are all unaffected.

- [ ] **Step 1: Write the failing test**

Append to `test/hydrate.test.mjs`. **Write two tests, not one.**

`test/hydrate.test.mjs` already stubs `globalThis.document` and hand-rolls fake element
objects to exercise `mount()` without a browser - see the existing tests
`'the Play loop never leaves the same callback scheduled twice'`,
`'pointer and keyboard drag listeners live on the container, attached exactly once, never
on the replaceable svg'`, and `'rerender() actually uses updateControls, and never rebinds
a control that survived in place'`. Mirror that machinery. A test that only checks
`controlsMarkup` cannot fail if `bindControls` binds the wrong event, which is the entire
behaviour being added.

**Test 1, the real one: the declared event is the event actually bound.** Mount an
instrument whose controls are two sliders - one plain, one carrying `commit: 'change'` -
and record the event names each fake `<input>` node receives through `addEventListener`.
Assert the plain slider got `input` and the committing slider got `change`, and that
neither got both. Model the fake nodes on whichever existing test in this file is closest;
do not invent a new stub style.

**Test 2, the guard: the option never leaks into the markup or into control identity.**

```js
test('a slider that commits on change still renders and keys identically', () => {
  const controls = [
    { id: 'k', kind: 'slider', label: 'neighbours (k)', min: 1, max: 30, step: 1, commit: 'change' },
  ];
  const state = { k: 15 };
  assert.equal(visibleControls(controls, state).length, 1);
  const html = controlsMarkup(controls, state);
  assert.match(html, /type="range"/);
  assert.match(html, /data-control="k"/);
  assert.ok(!html.includes('commit'), 'commit is a binding hint, never an attribute on the node');
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `node --test test/hydrate.test.mjs`
Expected: FAIL on the `commit` assertion only if `controlsMarkup` leaks the field; if it
already passes, that is fine - the assertion exists to keep it true.

- [ ] **Step 3: Bind the declared event**

In `bindControls`, replace the slider binding with one that reads the descriptor. The
descriptor lookup is by id because `controlsMarkup` writes `data-control="${c.id}"` and
nothing else identifies a node back to its descriptor.

```js
    controlsEl.querySelectorAll('input[data-control]').forEach(input => {
      // A slider may declare commit: 'change' to fire once per released drag
      // rather than once per pixel. Lesson 5's closer recomputes a whole
      // embedding on this event (96 ms in Node, 2 to 3x that in Safari), which
      // is a control at 'change' and a stall at 'input'. Anything cheap leaves
      // the field off and keeps the live 'input' feel.
      const desc = instrument.controls.find(c => c.kind === 'slider' && c.id === input.dataset.control);
      const evName = desc && desc.commit === 'change' ? 'change' : 'input';
      input.addEventListener(evName, () => apply(input.dataset.control, Number(input.value)));
    });
```

- [ ] **Step 4: Run the tests**

Run: `node --test test/hydrate.test.mjs`
Expected: PASS.

Run: `node --test`
Expected: PASS, no existing instrument affected (none declares `commit`).

- [ ] **Step 5: Commit**

```bash
git add js/lib/hydrate.mjs test/hydrate.test.mjs
git commit -m "hydrate: let a slider declare commit: change

Additive and opt-in. Lesson 5's closer recomputes a whole embedding per event,
which is a control at change and a stall at input. No existing instrument
declares it, and control identity, the in-place update path and the mobile-drag
fix are all untouched."
```

---

## Task 4: `knn-graph` - the idea the lesson has to teach first

Stage one, and the only instrument with no seed, which is the point being made: given the
data and the number of neighbours there is exactly one graph.

**Files:**
- Create: `js/instruments/knn-graph.mjs`
- Create: `test/instruments5.test.mjs`

**Interfaces:**
- Consumes: `fuzzyGraph` from `js/math/umap.mjs`; `zscoreColumns` from `js/math/kmeans.mjs`; `isoFrame`, `F` from `js/lib/frame.mjs`; `markPath`, `markFor` from `js/lib/marks.mjs`.
- Produces, for Tasks 5 to 8 and `tools/poster.mjs`:
  - `name: 'knn-graph'`
  - `DATASETS: Record<string, {cols: string[], pos: [string, string], standardize: boolean, note: string, k: number}>`
  - `defaults: object`, `posterState: null`, `controls: Control[]`
  - `rowsOf(st) -> number[][]` - the rows the graph is computed on
  - `positionsOf(st) -> number[][]` - the 2D coordinates the points are drawn at
  - `graphOf(st) -> {head, tail, weight}`
  - `setDataset(st, name, data) -> partial`
  - `applyControl(st, id, value) -> partial`, `applyDrag() -> {}`
  - `render(state) -> string`

- [ ] **Step 1: Write the failing tests**

Create `test/instruments5.test.mjs`. Reuse the helper shape from
`test/instruments4.test.mjs` verbatim (`roles`, `attrs`, `texts`, `EM_DASH`) so the two
files describe the SVG the same way.

```js
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
  assert.ok(Math.max(...len) > 4 * med,
    'if no edge looks wrong in the shadow, the figure is not teaching what it was chosen to teach');
});

test('knn-graph refuses a k the data cannot support', () => {
  assert.throws(() => KG.graphOf(kgState({ k: 200 })), /k/);
});
```

- [ ] **Step 2: Run and watch every test fail**

Run: `node --test test/instruments5.test.mjs`
Expected: FAIL, `Cannot find module '../js/instruments/knn-graph.mjs'`.

- [ ] **Step 3: Write `js/instruments/knn-graph.mjs`**

```js
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

  if (st.note) parts.push(`<text data-role="note" x="${PLOT.x0}" y="${H - 14}" font-size="11" fill="var(--text-light)">${st.note}</text>`);
  parts.push(`</svg>`);
  return parts.join('\n');
}
```

- [ ] **Step 4: Run the tests until they pass**

Run: `node --test test/instruments5.test.mjs`
Expected: PASS, 8 tests.

The biometry long-edge test is the one that may need real numbers rather than a guess. If
`Math.max(...len) > 4 * med` does not hold, **measure before loosening it**: print the
ratio, and if the picture genuinely does not disagree with the graph, that is a finding
worth reporting - it would mean HC and AC alone carry the four-dimensional neighbourhood,
which is itself a sentence for the page.

- [ ] **Step 5: Commit**

```bash
git add js/instruments/knn-graph.mjs test/instruments5.test.mjs
git commit -m "feat: knn-graph, stage one of lesson 5

Membership strength as line weight, no seed control, and biometry's neighbours
computed on all four measurements while the picture draws two of them."
```

---

## Task 5: `layout-play` - the part with the seed

Stage two, and the only instrument in the lesson with a `step()`. Reuses `hydrate.mjs`'s
Play loop exactly as M6 built it: one call to `optimizeEpoch` per tick, an empty return
when the epochs run out.

**Files:**
- Create: `js/instruments/layout-play.mjs`
- Modify: `test/instruments5.test.mjs`

**Interfaces:**
- Consumes: `fuzzyGraph`, `fitAB`, `epochsPerSample`, `randomInit`, `optimizeEpoch` from `js/math/umap.mjs`; `mulberry32` from `js/math/core.mjs`; `isoFrame`, `F` from `js/lib/frame.mjs`; `markPath`, `markFor` from `js/lib/marks.mjs`.
- Produces:
  - `name: 'layout-play'`, `defaults`, `posterState: null`, `controls`
  - `N_EPOCHS = 200`
  - `start(st, seed) -> partial` - builds the graph, the a/b fit, the sampling schedule and the raw initialisation. Returns `{seed, run, frames, view, play: false}`.
  - `step(st) -> partial` - one epoch. Returns `{}` when the run is exhausted, which is how the Play loop learns to stop.
  - `applyControl(st, id, value) -> partial`, `applyDrag() -> {}`, `render(state) -> string`
  - The optimiser's carry state lives in `st.run` (`{graph, a, b, eps, eons, eopns, rng}`) and is never serialized. `st.frames` is the trajectory so far; `st.view` is the epoch on screen.

- [ ] **Step 1: Write the failing tests**

Append to `test/instruments5.test.mjs`:

```js
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
  // The movement check is at frames[2], not frames[1]. See the next test: epoch
  // 0 provably moves nothing, and an earlier draft of this file asserted the
  // opposite from expectation rather than measurement.
  st = { ...st, ...LP.step(st) };
  assert.equal(st.frames.length, 3);
  assert.notDeepEqual(st.frames[2], before, 'by the second epoch the layout must have moved');
});

test('the first epoch provably moves nothing, and umap-learn behaves the same way', () => {
  // Recorded as a fact rather than left as a surprise, because it is visible to
  // the reader: the first click of Step advances the epoch readout without
  // moving a single dot.
  //
  // The proof: epochsPerSample returns max(weight)/weight[e], whose minimum is
  // exactly 1 (attained by the strongest edge, measured at 1.000000 across all
  // 1398 blobs edges at k=15). eons is initialised to eps. optimizeEpoch skips
  // an edge while eons[e] > epoch. So at epoch 0 no edge, in any dataset, at any
  // k, on any seed, can fire. umap-learn uses the identical condition.
  //
  // Do not "fix" this by shifting the epoch numbering: the parity test below
  // pins that stepping to the end reproduces umap() bit-identically, and that
  // is worth more than a cosmetic first click.
  let st = lpState();
  const init = st.frames[0].map(p => p.slice());
  st = { ...st, ...LP.step(st) };
  assert.deepEqual(st.frames[1], init, 'epoch 0 must be a no-op, by construction');
  st = { ...st, ...LP.step(st) };
  assert.notDeepEqual(st.frames[2], init, 'epoch 1 is where the layout starts moving');
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
```

- [ ] **Step 2: Run and watch them fail**

Run: `node --test test/instruments5.test.mjs`
Expected: FAIL, `Cannot find module '../js/instruments/layout-play.mjs'`.

- [ ] **Step 3: Write `js/instruments/layout-play.mjs`**

```js
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/instruments5.test.mjs`
Expected: PASS, 16 tests.

- [ ] **Step 5: Commit**

```bash
git add js/instruments/layout-play.mjs test/instruments5.test.mjs
git commit -m "feat: layout-play, the live optimisation through M6's Play loop

One optimizeEpoch per tick, an empty partial when the epochs run out, and the
trajectory kept so the scrubber can go back to the noise it started from."
```

---

## Task 6: `seed-roulette` - the direct callback to `restart-roulette`

Six seeds, same data, same neighbours, as small multiples. Each panel labelled with the two
numbers the lesson actually turns on. This is where lesson 5's central honest claim lives.

**Files:**
- Create: `js/instruments/seed-roulette.mjs`
- Modify: `test/instruments5.test.mjs`

**Interfaces:**
- Consumes: `umap` from `js/math/umap.mjs`; `knnRecall`, `distanceSpearman` from `js/lib/embed-metrics.mjs`; `zscoreColumns` from `js/math/kmeans.mjs`; `isoFrame`, `F` from `js/lib/frame.mjs`; `markPath`, `markFor` from `js/lib/marks.mjs`.
- Produces: `name`, `RUNS = 6`, `seedOf(i) -> number`, `defaults`, `posterState: null`, `controls`, `rowsOf(st)`, `panels(st) -> {seed, Y, local, global}[]`, `spreadText(panels) -> string`, `applyControl`, `applyDrag`, `render`.

- [ ] **Step 1: Write the failing tests**

Append to `test/instruments5.test.mjs`:

```js
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

test('the six panels share one frame, so this is a comparison and not six pictures', () => {
  // Six layouts at six scales would let a reader read a difference that is only
  // a difference in zoom.
  const svg = SR.render(srState());
  const panels = [...svg.matchAll(/<g data-role="panel"[^>]*transform="translate\(([\d.]+) ([\d.]+)\)"/g)];
  assert.equal(panels.length, 6);
  assert.equal(new Set(panels.map(p => `${p[1]},${p[2]}`)).size, 6, 'each panel sits in its own cell');
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
```

- [ ] **Step 2: Run and watch them fail**

Run: `node --test test/instruments5.test.mjs`
Expected: FAIL, `Cannot find module '../js/instruments/seed-roulette.mjs'`.

- [ ] **Step 3: Write `js/instruments/seed-roulette.mjs`**

Follow `js/instruments/restart-roulette.mjs` closely: same 3-across-by-2-down grid, same
`CELL_W` / `CELL_H` / `GUTTER` constants, same one-shared-frame rule. Two differences that
matter:

1. **The shared frame is computed from all six layouts together**, not from the input data,
   because each layout lands wherever the optimiser left it. Pool every panel's coordinates
   into one `isoFrame` so the six panels are on one scale.
2. **Each panel carries two numbers, not a rank.** There is no "cheapest" here - no panel
   is better than another, which is exactly the thing the figure exists to say. Do not add
   a winner glyph.

```js
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
```

```js
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
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/instruments5.test.mjs`
Expected: PASS, 23 tests.

If the "local moves less than global" assertion fails on any dataset, **stop**. That is the
lesson's central claim and a failure is a finding, not a test to relax.

- [ ] **Step 5: Check how long six embeddings take on the largest dataset**

Run: `node -e "import('./js/instruments/seed-roulette.mjs').then(async SR => { const fs=await import('node:fs'); const bio=JSON.parse(fs.readFileSync('data/biometry.json','utf8')); const st={...SR.defaults, idKey:'x', dataset:'biometry', columns:[bio.bpd,bio.hc,bio.ac,bio.fl], truth:null, k:15}; const t=Date.now(); SR.render(st); console.log(Date.now()-t, 'ms'); })"`

Expected: under 700 ms. Six runs at up to 96 ms each plus the metrics. Record the number.
If it exceeds ~1.5 s, note it for Task 10's real-hardware check rather than optimising
blind - the poster covers the first paint either way.

- [ ] **Step 6: Commit**

```bash
git add js/instruments/seed-roulette.mjs test/instruments5.test.mjs
git commit -m "feat: seed-roulette, six seeds on one frame with two numbers each

No panel is ranked and no panel wins: six embeddings have no ordering, and
inventing one would teach that some seeds are right."
```

---

## Task 7: `umap-vs-truth` - the closer, and the third route to the same answer

Embed the four biometry measurements, then show the embedding against gestational age,
which the algorithm never saw.

**Files:**
- Create: `js/instruments/umap-vs-truth.mjs`
- Modify: `test/instruments5.test.mjs`

**Interfaces:**
- Consumes: `umap` from `js/math/umap.mjs`; `gaFromNeighbours` from `js/lib/embed-metrics.mjs`; `zscoreColumns` from `js/math/kmeans.mjs`; `isoFrame`, `F` from `js/lib/frame.mjs`.
- Produces: `name`, `SEED = 1`, `NEIGHBOURS_FOR_RECOVERY = 15`, `defaults`, `posterState: null`, `controls`, `embedding(st) -> {Y, recovered, ceiling}`, `radiusOf(v, lo, hi) -> number`, `applyControl`, `applyDrag`, `render`.

- [ ] **Step 1: Write the failing tests**

Append to `test/instruments5.test.mjs`:

```js
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
```

- [ ] **Step 2: Run and watch them fail**

Run: `node --test test/instruments5.test.mjs`
Expected: FAIL, `Cannot find module '../js/instruments/umap-vs-truth.mjs'`.

- [ ] **Step 3: Write `js/instruments/umap-vs-truth.mjs`**

```js
// umap-vs-truth - the closer, and the third route to the same answer.
//
// Embed the four biometry measurements, then draw the embedding with each point
// sized by gestational age, which the algorithm never saw.
//   - PCA's first component was gestational age in disguise (lesson 3).
//   - k-means' cluster labels were gestational age wearing a costume (lesson 4).
//   - The embedding recovers gestational age at 0.973 against a ceiling of 0.972.
// Three unrelated machines, one answer, and the page says so plainly.
//
// The number is a NEIGHBOURHOOD measure - predict each scan's gestational age
// from the mean age of its fifteen neighbours in the embedding - not a straight
// line fitted to the two coordinates. The linear reading gives 0.261 to 0.971
// depending on the seed, which reads as wild instability and is nothing of the
// sort: it is a line fitted to a curved arc. Spec §2(c). Approved 2026-08-27:
// this figure carries the neighbourhood number ALONE, and the linear failure is
// taught in the prose rather than given equal footing here.
//
// Gestational age is continuous, so it cannot be a mark shape. It is graduated
// dot area, area linear in the value, smallest dot at the youngest scan - the
// owner's Lichtenstein rule of 2026-08-20, the same one halftone.mjs follows.
//
// Pure: render(state) -> SVG string.

import { umap } from '../math/umap.mjs';
import { gaFromNeighbours } from '../lib/embed-metrics.mjs';
import { zscoreColumns } from '../math/kmeans.mjs';
import { isoFrame, F } from '../lib/frame.mjs';

export const name = 'umap-vs-truth';

// Fixed, and shared with the poster config in tools/poster.mjs. A poster drawn
// from one seed beside a live mount that starts from another makes the page jump
// the moment JS loads.
export const SEED = 1;
export const N_EPOCHS = 200;
export const NEIGHBOURS_FOR_RECOVERY = 15;

export const R_MIN = 1.3, R_MAX = 5.2;

export const defaults = {
  idKey: 'umap-vs-truth',
  columns: null,                 // [BPD, HC, AC, FL]
  names: null,
  outcome: null,                 // gestational age, which the algorithm never sees
  outcomeName: 'gestational age (weeks)',
  k: 15,
  note: '',
  labels_: { title: 'the algorithm never saw the dates. again.' },
};

export const posterState = null;

export const controls = [
  // commit: 'change' - this slider recomputes a whole 200-epoch embedding, 96 ms
  // in Node and 2 to 3x that in Safari. On 'input' that fires per pixel of drag.
  { id: 'k', kind: 'slider', label: 'how many neighbours (k)', min: 5, max: 50, step: 5, commit: 'change' },
];

// Area linear in the value, so the radius goes as the square root. The smallest
// dot is the minimum of the range, never zero - a scan drawn at zero radius is a
// scan the reader cannot count.
export function radiusOf(v, lo, hi) {
  const t = hi > lo ? (v - lo) / (hi - lo) : 0;
  return Math.sqrt(R_MIN * R_MIN + t * (R_MAX * R_MAX - R_MIN * R_MIN));
}

export function embedding(st) {
  const X = zscoreColumns(st.columns);
  const { Y } = umap(X, { k: st.k, seed: SEED, nEpochs: N_EPOCHS });
  return {
    Y,
    recovered: gaFromNeighbours(Y, st.outcome, NEIGHBOURS_FOR_RECOVERY),
    ceiling: gaFromNeighbours(X, st.outcome, NEIGHBOURS_FOR_RECOVERY),
  };
}

export function applyControl(st, id, value) { return { [id]: value }; }
export function applyDrag() { return {}; }
```

```js
// ---------------------------------------------------------------- render

const W = 640, H = 460;
const PLOT = { x0: 40, y0: 66, x1: W - 40, y1: H - 56 };

// "A, B, C and D" - no oxford comma, matching label-vs-truth's caption voice.
function listNames(names) {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export function render(state) {
  const st = { ...defaults, ...state };
  const { idKey } = st;
  const id = s => `sb-${idKey}-${s}`;
  const names = st.names && st.names.length ? st.names : ['BPD', 'HC', 'AC', 'FL'];
  const { Y, recovered, ceiling } = embedding(st);

  const lo = Math.min(...st.outcome), hi = Math.max(...st.outcome);
  const frame = isoFrame(Y.map(p => p[0]), Y.map(p => p[1]), PLOT);

  const parts = [];
  parts.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="'IBM Plex Sans', Arial, sans-serif">`);
  parts.push(`<title>A UMAP embedding of ${Y.length} scans built from four biometry measurements, with each scan drawn as a dot whose area is its gestational age - a number the algorithm never saw. The scans lie along an arc that runs from the youngest to the oldest.</title>`);
  parts.push(`<defs><clipPath id="${id('clip')}"><rect x="${PLOT.x0}" y="${PLOT.y0}" width="${F(PLOT.x1 - PLOT.x0)}" height="${F(PLOT.y1 - PLOT.y0)}"/></clipPath></defs>`);

  parts.push(`<text x="${PLOT.x0}" y="26" font-size="14" fill="var(--text)" font-family="'IBM Plex Serif', Georgia, serif" font-style="italic">${st.labels_.title}</text>`);
  // The number in text, never only as the picture the arc makes of it. Both
  // halves of the claim in one sentence: a recovered value without the ceiling
  // it is measured against is not a claim, it is a decoration.
  parts.push(`<text data-role="recovered" x="${PLOT.x0}" y="47" font-size="12.5" fill="var(--heading)">a scan's neighbours here predict its age to ${recovered.toFixed(3)}. the four raw measurements themselves reach ${ceiling.toFixed(3)}.</text>`);
  parts.push(`<text data-role="axes-warning" x="${PLOT.x0}" y="62" font-size="11" fill="var(--text-light)">neither axis means anything. the arc does.</text>`);

  parts.push(`<rect x="${PLOT.x0}" y="${PLOT.y0}" width="${F(PLOT.x1 - PLOT.x0)}" height="${F(PLOT.y1 - PLOT.y0)}" fill="none" stroke="var(--border)" stroke-width="1.5"/>`);
  parts.push(`<g clip-path="url(#${id('clip')})">`);
  for (let i = 0; i < Y.length; i++) {
    const r = radiusOf(st.outcome[i], lo, hi);
    // A plain circle, sized. No mark shape: shape is membership in this codebase
    // and there is no membership here. No partition wall and no centres either -
    // the biometry has a gradient, not groups, and nothing in this figure may do
    // the reader's cutting for them. Spec §8.
    parts.push(`<circle data-role="pt" cx="${F(frame.x(Y[i][0]))}" cy="${F(frame.y(Y[i][1]))}" r="${F(r)}" fill="var(--heading)"/>`);
  }
  parts.push(`</g>`);

  // Size key, bottom right, on an opaque chip so it reads over the cloud - the
  // same trick restart-roulette's cheapest badge uses. Dot area is a channel the
  // reader has to be taught, and it is taught with numbers, not a gradient bar.
  {
    const kx = PLOT.x1 - 150, ky = PLOT.y1 - 34;
    parts.push(`<g data-role="key">`);
    parts.push(`<rect x="${F(kx - 8)}" y="${F(ky - 16)}" width="150" height="30" fill="var(--bg)"/>`);
    const stops = [lo, (lo + hi) / 2, hi];
    stops.forEach((v, i) => {
      const cx = kx + 14 + i * 44;
      parts.push(`<circle data-role="key-dot" cx="${F(cx)}" cy="${F(ky - 2)}" r="${F(radiusOf(v, lo, hi))}" fill="var(--heading)"/>`);
      parts.push(`<text data-role="key-label" x="${F(cx)}" y="${F(ky + 12)}" text-anchor="middle" font-size="9.5" fill="var(--text)">${Math.round(v)} wk</text>`);
    });
    parts.push(`</g>`);
  }

  parts.push(`<text x="${PLOT.x0}" y="${F(PLOT.y1 + 20)}" font-size="10" fill="var(--text-light)">embedded from ${listNames(names)}. gestational age was never shown to the algorithm.</text>`);
  if (st.note) parts.push(`<text data-role="note" x="${PLOT.x0}" y="${F(PLOT.y1 + 36)}" font-size="11" fill="var(--text-light)">${st.note}</text>`);
  parts.push(`</svg>`);
  return parts.join('\n');
}
```

Note the point element is a `<circle>`, not a `markPath` result. Mark shape means cluster
membership everywhere else in this codebase, and there is no membership here - reusing it
would say "these are groups" in the one figure whose whole job is to say they are not.
The test reads `data-role="pt"`, so the element type is free.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `node --test test/instruments5.test.mjs`
Expected: PASS, 30 tests.

- [ ] **Step 5: Commit**

```bash
git add js/instruments/umap-vs-truth.mjs test/instruments5.test.mjs
git commit -m "feat: umap-vs-truth, the closer

Gestational age as graduated dot area, the neighbourhood measure alone beside
the ceiling it is measured against, and a k slider that commits on change."
```

---

## Task 8: The page, the posters, and seed parity between them

**Files:**
- Create: `umap.html`
- Modify: `tools/poster.mjs`
- Create: `figures/knn-graph-crescents.svg`, `figures/layout-play-blobs.svg`, `figures/seed-roulette-blobs.svg`, `figures/umap-vs-truth-biometry.svg` (all generated)
- Modify: `test/poster.test.mjs`

**Interfaces:**
- Consumes: all four instrument modules; `createStore`, `mount` from `js/lib/hydrate.mjs`.
- Produces: four `<!-- poster:KEY -->` marker pairs in `umap.html` and four mount ids: `kg-cres`, `lp-blobs`, `sr-blobs`, `ut-bio`.

- [ ] **Step 1: Write `umap.html` with prose slots, not prose**

Copy `kmeans.html`'s skeleton exactly: same `<head>`, same font links, same stylesheet,
same `<nav class="trellis">` (now with five entries and `<span aria-current="page">5
UMAP</span>`), same `<div class="instrument-mount" id="...">` wrapper around each poster
marker pair, same closing `<script type="module">`.

Where prose goes, leave `<!-- PROSE: what this section has to say -->` markers. Task 9
fills them. The house-rules test in Task 10 asserts no `<!-- PROSE` survives into the
shipped page, which is the mechanism that stops a slot shipping empty.

The hydration script, modelled on `kmeans.html`'s:

```js
  <script type="module">
    import * as KG from './js/instruments/knn-graph.mjs';
    import * as LP from './js/instruments/layout-play.mjs';
    import * as SR from './js/instruments/seed-roulette.mjs';
    import * as UT from './js/instruments/umap-vs-truth.mjs';
    import { createStore, mount } from './js/lib/hydrate.mjs';

    // The birth-weight dataset is deliberately absent. 78 duplicate rows out of
    // 400 and about 22 percent of k-th neighbours decided by floating-point
    // rounding make it unusable for anything built on a neighbour graph. It
    // stays in lessons 1, 2 and 4, which never ask who your neighbours are.
    // Spec §2(b). Task 10's sweep pins that this page never loads it.
    const load = name => fetch(`data/${name}.json`).then(r => r.json());

    Promise.all([load('blobs'), load('biometry')]).then(([blobs, bio]) => {
      const SETS = {
        blobs:     { columns: [blobs.configs.blobs.xs, blobs.configs.blobs.ys],         truth: blobs.configs.blobs.labels },
        crescents: { columns: [blobs.configs.crescents.xs, blobs.configs.crescents.ys], truth: blobs.configs.crescents.labels },
        uniform:   { columns: [blobs.configs.uniform.xs, blobs.configs.uniform.ys],     truth: blobs.configs.uniform.labels },
        biometry:  { columns: [bio.bpd, bio.hc, bio.ac, bio.fl],                        truth: null },
      };

      // --- stage one: who is near whom ---
      const kg = createStore({ dataset: 'crescents', ...SETS.crescents, k: 5,
        note: KG.DATASETS.crescents.note });
      const kgActions = {};
      for (const nm of Object.keys(KG.DATASETS)) {
        kgActions[`use-${nm}`] = store => store.set(KG.setDataset(store.get(), nm, SETS[nm]));
      }
      mount(document.getElementById('kg-cres'), KG, kg, { actions: kgActions, overlay: {
        idKey: 'kg-cres',
        labels_: { title: 'who is near whom. no seed, no restart, one answer.' },
      } });

      // --- stage two: the layout, live ---
      // Seed 1 here and seed 1 in tools/poster.mjs. If these two ever disagree,
      // the page visibly jumps the moment this script runs.
      const lpBase = { dataset: 'blobs', ...SETS.blobs, k: 15, seed: 1,
        note: LP.DATASETS.blobs.note };
      const lp = createStore({ ...lpBase, ...LP.start(lpBase, 1) });
      const lpActions = {
        stepOnce: store => store.set(LP.step(store.get())),
        reset: store => store.set(LP.start(store.get(), store.get().seed + 1)),
      };
      for (const nm of Object.keys(LP.DATASETS)) {
        lpActions[`use-${nm}`] = store => store.set(LP.setDataset(store.get(), nm, SETS[nm]));
      }
      mount(document.getElementById('lp-blobs'), LP, lp, { actions: lpActions, overlay: {
        idKey: 'lp-blobs',
        labels_: { title: 'press Play. it starts as noise, every time.' },
      } });

      // --- six seeds ---
      const sr = createStore({ dataset: 'blobs', ...SETS.blobs, k: 15,
        note: SR.DATASETS.blobs.note });
      const srActions = {};
      for (const nm of Object.keys(SR.DATASETS)) {
        srActions[`use-${nm}`] = store => store.set(SR.setDataset(store.get(), nm, SETS[nm]));
      }
      mount(document.getElementById('sr-blobs'), SR, sr, { actions: srActions, overlay: {
        idKey: 'sr-blobs',
        labels_: { title: 'six seeds. same data, same neighbours.' },
      } });

      // --- the closer ---
      const ut = createStore({ columns: [bio.bpd, bio.hc, bio.ac, bio.fl],
        names: ['BPD', 'HC', 'AC', 'FL'], outcome: bio.ga, k: 15 });
      mount(document.getElementById('ut-bio'), UT, ut, { overlay: {
        idKey: 'ut-bio',
        note: '350 simulated scans, 20-40 weeks. not patients.',
        labels_: { title: 'the algorithm never saw the dates. again.' },
      } });
    });
  </script>
```

- [ ] **Step 2: Add the four poster configs to `tools/poster.mjs`**

Import the four modules and append a fifth `CONFIGS` entry. Every `state()` must produce
**exactly** the state the live mount starts from, seeds included.

```js
}, {
  file: 'umap.html',
  posters: [
    {
      key: 'knn-graph-crescents', instrument: knnGraph,
      // Crescents at 5 neighbours: the graph runs ALONG each arc and does not yet
      // bridge between them. That single picture is the mechanism behind every
      // crescents number in the claims table.
      state: () => {
        const c = JSON.parse(readFileSync(inRepo('data/blobs.json'), 'utf8')).configs.crescents;
        return { ...knnGraph.defaults, idKey: 'kg-cres', dataset: 'crescents',
          columns: [c.xs, c.ys], truth: c.labels, k: 5,
          note: knnGraph.DATASETS.crescents.note,
          labels_: { title: 'who is near whom. no seed, no restart, one answer.' } };
      },
    },
    {
      key: 'layout-play-blobs', instrument: layoutPlay,
      // Epoch 0, seed 1, matching the live mount exactly: the poster shows the
      // NOISE the layout starts from, which is the thing the reader is about to
      // watch resolve. Seed 1 here and seed 1 in umap.html, or the page jumps.
      state: () => {
        const c = JSON.parse(readFileSync(inRepo('data/blobs.json'), 'utf8')).configs.blobs;
        const base = { ...layoutPlay.defaults, idKey: 'lp-blobs', dataset: 'blobs',
          columns: [c.xs, c.ys], truth: c.labels, k: 15, seed: 1,
          note: layoutPlay.DATASETS.blobs.note,
          labels_: { title: 'press Play. it starts as noise, every time.' } };
        return { ...base, ...layoutPlay.start(base, 1) };
      },
    },
    {
      key: 'seed-roulette-blobs', instrument: seedRoulette,
      state: () => {
        const c = JSON.parse(readFileSync(inRepo('data/blobs.json'), 'utf8')).configs.blobs;
        return { ...seedRoulette.defaults, idKey: 'sr-blobs', dataset: 'blobs',
          columns: [c.xs, c.ys], truth: c.labels, k: 15,
          note: seedRoulette.DATASETS.blobs.note,
          labels_: { title: 'six seeds. same data, same neighbours.' } };
      },
    },
    {
      key: 'umap-vs-truth-biometry', instrument: umapVsTruth,
      state: () => {
        const d = JSON.parse(readFileSync(inRepo('data/biometry.json'), 'utf8'));
        return { ...umapVsTruth.defaults, idKey: 'ut-bio',
          columns: [d.bpd, d.hc, d.ac, d.fl], names: ['BPD', 'HC', 'AC', 'FL'],
          outcome: d.ga, k: 15,
          note: '350 simulated scans, 20-40 weeks. not patients.',
          labels_: { title: 'the algorithm never saw the dates. again.' } };
      },
    },
  ],
}];
```

- [ ] **Step 3: Write the seed-parity test**

This is the failure mode lesson 4 did not have, called out in spec §11. Append to
`test/instruments5.test.mjs`:

```js
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
```

- [ ] **Step 4: Run the posters and verify idempotence**

```bash
node tools/poster.mjs
git diff --stat
node tools/poster.mjs
git diff --stat
```

Expected: the first run writes four SVGs and injects them into `umap.html`. The second run
changes **nothing** - `git diff --stat` identical between the two. Injection is idempotent
by contract and a drifting diff means the state functions are not pure.

- [ ] **Step 5: Run everything**

Run: `node --test`
Expected: PASS.

- [ ] **Step 6: Preview it in a browser**

```bash
python -m http.server 8000
```

Open `http://localhost:8000/umap.html`. Check, in this order:
1. **No jump on load.** The poster and the hydrated first frame must be indistinguishable.
2. Play runs and stops on its own at epoch 200.
3. The epoch scrubber goes back to 0 and forward again without recomputing.
4. The neighbours slider on the closer moves only on release, not per pixel.
5. No console errors, and no empty figure anywhere (an empty figure is the NaN
   signature from spec §2(d)).

- [ ] **Step 7: Commit**

```bash
git add umap.html tools/poster.mjs figures/ test/instruments5.test.mjs
git commit -m "feat: umap.html with four mounts and committed poster frames

Poster and live mount share seed 1, pinned by a test, because this is the first
lesson whose poster state is not fully determined by its controls."
```

---

## Task 8b: The method card - data module, generator, tests

Added mid-plan, 2026-08-27, on the owner's approved idea. **Spec:**
`docs/superpowers/specs/2026-08-27-shadowbox-method-cards-design.md` - read its §3, §4 and §6
before starting; they define the record model, the comparison matrix and the tests.

Every lesson gains one closing `<details>` answering when you would use this method, why you
would reach for it instead of an earlier one, and how it differs as a test. Lesson 5 gets
its card now; lessons 1 to 4 are backfilled as a separate milestone (M8). The content lives
in a data module rather than in hand-written HTML because the owner framed it as the first
authored form of the comparison data a future statistical-test picker will route on, and a
matrix with holes cannot answer "why not X".

**Files:**
- Create: `js/data/methods.mjs`
- Create: `tools/methods.mjs`
- Create: `test/methods.test.mjs`
- Modify: `css/shadowbox.css` (one `details.method-card` block, mirroring `details.from-zero`)

**Interfaces:**
- Produces: `METHODS` - an ordered object keyed by method id. Each record carries `name`, `lesson`, `kind: 'method' | 'lens'`, `when`, `assumes: string[]`, `gives`, and `notInstead: Record<string, {depth: 'deep' | 'brief', text: string}>`.
- Produces: `renderCard(id) -> string` and `injectCard(html, key, card) -> string` from `tools/methods.mjs`, the latter identical in shape to `injectPoster` in `tools/poster.mjs`.
- Consumes: nothing. This task adds no page markup - Task 8 already shipped `umap.html`, and Task 10 adds the marker pair and runs the generator.

- [ ] **Step 1: Write the failing tests**

Create `test/methods.test.mjs`. The completeness test is the load-bearing one - it is what
makes the future picker possible and the entire reason this is data rather than prose.

```js
// The comparison matrix behind every lesson's closing card, pinned so it cannot
// grow holes. Spec: docs/superpowers/specs/2026-08-27-shadowbox-method-cards-design.md
//
// Completeness is the point. A picker with a missing pair cannot answer "why not
// X?", and missing pairs are exactly what accumulates when five panels are
// written months apart. Everything else here protects the format from drifting
// into five paragraphs of equal weight.

import test from 'node:test';
import assert from 'node:assert/strict';
import { METHODS } from '../js/data/methods.mjs';

const EM_DASH = String.fromCharCode(0x2014);
const records = () => Object.entries(METHODS);
const sentences = s => s.split(/(?<=[.!?])\s+/).filter(t => t.trim().length);

test('every record carries the fields a card and a picker both need', () => {
  for (const [id, m] of records()) {
    assert.equal(typeof m.name, 'string', id);
    assert.ok(Number.isInteger(m.lesson) && m.lesson >= 1, id);
    assert.ok(['method', 'lens'].includes(m.kind), `${id}: kind ${m.kind}`);
    assert.equal(typeof m.when, 'string', id);
    assert.ok(Array.isArray(m.assumes), id);
    assert.equal(typeof m.gives, 'string', id);
    assert.equal(typeof m.notInstead, 'object', id);
  }
});

test('lesson numbers are unique, so the ladder has one method per rung', () => {
  const ls = records().map(([, m]) => m.lesson);
  assert.equal(new Set(ls).size, ls.length);
});

test('covariance is the only lens, and it is one deliberately', () => {
  // Nobody chooses covariance over k-means. Forcing a "when would you use this
  // instead" card onto lesson 2 would be subtly untrue, and the picker must
  // never offer it as an answer to "which test should I run". Spec §3.1.
  const lenses = records().filter(([, m]) => m.kind === 'lens').map(([id]) => id);
  assert.deepEqual(lenses, ['covariance']);
});

test('the comparison matrix has no holes', () => {
  // THE load-bearing test. Every record must compare against every method the
  // reader has already met.
  for (const [id, m] of records()) {
    const priors = records().filter(([, p]) => p.lesson < m.lesson).map(([pid]) => pid);
    for (const p of priors) {
      const e = m.notInstead[p];
      assert.ok(e, `${id} has no "why not ${p}" entry, and the reader has already met ${p}`);
      assert.ok(typeof e.text === 'string' && e.text.trim().length > 0, `${id} vs ${p}: empty text`);
      assert.ok(['deep', 'brief'].includes(e.depth), `${id} vs ${p}: depth ${e.depth}`);
    }
  }
});

test('no card compares against a method the reader has not met yet', () => {
  for (const [id, m] of records()) {
    for (const other of Object.keys(m.notInstead)) {
      assert.ok(METHODS[other], `${id} compares against unknown ${other}`);
      assert.ok(METHODS[other].lesson < m.lesson,
        `${id} (lesson ${m.lesson}) compares forward against ${other} (lesson ${METHODS[other].lesson})`);
    }
  }
});

test('depth is honest: deep entries argue, brief entries do not', () => {
  // Without this the tiering collapses into five paragraphs of equal weight,
  // which is the format's most likely failure. Spec §4.1.
  for (const [id, m] of records()) {
    for (const [other, e] of Object.entries(m.notInstead)) {
      const n = sentences(e.text).length;
      if (e.depth === 'deep') assert.ok(n >= 2, `${id} vs ${other}: deep needs two sentences, has ${n}`);
      else assert.equal(n, 1, `${id} vs ${other}: brief must be one sentence, has ${n}`);
    }
  }
});

test('records hold plain text, never markup', () => {
  // The picker will render this in a layout nobody has designed yet. A record
  // carrying page-specific markup only works on one surface. Spec §3.2.
  const strings = m => [m.name, m.when, m.gives, ...m.assumes,
    ...Object.values(m.notInstead).map(e => e.text)];
  for (const [id, m] of records()) {
    for (const s of strings(m)) {
      assert.ok(!s.includes('<'), `${id}: markup in a record - ${s.slice(0, 40)}`);
      assert.ok(!s.includes(EM_DASH), `${id}: em-dash in a record`);
    }
  }
});

test('no card contains a bare k, because a card is read out of context', () => {
  // k counts groups in lesson 4 and neighbours in lesson 5, and a card is often
  // the only part a hurried reader opens. Token match, not a judgment call.
  const strings = m => [m.when, m.gives, ...m.assumes,
    ...Object.values(m.notInstead).map(e => e.text)];
  for (const [id, m] of records()) {
    for (const s of strings(m)) {
      assert.ok(!/\bk\b/.test(s), `${id}: bare k - say clusters or neighbours: ${s.slice(0, 60)}`);
    }
  }
});

test('lesson 5 keeps its own vocabulary bans inside its card', () => {
  const s = JSON.stringify(METHODS.umap);
  assert.ok(!/n_neighbors/.test(s), 'say neighbours');
  assert.ok(!/fuzzy simplicial/i.test(s), 'say: the graph of who is near whom');
});
```

- [ ] **Step 2: Run them and watch them fail**

Run: `node --test test/methods.test.mjs`
Expected: FAIL, `Cannot find module '../js/data/methods.mjs'`.

- [ ] **Step 3: Write `js/data/methods.mjs`**

Full records for `umap`. Stub records for the four earlier methods carrying only `name`,
`lesson`, `kind`, and an empty `notInstead` - M8 fills them. The completeness test only
demands pairs for records whose own lesson has a card, so stubs are legal now and become
illegal the moment their lesson gets one.

**The `umap` record's prose is written in Task 9**, alongside the rest of lesson 5's prose,
because it IS prose and the same voice rules apply. Put placeholder-free minimal sentences
here that satisfy the tests, and expect Task 9 to replace them.

- [ ] **Step 4: Write `tools/methods.mjs`**

Hand-run, mirroring `tools/poster.mjs`: read `METHODS`, render one card per method, inject
between `<!-- methods:KEY -->` markers, idempotently. Reuse `injectPoster`'s regex shape.
Escape record text into HTML, since records hold plain text by contract.

Render section 1's heading from `kind`: a `method` gets "When you would use it", a `lens`
gets "What this buys you further up the ladder" (spec §3.1). Assumptions render as a `<ul>`;
comparisons as a `<dl>` with the method name as `<dt>`, deep entries first, then brief, each
group in descending lesson order.

- [ ] **Step 5: Add the stylesheet block**

One `details.method-card` block in `css/shadowbox.css`, mirroring the existing
`details.from-zero` block immediately above it. No colour carries meaning; the existing
print rules already force `<details>` open.

- [ ] **Step 6: Run the tests and commit**

Run: `node --test`
Expected: PASS.

```bash
git add js/data/methods.mjs tools/methods.mjs test/methods.test.mjs css/shadowbox.css
git commit -m "feat: method-card data model, generator and completeness tests"
```

---

## Task 9: The prose

Follow the established process from spec §5 and `PROSE-GUIDE.md`: terse outline in bullets,
scored by the owner, each bullet drafted separately, then a straight read-through to fix
the joins. **Do not draft the whole page in one pass.**

**Files:**
- Create: `.handoff/LESSON-5-PROSE-OUTLINE.md`
- Create: `.handoff/LESSON-5-PROSE-DRAFT.md`
- Modify: `umap.html` (fills every `<!-- PROSE ... -->` slot)

- [ ] **Step 1: Write the outline as bullets and stop**

Create `.handoff/LESSON-5-PROSE-OUTLINE.md`. One bullet per paragraph, no prose. Sections,
in the order the instruments appear:

1. What UMAP is for, and why it is on this ladder after k-means.
2. **Start from zero: what a neighbour graph is.** *The graph of who is near whom, with a
   weight saying how near.* Never "fuzzy simplicial set".
3. **The two k's are different.** Lesson 4's k counted groups. This one counts neighbours.
   Say it outright; Andrew flagged this as a real trap on 2026-08-27.
4. `knn-graph`: at few neighbours the graph runs along each arc, at many it bridges between
   them, and that is why the answer depends on a number you chose.
5. Stage two, and what a seed is doing here at all. The graph had no seed; the layout does.
6. `layout-play`: it starts as noise every time. Neither axis means anything.
6b. **Candidate sentence, Andrew's call:** the first epoch genuinely does nothing. Every
    edge is scheduled by how strongly it pulls, and even the strongest edge's turn does not
    come up until epoch 1, so the first click of Step advances the counter without moving a
    dot. Measured, not assumed, and umap-learn behaves identically. Worth saying on the page
    because a reader who notices it will otherwise read it as broken. Cut it if it reads as
    an apology for the instrument rather than a fact about the algorithm.
7. `seed-roulette` with its own heading: **the distance between clusters does not mean
   anything.** A statement, not a hedge, and not a parenthesis - it is the most common
   misreading of a UMAP plot in published work.
8. What survived and what did not: near moved by 0.01, far moved by 0.38.
9. The honest failure. The uniform square has no structure by construction, and UMAP makes
   it look **more** structured, not less.
10. Not a strict improvement on k-means. At 50 neighbours 24 of 30 seeds recover both
    crescents exactly; at 5 the median is 0.657, worse than the 0.747 k-means got for free.
    Both numbers in the same paragraph.
11. `umap-vs-truth`: the third route to the same answer, 0.973 against a ceiling of 0.972.
12. The wrong instrument. The obvious way to measure that closer gives 0.261 to 0.971 and
    looks like chaos. It is a straight line fitted to a curved arc. Short - it is an aside,
    not a rival to the closer.
13. Gloss `min_dist` before any control asks the reader to care: it sets how tightly points
    are allowed to pack, and it is cosmetic.
14. One sentence: umap-learn starts from a spectral initialisation and this page starts
    from noise, because watching it resolve is the point.
15. What the lesson refuses to claim (spec §8), as a short closing list.

- [ ] **Step 2: Get the outline scored before drafting**

This is a checkpoint, not a formality. Lesson 3's outline was scored before it was written
and lesson 4's was too. Hand Andrew the outline and stop.

- [ ] **Step 3: Draft one bullet at a time into `.handoff/LESSON-5-PROSE-DRAFT.md`**

Every number comes from `test/umap-claims.test.mjs` or `results/umap-measure.log`. Nothing
is written from expectation.

- [ ] **Step 4: One straight read-through to fix the joins, then run the linters**

```bash
node tools/prose-lint.mjs umap.html
node tools/voice-lint.mjs umap.html
```

Compare the findings against the same run on `kmeans.html` and `pca.html`. These are
linters, not detectors: the target is parity with the approved pages, not zero findings.

- [ ] **Step 5: Fill the slots in `umap.html` and verify none survived**

Run: `grep -c 'PROSE' umap.html`
Expected: `0`.

- [ ] **Step 6: Write the `umap` record's prose in `js/data/methods.mjs`**

Task 8b left minimal sentences there to satisfy its tests. Replace them now, in the same
pass as the page's prose, because they are prose and the same voice rules apply. The record
needs: `when`, `assumes`, `gives`, and four `notInstead` entries.

Per spec §4.1, `kmeans` and `pca` are the `deep` pair - those are the genuine confusions a
reader could act on wrongly - and `covariance` and `leastSquares` are `brief`. The tests in
`test/methods.test.mjs` enforce two sentences for deep and exactly one for brief, plus no
bare `k` anywhere, so write to those bounds rather than trimming afterward.

The material is already settled by the lesson: §8's refusals say what the method will not
claim, and the k=5-versus-k-means result says plainly that UMAP is a different bet rather
than an upgrade. Do not invent new comparisons here.

- [ ] **Step 7: Commit**

```bash
git add umap.html js/data/methods.mjs .handoff/LESSON-5-PROSE-OUTLINE.md .handoff/LESSON-5-PROSE-DRAFT.md
git commit -m "prose: lesson 5, drafted bullet by bullet against measured numbers"
```

---

## Task 10: The house rules, five lessons, and the checks that close M7

Everything in spec §10's accept criteria that is not already covered.

**Files:**
- Modify: `test/instruments5.test.mjs`
- Modify: `index.html`, `least-squares.html`, `covariance.html`, `pca.html`, `kmeans.html`
- Modify: `NEXT-STEPS.md`

- [ ] **Step 1: Write the house-rules sweep over all four new instruments**

This is the test spec §10 warns about: `test/instruments4.test.mjs` drives a hand-written
list of four names, and lesson 5's four must be added somewhere or the sweep passes by not
looking at them. Add the lesson-5 version to `test/instruments5.test.mjs` rather than
extending the lesson-4 list, so each file sweeps its own lesson.

```js
// ------------------------------------------------ all four, the house rules

test('every lesson-5 instrument prefixes its ids and keeps the house punctuation', () => {
  const c = BLOBS.configs.blobs;
  const lpBase = { ...LP.defaults, idKey: 'lp', dataset: 'blobs',
    columns: [c.xs, c.ys], truth: c.labels, k: 15, seed: 1 };

  const cases = [
    ['kg', KG, kgState({ idKey: 'kg' })],
    ['lp', LP, { ...lpBase, ...LP.start(lpBase, 1) }],
    ['sr', SR, srState({ idKey: 'sr' })],
    ['ut', UT, utState({ idKey: 'ut' })],
  ];

  for (const [key, mod, st] of cases) {
    const svg = mod.render(st);
    assert.match(svg, /^<svg[^>]*viewBox="0 0 640 460"/, key);
    assert.match(svg, /<\/svg>\s*$/, key);
    assert.equal((svg.match(/<svg/g) || []).length, 1, key);

    const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
    for (const id of ids) assert.ok(id.startsWith(`sb-${key}-`), `${key}: unprefixed id ${id}`);
    for (const ref of [...svg.matchAll(/url\(#([^)]+)\)/g)].map(m => m[1])) {
      assert.ok(ids.includes(ref), `${key}: dangling reference ${ref}`);
    }

    assert.ok(!svg.includes(EM_DASH), `${key} rendered an em-dash`);
    assert.ok(svg.includes('<title>'), `${key} has no accessible title`);
    assert.equal(typeof mod.name, 'string', key);
    assert.ok(Array.isArray(mod.controls), key);
    assert.equal(typeof mod.applyDrag, 'function', key);

    for (const ctl of mod.controls) {
      assert.ok(['slider', 'toggle', 'action'].includes(ctl.kind), `${key}: control ${ctl.id} has kind ${ctl.kind}`);
      // Lesson 4's k counted groups. Every k here counts neighbours and must say
      // so, or a reader arriving from that page carries the wrong meaning over.
      if (ctl.id === 'k') assert.match(ctl.label, /neighbour/i, `${key}: a bare k is the lesson-4 trap`);
    }
  }
});

test('the lesson-5 sources are free of em-dashes too', () => {
  const files = ['js/instruments/knn-graph.mjs', 'js/instruments/layout-play.mjs',
    'js/instruments/seed-roulette.mjs', 'js/instruments/umap-vs-truth.mjs',
    'js/lib/embed-metrics.mjs'];
  for (const f of files) {
    assert.ok(!readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').includes(EM_DASH), f);
  }
});

test('nothing in lesson 5 loads the birth-weight dataset', () => {
  // 78 duplicate rows out of 400 and about 22 percent of k-th neighbours decided
  // by rounding. Unusable for anything built on a neighbour graph, and dropped
  // from this lesson only. Spec §2(b).
  //
  // This matches on how the file would be LOADED, not on the word appearing.
  // A bare substring check would forbid the page from explaining why the
  // dataset is missing, which is a sentence the prose may well want.
  const files = ['js/instruments/knn-graph.mjs', 'js/instruments/layout-play.mjs',
    'js/instruments/seed-roulette.mjs', 'js/instruments/umap-vs-truth.mjs', 'umap.html'];
  for (const f of files) {
    const src = readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
    assert.ok(!/data\/births/.test(src), `${f} references the births data file`);
    assert.ok(!/load\(\s*['"]births['"]\s*\)/.test(src), `${f} loads the births dataset`);
    assert.ok(!/births\.json/.test(src), `${f} names the births data file`);
  }
});

// ---------------------------------------------------------- umap.html page

test('umap.html obeys the hard rules of the prose guide and the spec vocabulary', () => {
  const html = readFileSync(new URL('../umap.html', import.meta.url), 'utf8');
  const prose = html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  assert.ok(!prose.includes(EM_DASH), 'never an em-dash; spaced hyphen instead');
  assert.ok(!/fuzzy simplicial/i.test(prose), 'say: the graph of who is near whom, with a weight saying how near');
  assert.ok(!/n_neighbors/.test(prose), 'say neighbours');
  assert.ok(!/<!-- PROSE/.test(html), 'a prose slot survived into the shipped page');
  assert.match(prose, /neighbour/i, 'the whole lesson turns on the word');
  // The distance-between-clusters warning gets a heading, not a parenthesis.
  assert.match(html, /<h2[^>]*>[^<]*distance[^<]*<\/h2>/i,
    'the most common misreading of a UMAP plot earns its own heading, per spec §5');
});
```

- [ ] **Step 2: Run it**

Run: `node --test test/instruments5.test.mjs`
Expected: PASS.

- [ ] **Step 3: Take every page to five lessons**

In each of `least-squares.html`, `covariance.html`, `pca.html`, `kmeans.html`, add to the
trellis nav, after the k-means entry:

```html
      <a href="umap.html">5 UMAP</a>
```

and in `umap.html` the same list with `<span aria-current="page">5 UMAP</span>` in that
slot. In `index.html`, add to `<ul class="lessons">`:

```html
      <li><a href="umap.html">5 &middot; UMAP</a> - what a picture of your data
      is allowed to tell you</li>
```

**Do not** touch the `index.html` opening paragraph or meta description, and **do not**
touch the `apps.html` card on the site repo. Both were deliberately de-enumerated on
2026-08-27 precisely so this step touches neither.

- [ ] **Step 4: Verify the nav on every page**

Run: `grep -c 'umap.html' index.html least-squares.html covariance.html pca.html kmeans.html`
Expected: `index.html:1`, and `1` for each of the other four.

- [ ] **Step 4b: Add the method card to `umap.html` and generate it**

Add the marker pair at the very end of the essay, after the closing instrument and before
the trellis nav:

```html
<!-- methods:umap -->
<!-- /methods:umap -->
```

Then run the generator and confirm it round-trips:

```bash
node tools/methods.mjs
git diff --stat
node tools/methods.mjs
git diff --stat
```

Expected: the first run injects the card, the second changes nothing. Add an assertion to
`test/methods.test.mjs` that `umap.html` contains exactly one `details class="method-card"`
inside its marker pair, and that re-running the generator is a no-op - mirroring the
poster-parity tests in Task 8.

Read the rendered card on the page before moving on. Spec §10 names the risk plainly: the
card must read as an appendix the reader may open, not as a second ending competing with
the lesson's closer. If it reads as a second ending, say so in your report - the remedy is
a spec amendment, not a silent reposition.

- [ ] **Step 5: Accessibility and print pass**

In the browser at `http://localhost:8000/umap.html`:
- Tab to Play, Step, every slider and every dataset button. Each takes focus with a visible
  ring, each is operable from the keyboard, and focus survives the re-render that follows.
- Every control has an `aria-label` or a real `<label>`.
- Print preview: collapsibles forced open, controls hidden, figures and headings unbroken
  across pages.
- Grayscale check: print preview in black and white, or a browser grayscale filter. Edge
  weight, mark shape and dot area must all still read. Nothing may depend on hue.

- [ ] **Step 6: The real-hardware timing check that closes M7**

Every UMAP timing in the spec is Node 24 on V8. The claim that this runs live in a browser
is an inference from 96 ms, not a measurement. Spec §11 and `NEXT-STEPS.md` both record it
as **accepted, not verified**.

In the browser console on `umap.html`:

```js
const t0 = performance.now();
document.getElementById('ut-bio').__none;   // no-op, keeps the paste one block
const m = await import('./js/math/umap.mjs');
const k = await import('./js/math/kmeans.mjs');
const bio = await (await fetch('data/biometry.json')).json();
const X = k.zscoreColumns([bio.bpd, bio.hc, bio.ac, bio.fl]);
const t1 = performance.now();
m.umap(X, { k: 50, seed: 1, nEpochs: 200 });
console.log('worst case', (performance.now() - t1).toFixed(0), 'ms');
```

Run it in **Chrome, Firefox and Safari** if all three are reachable; at minimum the two on
this machine. Record each number in `NEXT-STEPS.md` under "Accepted, not verified", and
move the item to measured.

**If any browser exceeds ~300 ms**, do not silently accept it. That is the threshold spec
§11 named, and crossing it is a finding for Andrew - the fallback would be shipping
precomputed frames for the closer only, which is a design change and his call.

- [ ] **Step 7: Full verification**

```bash
node --test
node tools/poster.mjs && git diff --stat
```

Expected: all tests pass, and the poster run leaves the tree clean.

- [ ] **Step 8: Update `NEXT-STEPS.md` and commit**

Mark M7 done in the build queue. Move the browser-timing item out of "Accepted, not
verified" and record the measured numbers. Leave the iOS Safari item alone - it is a
separate acceptance and unrelated to this milestone.

```bash
git add test/instruments5.test.mjs index.html least-squares.html covariance.html \
        pca.html kmeans.html umap.html NEXT-STEPS.md
git commit -m "feat: M7 complete - lesson 5 live, five lessons in the nav

House-rules sweep covers all four new instruments, births.json is pinned out of
this lesson, and the browser timing inference is now measured."
```

---

## Risks and things that will bite

- **The claims test is the slowest thing in the suite.** It embeds several hundred times.
  Budget is 60 seconds for the whole suite; the fix if it runs long is memoising embeddings
  by `${dataset}:${k}:${seed}`, never cutting seeds.
- **`seed-roulette` computes six embeddings on mount.** Up to ~600 ms on biometry, more in
  Safari. The poster covers the first paint, so this is a hydration cost rather than a
  load cost, but it is the second-worst number on the page after the closer.
- **A NaN embedding renders as an empty figure and reports nothing.** Spec §2(d). Task 5
  Step 1 pins it across the whole min_dist range. If a figure ever comes up blank, check
  for NaN before checking anything else.
- **Poster and live mount drift.** The two seed-parity tests in Task 8 are the only thing
  standing between a clean page and a visible jump on load. If either fails, run
  `node tools/poster.mjs`; if it still fails, a `state()` function is not pure.
- **`test/instruments4.test.mjs` is not extended by this plan.** Lesson 5's four
  instruments are swept by `test/instruments5.test.mjs` instead. If a future refactor
  merges the two sweeps, the lesson-5 names must survive the merge.
- **Reading `seed-roulette` as instability theatre.** The local numbers barely move. The
  page must not let six different-looking panels imply the method is unreliable, when what
  they show is that the unstable part is the part you were never supposed to read.
- **Crescents overclaiming.** It is tempting to present k=50's 25-of-30 as UMAP beating
  k-means. §8 and the claims test both require the k=5 result on the same page.
