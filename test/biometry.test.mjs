import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { hadlockEfw } from '../tools/make-biometry.mjs';
import { corr } from '../js/math/core.mjs';

const data = JSON.parse(readFileSync(new URL('../data/biometry.json', import.meta.url), 'utf8'));

test('biometry.json carries provenance and parallel arrays', () => {
  assert.match(data.provenance.kind, /SIMULATED/);
  assert.match(data.provenance.centiles, /Papageorghiou.*Lancet 2014/);
  assert.match(data.provenance.efw, /Hadlock.*1985/);
  const n = data.ga.length;
  for (const k of ['hc', 'ac', 'fl', 'bpd', 'efw']) assert.equal(data[k].length, n);
  assert.ok(n >= 300);
});

test('hadlockEfw reproduces a hand-checked value at term-median biometry', () => {
  // INTERGROWTH 40w medians: HC 333.9, AC 349.8, FL 72.1 mm
  const w = hadlockEfw(33.39, 34.98, 7.21);
  assert.ok(w > 3200 && w < 3650, `term median EFW ${w}`);
});

test('stored EFW matches the Hadlock formula up to the disclosed noise', () => {
  const sd = data.provenance.simulationParameters.sdLog10Efw;
  for (let i = 0; i < data.ga.length; i++) {
    const formula = hadlockEfw(data.hc[i] / 10, data.ac[i] / 10, data.fl[i] / 10);
    const dLog = Math.abs(Math.log10(data.efw[i] / formula));
    assert.ok(dLog < 5 * sd, `row ${i}: ${data.efw[i]} vs ${formula}`);
  }
});

test('ranges are clinically sane and the pair correlates the way the essay claims', () => {
  assert.ok(Math.min(...data.ga) >= 20 && Math.max(...data.ga) <= 40);
  assert.ok(Math.min(...data.hc) > 150 && Math.max(...data.hc) < 380);
  assert.ok(Math.min(...data.efw) > 200 && Math.max(...data.efw) < 5200);
  const r = corr(data.hc, data.efw);
  assert.ok(r > 0.9 && r < 0.995, `corr(HC, EFW) = ${r}`);
});
