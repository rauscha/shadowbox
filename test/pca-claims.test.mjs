// The claims pca.html makes in prose, pinned so they cannot drift silently.
// Every number quoted on that page is checked here against the same code the
// page runs, and the measured results are recorded in comments so a future
// change that moves them shows up as a test failure rather than as a page that
// quietly disagrees with itself.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as AP from '../js/instruments/axis-projector.mjs';
import * as SC from '../js/instruments/scree.mjs';
import { pca, detrend, standardize, corr, ols, eigSym2, variance, covariance } from '../js/math/core.mjs';

const bio = () => JSON.parse(readFileSync(new URL('../data/biometry.json', import.meta.url), 'utf8'));
const NAMES = ['BPD', 'HC', 'AC', 'FL'];
const colsOf = d => [d.bpd, d.hc, d.ac, d.fl];
const pct = (v, tot) => 100 * v / tot;

test('the variance budget is fixed: along + across = total, at every angle', () => {
  // This is the whole argument of the first section. If it ever stops holding,
  // the prose claim that the two rules are one rule is false.
  for (let a = 0; a < 180; a += 1) {
    const s = AP.stats({ ...AP.defaults, angleDeg: a });
    assert.ok(Math.abs(s.varAlong + s.varAcross - s.total) < 1e-12,
      `angle ${a}: along+across=${s.varAlong + s.varAcross} but total=${s.total}`);
  }
});

test('the angle that maximizes spread along is the angle that minimizes distance across', () => {
  let bestAlong = { a: null, v: -Infinity }, bestAcross = { a: null, v: Infinity };
  for (let a = 0; a < 180; a += 0.25) {
    const s = AP.stats({ ...AP.defaults, angleDeg: a });
    if (s.varAlong > bestAlong.v) bestAlong = { a, v: s.varAlong };
    if (s.varAcross < bestAcross.v) bestAcross = { a, v: s.varAcross };
  }
  assert.equal(bestAlong.a, bestAcross.a);
  assert.ok(Math.abs(bestAlong.a - AP.bestAngleDeg(AP.defaults)) < 0.3);
});

test('page numbers for the synthetic cloud: 34 degrees, 2.16 of 2.50', () => {
  const s = AP.stats({ ...AP.defaults, angleDeg: AP.bestAngleDeg(AP.defaults) });
  assert.ok(Math.abs(AP.bestAngleDeg(AP.defaults) - 33.69) < 0.05);   // prose: "about 34 degrees"
  assert.ok(Math.abs(s.varAlong - 2.16) < 0.005);                     // prose: "carries 2.16"
  assert.ok(Math.abs(s.total - 2.50) < 0.005);                        // prose: "total variance of 2.50"
  assert.ok(Math.abs(s.varAcross - 0.34) < 0.005);                    // prose: "remaining 0.34"
});

test('page numbers for the three lines: 0.53, 1.07, 0.67, and PC1 sits between', () => {
  const { xs, ys } = AP.cloudOf(AP.defaults);
  const yOnX = ols(xs, ys).slope;
  const xOnY = 1 / ols(ys, xs).slope;                  // re-expressed as y per x
  const e = eigSym2(variance(xs), covariance(xs, ys), variance(ys));
  const pc1 = e.vectors[0][1] / e.vectors[0][0];
  assert.ok(Math.abs(yOnX - 0.53) < 0.005, `y on x ${yOnX}`);
  assert.ok(Math.abs(xOnY - 1.07) < 0.005, `x on y ${xOnY}`);
  assert.ok(Math.abs(pc1 - 0.67) < 0.005, `pc1 ${pc1}`);
  assert.ok(yOnX < pc1 && pc1 < xOnY, 'PC1 must lie between the two regressions');
});

test('biometry in raw millimeters: PC1 near 98 percent, led by AC then HC', () => {
  const s = SC.stats({ ...SC.defaults, columns: colsOf(bio()), names: NAMES, standardize: false });
  assert.ok(Math.abs(pct(s.values[0], s.total) - 97.98) < 0.05);      // prose: "just under 98 percent"
  const [bpd, hc, ac, fl] = s.vectors[0].map(v => Math.abs(v));
  assert.ok(Math.abs(ac - 0.75) < 0.005 && Math.abs(hc - 0.62) < 0.005);
  assert.ok(Math.abs(bpd - 0.18) < 0.005 && Math.abs(fl - 0.15) < 0.005);
  assert.ok(ac > hc && hc > bpd && bpd > fl, 'AC must lead, FL must trail');
});

test('standardizing flattens the PC1 loadings to a quarter each', () => {
  const s = SC.stats({ ...SC.defaults, columns: colsOf(bio()), names: NAMES, standardize: true });
  assert.ok(Math.abs(pct(s.values[0], s.total) - 97.53) < 0.05);      // prose: "97.5 percent"
  for (const v of s.vectors[0]) assert.ok(Math.abs(Math.abs(v) - 0.50) < 0.006, `loading ${v}`);
});

test('PC2 flips its story between raw and standardized, which is why the prose refuses to name it', () => {
  const raw = SC.stats({ ...SC.defaults, columns: colsOf(bio()), names: NAMES, standardize: false });
  const std = SC.stats({ ...SC.defaults, columns: colsOf(bio()), names: NAMES, standardize: true });
  const lead = v => NAMES[v.reduce((b, x, i) => (Math.abs(x) > Math.abs(v[b]) ? i : b), 0)];
  assert.equal(lead(raw.vectors[1]), 'HC');            // raw: head against abdomen
  assert.equal(lead(std.vectors[1]), 'AC');            // standardized: abdomen against the rest
  assert.ok(pct(raw.values[1], raw.total) < 2 && pct(std.values[1], std.total) < 2,
    'both readings live inside ~2 percent of the variance');
});

test('every pair of raw measurements correlates above 0.95', () => {
  const c = colsOf(bio());
  for (let i = 0; i < 4; i++) {
    for (let k = i + 1; k < 4; k++) {
      assert.ok(corr(c[i], c[k]) > 0.95, `${NAMES[i]}-${NAMES[k]} = ${corr(c[i], c[k])}`);
    }
  }
});

test('removing gestational age drops the correlations to about 0.3 and the split to 49/19/17/16', () => {
  const d = bio();
  const z = colsOf(d).map(c => standardize(detrend(c, d.ga, 2)));
  for (let i = 0; i < 4; i++) {
    for (let k = i + 1; k < 4; k++) {
      const r = corr(z[i], z[k]);
      assert.ok(r > 0.2 && r < 0.45, `${NAMES[i]}-${NAMES[k]} = ${r}`);   // prose: "about 0.3"
    }
  }
  const X = z[0].map((_, i) => z.map(c => c[i]));
  const o = pca(X, { standardize: true });
  const tot = o.values.reduce((a, b) => a + b, 0);
  const share = o.values.map(v => pct(v, tot));
  [49.0, 18.8, 16.6, 15.6].forEach((want, i) => {
    assert.ok(Math.abs(share[i] - want) < 0.3, `PC${i + 1} ${share[i].toFixed(1)} want ${want}`);
  });
  for (const v of o.vectors[0]) assert.ok(v > 0.45 && v < 0.55, 'PC1 stays an all-positive size factor');
});

test('the last three adjusted components are close enough to equal that their directions are noise', () => {
  // The page says so explicitly. If the generator ever changes and they separate,
  // that caveat becomes wrong and needs rewriting rather than quietly surviving.
  const d = bio();
  const z = colsOf(d).map(c => standardize(detrend(c, d.ga, 2)));
  const X = z[0].map((_, i) => z.map(c => c[i]));
  const [, b, c, e] = pca(X, { standardize: true }).values;
  assert.ok((b - e) / b < 0.25, `spread across the degenerate triple: ${b}, ${c}, ${e}`);
});
