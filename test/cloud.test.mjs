import test from 'node:test';
import assert from 'node:assert/strict';
import { chol2, whiten, baseCloud, colorCloud, ellipseParams, covFromEllipse } from '../js/lib/cloud.mjs';
import { mean, variance, covariance, corr, eigSym2 } from '../js/math/core.mjs';
import { controlsMarkup } from '../js/lib/hydrate.mjs';

const close = (a, b, tol = 1e-9) => assert.ok(Math.abs(a - b) < tol, `${a} !~ ${b}`);

test('chol2 reconstructs the matrix and rejects non-PD input', () => {
  const { a, b, c } = chol2(2, 0.6, 1.3);
  close(a * a, 2); close(a * b, 0.6); close(b * b + c * c, 1.3);
  assert.throws(() => chol2(1, 1.5, 1));   // |sxy| > sqrt(sxx*syy)
});

test('whiten produces exact zero mean and identity sample covariance', () => {
  const { ux, uy } = baseCloud(42, 60);
  close(mean(ux), 0, 1e-12); close(mean(uy), 0, 1e-12);
  close(variance(ux), 1, 1e-10); close(variance(uy), 1, 1e-10);
  close(covariance(ux, uy), 0, 1e-10);
});

test('colorCloud hits the target covariance exactly, so dial == picture', () => {
  const base = baseCloud(7, 80);
  const { xs, ys } = colorCloud(base, 1.8, -0.9, 1.1, 5, 20);
  close(mean(xs), 5, 1e-9); close(mean(ys), 20, 1e-9);
  close(variance(xs), 1.8, 1e-9);
  close(covariance(xs, ys), -0.9, 1e-9);
  close(variance(ys), 1.1, 1e-9);
});

test('ellipseParams axes come from the eigenvalues; covFromEllipse round-trips', () => {
  const [sxx, sxy, syy] = [2.2, 0.7, 0.9];
  const e = ellipseParams(sxx, sxy, syy, 2);
  const { values } = eigSym2(sxx, sxy, syy);
  close(e.rx, 2 * Math.sqrt(values[0]));
  close(e.ry, 2 * Math.sqrt(values[1]));
  const back = covFromEllipse(values[0], values[1], e.angle);
  close(back.sxx, sxx); close(back.sxy, sxy); close(back.syy, syy);
});

test('unit rescaling scales covariance entries but never the correlation', () => {
  const base = baseCloud(3, 50);
  const { xs, ys } = colorCloud(base, 1.5, 0.8, 1.2);
  const xs10 = xs.map(v => v / 10), ys1000 = ys.map(v => v / 1000); // mm->cm, g->kg
  close(covariance(xs10, ys1000), 0.8 / 10 / 1000, 1e-12);
  close(corr(xs10, ys1000), corr(xs, ys), 1e-12);
});

test('controlsMarkup: needsTruth controls vanish when the data carries no truth', () => {
  const controls = [
    { id: 'rho', kind: 'slider', min: -0.95, max: 0.95, step: 0.01, label: 'true ρ', needsTruth: true },
    { id: 'resample', kind: 'action', label: 'resample', needsTruth: true },
    { id: 'xUnit', kind: 'toggle', label: 'x in cm', on: 'cm', off: 'mm' },
  ];
  const withTruth = controlsMarkup(controls, { rho: 0.7, truth: { rho: 0.7 }, xUnit: 'mm' });
  assert.ok(withTruth.includes('data-control="rho"') && withTruth.includes('data-action="resample"'));
  const noTruth = controlsMarkup(controls, { rho: 0.7, truth: null, xUnit: 'mm' });
  assert.ok(!noTruth.includes('data-control="rho"') && !noTruth.includes('data-action="resample"'));
  assert.ok(noTruth.includes('data-control="xUnit"'));
});
