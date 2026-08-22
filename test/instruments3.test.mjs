import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as AP from '../js/instruments/axis-projector.mjs';
import * as TL from '../js/instruments/three-lines.mjs';
import * as BS from '../js/instruments/basis-spin.mjs';
import * as SC from '../js/instruments/scree.mjs';
import { mean, variance, covariance, ols, eigSym2, pca } from '../js/math/core.mjs';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} !~ ${b}`);
const EM_DASH = String.fromCharCode(0x2014);   // never typed literally, only tested for
const bio = JSON.parse(readFileSync(new URL('../data/biometry.json', import.meta.url), 'utf8'));
const BIO_NAMES = ['BPD', 'HC', 'AC', 'FL'];
const bioColumns = () => [bio.bpd, bio.hc, bio.ac, bio.fl];
const texts = (svg, role) =>
  [...svg.matchAll(new RegExp(`data-role="${role}"[^>]*>([^<]*)<`, 'g'))].map(m => m[1]);
const attrs = (svg, role) =>
  [...svg.matchAll(new RegExp(`<[a-z]+ data-role="${role}"[^>]*>`, 'g'))].map(m => {
    const o = {};
    for (const a of m[0].matchAll(/([a-z0-9-]+)="([^"]*)"/g)) o[a[1]] = a[2];
    return o;
  });

// ---------------------------------------------------------------- axis-projector

test('axis-projector renders the cloud, its shadows, its drops and both readouts', () => {
  const svg = AP.render({ ...AP.defaults, idKey: 'ap1' });
  assert.match(svg, /^<svg[^>]*viewBox="0 0 640 460"/);
  assert.match(svg, /<\/svg>\s*$/);
  assert.equal((svg.match(/data-role="pt"/g) || []).length, 80);
  assert.equal((svg.match(/data-role="shadow-tick"/g) || []).length, 80);
  assert.equal((svg.match(/data-role="drop"/g) || []).length, 80);
  assert.ok(svg.includes('data-drag="angle"'));
  assert.ok(svg.includes('sb-ap1-clip') && svg.includes('sb-ap1-screen'));
  assert.equal(texts(svg, 'var-along').length, 1);
  assert.equal(texts(svg, 'perp-ss').length, 1);
});

test('axis-projector: the two readouts are two shares of one fixed budget', () => {
  const st = { ...AP.defaults, idKey: 'ap2' };
  const total = AP.stats(st).total;
  for (let deg = 0; deg < 180; deg += 15) {
    const s = AP.stats({ ...st, angleDeg: deg });
    close(s.varAlong + s.varAcross, total, 1e-9);
    close(s.varAcross, s.perpSS / (s.xs.length - 1), 1e-12);
  }
  // the budget is the trace of the dialled covariance matrix
  close(total, AP.defaults.sxx + AP.defaults.syy, 1e-9);
});

test('axis-projector: variance peaks and perpendicular error bottoms at the SAME angle, and it is PC1', () => {
  const st = { ...AP.defaults, idKey: 'ap3' };
  let argMax = null, maxV = -Infinity, argMin = null, minP = Infinity;
  for (let k = 0; k < 3600; k++) {
    const deg = k * 0.05;
    const s = AP.stats({ ...st, angleDeg: deg });
    if (s.varAlong > maxV) { maxV = s.varAlong; argMax = deg; }
    if (s.perpSS < minP) { minP = s.perpSS; argMin = deg; }
  }
  assert.equal(argMax, argMin, `max variance at ${argMax}, min error at ${argMin}`);
  const { angle, values } = eigSym2(st.sxx, st.sxy, st.syy);
  const pc1Deg = ((angle * 180 / Math.PI) % 180 + 180) % 180;
  close(argMax, pc1Deg, 0.06);
  close(argMax, AP.bestAngleDeg(st), 0.06);
  close(maxV, values[0], 1e-4);                    // the peak IS the top eigenvalue
  close(minP / (st.n - 1), values[1], 1e-4);       // the floor IS the bottom one
});

test('axis-projector: the shadow ticks lie on the line and cross it square', () => {
  const st = { ...AP.defaults, idKey: 'ap4', angleDeg: 40 };
  const svg = AP.render(st);
  const L = AP.layout(st);
  const S = AP.stats(st);
  const ticks = attrs(svg, 'shadow-tick');
  assert.equal(ticks.length, 80);
  const t0 = ticks[0];
  // the tick's own direction is perpendicular to the line (isotropic frame, so
  // a right angle in the numbers is a right angle on screen)
  const tdx = +t0.x2 - +t0.x1, tdy = +t0.y2 - +t0.y1;
  const ldx = S.c * L.s, ldy = -S.s * L.s;
  close((tdx * ldx + tdy * ldy) / (Math.hypot(tdx, tdy) * Math.hypot(ldx, ldy)), 0, 1e-3);
  // and its centre is the projection of the first point
  const mid = { x: (+t0.x1 + +t0.x2) / 2, y: (+t0.y1 + +t0.y2) / 2 };
  close(L.invX(mid.x), L.mx + S.t[0] * S.c, 1e-2);
  close(L.invY(mid.y), L.my + S.t[0] * S.s, 1e-2);
});

test('axis-projector: dragging points the line at the cursor; PC1 guide is opt-in', () => {
  const st = { ...AP.defaults, idKey: 'ap5' };
  const L = AP.layout(st);
  const out = AP.applyDrag(st, { id: 'angle', x: L.x(L.mx + 1), y: L.y(L.my + 1) });
  close(out.angleDeg, 45, 1e-9);
  assert.deepEqual(AP.applyDrag(st, { id: 'nope', x: 0, y: 0 }), {});
  close(AP.applyControl(st, 'angleDeg', 200).angleDeg, 20, 1e-9);   // 200 deg is the 20 deg line
  assert.ok(!AP.render(st).includes('data-role="pc1-guide"'));
  assert.ok(AP.render({ ...st, showBest: true }).includes('data-role="pc1-guide"'));
});

// ------------------------------------------------------------------- three-lines

test('three-lines: three genuinely different slopes, and each is the fit it claims to be', () => {
  const st = { ...TL.defaults, idKey: 'tl1' };
  const { xs, ys } = TL.cloudOf(st);
  const L = TL.lines(st);

  close(L.yx.slope, ols(xs, ys).slope, 1e-12);
  close(L.xy.inverseSlope, ols(ys, xs).slope, 1e-12);        // x on y, the inverse regression
  close(L.xy.slope, 1 / ols(ys, xs).slope, 1e-12);
  close(L.pc1.slope, Math.tan(eigSym2(variance(xs), covariance(xs, ys), variance(ys)).angle), 1e-12);

  assert.ok(L.yx.slope < L.pc1.slope - 0.05, `${L.yx.slope} vs ${L.pc1.slope}`);
  assert.ok(L.pc1.slope < L.xy.slope - 0.05, `${L.pc1.slope} vs ${L.xy.slope}`);
  assert.ok(L.xy.slope - L.yx.slope > 0.4);                  // not three names for one line
  // all three pass through the mean
  for (const ln of [L.yx, L.xy, L.pc1]) {
    const t = 0.7;
    const px = L.mx + t * ln.dir[0], py = L.my + t * ln.dir[1];
    close((py - L.my) * ln.dir[0] - (px - L.mx) * ln.dir[1], 0, 1e-12);
  }
});

test('three-lines: each residual family is drawn in its own orientation', () => {
  const st = { ...TL.defaults, idKey: 'tl2' };
  const svg = TL.render(st);
  const per = TL.tickIndices(st.n).length;
  assert.ok(per >= 10 && per <= 20, `${per} error marks per family`);

  const vert = attrs(svg, 'mark-yx'), horz = attrs(svg, 'mark-xy'), perp = attrs(svg, 'mark-pc1');
  assert.equal(vert.length, per);
  assert.equal(horz.length, per);
  assert.equal(perp.length, per);
  assert.equal(vert[0]['data-orient'], 'vertical');
  assert.equal(horz[0]['data-orient'], 'horizontal');
  assert.equal(perp[0]['data-orient'], 'perpendicular');
  for (const m of vert) close(+m.x2 - +m.x1, 0, 1e-9);       // moves only in y
  for (const m of horz) close(+m.y2 - +m.y1, 0, 1e-9);       // moves only in x
  const L = TL.layout(st), LN = TL.lines(st);
  const ldx = LN.pc1.dir[0] * L.s, ldy = -LN.pc1.dir[1] * L.s;
  for (const m of perp) {
    const dx = +m.x2 - +m.x1, dy = +m.y2 - +m.y1;
    if (Math.hypot(dx, dy) < 0.05) continue;                 // a point already on the line
    close((dx * ldx + dy * ldy) / (Math.hypot(dx, dy) * Math.hypot(ldx, ldy)), 0, 5e-3);
  }
  // three distinct orientations really are present in the markup
  for (const o of ['vertical', 'horizontal', 'perpendicular']) assert.ok(svg.includes(`data-orient="${o}"`), o);
});

test('three-lines: every line carries its own welded label, and the toggles remove it whole', () => {
  const st = { ...TL.defaults, idKey: 'tl3' };
  const svg = TL.render(st);
  assert.deepEqual(texts(svg, 'label-yx'), ['y on x']);
  assert.deepEqual(texts(svg, 'label-xy'), ['x on y']);
  assert.deepEqual(texts(svg, 'label-pc1'), ['PC1']);
  assert.ok(svg.includes('data-role="centroid"'));

  const only = TL.render({ ...st, showYX: false, showXY: false });
  assert.ok(!only.includes('data-role="line-yx"') && !only.includes('data-role="mark-yx"'));
  assert.ok(!only.includes('data-role="line-xy"') && !only.includes('data-role="mark-xy"'));
  assert.ok(only.includes('data-role="line-pc1"'));
  assert.ok(!TL.render({ ...st, ticks: false }).includes('data-role="mark-pc1"'));
});

// -------------------------------------------------------------------- basis-spin

test('basis-spin: at t = 1 the covariance is diagonal and its diagonal is the eigenvalues', () => {
  const st = { ...BS.defaults, idKey: 'bs1', t: 1 };
  const R = BS.rotated(st);
  const { values } = eigSym2(st.sxx, st.sxy, st.syy);
  close(covariance(R.zx, R.zy), 0, 1e-12);
  close(variance(R.zx), values[0], 1e-12);
  close(variance(R.zy), values[1], 1e-12);
  close(variance(R.zx) + variance(R.zy), st.sxx + st.syy, 1e-12);   // nothing was lost
});

test('basis-spin: at t = 0 nothing has turned, and the total never moves', () => {
  const st = { ...BS.defaults, idKey: 'bs2', t: 0 };
  const R = BS.rotated(st);
  const { xs, ys } = BS.cloudOf(st);
  const mx = mean(xs), my = mean(ys);
  for (let i = 0; i < xs.length; i += 17) {
    close(R.zx[i], xs[i] - mx, 1e-12);
    close(R.zy[i], ys[i] - my, 1e-12);
  }
  for (const t of [0, 0.25, 0.5, 0.75, 1]) {
    const r = BS.rotated({ ...st, t });
    close(variance(r.zx) + variance(r.zy), st.sxx + st.syy, 1e-12);
  }
});

test('basis-spin: the drawn cloud, ellipse and matrix all agree with the rotation', () => {
  const st = { ...BS.defaults, idKey: 'bs3', t: 1 };
  const svg = BS.render(st);
  assert.match(svg, /^<svg[^>]*viewBox="0 0 640 460"/);
  assert.equal((svg.match(/data-role="pt"/g) || []).length, 80);
  assert.ok(svg.includes('data-role="ellipse"'));
  assert.ok(svg.includes('data-role="old-axis-x"') && svg.includes('data-role="old-axis-y"'));
  assert.match(svg, /rotate\(-?0\)/);                       // straightened at t = 1
  assert.deepEqual(texts(svg, 'cov-off'), ['0.00', '0.00']);
  const { values } = eigSym2(st.sxx, st.sxy, st.syy);
  assert.deepEqual(texts(svg, 'cov-diag'), [values[0].toFixed(2), values[1].toFixed(2)]);
  assert.deepEqual(texts(svg, 'x-caption'), ['PC1']);
  assert.deepEqual(texts(svg, 'y-caption'), ['PC2']);

  const mid = BS.render({ ...st, t: 0.5 });
  assert.ok(!/rotate\(-?0\)/.test(mid));
  assert.ok(texts(mid, 'cov-off')[0] !== '0.00');
  assert.match(texts(mid, 'x-caption')[0], /x turning into PC1, 50%/);
});

test('basis-spin: the handle scrubs t across the whole rotation', () => {
  const st = { ...BS.defaults, idKey: 'bs4', t: 0.5 };
  const L = BS.layout(st), R = BS.rotated(st);
  const at = phi => BS.applyDrag(st, {
    id: 'spin',
    x: L.cx + Math.cos(phi) * 60,
    y: L.cy - Math.sin(phi) * 60,
  }).t;
  close(at(-R.angle), 1, 1e-9);
  close(at(0), 0, 1e-9);
  close(at(-R.angle / 2), 0.5, 1e-9);
  close(BS.applyControl(st, 't', 3).t, 1, 1e-12);            // clamped, not wrapped
});

// ------------------------------------------------------------------------- scree

test('scree: percentages sum to 100 and every bar carries its number as text', () => {
  for (const standardize of [false, true]) {
    const svg = SC.render({ ...SC.defaults, idKey: 'sc1', columns: bioColumns(), names: BIO_NAMES, standardize });
    const pcts = texts(svg, 'pct').map(s => +s.replace('%', ''));
    assert.equal(pcts.length, 4);
    assert.equal((svg.match(/data-role="bar"/g) || []).length, 4);
    close(pcts.reduce((a, b) => a + b, 0), 100, 0.02);
    for (const p of pcts) assert.ok(p >= 0 && p <= 100);
    assert.ok(texts(svg, 'note')[0].includes('simulated'));
  }
});

test('scree: the 2-variable fallback works with no data supplied', () => {
  const svg = SC.render({ ...SC.defaults, idKey: 'sc2' });
  const pcts = texts(svg, 'pct').map(s => +s.replace('%', ''));
  assert.equal(pcts.length, 2);
  close(pcts.reduce((a, b) => a + b, 0), 100, 0.02);
  const S = SC.stats({ ...SC.defaults, idKey: 'sc2' });
  const { values } = eigSym2(SC.defaults.sxx, SC.defaults.sxy, SC.defaults.syy);
  close(S.values[0], values[0], 1e-9);
  close(S.values[1], values[1], 1e-9);
});

test('scree: raw and standardized give different answers on the four biometry measures', () => {
  const base = { ...SC.defaults, idKey: 'sc3', columns: bioColumns(), names: BIO_NAMES };
  const raw = SC.stats({ ...base, standardize: false });
  const std = SC.stats({ ...base, standardize: true });

  // the percentages themselves move
  assert.ok(Math.abs(raw.explained[0] - std.explained[0]) > 1e-3);
  for (let i = 1; i < 4; i++) assert.ok(Math.abs(raw.explained[i] - std.explained[i]) > 1e-4);
  const pctOf = st => texts(SC.render(st), 'pct').join(' ');
  assert.notEqual(pctOf({ ...base, standardize: false }), pctOf({ ...base, standardize: true }));

  // and so does the ordering of what PC1 is made of: in millimetres the biggest
  // measurement dominates; standardized, the four weigh the same
  const rawL = raw.vectors[0].map(Math.abs), stdL = std.vectors[0].map(Math.abs);
  const order = v => v.map((x, i) => i).sort((a, b) => v[b] - v[a]);
  assert.equal(BIO_NAMES[order(rawL)[0]], 'AC');            // the largest numbers win
  assert.ok(Math.max(...rawL) / Math.min(...rawL) > 4);
  assert.ok(Math.max(...stdL) - Math.min(...stdL) < 0.02);  // an equal-weight size index
  assert.notEqual(order(rawL).join(), order(stdL).join());

  // total variance: raw is millimetres squared, standardized is one per variable
  close(std.total, 4, 1e-9);
  assert.ok(raw.total > 1000);
});

test('scree: the morphometric result actually comes out of the data', () => {
  const base = { ...SC.defaults, idKey: 'sc4', columns: bioColumns(), names: BIO_NAMES };
  for (const standardize of [false, true]) {
    const S = SC.stats({ ...base, standardize });
    const ref = pca(bio.ga.map((_, i) => [bio.bpd[i], bio.hc[i], bio.ac[i], bio.fl[i]]), { standardize });
    close(S.explained[0], ref.explained[0], 1e-12);

    // PC1: every loading the same sign, and it carries nearly everything
    const pc1 = S.vectors[0];
    assert.ok(pc1.every(v => v > 0), `PC1 loadings ${pc1}`);
    assert.ok(S.explained[0] > 0.9);
    assert.equal(SC.loadingCaption(pc1, BIO_NAMES), 'every variable the same sign');

    // PC2: the head measure and the abdomen measure pull opposite ways
    const pc2 = S.vectors[1];
    const hc = pc2[BIO_NAMES.indexOf('HC')], ac = pc2[BIO_NAMES.indexOf('AC')];
    assert.ok(hc * ac < 0, `HC ${hc} and AC ${ac} should oppose`);
    assert.ok(Math.abs(hc) > 0.3 && Math.abs(ac) > 0.3);
    assert.match(SC.loadingCaption(pc2, BIO_NAMES), /against/);
  }
});

test('scree: loadings are drawn with sign on two channels, not one', () => {
  const svg = SC.render({ ...SC.defaults, idKey: 'sc5', columns: bioColumns(), names: BIO_NAMES });
  const bars = attrs(svg, 'loading');
  assert.equal(bars.length, 8);                              // PC1 and PC2, four variables each
  assert.ok(bars.some(b => b['data-sign'] === 'pos') && bars.some(b => b['data-sign'] === 'neg'));
  for (const b of bars) {
    assert.match(b.fill, b['data-sign'] === 'pos' ? /sc5-up/ : /sc5-down/);   // hatch orientation
  }
  const vals = texts(svg, 'loading-value');
  assert.equal(vals.length, 8);
  assert.ok(vals.some(v => v.startsWith('+')) && vals.some(v => v.startsWith('-')));   // printed sign
  for (const n of BIO_NAMES) assert.ok(svg.includes(`>${n}<`), n);                     // direct labels
});

// --------------------------------------------------------------------- all four

test('every lesson-3 instrument prefixes its ids and keeps the house punctuation', () => {
  const cases = [
    ['ap', AP, { ...AP.defaults, idKey: 'ap', showBest: true, angleDeg: 61 }],
    ['tl', TL, { ...TL.defaults, idKey: 'tl' }],
    ['bs', BS, { ...BS.defaults, idKey: 'bs', t: 0.42 }],
    ['sc', SC, { ...SC.defaults, idKey: 'sc', columns: bioColumns(), names: BIO_NAMES, unit: 'mm squared' }],
  ];
  for (const [key, mod, st] of cases) {
    const svg = mod.render(st);
    assert.match(svg, /^<svg[^>]*viewBox="0 0 640 460"/, key);
    assert.match(svg, /<\/svg>\s*$/, key);
    assert.equal((svg.match(/<svg/g) || []).length, 1, key);
    const ids = [...svg.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]);
    assert.ok(ids.length > 0, key);
    for (const id of ids) assert.ok(id.startsWith(`sb-${key}-`), `${key}: ${id}`);
    for (const ref of [...svg.matchAll(/url\(#([^)]+)\)/g)].map(m => m[1])) {
      assert.ok(ids.includes(ref), `${key}: dangling ${ref}`);
    }
    assert.ok(!svg.includes(EM_DASH), `${key} rendered an em-dash`);
    assert.ok(svg.includes('<title>'), key);
    assert.equal(typeof mod.name, 'string');
    assert.ok(Array.isArray(mod.controls));
    assert.equal(typeof mod.applyDrag, 'function');
  }
});

test('the lesson-3 sources are free of em-dashes too', () => {
  const files = ['js/instruments/axis-projector.mjs', 'js/instruments/three-lines.mjs',
    'js/instruments/basis-spin.mjs', 'js/instruments/scree.mjs', 'js/lib/frame.mjs'];
  for (const f of files) {
    assert.ok(!readFileSync(new URL(`../${f}`, import.meta.url), 'utf8').includes(EM_DASH), f);
  }
});
