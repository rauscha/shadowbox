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
  close(s.spreadPct, 579.1, 0.5);               // this sweep's own spread across 60 seeds; not quoted directly in prose
  close(s.landedWrongPct, 15, 0.1);             // prose: "about one start in six"
});

test('the roulette figure (seeds 1-6, not the 60-seed sweep) shows one bad optimum: 89.7 against 506.8', () => {
  // restart-roulette.mjs does not reuse sweep()'s mulberry32(s * 7919) scheme;
  // its own seedOf steps mulberry32(1) through mulberry32(6) directly.
  // kmeans.html:1906 prints both numbers ("a total of 89.7 against 506.8"), and
  // until now nothing pinned the second one: the neighbouring instrument test
  // (test/instruments4.test.mjs) only asserts that exactly one of the six costs
  // exceeds best * 1.02, which lets the bad optimum drift anywhere above that
  // line and still read green.
  const X = rowsOf(BLOBS.configs.blobs);
  const costs = [1, 2, 3, 4, 5, 6].map(seed => kmeansRun(X, 3, mulberry32(seed), { plusplus: false }).wcss);
  close(Math.min(...costs), 89.7, 0.05);
  close(Math.max(...costs), 506.8, 0.1);        // prose: "a total of 89.7 against 506.8"
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

test('biometry: the labels account for most of the variation in gestational age, 0.719 / 0.871 / 0.916 / 0.941', () => {
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
