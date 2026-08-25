# shadowbox M6 - lesson 4, k-means - Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `kmeans.html` as lesson 4 of shadowbox: four interactive instruments over a shared, node-tested k-means core, every prose number pinned by a claims test, and a poster frame per instrument so the page teaches with JavaScript off.

**Architecture:** One pure algorithm module (`js/math/kmeans.mjs`) that all four instruments and both test files import, so the page and the tests provably run the same code. One shared drawing module (`js/lib/marks.mjs`) for the six membership shapes and the partition boundary, so cluster identity becomes a drawn mark in exactly one place. One additive change to `js/lib/hydrate.mjs`: instruments may export `step(state)`, and mount gains a Play loop capped at 4 steps per second. Everything else follows the existing instrument contract unchanged.

**Tech Stack:** Vanilla ES modules, Node 24 built-in test runner (`node --test`), zero dependencies, no build step. SVG generated as strings by pure `render(state)` functions.

**Spec:** `docs/superpowers/specs/2026-08-24-shadowbox-kmeans-design.md`

## Global Constraints

Copied from the spec and `CLAUDE.md`. Every task's requirements implicitly include this section.

- **Zero runtime dependencies.** No `node_modules`, no build step, no `package.json`. Hand-run scripts with committed output only.
- **Tests are `node --test` from the repo root.** Node 24.
- **Owner is colorblind. No meaning on hue alone, ever.** In this lesson: membership is **dot shape** (circle, square, triangle, diamond, plus, cross), the partition is a **heavy drawn outline**. No translucent fills for meaning.
- **The shape budget caps k at 6, and that cap binds only instruments that draw membership**: `kmeans-step`, `restart-roulette`, `label-vs-truth`. `elbow` draws a curve and no cluster identity, so it sweeps k = 1 to 10 freely.
- **Every SVG id is prefixed `sb-${idKey}-`**; unique `idKey` per instrument instance per page.
- **Never write "WCSS" on the page.** Call it *the total squared distance from each point to its own center*. The acronym is fine in code, tests, and this plan.
- **Never write "eta-squared" on the page.** Call it *the share of the variation in gestational age that the labels account for*.
- **Gloss k-means++ before the toggle asks the reader to care**: it seeds the centers far apart from each other instead of at random.
- **Name controls as controls.** "Press **Step** to assign every point to its nearest center", never "Step advances one half-step".
- **Never an em-dash** in prose or comments. Spaced hyphen instead. `<strong>`, never all-caps, for emphasis.
- **Nothing the main line depends on may live in a collapsible.**
- **One click of Step is one half-step.** Assign and recompute are separate visible moves. Ruled by Andrew, 2026-08-25.
- **Commit messages** end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`, matching every commit in this repo.
- **Run `node tools/poster.mjs` after changing any instrument**, and commit the regenerated `figures/*.svg` along with the re-injected page.

## Two measurement facts that will otherwise waste an afternoon

Both confirmed by running the reference probes on 2026-08-25.

1. **`reference/kmeans-probe-real.mjs` standardizes with population sd (divide by n). `js/math/core.mjs` `standardize()` uses sample sd (n-1).** For a fixed n this is one global scalar applied identically to every column, so **cluster labels, purity, eta-squared and every drop percentage are identical either way**; only the absolute total-squared-distance values differ, by a factor of n/(n-1). Nothing in the spec's claims table pins an absolute value on standardized real data, so nothing breaks. `js/math/kmeans.mjs` gets its own `zscoreColumns` using population sd so the probes stay reproducible line for line, and Task 3 pins the invariance as a test rather than leaving it as folklore.

2. **The biometry elbow is not monotone.** Measured drops for k = 2 through 7 are **72, 52, 35, 28, 10, 21** - it falls to 10 percent and then bounces back to 21. Spec §3.3 says biometry "does the same" as births, which is loose: births really is monotone (40, 32, 23, 15, 14, 12) and biometry is not. **The prose must not claim a smooth decay for biometry**, and Task 3 pins the actual sequence including the bump. The bump is on-message rather than a problem: a curve that goes back up is even worse at naming a k than one that slides quietly, and the lesson is that the curve does not name one.

## File Structure

**Create:**

| path | responsibility |
|---|---|
| `js/math/kmeans.mjs` | the algorithm, pure. init, assign, recompute, half-step, run-to-convergence, total squared distance, purity, eta-squared, population z-scoring. Imported by all four instruments and both test files. |
| `js/lib/marks.mjs` | cluster identity as shape, and the partition boundary via `contours.mjs`. The only place a cluster index becomes a drawn mark. |
| `tools/make-blobs.mjs` | hand-run generator for the three synthetic configs. Committed output. |
| `data/blobs.json` | the generated data, with true labels. Committed. |
| `js/instruments/kmeans-step.mjs` | the mechanism instrument. The only one that exports `step`. |
| `js/instruments/restart-roulette.mjs` | six initializations as small multiples, ranked by objective. |
| `js/instruments/elbow.mjs` | total squared distance against k, k = 1 to 10. |
| `js/instruments/label-vs-truth.mjs` | biometry labels against gestational age. |
| `kmeans.html` | the lesson page. |
| `test/kmeans.test.mjs` | algorithm unit tests, including equivalence with the reference probes. |
| `test/kmeans-claims.test.mjs` | the spec §7 claims table. Every number the prose quotes. |
| `test/instruments4.test.mjs` | render and geometry tests for the four new instruments. |

**Modify:**

| path | change |
|---|---|
| `js/lib/hydrate.mjs` | additive: optional `step(state)` export, Play loop capped at 4 steps/sec, pure `playTick` helper. |
| `test/hydrate.test.mjs` | add `playTick` tests. |
| `tools/poster.mjs` | add the `kmeans.html` config block with four poster states. |
| `index.html`, `least-squares.html`, `covariance.html`, `pca.html` | trellis nav gains `4 k-means`. |
| `data/README.md` | provenance entry for `blobs.json`. |
| `README.md`, `NEXT-STEPS.md` | lesson 4 listed, M6 closed. |

**Build order is deliberate.** The algorithm and the claims test exist before any instrument, and the claims test exists before a word of prose. This is the lesson-3 scar: prose written ahead of measurement produced a PC2 claim that was half wrong.

---

### Task 1: The k-means core

**Files:**
- Create: `js/math/kmeans.mjs`
- Test: `test/kmeans.test.mjs`
- Read for reference: `reference/kmeans-probe-synthetic.mjs`, `reference/kmeans-probe-real.mjs`

**Interfaces:**
- Consumes: `mulberry32` from `js/math/core.mjs`.
- Produces, and every later task depends on these exact names and shapes:
  - `d2(a: number[], b: number[]) -> number` squared euclidean distance
  - `zscoreColumns(cols: number[][]) -> number[][]` columns in, rows out, **population sd**
  - `initRandom(X, k, rng) -> number[][]` centers
  - `initPlusPlus(X, k, rng) -> number[][]` centers
  - `initCenters(X, k, rng, plusplus: boolean) -> number[][]`
  - `assign(X, centers) -> number[]` labels, lowest index wins ties
  - `recompute(X, labels, k, centers) -> number[][]` an empty cluster keeps its old center
  - `totalSquaredDistance(X, labels, centers) -> number`
  - `startState(X, k, rng, opts) -> KState`
  - `kmeansStep(s: KState) -> KState` one half-step
  - `kmeansRun(X, k, rng, opts) -> {centers, labels, wcss, iters}`
  - `purity(labels, truth, k) -> number`
  - `eta2(y, labels, k) -> number`
  - `KState = {X, k, centers, labels, phase: 'assign'|'update', iter: number, done: boolean}`

**Half-step semantics, ruled by Andrew and pinned here:** a state in phase `assign` recomputes labels from frozen centers and flips to phase `update`; a state in phase `update` recomputes centers from frozen labels, increments `iter`, and flips to phase `assign`. `done` is raised during an `assign` half-step when no label changed. The following `update` half-step still runs, exactly as the reference probes do, and steps after that are inert. One probe iteration equals two half-steps, so `kmeansRun` with `iters: 300` caps at 600 half-steps.

- [ ] **Step 1: Write the failing test file**

Create `test/kmeans.test.mjs`:

```js
// The k-means core, pinned against the two reference probes that produced every
// number in the spec. If this file and reference/kmeans-probe-*.mjs ever
// disagree, the spec's claims table is no longer reproducible and the page is
// quoting numbers that nothing generates.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mulberry32 } from '../js/math/core.mjs';
import {
  d2, zscoreColumns, initRandom, initPlusPlus, initCenters,
  assign, recompute, totalSquaredDistance,
  startState, kmeansStep, kmeansRun, purity, eta2,
} from '../js/math/kmeans.mjs';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} !~ ${b}`);
const births = () => JSON.parse(readFileSync(new URL('../data/births.json', import.meta.url), 'utf8'));

// A three-cluster toy small enough to reason about by hand.
const TOY = [[0, 0], [0.1, 0], [0, 0.1], [10, 10], [10.1, 10], [10, 10.1], [-10, 8], [-10.1, 8], [-10, 8.1]];

test('d2 is squared euclidean and works in any dimension', () => {
  close(d2([0, 0], [3, 4]), 25);
  close(d2([1, 2, 3, 4], [1, 2, 3, 4]), 0);
  close(d2([1, 1, 1, 1], [0, 0, 0, 0]), 4);
});

test('zscoreColumns takes columns and returns rows, centred, population sd', () => {
  const rows = zscoreColumns([[1, 2, 3], [10, 20, 30]]);
  assert.equal(rows.length, 3);
  assert.equal(rows[0].length, 2);
  for (let j = 0; j < 2; j++) {
    const col = rows.map(r => r[j]);
    close(col.reduce((a, b) => a + b, 0) / 3, 0);
    close(Math.sqrt(col.reduce((s, v) => s + v * v, 0) / 3), 1);   // population sd, divide by n
  }
});

test('assign gives every point its nearest center, lowest index wins a tie', () => {
  assert.deepEqual(assign([[0, 0], [9, 0], [5, 0]], [[0, 0], [10, 0]]), [0, 1, 0]);
  assert.deepEqual(assign([[5, 0]], [[0, 0], [10, 0]]), [0]);      // exact tie goes to index 0
});

test('recompute moves each center to its cluster mean and leaves an empty cluster alone', () => {
  const X = [[0, 0], [2, 0], [10, 10]];
  const out = recompute(X, [0, 0, 1], 3, [[99, 99], [99, 99], [7, 7]]);
  assert.deepEqual(out[0], [1, 0]);
  assert.deepEqual(out[1], [10, 10]);
  assert.deepEqual(out[2], [7, 7]);                                 // empty: keeps its old position
});

test('totalSquaredDistance sums each point to its own center', () => {
  close(totalSquaredDistance([[0, 0], [3, 4]], [0, 0], [[0, 0]]), 25);
});

test('a half-step alternates assign and update, and only one of them moves', () => {
  const s0 = startState(TOY, 3, mulberry32(1), { plusplus: true });
  assert.equal(s0.phase, 'assign');
  assert.ok(s0.labels.every(l => l === -1), 'nothing is assigned before the first Step');

  const s1 = kmeansStep(s0);                       // assign
  assert.equal(s1.phase, 'update');
  assert.deepEqual(s1.centers, s0.centers, 'assign must leave the centers frozen');
  assert.ok(s1.labels.every(l => l >= 0), 'assign must label every point');

  const s2 = kmeansStep(s1);                       // update
  assert.equal(s2.phase, 'assign');
  assert.deepEqual(s2.labels, s1.labels, 'recompute must leave membership frozen');
  assert.notDeepEqual(s2.centers, s1.centers, 'recompute must actually move the centers');
  assert.equal(s2.iter, s1.iter + 1, 'one full iteration is two half-steps');
});

test('done is raised on the assign half-step where no label changed, and later steps are inert', () => {
  let s = startState(TOY, 3, mulberry32(1), { plusplus: true });
  let guard = 0;
  while (!s.done && guard++ < 100) s = kmeansStep(s);
  assert.equal(s.phase, 'update', 'done is raised during assign, so the next half-step is update');
  const settled = kmeansStep(s);
  const after = kmeansStep(kmeansStep(settled));
  assert.deepEqual(after.labels, settled.labels);
  assert.deepEqual(after.centers, settled.centers, 'once converged, nothing moves again');
});

test('kmeansRun is the half-step loop, not a second implementation', () => {
  const run = kmeansRun(TOY, 3, mulberry32(4), { plusplus: true });
  let s = startState(TOY, 3, mulberry32(4), { plusplus: true });
  let guard = 0;
  while (!s.done && guard++ < 600) s = kmeansStep(s);
  s = kmeansStep(s);                                // the trailing update the probes also perform
  assert.deepEqual(run.labels, s.labels);
  assert.deepEqual(run.centers, s.centers);
  close(run.wcss, totalSquaredDistance(TOY, s.labels, s.centers));
});

test('purity is the share of points in their cluster majority class', () => {
  close(purity([0, 0, 1, 1], [0, 0, 1, 1], 2), 1);
  close(purity([0, 0, 0, 0], [0, 0, 1, 1], 2), 0.5);
  close(purity([0, 0, 1, 1], [1, 1, 0, 0], 2), 1);                  // a label permutation must not matter
});

test('eta2 is the share of variation in y the labels account for', () => {
  close(eta2([1, 1, 5, 5], [0, 0, 1, 1], 2), 1);                    // labels account for everything
  close(eta2([1, 5, 1, 5], [0, 0, 1, 1], 2), 0);                    // labels account for nothing
});

test('both initializers are deterministic under a seed, and ++ picks one center per blob', () => {
  const a = initPlusPlus(TOY, 3, mulberry32(9));
  assert.deepEqual(a, initPlusPlus(TOY, 3, mulberry32(9)), 'same seed must give the same centers');
  const c = initRandom(TOY, 3, mulberry32(9));
  assert.deepEqual(c, initRandom(TOY, 3, mulberry32(9)));
  assert.deepEqual(initCenters(TOY, 3, mulberry32(9), true), a);
  assert.deepEqual(initCenters(TOY, 3, mulberry32(9), false), c);
  const pairs = [];
  for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) pairs.push(d2(a[i], a[j]));
  assert.ok(Math.min(...pairs) > 50, `++ must not take two centers from one blob: ${pairs}`);
});

test('random init never picks the same point twice', () => {
  for (let s = 1; s <= 30; s++) {
    const c = initRandom(TOY, 3, mulberry32(s));
    assert.equal(new Set(c.map(p => p.join(','))).size, 3, `seed ${s} produced a duplicate center`);
  }
});

test('the core reproduces the probe on real data: births k=3 is 10 / 159 / 231', () => {
  // Lifted straight from reference/kmeans-probe-real.mjs. This is the check that
  // says the module is the probes refactored rather than a rewrite that agrees
  // on toys and diverges where it matters.
  const b = births();
  const X = zscoreColumns([b.xs, b.ys]);
  const r = kmeansRun(X, 3, mulberry32(7), { plusplus: true });
  const sizes = [0, 1, 2].map(j => r.labels.filter(l => l === j).length).sort((p, q) => p - q);
  assert.deepEqual(sizes, [10, 159, 231]);
});
```

- [ ] **Step 2: Run it and confirm it fails for the right reason**

```bash
node --test test/kmeans.test.mjs
```

Expected: FAIL with `Cannot find module` naming `js/math/kmeans.mjs`.

- [ ] **Step 3: Write `js/math/kmeans.mjs`**

```js
// k-means, factored so the page and the tests run the same code, and so one
// click of Step is one half-step. The reference probes in reference/ produced
// every number in the spec's claims table; this module reproduces them exactly,
// which means matching their rng consumption order, their tie-breaking, and
// their treatment of an empty cluster. Change any of those and the claims move.
//
// On standardizing: zscoreColumns divides by n (population sd), which is what
// the probes do. core.mjs standardize() divides by n-1. For a fixed n that is
// one global scalar on every column at once, so labels, purity, eta2 and all
// drop percentages come out identical either way; only the absolute total
// squared distance differs, by n/(n-1). test/kmeans-claims.test.mjs pins that
// invariance so nobody has to rediscover it.

export function d2(a, b) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2;
  return s;
}

// cols: one array per variable. Returns rows: one array per observation.
export function zscoreColumns(cols) {
  const n = cols[0].length;
  const mu = cols.map(c => c.reduce((a, b) => a + b, 0) / n);
  const sd = cols.map((c, j) => Math.sqrt(c.reduce((a, b) => a + (b - mu[j]) ** 2, 0) / n));
  return Array.from({ length: n }, (_, i) => cols.map((c, j) => (c[i] - mu[j]) / (sd[j] || 1)));
}

// Rejection sampling on distinct indices, insertion-ordered. Matches the probes.
export function initRandom(X, k, rng) {
  const idx = new Set();
  while (idx.size < k) idx.add(Math.floor(rng() * X.length));
  return [...idx].map(i => X[i].slice());
}

// k-means++: the first center uniform, each next one drawn with probability
// proportional to its squared distance from the nearest center already chosen.
export function initPlusPlus(X, k, rng) {
  const C = [X[Math.floor(rng() * X.length)].slice()];
  while (C.length < k) {
    const d = X.map(x => Math.min(...C.map(c => d2(x, c))));
    const T = d.reduce((a, b) => a + b, 0);
    let r = rng() * T, i = 0;
    while (r > d[i] && i < X.length - 1) { r -= d[i]; i++; }
    C.push(X[i].slice());
  }
  return C;
}

export function initCenters(X, k, rng, plusplus) {
  return plusplus ? initPlusPlus(X, k, rng) : initRandom(X, k, rng);
}

// Strict less-than, so the lowest center index wins a tie. The probes do this.
export function assign(X, centers) {
  const labels = new Array(X.length);
  for (let i = 0; i < X.length; i++) {
    let best = 0, bd = Infinity;
    for (let j = 0; j < centers.length; j++) {
      const dd = d2(X[i], centers[j]);
      if (dd < bd) { bd = dd; best = j; }
    }
    labels[i] = best;
  }
  return labels;
}

// An empty cluster keeps the center it had. Dropping or reseeding it would make
// the run non-reproducible against the probes.
export function recompute(X, labels, k, centers) {
  const dim = X[0].length;
  const sum = Array.from({ length: k }, () => new Array(dim).fill(0));
  const cnt = new Array(k).fill(0);
  for (let i = 0; i < X.length; i++) {
    const l = labels[i];
    if (l < 0) continue;
    cnt[l]++;
    for (let j = 0; j < dim; j++) sum[l][j] += X[i][j];
  }
  return centers.map((c, j) => (cnt[j] ? sum[j].map(s => s / cnt[j]) : c.slice()));
}

export function totalSquaredDistance(X, labels, centers) {
  let s = 0;
  for (let i = 0; i < X.length; i++) s += d2(X[i], centers[labels[i]]);
  return s;
}

export function startState(X, k, rng, { plusplus = false } = {}) {
  return {
    X, k,
    centers: initCenters(X, k, rng, plusplus),
    labels: new Array(X.length).fill(-1),
    phase: 'assign',
    iter: 0,
    done: false,
  };
}

// One half-step. assign redraws membership with the centers frozen; update moves
// the centers with membership frozen. Never both in one click.
export function kmeansStep(s) {
  if (s.phase === 'assign') {
    const labels = assign(s.X, s.centers);
    const moved = labels.some((l, i) => l !== s.labels[i]);
    return { ...s, labels, phase: 'update', done: !moved };
  }
  return {
    ...s,
    centers: recompute(s.X, s.labels, s.k, s.centers),
    phase: 'assign',
    iter: s.iter + 1,
  };
}

// Drives kmeansStep so there is exactly one implementation. iters counts full
// iterations, each of which is two half-steps, matching the probes' loop.
export function kmeansRun(X, k, rng, { plusplus = false, iters = 300 } = {}) {
  let s = startState(X, k, rng, { plusplus });
  for (let it = 0; it < iters; it++) {
    s = kmeansStep(s);                       // assign
    const done = s.done;
    s = kmeansStep(s);                       // update, which the probes also run before breaking
    if (done) break;
  }
  return { centers: s.centers, labels: s.labels, wcss: totalSquaredDistance(X, s.labels, s.centers), iters: s.iter };
}

export function purity(labels, truth, k) {
  const n = labels.length;
  let hit = 0;
  for (let j = 0; j < k; j++) {
    const cnt = new Map();
    for (let i = 0; i < n; i++) if (labels[i] === j) cnt.set(truth[i], (cnt.get(truth[i]) || 0) + 1);
    if (cnt.size) hit += Math.max(...cnt.values());
  }
  return hit / n;
}

// The share of the variation in y that the labels account for. Never called
// eta-squared on the page.
export function eta2(y, labels, k) {
  const n = y.length;
  const m = y.reduce((a, b) => a + b, 0) / n;
  const tot = y.reduce((s, v) => s + (v - m) ** 2, 0);
  let between = 0;
  for (let j = 0; j < k; j++) {
    const g = y.filter((_, i) => labels[i] === j);
    if (!g.length) continue;
    const mg = g.reduce((a, b) => a + b, 0) / g.length;
    between += g.length * (mg - m) ** 2;
  }
  return between / tot;
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
node --test test/kmeans.test.mjs
```

Expected: PASS. This task adds 13 tests.

- [ ] **Step 5: Run the whole suite so nothing already green went red**

```bash
node --test
```

Expected: PASS, every pre-existing test still green.

- [ ] **Step 6: Commit**

```bash
git add js/math/kmeans.mjs test/kmeans.test.mjs
git commit -F- <<'MSG'
m6: the k-means core, factored out of the reference probes

One module the page and the tests both import, so a number on the page can
never come from code the tests do not run. It matches the probes exactly where
exactness is load-bearing: rng consumption order in both initializers, strict
less-than tie-breaking in assign, and an empty cluster keeping its old center.

Step is a half-step, per Andrew's ruling. assign redraws membership with the
centers frozen; update moves the centers with membership frozen. kmeansRun
drives kmeansStep rather than reimplementing the loop, and a test asserts the
two agree, so the instrument and the claims cannot drift apart.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 2: `data/blobs.json` and its generator

**Files:**
- Create: `tools/make-blobs.mjs`
- Create: `data/blobs.json` (generated, committed)
- Modify: `data/README.md`
- Test: `test/kmeans.test.mjs` (append)

**Interfaces:**
- Consumes: `mulberry32`, `gaussian` from `js/math/core.mjs`. Both were checked on 2026-08-25 and are behaviourally identical to the probe's inline copies, so the generated points match the probe bit for bit **provided the draw order is preserved**: for each point, x's gaussian is drawn before y's.
- Produces: `data/blobs.json` with shape

  ```
  { provenance: {...}, configs: { blobs: Cfg, crescents: Cfg, uniform: Cfg } }
  Cfg = { seed, n, k, note, xs: number[], ys: number[], labels: number[] | null }
  ```

  `uniform.labels` is **null**: a uniform square has no ground truth, and null also makes `hydrate.mjs` hide the truth toggle for free, since `controlsMarkup` already skips `showTruth` when `!state.truth`. Never compute purity for uniform; the probe's 1.00 there is an artifact of scoring against a single constant label.

- [ ] **Step 1: Write the failing test**

Append to `test/kmeans.test.mjs`:

```js
const blobs = () => JSON.parse(readFileSync(new URL('../data/blobs.json', import.meta.url), 'utf8'));

test('blobs.json carries three configs, 150 points each, with truth where truth exists', () => {
  const d = blobs();
  assert.deepEqual(Object.keys(d.configs), ['blobs', 'crescents', 'uniform']);
  for (const [name, c] of Object.entries(d.configs)) {
    assert.equal(c.xs.length, 150, `${name} xs`);
    assert.equal(c.ys.length, 150, `${name} ys`);
    assert.ok(c.xs.every(Number.isFinite) && c.ys.every(Number.isFinite), `${name} has a non-finite value`);
  }
  assert.deepEqual([...new Set(d.configs.blobs.labels)].sort(), [0, 1, 2]);
  assert.deepEqual([...new Set(d.configs.crescents.labels)].sort(), [0, 1]);
  assert.equal(d.configs.uniform.labels, null, 'a uniform square has no ground truth to claim');
  assert.deepEqual([d.configs.blobs.seed, d.configs.crescents.seed, d.configs.uniform.seed], [42, 43, 44]);
  assert.deepEqual([d.configs.blobs.k, d.configs.crescents.k, d.configs.uniform.k], [3, 2, 3]);
});

test('blobs.json reproduces the reference generator exactly, or every restart number in the spec is wrong', () => {
  // The probe's own generator, inlined, so a drift in core.mjs's rng or in the
  // tool's draw order fails here rather than silently moving §7.
  const g = r => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const r1 = mulberry32(42), ctr = [[-2.2, -1.4], [2.4, -1.0], [0.2, 2.6]];
  const P = [];
  for (let c = 0; c < 3; c++) for (let i = 0; i < 50; i++) P.push([ctr[c][0] + g(r1) * 0.55, ctr[c][1] + g(r1) * 0.55]);
  const d = blobs().configs.blobs;
  for (let i = 0; i < 150; i++) {
    close(d.xs[i], P[i][0], 1e-12);
    close(d.ys[i], P[i][1], 1e-12);
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node --test test/kmeans.test.mjs
```

Expected: FAIL with `ENOENT` naming `data/blobs.json`.

- [ ] **Step 3: Write `tools/make-blobs.mjs`**

```js
// Generator for data/blobs.json. Hand-run:  node tools/make-blobs.mjs
// Committed output, no build step, byte-identical on every rerun.
//
// These three configurations ARE the spec (§6), and they are also the source of
// every restart number in §7. The draw order matters: for each point, x's
// gaussian is drawn before y's. Change the order, the seeds, the counts or the
// geometry and the spread percentages on the page all move, so the test
// re-derives the blobs config from the reference generator rather than trusting
// this file.

import { writeFileSync } from 'node:fs';
import { mulberry32, gaussian } from '../js/math/core.mjs';

// Three gaussians, well separated: k-means wins cleanly, restarts diverge loudly.
function makeBlobs(seed = 42) {
  const r = mulberry32(seed);
  const centers = [[-2.2, -1.4], [2.4, -1.0], [0.2, 2.6]];
  const xs = [], ys = [], labels = [];
  for (let c = 0; c < 3; c++) {
    for (let i = 0; i < 50; i++) {
      xs.push(centers[c][0] + gaussian(r) * 0.55);
      ys.push(centers[c][1] + gaussian(r) * 0.55);
      labels.push(c);
    }
  }
  return { seed, n: 150, k: 3, note: 'three gaussian blobs, sd 0.55', xs, ys, labels };
}

// Two interleaved half-moons: convex cells cannot recover them, and every
// restart agrees anyway. That pair of facts is the whole lesson of the figure.
function makeCrescents(seed = 43) {
  const r = mulberry32(seed);
  const xs = [], ys = [], labels = [];
  for (let i = 0; i < 75; i++) {
    const t = Math.PI * i / 74;
    xs.push(2 * Math.cos(t) + gaussian(r) * 0.13);
    ys.push(2 * Math.sin(t) + gaussian(r) * 0.13);
    labels.push(0);
  }
  for (let i = 0; i < 75; i++) {
    const t = Math.PI * i / 74;
    xs.push(2 - 2 * Math.cos(t) + gaussian(r) * 0.13);
    ys.push(1.0 - 2 * Math.sin(t) + gaussian(r) * 0.13);
    labels.push(1);
  }
  return { seed, n: 150, k: 2, note: 'two interleaved half-moons, radius 2, noise 0.13', xs, ys, labels };
}

// Nothing to find. Partitioned confidently regardless, which is the point.
// labels is null: there is no ground truth here to be right or wrong about.
function makeUniform(seed = 44) {
  const r = mulberry32(seed);
  const xs = [], ys = [];
  for (let i = 0; i < 150; i++) { xs.push((r() - 0.5) * 6); ys.push((r() - 0.5) * 6); }
  return { seed, n: 150, k: 3, note: 'uniform on a 6 by 6 square', xs, ys, labels: null };
}

const out = {
  provenance: {
    kind: 'SYNTHETIC - generated, not measured',
    generator: 'tools/make-blobs.mjs',
    rng: 'mulberry32 plus Box-Muller, both from js/math/core.mjs',
    why: 'ground truth is known and drawable, so the page can show what the algorithm missed',
  },
  configs: { blobs: makeBlobs(), crescents: makeCrescents(), uniform: makeUniform() },
};

writeFileSync(new URL('../data/blobs.json', import.meta.url), JSON.stringify(out) + '\n');
for (const [name, c] of Object.entries(out.configs)) {
  console.log(`${name.padEnd(10)} n=${c.n} k=${c.k} truth=${c.labels ? 'yes' : 'none'} `
    + `x[${Math.min(...c.xs).toFixed(2)}, ${Math.max(...c.xs).toFixed(2)}] `
    + `y[${Math.min(...c.ys).toFixed(2)}, ${Math.max(...c.ys).toFixed(2)}]`);
}
```

- [ ] **Step 4: Generate the data and read the ranges**

```bash
node tools/make-blobs.mjs
```

Expected: three lines. `blobs` spans roughly x [-3.6, 3.9] and y [-2.9, 4.1]; `crescents` roughly x [-2.3, 4.3] and y [-1.4, 2.4]; `uniform` close to x and y in [-3, 3]. If any range is wildly different, the draw order or a constant is wrong; stop and fix it before continuing, because everything downstream inherits it.

- [ ] **Step 5: Run the tests and confirm they pass**

```bash
node --test test/kmeans.test.mjs
```

Expected: PASS. This task adds 2 tests, so the file now holds 15, including the point-for-point reproduction of the reference generator.

- [ ] **Step 6: Add the provenance entry**

Append to `data/README.md`, matching the tone of the entries already there:

```markdown
## blobs.json

Synthetic, generated by `tools/make-blobs.mjs`. Three configurations of 150
points each, in two dimensions, with committed true labels where a truth exists.

| config | seed | shape | k | why it is here |
|---|---|---|---|---|
| `blobs` | 42 | three gaussians, sd 0.55 | 3 | k-means wins cleanly, restarts diverge loudly, k-means++ fixes it |
| `crescents` | 43 | two interleaved half-moons, radius 2, noise 0.13 | 2 | convex cells cannot recover it, and every restart agrees anyway |
| `uniform` | 44 | uniform on a 6 by 6 square | 3 | nothing to find, partitioned confidently regardless |

`uniform.labels` is `null` on purpose. There is no ground truth in a uniform
square, so nothing should be scored against one.

Regenerate with `node tools/make-blobs.mjs`. The output is byte-identical on
every rerun, and `test/kmeans.test.mjs` checks the `blobs` config against an
inlined copy of the reference generator, so a drift in the shared rng fails a
test instead of quietly moving every restart number on lesson 4.
```

- [ ] **Step 7: Commit**

```bash
git add tools/make-blobs.mjs data/blobs.json data/README.md test/kmeans.test.mjs
git commit -F- <<'MSG'
m6: blobs.json, the three synthetic configs, with truth committed

Three shapes chosen for three different behaviours, all measured before the
lesson was designed: blobs where restarts spread 579 percent, crescents where
every restart agrees and every restart is wrong, uniform where there is nothing
to find and k-means partitions it confidently anyway.

uniform.labels is null rather than an array of zeros. There is no ground truth
in a uniform square, and null also makes hydrate hide the truth toggle without
needing a special case.

The test re-derives the blobs config from an inlined copy of the reference
generator instead of trusting the tool, because a drift in the shared rng would
otherwise move every restart number on the page silently.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 3: The claims table

**Files:**
- Create: `test/kmeans-claims.test.mjs`

**Interfaces:**
- Consumes: everything Task 1 produced, plus `data/blobs.json` from Task 2, `data/births.json` and `data/biometry.json` as they already stand, and `standardize` from `js/math/core.mjs` for the invariance check.
- Produces: nothing importable. This file is the gate. **No prose may be written until it is green**, because the numbers it pins are the numbers the prose will quote. This is the lesson-3 scar, expressed as a build order.

Every value below was measured on 2026-08-25 by running both reference probes, and every one of them reproduced. The seed schemes differ between datasets and are **not** interchangeable:

| sweep | seeds | init |
|---|---|---|
| synthetic restarts | `mulberry32(s * 7919)`, s = 1..60 | both, per case |
| births restarts | `mulberry32(s)`, s = 1..60 | random, not ++ |
| births by k | `mulberry32(7)` | ++ |
| biometry by k | `mulberry32(11)` | ++ |
| elbow, both datasets | `mulberry32(3)` | ++ |

- [ ] **Step 1: Write the whole claims file at once**

Create `test/kmeans-claims.test.mjs`:

```js
// The claims kmeans.html makes in prose, pinned so they cannot drift silently.
// Mirrors test/pca-claims.test.mjs. Every number quoted on that page is checked
// here against the same code the page runs, and the measured value is recorded
// beside each assertion so a change that moves it shows up as a failure rather
// than as a page that quietly disagrees with itself.
//
// Measured 2026-08-25 by reference/kmeans-probe-synthetic.mjs and
// reference/kmeans-probe-real.mjs. The seed schemes are not interchangeable:
// the synthetic sweep uses mulberry32(s * 7919), the births restart sweep uses
// mulberry32(s), and the by-k runs use fixed seeds 7 (births), 11 (biometry)
// and 3 (elbow).

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mulberry32, standardize } from '../js/math/core.mjs';
import { zscoreColumns, kmeansRun, purity, eta2 } from '../js/math/kmeans.mjs';

const read = p => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), 'utf8'));
const BLOBS = read('blobs.json');
const BIRTHS = read('births.json');
const BIO = read('biometry.json');

const rowsOf = cfg => cfg.xs.map((x, i) => [x, cfg.ys[i]]);
const bioColumns = () => [BIO.bpd, BIO.hc, BIO.ac, BIO.fl];
const close = (a, b, tol) => assert.ok(Math.abs(a - b) < tol, `${a} !~ ${b} (tol ${tol})`);

// One restart sweep, exactly as the probes run it.
// digits: the resolution at which two runs count as landing on different
// optima. Defaults to 2, matching reference/kmeans-probe-synthetic.mjs. The
// births sweep passes 3, because its number came from
// reference/kmeans-probe-real.mjs, which counts at 3 decimals. Rounding the
// births costs to 2 decimals collapses 327.456, 327.458 and 327.460 into one
// and turns the measured 10 optima into 8. Each claim is counted at the
// resolution of the probe that measured it.
function sweep(X, k, { plusplus, seedOf = s => s * 7919, runs = 60, digits = 2 }) {
  const ws = [], labs = [];
  for (let s = 1; s <= runs; s++) {
    const r = kmeansRun(X, k, mulberry32(seedOf(s)), { plusplus });
    ws.push(r.wcss);
    labs.push(r.labels);
  }
  const best = Math.min(...ws), worst = Math.max(...ws);
  return {
    ws, labs, best, worst,
    optima: new Set(ws.map(w => w.toFixed(digits))).size,
    spreadPct: (worst / best - 1) * 100,
    landedWrongPct: 100 * ws.filter(w => w > best * 1.02).length / runs,
    bestLabels: labs[ws.indexOf(best)],
  };
}

// ------------------------------------------------------------ synthetic: blobs

test('blobs, k=3, random starts: 5 optima, 579 percent spread, 15 percent land wrong', () => {
  const s = sweep(rowsOf(BLOBS.configs.blobs), 3, { plusplus: false });
  assert.equal(s.optima, 5);
  close(s.best, 89.7, 0.05);                    // prose: the good answer costs about 90
  close(s.worst, 608.9, 0.05);
  close(s.spreadPct, 579.1, 0.5);               // prose: "the worst is nearly seven times the best"
  close(s.landedWrongPct, 15, 0.1);             // prose: "about one start in seven"
});

test('blobs, k=3, k-means++ : one optimum, zero spread, and it is right every time', () => {
  const cfg = BLOBS.configs.blobs;
  const s = sweep(rowsOf(cfg), 3, { plusplus: true });
  assert.equal(s.optima, 1);
  close(s.best, 89.7, 0.05);
  close(s.spreadPct, 0, 1e-6);
  for (const lab of s.labs) close(purity(lab, cfg.labels, 3), 1, 1e-12);   // 60 of 60, purity 1.00
});

test('++ is not a cure: at k=5 on the same blobs it still leaves 40 optima and 15 percent spread', () => {
  // The page says this out loud immediately after the ++ toggle pays off, so the
  // reader does not leave believing seeding solves the problem.
  const s = sweep(rowsOf(BLOBS.configs.blobs), 5, { plusplus: true });
  assert.equal(s.optima, 40);
  close(s.spreadPct, 15.1, 0.2);
});

// -------------------------------------------------------- synthetic: crescents

test('crescents, k=2: every restart agrees to 0.2 percent, and every restart is wrong', () => {
  const cfg = BLOBS.configs.crescents;
  const X = rowsOf(cfg);
  for (const plusplus of [false, true]) {
    const s = sweep(X, 2, { plusplus });
    assert.equal(s.optima, 3, `${plusplus ? '++' : 'random'} optima`);
    close(s.spreadPct, 0.2, 0.05);
    for (const lab of s.labs) close(purity(lab, cfg.labels, 2), 0.75, 0.01);
  }
});

test('crescents: the lowest-cost answer recovers 74.7 percent of the truth, the best any restart reaches is 75.3', () => {
  // This is the proof that convergence is not correctness, and the two numbers
  // have to stay apart: the cheapest solution is not the truest one.
  const cfg = BLOBS.configs.crescents;
  const s = sweep(rowsOf(cfg), 2, { plusplus: true });
  const atBest = purity(s.bestLabels, cfg.labels, 2);
  const bestAny = Math.max(...s.labs.map(l => purity(l, cfg.labels, 2)));
  close(100 * atBest, 74.7, 0.1);
  close(100 * bestAny, 75.3, 0.1);
  assert.ok(atBest < bestAny, 'the cheapest answer must not also be the truest, or the lesson evaporates');
});

// ---------------------------------------------------------- synthetic: uniform

test('uniform, k=3: 27 optima either way, and better seeding barely helps', () => {
  const X = rowsOf(BLOBS.configs.uniform);
  const rand = sweep(X, 3, { plusplus: false });
  const pp = sweep(X, 3, { plusplus: true });
  assert.equal(rand.optima, 27);
  assert.equal(pp.optima, 27);
  close(rand.spreadPct, 7.9, 0.1);
  close(pp.spreadPct, 7.6, 0.1);
  assert.ok(pp.spreadPct < rand.spreadPct, 'the page claims ++ helps a little, not that it helps a lot');
});

// -------------------------------------------------------------------- births

test('births, k=3: sizes 10 / 159 / 231, and the labels account for 0.53 of gestational age', () => {
  const X = zscoreColumns([BIRTHS.xs, BIRTHS.ys]);
  const r = kmeansRun(X, 3, mulberry32(7), { plusplus: true });
  const sizes = [0, 1, 2].map(j => r.labels.filter(l => l === j).length).sort((a, b) => a - b);
  assert.deepEqual(sizes, [10, 159, 231]);
  close(eta2(BIRTHS.xs, r.labels, 3), 0.532, 0.002);      // gestational age
  close(eta2(BIRTHS.ys, r.labels, 3), 0.650, 0.002);      // birthweight
});

test('births, k=3: asking for three groups does not return SGA / AGA / LGA', () => {
  // Spec §8. The page refuses this claim, so the refusal is pinned: the groups
  // split mostly on weight, and their gestational-age ranges overlap heavily.
  const X = zscoreColumns([BIRTHS.xs, BIRTHS.ys]);
  const r = kmeansRun(X, 3, mulberry32(7), { plusplus: true });
  const rangeOf = j => {
    const g = BIRTHS.xs.filter((_, i) => r.labels[i] === j);
    return [Math.min(...g), Math.max(...g)];
  };
  const byGa = [0, 1, 2].map(rangeOf).sort((a, b) => a[0] - b[0]);
  assert.ok(byGa[1][0] < byGa[0][1], 'the two lower groups must overlap in gestational age');
  assert.ok(byGa[2][0] < byGa[1][1], 'the two upper groups must overlap in gestational age');
  assert.ok(eta2(BIRTHS.ys, r.labels, 3) > eta2(BIRTHS.xs, r.labels, 3),
    'the split is mostly on weight, which is why it is not a clinical category');
});

test('births restarts are real but small: 10 optima across 60 random starts, 2.9 percent apart', () => {
  // Spec §11: state this plainly as small. Do not let "10 distinct optima" imply
  // the drama that blobs actually has.
  const X = zscoreColumns([BIRTHS.xs, BIRTHS.ys]);
  const s = sweep(X, 3, { plusplus: false, seedOf: n => n, digits: 3 });
  assert.equal(s.optima, 10);
  close(s.spreadPct, 2.9, 0.1);
  assert.ok(s.spreadPct < 5, 'the page calls this small; if it ever is not, the sentence is wrong');
});

// ------------------------------------------------------------------ biometry

test('biometry: the labels are gestational age in a costume, 0.719 / 0.871 / 0.916 / 0.941', () => {
  const X = zscoreColumns(bioColumns());
  const want = [0.719, 0.871, 0.916, 0.941];
  [2, 3, 4, 5].forEach((k, i) => {
    const r = kmeansRun(X, k, mulberry32(11), { plusplus: true });
    close(eta2(BIO.ga, r.labels, k), want[i], 0.002);
  });
});

test('biometry, k=3: the three cluster means are 22.8, 28.7 and 35.7 weeks', () => {
  const X = zscoreColumns(bioColumns());
  const r = kmeansRun(X, 3, mulberry32(11), { plusplus: true });
  const means = [0, 1, 2].map(j => {
    const g = BIO.ga.filter((_, i) => r.labels[i] === j);
    return g.reduce((a, b) => a + b, 0) / g.length;
  }).sort((a, b) => a - b);
  [22.8, 28.7, 35.7].forEach((w, i) => close(means[i], w, 0.05));
});

test('biometry: the units trap does not spring here, 93.7 percent agreement', () => {
  // Spec §8. Measured dead, so the callback to lesson 2 was cut down to one
  // sentence. If this ever separates, that sentence becomes wrong.
  const cols = bioColumns();
  const raw = cols[0].map((_, i) => cols.map(c => c[i]));
  const std = zscoreColumns(cols);
  const rr = kmeansRun(raw, 3, mulberry32(11), { plusplus: true });
  const rs = kmeansRun(std, 3, mulberry32(11), { plusplus: true });
  const perms = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];
  let agree = 0;
  for (const p of perms) {
    let a = 0;
    for (let i = 0; i < raw.length; i++) if (p[rr.labels[i]] === rs.labels[i]) a++;
    agree = Math.max(agree, a);
  }
  close(100 * agree / raw.length, 93.7, 0.2);
  close(eta2(BIO.ga, rr.labels, 3), 0.866, 0.002);
  close(eta2(BIO.ga, rs.labels, 3), 0.871, 0.002);
});

// ---------------------------------------------------------------------- elbow

test('the elbow vanishes on births: 40, 32, 23, 15, 14, 12 and no corner anywhere', () => {
  const X = zscoreColumns([BIRTHS.xs, BIRTHS.ys]);
  const w = [1, 2, 3, 4, 5, 6, 7].map(k => kmeansRun(X, k, mulberry32(3), { plusplus: true }).wcss);
  const drops = w.slice(1).map((v, i) => 100 * (1 - v / w[i]));
  [40, 32, 23, 15, 14, 12].forEach((want, i) => close(drops[i], want, 0.5));
  for (let i = 1; i < drops.length; i++) {
    assert.ok(drops[i] <= drops[i - 1] + 0.5, `births drops must not rise: ${drops.map(d => d.toFixed(0))}`);
  }
});

test('the elbow vanishes on biometry too, and its curve is not even monotone: 72, 52, 35, 28, 10, 21', () => {
  // Measured, and it matters for the prose. The biometry curve drops to 10
  // percent and then climbs back to 21, so the page must not describe it as a
  // smooth decay the way it can describe births. A curve that goes back up is
  // worse at naming a k, not better, which is the point being made.
  const X = zscoreColumns(bioColumns());
  const w = [1, 2, 3, 4, 5, 6, 7].map(k => kmeansRun(X, k, mulberry32(3), { plusplus: true }).wcss);
  const drops = w.slice(1).map((v, i) => 100 * (1 - v / w[i]));
  [72, 52, 35, 28, 10, 21].forEach((want, i) => close(drops[i], want, 0.5));
  assert.ok(drops[5] > drops[4], 'the k=7 drop is larger than the k=6 drop; the bump is real and stays');
});

test('blobs has the elbow that the real data does not, which is why it is in the figure', () => {
  const X = rowsOf(BLOBS.configs.blobs);
  const w = [1, 2, 3, 4, 5, 6, 7].map(k => kmeansRun(X, k, mulberry32(3), { plusplus: true }).wcss);
  const drops = w.slice(1).map((v, i) => 100 * (1 - v / w[i]));
  assert.ok(drops[1] > 50, `the k=3 drop should be large: ${drops[1].toFixed(0)} percent`);
  assert.ok(drops[2] < 20, `the k=4 drop should be small: ${drops[2].toFixed(0)} percent`);
  assert.ok(drops[1] / drops[2] > 3, 'blobs must have a corner the reader can actually see');
});

// -------------------------------------------------------------------- guards

test('sample sd and population sd give identical labels, so the standardizing choice is not load-bearing', () => {
  // core.mjs standardize() divides by n-1; zscoreColumns divides by n. For a
  // fixed n that is one global scale factor on the whole space, so distances all
  // scale together and the partition is unchanged. Recorded as a test because
  // the alternative is somebody rediscovering it while chasing a phantom bug.
  const cols = bioColumns();
  const pop = zscoreColumns(cols);
  const sampCols = cols.map(standardize);
  const samp = sampCols[0].map((_, i) => sampCols.map(c => c[i]));
  for (const k of [2, 3, 4, 5]) {
    const a = kmeansRun(pop, k, mulberry32(11), { plusplus: true });
    const b = kmeansRun(samp, k, mulberry32(11), { plusplus: true });
    assert.deepEqual(a.labels, b.labels, `k=${k} labels must not depend on which sd`);
    close(eta2(BIO.ga, a.labels, k), eta2(BIO.ga, b.labels, k), 1e-12);
  }
});

test('no page number is ever computed from uniform purity', () => {
  // uniform has no ground truth. blobs.json stores null rather than an array of
  // zeros so that scoring it is a TypeError instead of a meaningless 1.00.
  assert.equal(BLOBS.configs.uniform.labels, null);
});
```

- [ ] **Step 2: Run it**

```bash
node --test test/kmeans-claims.test.mjs
```

Expected: PASS. This task adds 17 tests. If any number is off, **do not adjust the assertion**. Re-run the probe that produced it and find out which side moved:

```bash
node reference/kmeans-probe-synthetic.mjs
```

- [ ] **Step 3: Run the whole suite**

```bash
node --test
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add test/kmeans-claims.test.mjs
git commit -F- <<'MSG'
m6: the claims table, before a word of prose exists

Seventeen tests, one per number lesson 4 will quote, all measured on 2026-08-25
and all reproduced from the reference probes. Written now rather than after the
page, because writing the prose first is exactly what produced the wrong PC2
claim in lesson 3.

Two findings worth recording rather than burying:

The biometry elbow is not monotone. Drops for k=2 through 7 are 72, 52, 35, 28,
10, 21, so it falls to 10 percent and climbs back to 21. The spec said biometry
"does the same" as births, which is loose; births really is monotone and this is
not. The bump is on message rather than a problem, and the test pins it so the
prose cannot describe a smooth decay that is not there.

The standardizing choice is not load-bearing. The probes divide by n and
core.mjs divides by n-1, which is one global scale factor on the whole space, so
the labels are identical and only the absolute cost differs. Pinned as a test so
the next person does not chase it as a bug.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 4: Cluster identity as shape, and the partition as an outline

**Files:**
- Create: `js/lib/marks.mjs`
- Test: `test/instruments4.test.mjs` (created here, extended by Tasks 6 to 9)

**Interfaces:**
- Consumes: `isoSegments` from `js/lib/contours.mjs`, `d2` from `js/math/kmeans.mjs`.
- Produces:
  - `MARK_KINDS: string[]` the six kinds in cluster-index order: `['circle','square','triangle','diamond','plus','cross']`
  - `MAX_MARKS = 6`
  - `markPath(kind: string, cx: number, cy: number, r: number) -> { d: string, filled: boolean }`
  - `partitionSegments(centers: number[][], frame, opts?: {n?: number}) -> Array<[x0,y0,x1,y1]>` in **screen** coordinates
  - `markFor(clusterIndex: number) -> string` kind name, throws above 5

**Why shape and not hue:** the owner is colorblind and this is the first instrument family on the site that needs a categorical channel at all. Filled silhouettes (circle, square, triangle, diamond) separate at small sizes; plus and cross are stroke-only line marks that read differently from all four fills and from each other. Six is the ceiling, which is where the k cap comes from, and the cap binds only the instruments that draw membership.

**Why k-means cells are exactly Voronoi cells:** every point goes to its nearest center, so the boundary of cluster j is the zero level set of `f_j(p) = d2(p, c_j) - min over l != j of d2(p, c_l)`. That is a scalar field, which is what `isoSegments` already traces. Tracing every j draws each internal wall twice, once from each side, so `partitionSegments` dedupes on a rounded midpoint key.

- [ ] **Step 1: Write the failing tests**

Create `test/instruments4.test.mjs`:

```js
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
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node --test test/instruments4.test.mjs
```

Expected: FAIL with `Cannot find module` naming `js/lib/marks.mjs`.

- [ ] **Step 3: Write `js/lib/marks.mjs`**

```js
// Cluster identity, drawn. The owner is colorblind, so membership is never hue:
// it is the shape of the mark, and the partition is a heavy drawn outline. Four
// filled silhouettes separate by outline at small sizes, and plus and cross are
// stroke-only line marks that read differently from all four fills and from each
// other. Six is the ceiling, which is where the k cap on the membership-drawing
// instruments comes from. elbow draws no membership and is not capped.
//
// The boundary: every point goes to its nearest center, so a k-means cell is a
// Voronoi cell, and the boundary of cluster j is the zero level set of
//   f_j(p) = d2(p, c_j) - min over l != j of d2(p, c_l)
// which is a scalar field, which is what contours.mjs already traces. Tracing
// every j walks each internal wall twice, once from each side, so the segments
// are deduped on a rounded midpoint.

import { isoSegments } from './contours.mjs';
import { d2 } from '../math/kmeans.mjs';

export const MARK_KINDS = ['circle', 'square', 'triangle', 'diamond', 'plus', 'cross'];
export const MAX_MARKS = MARK_KINDS.length;

export function markFor(i) {
  if (!(i >= 0 && i < MAX_MARKS)) {
    throw new RangeError(`cluster ${i} has no mark: the shape budget is six, and k is capped there`);
  }
  return MARK_KINDS[i];
}

const N = v => +v.toFixed(2);

// Returns {d, filled}. filled marks are painted with a screen and outlined;
// unfilled marks are stroked only. The caller decides stroke width and paint.
export function markPath(kind, cx, cy, r) {
  const x = N(cx), y = N(cy);
  switch (kind) {
    case 'circle':
      return { d: `M${N(cx - r)} ${y}a${N(r)} ${N(r)} 0 1 0 ${N(2 * r)} 0a${N(r)} ${N(r)} 0 1 0 ${N(-2 * r)} 0Z`, filled: true };
    case 'square':
      return { d: `M${N(cx - r)} ${N(cy - r)}H${N(cx + r)}V${N(cy + r)}H${N(cx - r)}Z`, filled: true };
    case 'triangle':
      return { d: `M${x} ${N(cy - r)}L${N(cx + r)} ${N(cy + r * 0.8)}L${N(cx - r)} ${N(cy + r * 0.8)}Z`, filled: true };
    case 'diamond':
      return { d: `M${x} ${N(cy - r)}L${N(cx + r)} ${y}L${x} ${N(cy + r)}L${N(cx - r)} ${y}Z`, filled: true };
    case 'plus':
      return { d: `M${N(cx - r)} ${y}H${N(cx + r)}M${x} ${N(cy - r)}V${N(cy + r)}`, filled: false };
    case 'cross': {
      const q = N(r * 0.75);
      return { d: `M${N(cx - q)} ${N(cy - q)}L${N(cx + q)} ${N(cy + q)}M${N(cx + q)} ${N(cy - q)}L${N(cx - q)} ${N(cy + q)}`, filled: false };
    }
    default:
      throw new RangeError(`unknown mark kind: ${kind}`);
  }
}

// frame: {plot:{x0,y0,x1,y1}, invX, invY} as built by js/lib/frame.mjs.
// Returns segments [x0, y0, x1, y1] in screen coordinates.
// n is the grid resolution; keep it coarse, the cost is O(n^2 * k^2).
export function partitionSegments(centers, frame, { n = 64 } = {}) {
  if (centers.length < 2) return [];
  const { plot } = frame;
  const w = (plot.x1 - plot.x0) / n, h = (plot.y1 - plot.y0) / n;
  const px = i => plot.x0 + i * w, py = j => plot.y0 + j * h;

  // Squared distance from every grid node to every center, computed once.
  const dist = [];
  for (let j = 0; j <= n; j++) {
    const row = [];
    for (let i = 0; i <= n; i++) {
      const p = [frame.invX(px(i)), frame.invY(py(j))];
      row.push(centers.map(c => d2(p, c)));
    }
    dist.push(row);
  }

  const out = [], seen = new Set();
  for (let c = 0; c < centers.length; c++) {
    const values = dist.map(row => row.map(ds => {
      let other = Infinity;
      for (let l = 0; l < ds.length; l++) if (l !== c && ds[l] < other) other = ds[l];
      return ds[c] - other;
    }));
    for (const [i0, j0, i1, j1] of isoSegments({ values }, 0)) {
      const s = [N(px(i0)), N(py(j0)), N(px(i1)), N(py(j1))];
      const key = `${Math.round((s[0] + s[2]) * 2)}:${Math.round((s[1] + s[3]) * 2)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
  }
  return out;
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
node --test test/instruments4.test.mjs
```

Expected: PASS. This task adds 7 tests.

- [ ] **Step 5: Commit**

```bash
git add js/lib/marks.mjs test/instruments4.test.mjs
git commit -F- <<'MSG'
m6: cluster identity as shape, partition as a traced outline

The first categorical channel on the site, so it needed deciding rather than
defaulting. Membership is the shape of the mark: four filled silhouettes that
separate by outline at small sizes, plus two stroke-only line marks that read
differently from the fills and from each other. Six kinds is the ceiling, which
is where the k cap on the three membership-drawing instruments comes from.
markFor throws past six rather than wrapping, so the cap fails loudly.

The boundary reuses contours.mjs instead of a second tracer. A k-means cell is a
Voronoi cell, so the wall around cluster j is the zero level set of its squared
distance minus the nearest rival's, which is an ordinary scalar field. Tracing
every cluster walks each internal wall twice, so segments dedupe on a rounded
midpoint, and a test asserts no wall is drawn twice.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 5: The Play loop, additively

**Files:**
- Modify: `js/lib/hydrate.mjs`
- Modify: `test/hydrate.test.mjs`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `PLAY_FPS = 4` exported constant
  - `playTick(lastMs: number, nowMs: number, fps: number) -> boolean` pure, node-tested
  - `mount` behaviour: if `instrument.step` exists and `state.play` is true, mount drives `store.set(instrument.step(fullState))` at no more than `PLAY_FPS` per second, and clears `play` when `state.done` is raised.
- **Additive by construction.** `render(state)` stays pure and untouched, so poster generation, node rendering and every existing geometry test are unaffected. An instrument without `step` behaves exactly as it does today. This is the contract change the spec authorised in §9, and it is the only one.

**Designed for lesson 5:** the same control surface accepts a precomputed frame index instead of a live `step`, because UMAP's optimization is too expensive to run in the browser. Lesson 5 inherits the transport rather than rebuilding it. Do not couple the loop to k-means.

**Why 4 steps per second:** honest to an algorithm that converges in about ten iterations, and it avoids re-rendering halftone screens at 60fps. `render` returns a whole SVG string, so every frame is a full re-render.

- [ ] **Step 1: Write the failing tests**

Append to `test/hydrate.test.mjs`:

```js
import { playTick, PLAY_FPS, mount } from '../js/lib/hydrate.mjs';

test('playTick gates the loop to the frame budget', () => {
  assert.equal(PLAY_FPS, 4);
  const gap = 1000 / PLAY_FPS;
  assert.equal(playTick(0, gap - 1, PLAY_FPS), false);
  assert.equal(playTick(0, gap, PLAY_FPS), true);
  assert.equal(playTick(0, gap + 1, PLAY_FPS), true);
});

test('playTick fires immediately on the first frame after Play is pressed', () => {
  // lastStep starts at -Infinity so the reader sees a move on the same tick they
  // clicked, rather than a quarter second of nothing.
  assert.equal(playTick(-Infinity, 0, PLAY_FPS), true);
});

test('the Play loop never leaves the same callback scheduled twice', () => {
  // The scheduling slice of the loop is cheaply testable in node even though the
  // rest of mount is not: it only references requestAnimationFrame and document,
  // so stubbing those two exercises the real pump and maybePlay. Worth having,
  // because the bug this pins produces no visible symptom - lastStep is shared,
  // so the step rate stays correct while pending callbacks pile up - and a
  // browser QA pass would not have caught it.
  const pending = [];
  const g = globalThis;
  const savedRaf = g.requestAnimationFrame, savedDoc = g.document;
  g.requestAnimationFrame = fn => pending.push(fn);
  g.document = { hidden: false, activeElement: null };
  try {
    const el = { innerHTML: '', querySelector: () => null, querySelectorAll: () => [], contains: () => false };
    const store = createStore({ play: true, i: 0 });
    mount(el, {
      controls: [], render: () => '<svg></svg>', applyDrag: () => ({}),
      step: s => ({ i: s.i + 1 }),
    }, store);
    for (const now of [0, 300, 600, 900, 1200]) {
      for (const fn of pending.splice(0, pending.length)) fn(now);
      // pump is one stable reference; each rerender wrapper is a fresh closure.
      // So a repeated reference is precisely a double-scheduled pump.
      const seen = new Map();
      for (const fn of pending) seen.set(fn, (seen.get(fn) || 0) + 1);
      const worst = Math.max(0, ...seen.values());
      assert.ok(worst <= 1, `at ${now}ms one callback is scheduled ${worst} times over`);
    }
  } finally {
    g.requestAnimationFrame = savedRaf;
    g.document = savedDoc;
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node --test test/hydrate.test.mjs
```

Expected: FAIL, `playTick` is not exported.

- [ ] **Step 3: Add the pure helper to `js/lib/hydrate.mjs`**

Insert directly above `export function mount(...)`:

```js
// Play is capped rather than free-running: render returns a whole SVG string, so
// every frame is a full re-render, and the algorithm converges in about ten
// iterations anyway. Pure so it can be node-tested; the loop that calls it is
// DOM and is exercised in the browser QA pass.
export const PLAY_FPS = 4;
export function playTick(lastMs, nowMs, fps) { return nowMs - lastMs >= 1000 / fps; }
```

- [ ] **Step 4: Add the loop inside `mount`**

Inside `mount`, beside the existing `let dragging = null; let raf = 0;` declarations, add:

```js
  let playRaf = 0, lastStep = -Infinity;
```

Then add these two functions after `rerender()` is defined and before the `store.subscribe(...)` call:

```js
  // An instrument may export step(state) -> partial state. If it does, mount
  // drives it while state.play is true. Instruments without step never enter
  // this path, which is what makes the contract change additive.
  //
  // Exhaustion is signalled by step() returning an empty partial, not by mount
  // reading a state field. mount must not know what "converged" means for any
  // particular instrument: lesson 5 will drive a precomputed frame index through
  // this same loop, and it runs out of frames rather than converging.
  function pump(now) {
    playRaf = 0;
    const s = full();
    if (!s.play || !instrument.step) return;
    if (playTick(lastStep, now, PLAY_FPS)) {
      lastStep = now;
      const next = instrument.step(s);
      if (!next || !Object.keys(next).length) { store.set({ play: false }); return; }
      store.set(next);
    }
    // Guarded, and the guard is load-bearing. store.set notifies synchronously,
    // the subscriber calls maybePlay, and playRaf is still 0 at that moment, so
    // maybePlay schedules the next frame. Assigning unconditionally here would
    // overwrite that schedule without cancelling it, leaving two pump callbacks
    // pending and one more on every tick after. It has no visible symptom, since
    // lastStep is shared and the step rate stays correct, which is exactly why
    // it needs a test rather than a browser pass.
    if (!playRaf) playRaf = requestAnimationFrame(pump);
  }
  function maybePlay() {
    if (!playRaf && instrument.step && full().play) playRaf = requestAnimationFrame(pump);
  }
```

Then change the existing subscribe body so it also starts the loop when `play` flips on. The block becomes:

```js
  store.subscribe(() => {
    maybePlay();
    if (raf) return;
    // rAF never fires in a hidden tab; fall back so state changes still land.
    const schedule = typeof document !== 'undefined' && document.hidden
      ? cb => setTimeout(cb, 16)
      : requestAnimationFrame;
    raf = schedule(() => { raf = 0; rerender(); });
  });

  rerender();
  maybePlay();
  return { rerender };
```

- [ ] **Step 5: Run the tests**

```bash
node --test test/hydrate.test.mjs
```

Expected: PASS. Task 5 adds 3 tests, so test/hydrate.test.mjs now holds 7.

- [ ] **Step 6: Confirm the change really is additive**

```bash
node --test
```

Expected: PASS, every instrument test and poster test unchanged. If anything in `instruments.test.mjs`, `instruments2.test.mjs`, `instruments3.test.mjs` or `poster.test.mjs` moved, the change was not additive and needs reverting rather than patching.

- [ ] **Step 7: Commit**

```bash
git add js/lib/hydrate.mjs test/hydrate.test.mjs
git commit -F- <<'MSG'
m6: an optional step() export and a Play loop, capped at 4 per second

The one contract change lesson 4 needs, and it is additive. render(state) stays
pure and untouched, so poster generation, node rendering and every existing
geometry test are unaffected, and an instrument without step behaves exactly as
it did. Verified by running the full suite rather than asserted.

Capped at four steps per second because render returns a whole SVG string, so
every frame is a full re-render of a page that also carries halftone screens,
and because the algorithm converges in about ten iterations. The cap is honest
rather than decorative. The loop clears play when the instrument raises done, so
a converged run stops instead of spinning.

The gate is a pure playTick, node-tested; the rAF loop around it is DOM and is
exercised in the browser pass, matching how the rest of this file is covered.
Built to accept a precomputed frame index in place of a live step, because UMAP
cannot optimise in the browser and lesson 5 should inherit the transport.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 6: `kmeans-step`, the mechanism and only the mechanism

**Files:**
- Create: `js/instruments/kmeans-step.mjs`
- Test: `test/instruments4.test.mjs` (append)

**Interfaces:**
- Consumes: `startState`, `kmeansStep`, `assign`, `totalSquaredDistance`, `zscoreColumns` from `js/math/kmeans.mjs`; `markPath`, `markFor`, `partitionSegments`, `MAX_MARKS` from `js/lib/marks.mjs`; `isoFrame`, `F` from `js/lib/frame.mjs`; `mulberry32` from `js/math/core.mjs`.
- Produces:
  - `name`, `defaults`, `posterState`, `controls`, `render(state)`, `applyDrag()` per the existing instrument contract
  - `step(state) -> partial` **the only instrument in this lesson that exports it**
  - `stats(state) -> {X, k, centers, labels, phase, iter, done, assigned, cost}` where `cost` is null until something is assigned
  - `restart(state, seed) -> partial` fresh centers, cleared labels, phase back to `assign`
  - `setDataset(state, name) -> partial` swaps the data and restarts

**Dataset switching uses `action` controls, one button per dataset.** `hydrate.mjs` supports slider, toggle and action, and nothing else. A five-way choice is not a toggle, and a slider over a categorical would be worse for the reader than five named buttons that are keyboard-operable for free. Adding a `choice` control kind would be a second contract change, and the spec authorised exactly one. The page wires the five actions to `setDataset`.

**k is capped at 2 to 6** because this instrument draws membership. Do not widen it.

- [ ] **Step 1: Write the failing tests**

Append to `test/instruments4.test.mjs`:

```js
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
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node --test test/instruments4.test.mjs
```

Expected: FAIL with `Cannot find module` naming `js/instruments/kmeans-step.mjs`.

- [ ] **Step 3: Write the contract half of `js/instruments/kmeans-step.mjs`**

```js
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
import { markPath, markFor, partitionSegments, MAX_MARKS, MARK_KINDS } from '../lib/marks.mjs';
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
  xName: 'x', yName: 'y',
  k: 3,
  plusplus: false,
  seed: 1,
  centers: null, labels: null, phase: 'assign', iter: 0, done: false,
  showTruth: false, showWall: true, play: false,
  note: '',
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

export function applyDrag() { return {}; }
```

- [ ] **Step 4: Write `render(state)` in the same file**

Follow the layout and the `data-role` contract below exactly; the tests assert on it. Model the SVG assembly on `js/instruments/units-trap.mjs`, which already builds an isotropic plot with a right-hand readout panel.

```
W = 640, H = 460
MARGIN = { l: 56, r: 200, t: 44, b: 48 }
plot   = { x0: MARGIN.l, y0: MARGIN.t, x1: W - MARGIN.r, y1: H - MARGIN.b }
frame  = isoFrame(rowsOf(st).map(r => r[0]), rowsOf(st).map(r => r[1]), plot)
```

Draw order, back to front:

| element | `data-role` | count | notes |
|---|---|---|---|
| plot rect | - | 1 | `stroke="var(--border)"` |
| title | - | 1 | `st.labels_.title`, serif italic, y=26 |
| partition wall | `wall` | many | only when `showWall` **and** something is assigned. `partitionSegments(st.centers, frame, {n: 56})`, each `<line ... stroke="var(--ink)" stroke-width="2.5">` |
| true-group ring | `truth-ring` | n | only when `showTruth` and `st.truth`. A thin circle `r=5` behind each point, `fill="none" stroke="var(--border)"` |
| point | `pt` | n | `<path data-role="pt" data-cluster="J" data-mark="KIND" d=...>`. Unassigned (`label < 0`) draws a small `circle` mark in `var(--text-light)`; assigned draws `markFor(label)` in `var(--heading)`. Filled marks get `fill`, unfilled get `fill="none" stroke-width="1.6"` |
| center | `center` | k | `markFor(j)` at `r=9`, `stroke="var(--ink)" stroke-width="3"`, plus a same-shape white halo underneath so it reads on top of its own cluster |
| phase readout | `phase` | 1 | the sentence, not the noun. See below |
| iteration | `iter` | 1 | `iteration ${st.iter}` |
| cost | `cost` | 1 | `total squared distance ${cost.toFixed(1)}`, or `not assigned yet` |
| legend | `legend-mark` | k | one row per cluster: the mark, then `group ${j+1}, n = ${count}` |
| note | `note` | 0 or 1 | `DATASETS[st.dataset].note` |

The `phase` text is the interaction copy and is fixed. Use exactly these strings, because the tests pin the first one and the prose guide requires naming the control and its consequence:

```js
const PHASE_TEXT = {
  fresh:  'press Step to assign every point to its nearest center',
  update: 'now press Step again to move each center to the middle of the points that chose it',
  assign: 'press Step to reassign every point to its nearest center',
  done:   'nothing moved on the last pass, so this is where it stops',
};
```

Pick `fresh` when nothing is assigned, `done` when `st.done`, otherwise the value of `st.phase` **naming the move about to happen**, not the one just made.

- [ ] **Step 5: Run the tests**

```bash
node --test test/instruments4.test.mjs
```

Expected: PASS. Task 6 adds 9 tests, so test/instruments4.test.mjs now holds 16.

- [ ] **Step 6: Look at it before believing it**

```bash
node -e "import('./js/instruments/kmeans-step.mjs').then(async M=>{const fs=await import('node:fs');const c=JSON.parse(fs.readFileSync('data/blobs.json','utf8')).configs.blobs;let s={...M.defaults,idKey:'x',dataset:'blobs',xs:c.xs,ys:c.ys,truth:c.labels,k:3};s={...s,...M.restart(s,1)};for(let i=0;i<8;i++)s={...s,...M.step(s)};fs.writeFileSync('figures/_scratch-kmeans-step.svg',M.render(s));console.log('wrote figures/_scratch-kmeans-step.svg iter',s.iter,'done',s.done)})"
```

Open it. Three blobs, three distinct marks, a wall between them, centers sitting in the middle of their own clusters. Then delete the scratch file:

```bash
rm figures/_scratch-kmeans-step.svg
```

- [ ] **Step 7: Commit**

```bash
git add js/instruments/kmeans-step.mjs test/instruments4.test.mjs
git commit -F- <<'MSG'
m6: kmeans-step, one click for one half of the algorithm

Assign redraws membership with the centers frozen; recompute moves the centers
with membership frozen. Never both in one click. That doubles the clicks to
convergence, which was the cost Andrew accepted on 2026-08-25, because the two
moves being separable is the thing the instrument exists to show.

The phase readout names the move about to happen rather than the one just made,
and names the control while it does it: "press Step to assign every point to its
nearest center". A reader who parses "Step advances one half-step" as a noun
phrase learns nothing, which two cold readers demonstrated on the spec.

Changing k, the seeding rule or the dataset starts the run over instead of
leaving a half-updated state that no sequence of Steps could have produced.

Dataset switching is five named action buttons, not a slider over a categorical
and not a new control kind. hydrate supports slider, toggle and action, the spec
authorised exactly one contract change, and five buttons are keyboard-operable
for free.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 7: `restart-roulette`, the same question and six different answers

**Files:**
- Create: `js/instruments/restart-roulette.mjs`
- Test: `test/instruments4.test.mjs` (append)

**Interfaces:**
- Consumes: `kmeansRun`, `totalSquaredDistance`, `purity`, `zscoreColumns` from `js/math/kmeans.mjs`; `marks.mjs`; `mulberry32`.
- Produces: `name`, `defaults`, `posterState`, `controls`, `render`, `applyDrag`, plus
  - `panels(state) -> Array<{seed, centers, labels, cost, rank, purity|null}>` six entries, `rank` 1 is cheapest
  - `applyControl(state, id, value) -> partial`
- Does **not** export `step`. Only `kmeans-step` animates.

**Size note:** six panels times 150 points is 900 marks, roughly 60 KB of SVG in the committed poster. That is the honest price of six real panels, and it is within budget: `pca.html` is 99 KB today and `least-squares.html` is 175 KB. Do not subsample the points to save bytes; a panel the reader cannot read the partition off is not a panel.

**Click-through to `kmeans-step`:** each panel carries `data-panel="INDEX"` and `data-seed="SEED"` so the page can wire a click to load that initialization into the `kmeans-step` store. The instrument itself stays pure; the page does the wiring, the same way drags are routed today.

- [ ] **Step 1: Write the failing tests**

Append to `test/instruments4.test.mjs`:

```js
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

test('the panels differ in the PARTITION, not merely in the number printed on them', () => {
  // The figure's argument is that the starting point changes the answer. Cost is
  // the evidence, membership is the claim. A refactor that drew one panel's
  // centers into all six while panels() still computed six different costs would
  // pass every other test here and reduce the figure to six identical drawings
  // with six different numbers stapled on, which is the exact failure this
  // lesson is about.
  // Canonical form matters: raw label vectors count a renumbering as a
  // difference, and on blobs with ++ the six panels carry three distinct raw
  // vectors but only ONE distinct partition. Measured canonically:
  // blobs random 2, blobs ++ 1, crescents ++ 4, uniform 6.
  assert.equal(RR.distinctAnswers(RR.panels(rrState())), 2);
  assert.equal(RR.distinctAnswers(RR.panels(rrState({ plusplus: true }))), 1);
  const u = BLOBS.configs.uniform;
  assert.equal(RR.distinctAnswers(RR.panels(rrState({ dataset: 'uniform', xs: u.xs, ys: u.ys, truth: null, k: 3 }))), 6);
});

test('the figure counts its own answers instead of promising a number in the title', () => {
  const svg = RR.render(rrState());
  assert.equal(roles(svg, 'agreement'), 1);
  assert.equal(texts(svg, 'agreement')[0], 'these six starts found 2 different answers');
  assert.equal(texts(svg, 'agreement').length, 1);
  const pp = RR.render(rrState({ plusplus: true }));
  assert.equal(texts(pp, 'agreement')[0], 'all six starts found the same answer');
  // and the title must not promise a count the panels may not deliver
  assert.ok(!/six answers/.test(svg), 'the title overclaimed once; it must not again');
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

test('a dataset with no ground truth renders no purity at all', () => {
  const u = BLOBS.configs.uniform;
  const svg = RR.render(rrState({ dataset: 'uniform', xs: u.xs, ys: u.ys, truth: null, k: 3 }));
  assert.equal(roles(svg, 'panel-purity'), 0);
  assert.equal(roles(svg, 'panel'), 6);
});

test('restart-roulette carries no em-dash and never writes the acronym', () => {
  const svg = RR.render(rrState());
  assert.ok(!svg.includes(EM_DASH));
  assert.ok(!/WCSS/i.test(svg));
});
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node --test test/instruments4.test.mjs
```

Expected: FAIL, module not found.

- [ ] **Step 3: Write `js/instruments/restart-roulette.mjs`**

Contract half, in full:

```js
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
// that promises disagreement and draws six identical panels teaches the
// opposite of its point.
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
```

- [ ] **Step 4: Write `render(state)` in the same file**

```
W = 640, H = 460
Grid: 3 columns by 2 rows. Panel cell 196 x 176, gutter 12, grid origin (28, 62).
Per panel plot inset 6px, so each panel gets its own isoFrame over the same data.
```

Every panel uses the **same** `isoFrame` extent (compute it once from the data and reuse), so the six pictures are comparable rather than each auto-scaling to its own answer.

| element | `data-role` | count | notes |
|---|---|---|---|
| panel group | `panel` | 6 | `<g data-role="panel" data-panel="I" data-seed="S" data-rank="R" tabindex="0" role="button" aria-label="...">`. Keyboard-reachable, because the page wires click and Enter to load it into `kmeans-step` |
| panel frame | - | 6 | `stroke="var(--border)"`; the rank-1 panel gets `stroke-width="3"` and `stroke="var(--ink)"` |
| wall | `wall` | many | `partitionSegments(panel.centers, panelFrame, {n: 32})`, coarser than `kmeans-step` because the panel is small |
| point | `pt` | 900 | `markFor(label)` at `r=2.2` |
| center | `center` | 6 x k | `markFor(j)` at `r=5`, `stroke-width="2.5"` |
| rank | `panel-rank` | 6 | `#1` through `#6`, mono |
| cost | `panel-cost` | 6 | `cost.toFixed(1)` |
| best mark | `panel-best-mark` | 1 | a filled triangle glyph plus the word `cheapest` on the rank-1 panel. Shape and word, never colour |
| purity | `panel-purity` | 0 or 6 | `${Math.round(100 * purity)}% right` only when `st.truth` |
| agreement | `agreement` | 1 | `agreementText(panels(st))`, under the title. Computed, never asserted |
| title, note | - | 1 each | |

The `aria-label` on each panel is `start ${i + 1}, cost ${cost.toFixed(1)}${rank === 1 ? ', the cheapest of the six' : ''}` so a screen reader gets the ranking without the glyph.

- [ ] **Step 5: Run the tests**

```bash
node --test test/instruments4.test.mjs
```

Expected: PASS. Task 7 adds 13 tests.

- [ ] **Step 6: Commit**

```bash
git add js/instruments/restart-roulette.mjs test/instruments4.test.mjs
git commit -F- <<'MSG'
m6: restart-roulette, and a figure that counts its own answers

Six initializations of the same data at the same k, as small multiples, each
labelled with its own cost and ranked. Seeds follow the reference probe's scheme
exactly, so a panel on the page is a row of the claims table rather than a
different sweep that happens to resemble it.

All six panels share one isoFrame computed from the data rather than each
auto-scaling to its own answer, because six pictures at six scales are not
comparable and the whole figure is a comparison.

The cheapest panel is marked three ways at once: a heavier frame, a drawn glyph,
and the word "cheapest". Never a colour. Panels are tabbable with an aria-label
that states the cost and the ranking, so the click-through to kmeans-step and
the ranking itself both survive without sight of the glyph.

900 points across six panels is about 60 KB of SVG. Kept, rather than subsampled
to save bytes: a panel you cannot read the partition off is not a panel, and the
page budget has room.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 8: `elbow`, the method people actually use, failing on their own data

**Files:**
- Create: `js/instruments/elbow.mjs`
- Test: `test/instruments4.test.mjs` (append)

**Interfaces:**
- Consumes: `kmeansRun`, `zscoreColumns` from `js/math/kmeans.mjs`; `niceTicks`, `F` from `js/lib/frame.mjs`; `mulberry32`.
- Produces: `name`, `defaults`, `posterState`, `controls`, `render`, `applyControl`, `applyDrag`, plus
  - `curve(state) -> Array<{k, cost, dropPct}>` k = 1 to `state.kMax`, `dropPct` null at k = 1
  - `verdictOf(curve) -> {corner: number|null, ratio: number, text: string}`

**This instrument is not capped at 6.** It draws a curve and no cluster identity, so the shape budget does not apply. `kMax` defaults to 10 and the slider runs to 10. Capping it here would cripple the one instrument whose entire job is the shape of the curve across k; two cold readers caught that in the first draft of the design.

**Seed is fixed at 3 with ++ seeding**, matching the claims test. A curve that jitters when the reader is not touching anything teaches the wrong lesson.

- [ ] **Step 1: Write the failing tests**

Append to `test/instruments4.test.mjs`:

```js
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
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node --test test/instruments4.test.mjs
```

Expected: FAIL, module not found.

- [ ] **Step 3: Write `js/instruments/elbow.mjs`**

```js
// elbow - the method people actually use, shown failing on their own data. The
// total squared distance against k, with the drop at each step printed as text
// beside the point, because a bar is a picture of a number and never the only
// copy of it. Structural callback to scree in lesson 3: same left-hand shape,
// same insistence that the number is written out.
//
// NOT capped at six. This instrument draws a curve and no cluster identity, so
// the shape budget does not bind it. Capping it would cripple the one figure
// whose whole job is the shape of the curve across k; two cold readers caught
// exactly that in the first draft of the design.
//
// Seed fixed at 3 with ++ seeding, matching test/kmeans-claims.test.mjs. A curve
// that jitters while the reader is not touching anything teaches restarts, which
// is restart-roulette's job, not this one's.
// Pure: render(state) -> SVG string.

import { mulberry32 } from '../math/core.mjs';
import { kmeansRun, zscoreColumns } from '../math/kmeans.mjs';
import { niceTicks, F } from '../lib/frame.mjs';

export const name = 'elbow';

export const SEED = 3;

export const defaults = {
  idKey: 'elbow',
  dataset: 'blobs',
  columns: null,            // [[...], [...]] one array per variable
  standardize: false,
  kMax: 10,
  note: '',
  labels_: { title: 'the cost always falls. that is the problem.' },
};

export const posterState = null;

export const controls = [
  { id: 'kMax', kind: 'slider', label: 'how far to look (k)', min: 4, max: 10, step: 1 },
  { id: 'use-blobs', kind: 'action', label: 'blobs' },
  { id: 'use-births', kind: 'action', label: 'births' },
  { id: 'use-biometry', kind: 'action', label: 'biometry' },
];

export function curve(st) {
  const X = st.standardize
    ? zscoreColumns(st.columns)
    : st.columns[0].map((_, i) => st.columns.map(c => c[i]));
  const out = [];
  for (let k = 1; k <= st.kMax; k++) {
    const cost = kmeansRun(X, k, mulberry32(SEED), { plusplus: true }).wcss;
    const prev = out.length ? out[out.length - 1].cost : null;
    out.push({ k, cost, dropPct: prev === null ? null : 100 * (1 - cost / prev) });
  }
  return out;
}

export function applyControl(st, id, value) { return { [id]: value }; }
export function applyDrag() { return {}; }
```

- [ ] **Step 4: Write `render(state)` in the same file**

```
W = 640, H = 460
MARGIN = { l: 72, r: 150, t: 44, b: 52 }
x: k, linear from 1 to kMax across the plot
y: cost, linear from 0 to the k=1 cost
```

| element | `data-role` | count | notes |
|---|---|---|---|
| plot rect, ticks | - | | `niceTicks` on the y axis; the x axis has one tick per integer k |
| curve | `curve` | 1 | one `<polyline>`, `stroke="var(--ink)" stroke-width="2.5" fill="none"` |
| point | `k-point` | kMax | filled circle `r=4`, `data-k="K"` |
| drop label | `drop-label` | kMax - 1 | one per k from 2 upward, printed as `${Math.round(dropPct)}%` immediately right of its point |
| axis label y | - | 1 | exactly `total squared distance from each point to its own center` |
| axis label x | - | 1 | `how many groups (k)` |
| verdict | `verdict` | 1 | see below |
| note | `note` | 0 or 1 | |

The `verdict` line is computed, never asserted, so the figure cannot claim a corner the data does not have. Export it as `verdictOf(curve)` and render `verdictOf(curve(st)).text`.

An elbow is a sharp fall-off in the **rate** of improvement, so the rule looks at the ratio between *consecutive* drops, not at any single drop's size:

```js
// Measured with seed 3 and ++ seeding, k = 1 to 10:
//   blobs    sharpest fall-off 6.21, at k = 3, which is the true k
//   births   2.14, no corner
//   biometry 2.90, no corner
// An earlier version of this rule compared the first drop to the median of the
// rest. It scored biometry at 4.19 and would have printed "there is a corner
// here" on the very dataset this lesson uses to show there is not one. A
// computed verdict is only worth having if it can say no.
export function verdictOf(curve) {
  const d = curve.slice(1).map(p => p.dropPct);
  let best = 0, at = -1;
  for (let i = 0; i < d.length - 1; i++) {
    const r = d[i] / d[i + 1];
    if (r > best) { best = r; at = i; }
  }
  const steady = d.every((v, i) => i === 0 || v <= d[i - 1] + 1e-9);
  if (best > 3) {
    return { corner: at + 2, ratio: best, text: `there is a corner here, and it is at k = ${at + 2}` };
  }
  return {
    corner: null, ratio: best,
    text: 'no corner. the cost keeps falling and never tells you where to stop'
      + (steady ? '' : ', and it does not even fall steadily'),
  };
}
```

`d[i]` is the drop arriving at k = i + 2, so the corner sits at the last k before the fall-off. The `steady` clause is computed over whatever range is actually drawn: across k = 2 to 7 the births drops fall steadily, but out to k = 10 neither real dataset does.

- [ ] **Step 5: Run the tests**

```bash
node --test test/instruments4.test.mjs
```

Expected: PASS. Task 8 adds 8 tests.

- [ ] **Step 6: Commit**

```bash
git add js/instruments/elbow.mjs test/instruments4.test.mjs
git commit -F- <<'MSG'
m6: elbow, and it is deliberately not capped at six

This instrument draws a curve and no cluster identity, so the shape budget does
not bind it and the slider runs to k=10. Capping it at six would have crippled
the one figure whose whole job is the shape of the curve across k, which is what
two cold readers caught in the first draft of the design.

The verdict line is computed from the drops rather than asserted in the prose,
so the figure cannot claim a corner the data does not have. On blobs it finds
one. On births and biometry it says there is none, which is the point of putting
real data next to synthetic.

Biometry's curve is not monotone: it drops to 10 percent at k=6 and climbs back
to 21 at k=7. Drawn as measured, not smoothed, and the verdict says so. A curve
that goes back up is worse at naming a k, not better.

Seed fixed at 3 with ++ seeding, matching the claims test. A curve that jitters
while nobody is touching it would teach restarts, and restarts are the previous
figure's job.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 9: `label-vs-truth`, the closer

**Files:**
- Create: `js/instruments/label-vs-truth.mjs`
- Test: `test/instruments4.test.mjs` (append)

**Interfaces:**
- Consumes: `kmeansRun`, `zscoreColumns`, `eta2` from `js/math/kmeans.mjs`; `marks.mjs`; `niceTicks`, `F`; `mulberry32`.
- Produces: `name`, `defaults`, `posterState`, `controls`, `render`, `applyControl`, `applyDrag`, plus
  - `bands(state) -> {labels, share, bands: Array<{cluster, n, mean, min, max, mark}>}` bands sorted by mean, `share` is the eta-squared value, never named that on the page

**The figure:** cluster the four biometry variables, then lay the clusters out as horizontal strips against gestational age, which the algorithm never saw. Strips are ordered by their mean. The reader sees them very nearly tile the interval, which is the punchline: the clusters are gestational age wearing a costume. Same result as PC1 in lesson 3, reached by unrelated machinery.

**Seed fixed at 11 with ++**, matching the claims test.

**k slider is 2 to 5**, per the spec, not 2 to 6. This instrument draws membership so it is inside the shape budget anyway, and the measured share only runs to k = 5.

- [ ] **Step 1: Write the failing tests**

Append to `test/instruments4.test.mjs`:

```js
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
  assert.match(svg, /gestational age/);
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
```

- [ ] **Step 2: Run it to verify it fails**

```bash
node --test test/instruments4.test.mjs
```

Expected: FAIL, module not found.

- [ ] **Step 3: Write `js/instruments/label-vs-truth.mjs`**

```js
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
```

- [ ] **Step 4: Write `render(state)` in the same file**

```
W = 640, H = 460
MARGIN = { l: 64, r: 40, t: 56, b: 72 }
x: gestational age, linear across the measured range, niceTicks
y: one horizontal strip per band, ordered by mean, tallest to the top
```

| element | `data-role` | count | notes |
|---|---|---|---|
| strip rule | `band` | k | a horizontal rule spanning `[min, max]` for that band, `stroke="var(--ink)" stroke-width="2"`, with end caps |
| scan | `pt` | n | `markFor(cluster)` at `r=3`, jittered vertically inside its strip by a deterministic offset (`(i % 7 - 3) * 1.6`), never randomly, so the poster and the live view agree |
| band mean | `band-mean` | k | `${mean.toFixed(1)} wk`, mono, at the band's mean x, with a short vertical tick |
| band count | `band-n` | k | `n = ${n}` |
| share readout | `share` | 1 | `the labels account for ${share.toFixed(3)} of the variation in gestational age` |
| axis label | - | 1 | `st.outcomeName` |
| caption | - | 1 | `clustered on BPD, HC, AC and FL. gestational age was never shown to the algorithm.` |

The share must be **printed as a number in text**, not only encoded in a bar. Same rule as `scree`: the bar is a picture of a number and never the only copy of it.

- [ ] **Step 5: Run the tests**

```bash
node --test test/instruments4.test.mjs
```

Expected: PASS. Task 9 adds 6 tests.

- [ ] **Step 6: Run the whole suite**

```bash
node --test
```

Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add js/instruments/label-vs-truth.mjs test/instruments4.test.mjs
git commit -F- <<'MSG'
m6: label-vs-truth, the closer

Cluster the four biometry measurements, then lay the clusters out against
gestational age, which the algorithm never saw. The bands very nearly tile the
interval: 22.8, 28.7 and 35.7 weeks at k=3, and the labels account for 0.871 of
the variation. The clusters are gestational age wearing a costume.

Same finding as PC1 in lesson 3, reached by unrelated machinery. That is the
part worth saying out loud, and it is also the handoff: this is four dimensions,
so the reader cannot check it by eye, and that discomfort is what lesson 5 is
for.

The share is printed as a number in text, not only drawn, following scree's
rule that a bar is a picture of a number and never the only copy of it. It is
never called eta-squared anywhere the reader can see. The vertical jitter inside
each band is deterministic, so the poster and the live view agree exactly.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 10: The page skeleton and its poster frames

**Files:**
- Create: `kmeans.html` (structure and markers only; the prose is Task 11)
- Modify: `tools/poster.mjs`
- Create: `figures/kmeans-step-blobs.svg`, `figures/restart-roulette-blobs.svg`, `figures/elbow-biometry.svg`, `figures/label-vs-truth-biometry.svg` (all generated)
- Test: `test/poster.test.mjs` (append)

**Interfaces:**
- Consumes: all four instruments, `injectPoster` from `tools/poster.mjs`.
- Produces: four committed poster SVGs and a page that teaches with JavaScript off.

**Why the posters come before the prose:** the prose has to describe what the reader is looking at, and the reader with JavaScript disabled is looking at the poster frame. Writing the prose against an imagined figure and then generating the figure is how a caption ends up describing a picture that does not exist.

**Poster states, chosen so each frame teaches on its own:**

| key | instrument | state | why this frame |
|---|---|---|---|
| `kmeans-step-blobs` | `kmeans-step` | blobs, k=3, seed 1, random seeding, stepped to convergence | the resting state is the one worth printing: three groups, three marks, a wall between them |
| `restart-roulette-blobs` | `restart-roulette` | blobs, k=3, random seeding | the divergent case. ++ would print six identical panels, which teaches nothing on paper |
| `elbow-biometry` | `elbow` | biometry, standardized, kMax 10 | the real-data failure, including the bump at k=7 |
| `label-vs-truth-biometry` | `label-vs-truth` | biometry, k=3 | the closer, with 0.871 printed |

- [ ] **Step 1: Write `kmeans.html` with structure, markers and placeholder headings**

Copy the head, trellis nav, and footer of `pca.html` verbatim, then change the title, the description, and the nav's `aria-current`. Body structure, with the prose left as a single-word heading per section so Task 11 has somewhere to put it:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>k-means - shadowbox</title>
  <meta name="description" content="An interactive essay on k-means clustering: what one step of the algorithm actually does, why six honest starts give six different answers, why the elbow method fails on real data, and what happens when the clusters turn out to be gestational age in disguise.">
  <!-- icon, fonts and stylesheet: copy the four link tags from pca.html unchanged -->
</head>
<body>
  <main class="essay">
    <nav class="trellis" aria-label="lessons">
      <a href="index.html">shadowbox</a>
      <a href="least-squares.html">1 least squares</a>
      <a href="covariance.html">2 covariance</a>
      <a href="pca.html">3 PCA</a>
      <span aria-current="page">4 k-means</span>
    </nav>
    <h1>k-means</h1>

    <!-- PROSE: opening. Andrew's Plato's Cave framing goes here. -->

    <details class="from-zero">
      <summary>Start from zero: the distance between two rows</summary>
      <!-- PROSE: written self-contained, because lesson 5 references it rather
           than restating it, and sub-project B may hoist it to its own page. -->
    </details>

    <details class="from-zero">
      <summary>Start from zero: what it means to improve a guess</summary>
      <!-- PROSE: iterative optimization. Same self-contained rule. -->
    </details>

    <h2>One step, twice</h2>
    <!-- PROSE -->
    <figure>
      <!-- poster:kmeans-step-blobs -->
      <!-- /poster:kmeans-step-blobs -->
      <figcaption><!-- PROSE: interaction copy. Name Step, say what it does. --></figcaption>
    </figure>

    <h2>Six starts on the same data</h2>
    <!-- PROSE -->
    <figure>
      <!-- poster:restart-roulette-blobs -->
      <!-- /poster:restart-roulette-blobs -->
      <figcaption><!-- PROSE --></figcaption>
    </figure>

    <h2>How many groups?</h2>
    <!-- PROSE -->
    <figure>
      <!-- poster:elbow-biometry -->
      <!-- /poster:elbow-biometry -->
      <figcaption><!-- PROSE --></figcaption>
    </figure>

    <h2>The algorithm never saw the dates</h2>
    <!-- PROSE -->
    <figure>
      <!-- poster:label-vs-truth-biometry -->
      <!-- /poster:label-vs-truth-biometry -->
      <figcaption><!-- PROSE --></figcaption>
    </figure>

    <h2>What this lesson refuses to claim</h2>
    <!-- PROSE: the hinge sentence carries the reader from teaching to auditing,
         then the five refusals from spec §8. -->

    <!-- footer: copy from pca.html, updating the "next lesson" line -->
  </main>
  <script type="module">
    // wiring: Task 10 step 3
  </script>
</body>
</html>
```

Every `<!-- PROSE -->` marker is a Task 11 obligation. None of them may survive into the shipped page.

- [ ] **Step 2: Add the `kmeans.html` block to `tools/poster.mjs`**

Add the four imports beside the existing ones, then append this config object to the `CONFIGS` array:

```js
{
  file: 'kmeans.html',
  posters: [
    {
      key: 'kmeans-step-blobs', instrument: kmeansStep,
      // the resting state: stepped to convergence, so the printed frame shows
      // three groups, three marks and the wall between them
      state: () => {
        const c = JSON.parse(readFileSync(inRepo('data/blobs.json'), 'utf8')).configs.blobs;
        let s = { ...kmeansStep.defaults, idKey: 'ks-blobs', dataset: 'blobs',
          xs: c.xs, ys: c.ys, truth: c.labels, k: 3, plusplus: false,
          labels_: { title: 'press Step. watch which half of the algorithm moves.' } };
        s = { ...s, ...kmeansStep.restart(s, 1) };
        let guard = 0;
        while (!s.done && guard++ < 60) s = { ...s, ...kmeansStep.step(s) };
        return s;
      },
    },
    {
      key: 'restart-roulette-blobs', instrument: restartRoulette,
      // random seeding on purpose: ++ would print six identical panels, which
      // teaches nothing on paper
      state: () => {
        const c = JSON.parse(readFileSync(inRepo('data/blobs.json'), 'utf8')).configs.blobs;
        return { ...restartRoulette.defaults, idKey: 'rr-blobs', dataset: 'blobs',
          xs: c.xs, ys: c.ys, truth: c.labels, k: 3, plusplus: false,
          note: '150 generated points, three blobs',
          labels_: { title: 'six starts. same data, same k.' } };
      },
    },
    {
      key: 'elbow-biometry', instrument: elbow,
      state: () => {
        const d = JSON.parse(readFileSync(inRepo('data/biometry.json'), 'utf8'));
        return { ...elbow.defaults, idKey: 'el-bio', dataset: 'biometry',
          columns: [d.bpd, d.hc, d.ac, d.fl], standardize: true, kMax: 10,
          note: '350 simulated scans, 20-40 weeks',
          labels_: { title: 'the cost always falls. that is the problem.' } };
      },
    },
    {
      key: 'label-vs-truth-biometry', instrument: labelVsTruth,
      state: () => {
        const d = JSON.parse(readFileSync(inRepo('data/biometry.json'), 'utf8'));
        return { ...labelVsTruth.defaults, idKey: 'lt-bio',
          columns: [d.bpd, d.hc, d.ac, d.fl], names: ['BPD', 'HC', 'AC', 'FL'],
          outcome: d.ga, k: 3,
          note: '350 simulated scans, 20-40 weeks',
          labels_: { title: 'the algorithm never saw the dates. look what it found.' } };
      },
    },
  ],
}
```

- [ ] **Step 3: Write the page's module script**

```html
  <script type="module">
    import * as KS from './js/instruments/kmeans-step.mjs';
    import * as RR from './js/instruments/restart-roulette.mjs';
    import * as EL from './js/instruments/elbow.mjs';
    import * as LT from './js/instruments/label-vs-truth.mjs';
    import { createStore, mount } from './js/lib/hydrate.mjs';

    const DATA = {};
    const load = name => fetch(`data/${name}.json`).then(r => r.json());

    Promise.all([load('blobs'), load('births'), load('biometry')]).then(([blobs, births, bio]) => {
      // Every dataset in one shape, so setDataset is a lookup rather than a switch.
      DATA.blobs = blobs.configs.blobs;
      DATA.crescents = blobs.configs.crescents;
      DATA.uniform = blobs.configs.uniform;
      DATA.births = { xs: births.xs, ys: births.ys, labels: null };
      DATA.biometry = { xs: bio.hc, ys: bio.ac, labels: null };

      const pick = name => ({ xs: DATA[name].xs, ys: DATA[name].ys, truth: DATA[name].labels });

      // --- the mechanism ---
      const ks = createStore({ dataset: 'blobs', ...pick('blobs'), k: 3, plusplus: false });
      ks.set(KS.restart(ks.get(), 1), { silent: true });
      const ksActions = {
        step: store => store.set(KS.step(store.get())),
        reset: store => store.set(KS.restart(store.get(), store.get().seed + 1)),
      };
      for (const name of Object.keys(KS.DATASETS)) {
        ksActions[`use-${name}`] = store => store.set(KS.setDataset(store.get(), name, pick(name)));
      }
      mount(document.getElementById('ks-blobs'), KS, ks, { actions: ksActions, overlay: {
        idKey: 'ks-blobs',
        labels_: { title: 'press Step. watch which half of the algorithm moves.' },
      } });

      // --- six starts ---
      const rr = createStore({ dataset: 'blobs', ...pick('blobs'), k: 3, plusplus: false });
      const rrActions = {};
      for (const name of ['blobs', 'crescents', 'uniform']) {
        rrActions[`use-${name}`] = store => store.set({ dataset: name, ...pick(name), k: DATA[name].k ?? store.get().k });
      }
      mount(document.getElementById('rr-blobs'), RR, rr, { actions: rrActions, overlay: {
        idKey: 'rr-blobs',
        labels_: { title: 'six starts. same data, same k.' },
      } });

      // Clicking or Entering a panel loads that start into the mechanism above,
      // which is the whole reason the panels are tabbable.
      document.getElementById('rr-blobs').addEventListener('click', ev => {
        const panel = ev.target.closest('[data-role="panel"]');
        if (!panel) return;
        const s = { ...ks.get(), dataset: rr.get().dataset, ...pick(rr.get().dataset), k: rr.get().k, plusplus: rr.get().plusplus };
        ks.set({ ...s, ...KS.restart(s, Number(panel.dataset.seed)) });
        document.getElementById('ks-blobs').scrollIntoView({ behavior: 'smooth', block: 'center' });
      });

      // --- how many groups ---
      const el = createStore({ dataset: 'biometry', columns: [bio.bpd, bio.hc, bio.ac, bio.fl], standardize: true, kMax: 10 });
      const elSets = {
        blobs: { columns: [blobs.configs.blobs.xs, blobs.configs.blobs.ys], standardize: false, note: '150 generated points, three blobs' },
        births: { columns: [births.xs, births.ys], standardize: true, note: '400 births, gestational age against birthweight' },
        biometry: { columns: [bio.bpd, bio.hc, bio.ac, bio.fl], standardize: true, note: '350 simulated scans, 20-40 weeks' },
      };
      const elActions = {};
      for (const name of Object.keys(elSets)) elActions[`use-${name}`] = store => store.set({ dataset: name, ...elSets[name] });
      mount(document.getElementById('el-bio'), EL, el, { actions: elActions, overlay: {
        idKey: 'el-bio',
        labels_: { title: 'the cost always falls. that is the problem.' },
      } });

      // --- the closer ---
      const lt = createStore({ columns: [bio.bpd, bio.hc, bio.ac, bio.fl], names: ['BPD', 'HC', 'AC', 'FL'], outcome: bio.ga, k: 3 });
      mount(document.getElementById('lt-bio'), LT, lt, { overlay: {
        idKey: 'lt-bio',
        note: '350 simulated scans, 20-40 weeks',
        labels_: { title: 'the algorithm never saw the dates. look what it found.' },
      } });
    });
  </script>
```

Each `<figure>` needs the mount target beside its poster, matching how `pca.html` does it: `<div id="ks-blobs" class="instrument"></div>` immediately after the closing poster marker.

- [ ] **Step 4: Generate the posters**

```bash
node tools/poster.mjs
```

Expected: four new lines, `poster: kmeans-step-blobs -> figures/kmeans-step-blobs.svg + kmeans.html` and so on, plus the eleven existing ones unchanged.

- [ ] **Step 5: Confirm the injection round-trips**

```bash
node tools/poster.mjs && git diff --stat kmeans.html
```

Expected: **no diff on the second run.** Injection is idempotent by design; a diff here means the marker regex matched something it should not have.

- [ ] **Step 6: Add the poster test**

Append to `test/poster.test.mjs`, matching the tests already there:

```js
test('every lesson-4 poster marker exists and holds a rendered SVG', () => {
  const html = readFileSync(new URL('../kmeans.html', import.meta.url), 'utf8');
  for (const key of ['kmeans-step-blobs', 'restart-roulette-blobs', 'elbow-biometry', 'label-vs-truth-biometry']) {
    const m = html.match(new RegExp(`<!-- poster:${key} -->([\\s\\S]*?)<!-- /poster:${key} -->`));
    assert.ok(m, `marker missing: ${key}`);
    assert.match(m[1], /<svg[^>]*viewBox="0 0 640 460"/, `${key} holds no rendered SVG`);
    assert.ok(!m[1].includes(String.fromCharCode(0x2014)), `${key} carries an em-dash`);
  }
});

test('lesson 4 teaches with JavaScript off', () => {
  // The posters are the archival layer. If a figure is empty without JS, the
  // page does not teach in 2041 and does not print today.
  const html = readFileSync(new URL('../kmeans.html', import.meta.url), 'utf8');
  assert.equal((html.match(/<svg/g) || []).length >= 4, true);
});
```

- [ ] **Step 7: Run the suite and preview the page**

```bash
node --test
```

Then serve it and look at all four figures with JavaScript enabled:

```bash
python -m http.server 8000
```

Open `http://localhost:8000/kmeans.html`. Check: Step advances one half at a time, Play stops on its own at convergence, the five dataset buttons swap the data, clicking a roulette panel loads it into the mechanism above, the elbow slider moves, and the k slider on the closer moves the share readout.

- [ ] **Step 8: Commit**

```bash
git add kmeans.html tools/poster.mjs figures/kmeans-step-blobs.svg figures/restart-roulette-blobs.svg figures/elbow-biometry.svg figures/label-vs-truth-biometry.svg test/poster.test.mjs
git commit -F- <<'MSG'
m6: the page skeleton, wired, with four poster frames

Posters before prose, deliberately. The reader with JavaScript off is looking at
the poster frame, so the prose has to describe that picture; writing the caption
against an imagined figure and generating the figure afterwards is how a page
ends up describing something that is not there.

Frames chosen so each one teaches alone. kmeans-step prints its resting state
rather than a mid-run frame. restart-roulette prints the random-seeded case,
because k-means++ would print six identical panels and teach nothing on paper.
elbow prints biometry, bump at k=7 included. label-vs-truth prints k=3 with the
0.871 visible.

Clicking a roulette panel loads that start into the mechanism instrument above
and scrolls to it, which is what the tabbable panels were for.

Every prose slot is a marked comment. None of them may survive into the shipped
page.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 11: The prose

**Files:**
- Modify: `kmeans.html` (every `<!-- PROSE -->` slot)
- Test: `test/instruments4.test.mjs` (append the page guard)
- Read first: `PROSE-GUIDE.md` in full, and spec §5 and §8

**This task has a human gate in the middle and it is not optional.** `PROSE-GUIDE.md` records Andrew's own instruction after the first PCA draft lost the thread: write the terse outline in bullets first, have it scored, then draft each bullet separately, then read the whole thing straight through and fix the joins. Writing it in one pass is how a page ends up with a section that assumes a term the previous section never introduced.

**Do not start this task until `node --test` is green.** Every number the prose quotes is already pinned in `test/kmeans-claims.test.mjs`; the prose's job is to say what those numbers mean, not to introduce new ones. If a sentence wants a number the claims file does not have, the number gets measured and pinned first, or the sentence changes.

- [ ] **Step 1: Write the outline, in bullets, and stop**

Produce a terse bullet outline covering the eight sections in the skeleton. One line per paragraph, naming the claim that paragraph makes. Include, from spec §5:

- the **opening** names k-means in the first clause, glosses it inline, and carries Andrew's Plato's Cave framing: not a projection, but still a projection in the sense that matters, a representation of something else, possibly true, possibly false, flattened either way
- the two **start from zero** blocks are self-contained, and nothing the main line depends on lives inside them
- **k-means++ is glossed before the toggle asks the reader to care**: it seeds the centers far apart from each other instead of at random
- the **hinge** sentence before "what this lesson refuses to claim", carrying the reader from teaching to auditing
- a line saying out loud that **UMAP does not use k-means**, so lesson 5 does not have to undo an assumption this page created

- [ ] **Step 2: Hand the outline to Andrew and wait**

This is the gate. He scored lesson 3's outline before it was written and that is why lesson 3 reads the way it does. Do not draft past a scored outline, and do not draft while waiting.

- [ ] **Step 3: Draft each bullet on its own**

One bullet, one paragraph, in order. Do not write the next one until the current one is done. Against `PROSE-GUIDE.md`, the rules most likely to be violated in this particular lesson:

- **Rule 1**, name the subject in the first clause. Not "Clustering means dividing data into groups" but "k-means splits a cloud of data points into a number of groups you choose in advance."
- **Rule 6**, name the mechanism, not just the outcome. "Six starts give six answers" is the outcome; "each start puts the centers somewhere different, and the algorithm only ever moves downhill from where it began" is the mechanism.
- **Rule 7 and 7b**, no punchy fragments and no balanced pairs. "Every restart agrees. Every restart is wrong." is exactly the antithesis the guide cuts on sight. Say it as one sentence that reports two genuinely different things.
- **Rule 10**, cut the scaffolding verb phrase. "k-means is a method for partitioning" is "k-means partitions" with padding.
- **Rule 12**, nothing the main line depends on in a collapsible. Both "start from zero" blocks are background, and the body must not later say "the distance between two rows" as though the block established it.
- **Interaction copy**: imperative plus consequence, naming the control. "Press **Step** to assign every point to its nearest center, then press it again to move the centers." Never "the figure below illustrates".

- [ ] **Step 4: Read the whole page straight through and fix the joins**

Out loud if possible. The failure mode this catches is a section that assumes a term the previous section never introduced, which is what broke the first PCA draft.

- [ ] **Step 5: Add the page guard test**

Append to `test/instruments4.test.mjs`:

```js
test('kmeans.html obeys the hard rules of the prose guide', () => {
  const html = readFileSync(new URL('../kmeans.html', import.meta.url), 'utf8');
  const prose = html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  assert.ok(!prose.includes(EM_DASH), 'never an em-dash; spaced hyphen instead');
  assert.ok(!/\bWCSS\b/i.test(prose), 'call it the total squared distance from each point to its own center');
  assert.ok(!/eta[- ]?squared|η²/i.test(prose), 'call it the share of the variation the labels account for');
  assert.ok(!/<!-- PROSE/.test(html), 'a prose slot survived into the shipped page');
  assert.match(prose, /k-nearest/i, 'lesson 5 uses a kNN graph, and this page has to say so');
});
```

- [ ] **Step 6: Run the linters, then decide against the guide, not the linter**

```bash
node tools/voice-lint.mjs kmeans.html
node tools/prose-lint.mjs kmeans.html
```

`PROSE-GUIDE.md` is explicit that **the guide, not the linter, is the target**, and that the linter's we-dominant warning comes from a slide-deck corpus and should be ignored on these pages. Fix what is a real tic. Ignore what is the linter being wrong about the genre, and say which is which in the commit.

- [ ] **Step 7: Confirm every number on the page is pinned**

Read the rendered prose and list every numeral in it. For each one, point at the assertion in `test/kmeans-claims.test.mjs` that pins it. Any number without a home is either deleted from the prose or measured and added to the claims file. There is no third option; the third option is what lesson 3 did.

```bash
node --test
```

- [ ] **Step 8: Commit**

```bash
git add kmeans.html test/instruments4.test.mjs
git commit -F- <<'MSG'
m6: lesson 4's prose, outline first and scored before drafting

Written the way Andrew asked for after the first PCA draft lost the thread:
terse bullet outline, scored, then each bullet drafted on its own, then a
straight read-through to fix the joins.

Three terms two cold readers flagged as load-bearing and unglossed are now
glossed where the reader first needs them, and the two acronyms never appear at
all. The total squared distance from each point to its own center is written out
every time. So is the share of the variation in gestational age that the labels
account for. k-means++ is glossed before the toggle asks anyone to care about
it.

A guard test enforces the three hard rules mechanically: no em-dash, neither
acronym, and no prose slot left unfilled. It also requires the page to say that
UMAP's first step is a k-nearest-neighbour graph, so lesson 5 does not have to
undo an assumption this page created.

Every number in the prose was already pinned in the claims test before the
sentence around it existed.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
```

---

### Task 12: Ship it

**Files:**
- Modify: `index.html`, `least-squares.html`, `covariance.html`, `pca.html` (trellis nav)
- Modify: `README.md`, `NEXT-STEPS.md`
- Modify: `.handoff/PENDING-DECISIONS.md`

- [ ] **Step 1: Add lesson 4 to the trellis on all four existing pages**

In each of `least-squares.html`, `covariance.html`, `pca.html`, add `<a href="kmeans.html">4 k-means</a>` as the last child of `nav.trellis`, after the lesson-3 entry. In `index.html`, add the lesson-4 card beside the other three, matching their markup exactly.

The current page is marked three ways at once and never by colour: a leading glyph, heavier weight, and full-strength text against muted siblings. That is already in `css/shadowbox.css` and needs no change; just make sure `kmeans.html` uses `<span aria-current="page">` and the other three use `<a>`.

- [ ] **Step 2: Verify the nav is consistent**

```bash
grep -c 'kmeans.html' index.html least-squares.html covariance.html pca.html
```

Expected: `1` for the three lesson pages. `index.html` may be more than 1 if its card markup carries both a heading link and a body link; match whatever the other three cards do rather than forcing a count.

- [ ] **Step 3: Grayscale and print pass**

Open `kmeans.html` at `http://localhost:8000/kmeans.html` and check, in this order:

1. **Grayscale.** Force it in devtools (Rendering, Emulate vision deficiencies, Achromatopsia). Every cluster must still be distinguishable, because membership is shape. Every partition must still be visible, because it is a heavy outline. The rank-1 roulette panel must still be identifiable, because it carries a glyph and the word `cheapest`.
2. **Print preview.** Collapsibles force open at `beforeprint`, controls and nav hide, figures and headings do not break across pages, footer links print their URLs. This is all existing stylesheet behaviour; confirm lesson 4 inherits it rather than assuming it does.
3. **Keyboard.** Tab to the roulette panels and press Enter: the start loads into the mechanism above. Tab to Step and Play and operate both. Focus survives the re-render, which it does through `hydrate.mjs`'s existing focus restoration, but the roulette panels are a new kind of focus target so check them specifically.

Record what you actually checked in the commit message. "Verified" without saying how is what made the last stale note in `NEXT-STEPS.md` stale.

- [ ] **Step 4: Update `README.md`**

Add lesson 4 to the lesson list, and add `blobs.json` to whatever data inventory the file carries.

- [ ] **Step 5: Update `NEXT-STEPS.md`**

Mark M6 done with the date. Move M7 (lesson 5, UMAP) to the top of the queue. Record what lesson 5 inherits: the two "start from zero" blocks, the Play control surface built to accept a precomputed frame index, and the `marks.mjs` shape channel. Note that the k cap does not apply to instruments that draw no membership, so lesson 5 does not inherit it blindly.

- [ ] **Step 6: Update `.handoff/PENDING-DECISIONS.md`**

Both lesson-4 decisions resolved on 2026-08-25: the spec read and approved, and the half-step ruling. Move them to the resolved list with the date. Leave the `apps.html` card open, since it still is.

- [ ] **Step 7: Final full check**

```bash
node --test && node tools/poster.mjs && git status --short
```

Expected: all tests pass, and `git status` is clean after the poster run. A dirty tree here means a poster was not committed with the instrument that changed it.

- [ ] **Step 8: Commit and push**

```bash
git add -A
git commit -F- <<'MSG'
m6 closed: lesson 4 is live

Trellis nav across all four lessons, index card, README and NEXT-STEPS current.

Verified rather than assumed, and here is what was actually checked: achromatopsia
emulation in devtools, where every cluster stayed separable because membership
is shape and every wall stayed visible because it is a heavy outline; print
preview, where the collapsibles opened at beforeprint and no figure broke across
a page; and keyboard, where the roulette panels are a new kind of focus target
and needed checking specifically rather than inheriting the claim from the drag
handles.

M7 is lesson 5, UMAP. It inherits the two start-from-zero blocks, the Play
control surface already built to accept a precomputed frame index, and the shape
channel in marks.mjs. It does not inherit the k cap, which binds only
instruments that draw membership.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
MSG
git push origin main
```

---

## Self-Review

Run against the spec after the plan is written, before execution starts.

**Spec coverage.** Every section has a task:

| spec section | covered by |
|---|---|
| §1 why k-means is on the ladder | Task 11, the opening |
| §2 approach: mechanism-first, staged data | Tasks 6 to 9, and the build order |
| §3.1 `kmeans-step` | Task 6 |
| §3.2 `restart-roulette` | Task 7 |
| §3.3 `elbow` | Task 8 |
| §3.4 `label-vs-truth` | Task 9 |
| §4 encoding: shape, outline, scoped k cap | Task 4, enforced by tests in 6, 7, 8, 9 |
| §5 prose requirements | Task 11, with the mechanical rules as a guard test |
| §6 data | Task 2 |
| §7 claims table | Task 3 |
| §8 what the lesson refuses to claim | Task 3 (the SGA/AGA/LGA and units-trap tests) and Task 11 (the section) |
| §9 contract change | Task 5 |
| §10 accept criteria | Tasks 10 and 12 |
| §11 risks | Play cap in Task 5, shape budget in Task 4, coarse grids in Tasks 4 and 7, the "small" wording in Task 3's births test, the UMAP disclaimer in Task 11's guard |
| §12 deferred to lesson 5 | Task 12, step 5 |

**Two places this plan departs from the spec, both deliberate, both flagged where they matter:**

1. **§3.3 says biometry's elbow "does the same" as births.** It does not; biometry's drops are 72, 52, 35, 28, 10, 21 and are not monotone. The plan pins the real sequence and forbids the prose from describing a smooth decay.
2. **§3.1 lists the dataset toggle as a "toggle".** Five datasets is not a toggle, and `hydrate.mjs` has no choice control. Task 6 uses five named action buttons rather than adding a second contract change, which §9 was explicit about limiting to one.

**Placeholder scan.** No step says "add error handling", "similar to Task N", or "write tests for the above". The four `render` functions are specified as a layout table plus an exact `data-role` contract plus a named existing instrument to model the SVG assembly on, rather than 150 lines of transcribed SVG per instrument; the tests in each task assert the contract, so an implementer knows precisely when the render is done.

**Type consistency.** Checked across tasks: `kmeansStep` / `kmeansRun` / `startState` are used with the same `KState` field names in Tasks 1, 5, 6 and 10. `markFor`, `markPath`, `partitionSegments`, `MAX_MARKS`, `MARK_KINDS` keep the same names in Tasks 4, 6, 7 and 9. `zscoreColumns` is the only standardizer any instrument calls. `labels_` (with the underscore) is the SVG title bag on all four new instruments, kept distinct from `labels`, which is the k-means membership array; that collision is real and this is how it is avoided.
