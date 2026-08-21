// Regenerates data/biometry.json — a SIMULATED fetal biometry sample for
// rungs 2–3. Hand-run:  node tools/make-biometry.mjs
//
// Construction (all sources on the record):
// 1. Per-week medians and SDs for HC, AC, FL, BPD (mm) are the INTERGROWTH-21st
//    Fetal Growth Standards (Papageorghiou et al., Lancet 2014;384:869-79),
//    transcribed from the official z-score tables published at
//    intergrowth21.com (grow_fetal-zs_*_table.pdf, © University of Oxford).
//    Spot-checked against the fitted equations reproduced in Ohuma & Altman,
//    Stat Med 2019 (doi:10.1002/sim.8018) for HC and in Wang et al., PLoS ONE
//    2016 (doi:10.1371/journal.pone.0159733) for FL.
// 2. EFW is COMPUTED from the simulated biometry with the Hadlock 1985
//    three-parameter model (Hadlock et al., Am J Obstet Gynecol 1985;151:333-7):
//    log10(W g) = 1.326 − 0.00326·AC·FL + 0.0107·HC + 0.0438·AC + 0.158·FL
//    (AC, FL, HC in cm) — so the HC↔EFW correlation on the page is partly by
//    construction, exactly the honest aside the rung-2 essay makes (spec §7).
// 3. Simulation parameters (choices, not published facts — owner may tune):
//    GA ~ U(20, 40) weeks; each fetus gets a shared size z plus per-measure
//    noise with within-GA cross-correlation RHO_WITHIN = 0.6; EFW carries
//    multiplicative noise SD_LOG10_EFW = 0.031 (≈7.5% — the order of random
//    error usually attributed to Hadlock EFW).

import { writeFileSync } from 'node:fs';
import { mulberry32, gaussian } from '../js/math/core.mjs';

const HC = [[14, 97.9, 5.6], [15, 110.4, 5.9], [16, 122.9, 6.3], [17, 135.4, 6.6], [18, 147.9, 6.9], [19, 160.3, 7.1], [20, 172.5, 7.4], [21, 184.5, 7.7], [22, 196.3, 7.9], [23, 207.8, 8.1], [24, 219.1, 8.3], [25, 230.0, 8.4], [26, 240.5, 8.6], [27, 250.6, 8.8], [28, 260.4, 8.9], [29, 269.6, 9.1], [30, 278.4, 9.2], [31, 286.6, 9.5], [32, 294.4, 9.6], [33, 301.5, 9.9], [34, 308.1, 10.1], [35, 314.1, 10.4], [36, 319.4, 10.8], [37, 324.1, 11.2], [38, 328.1, 11.6], [39, 331.4, 12.2], [40, 333.9, 13.0]];
const AC = [[14, 80.6, 4.1], [15, 91.9, 4.8], [16, 103.2, 5.4], [17, 114.4, 6.0], [18, 125.6, 6.6], [19, 136.7, 7.1], [20, 147.7, 7.7], [21, 158.7, 8.1], [22, 169.6, 8.6], [23, 180.4, 9.1], [24, 191.2, 9.4], [25, 201.8, 10.0], [26, 212.4, 10.4], [27, 222.9, 10.8], [28, 233.3, 11.3], [29, 243.6, 11.8], [30, 253.8, 12.4], [31, 263.9, 13.0], [32, 273.9, 13.6], [33, 283.8, 14.4], [34, 293.6, 15.1], [35, 303.3, 16.0], [36, 312.8, 17.1], [37, 322.3, 18.1], [38, 331.6, 19.4], [39, 340.8, 20.8], [40, 349.8, 22.4]];
const FL = [[14, 13.1, 1.5], [15, 16.3, 1.6], [16, 19.5, 1.6], [17, 22.5, 1.7], [18, 25.5, 1.7], [19, 28.5, 1.7], [20, 31.3, 1.8], [21, 34.1, 1.8], [22, 36.7, 1.9], [23, 39.4, 1.9], [24, 41.9, 1.9], [25, 44.4, 1.9], [26, 46.7, 2.1], [27, 49.1, 2.0], [28, 51.3, 2.1], [29, 53.4, 2.2], [30, 55.5, 2.3], [31, 57.5, 2.3], [32, 59.5, 2.3], [33, 61.3, 2.5], [34, 63.1, 2.5], [35, 64.8, 2.6], [36, 66.4, 2.7], [37, 68.0, 2.8], [38, 69.4, 3.0], [39, 70.8, 3.1], [40, 72.1, 3.3]];
const BPD = [[14, 29.6, 1.8], [15, 32.6, 1.8], [16, 35.6, 2.0], [17, 38.8, 2.0], [18, 42.0, 2.1], [19, 45.2, 2.2], [20, 48.4, 2.3], [21, 51.7, 2.4], [22, 55.0, 2.4], [23, 58.2, 2.6], [24, 61.4, 2.6], [25, 64.5, 2.8], [26, 67.6, 2.8], [27, 70.6, 2.9], [28, 73.5, 2.9], [29, 76.3, 3.0], [30, 78.9, 3.1], [31, 81.4, 3.1], [32, 83.8, 3.1], [33, 85.9, 3.3], [34, 87.9, 3.3], [35, 89.7, 3.4], [36, 91.2, 3.5], [37, 92.5, 3.6], [38, 93.6, 3.6], [39, 94.4, 3.8], [40, 94.9, 3.9]];

const N = 350, SEED = 21, RHO_WITHIN = 0.6, SD_LOG10_EFW = 0.031;

function interp(table, ga) {
  const lo = Math.max(table[0][0], Math.min(Math.floor(ga), table[table.length - 1][0] - 1));
  const row0 = table[lo - table[0][0]], row1 = table[lo - table[0][0] + 1];
  const t = ga - lo;
  return { mean: row0[1] + t * (row1[1] - row0[1]), sd: row0[2] + t * (row1[2] - row0[2]) };
}

export function hadlockEfw(hcCm, acCm, flCm) {
  const log10w = 1.326 - 0.00326 * acCm * flCm + 0.0107 * hcCm + 0.0438 * acCm + 0.158 * flCm;
  return 10 ** log10w;
}

function main() {
  const rng = mulberry32(SEED);
  const ga = [], hc = [], ac = [], fl = [], bpd = [], efw = [];
  for (let i = 0; i < N; i++) {
    const g = 20 + 20 * rng();
    const zShared = gaussian(rng);
    const z = () => RHO_WITHIN * zShared + Math.sqrt(1 - RHO_WITHIN ** 2) * gaussian(rng);
    const mHc = interp(HC, g), mAc = interp(AC, g), mFl = interp(FL, g), mBpd = interp(BPD, g);
    const vHc = mHc.mean + mHc.sd * z();
    const vAc = mAc.mean + mAc.sd * z();
    const vFl = mFl.mean + mFl.sd * z();
    const vBpd = mBpd.mean + mBpd.sd * z();
    const w = hadlockEfw(vHc / 10, vAc / 10, vFl / 10) * 10 ** (SD_LOG10_EFW * gaussian(rng));
    ga.push(+g.toFixed(2)); hc.push(+vHc.toFixed(1)); ac.push(+vAc.toFixed(1));
    fl.push(+vFl.toFixed(1)); bpd.push(+vBpd.toFixed(1)); efw.push(+w.toFixed(0));
  }
  const out = {
    provenance: {
      kind: 'SIMULATED from published parameters — not patient data',
      centiles: 'INTERGROWTH-21st Fetal Growth Standards: Papageorghiou et al., Lancet 2014;384:869-79; per-week mean/SD transcribed from the official z-score tables at intergrowth21.com (© University of Oxford); cross-checked against Ohuma & Altman, Stat Med 2019 (doi:10.1002/sim.8018) and Wang et al., PLoS ONE 2016 (doi:10.1371/journal.pone.0159733)',
      efw: 'Hadlock et al., Am J Obstet Gynecol 1985;151:333-7 — three-parameter model (HC, AC, FL); EFW is computed from the simulated biometry, so biometry↔EFW correlation is partly by construction',
      simulationParameters: { n: N, seed: SEED, gaWeeks: [20, 40], rhoWithinGa: RHO_WITHIN, sdLog10Efw: SD_LOG10_EFW, note: 'these three are modeling choices, not published quantities; owner may tune' },
      generator: 'tools/make-biometry.mjs (deterministic; rerun to regenerate)',
      units: { ga: 'weeks', hc: 'mm', ac: 'mm', fl: 'mm', bpd: 'mm', efw: 'g' },
    },
    ga, hc, ac, fl, bpd, efw,
  };
  writeFileSync(new URL('../data/biometry.json', import.meta.url), JSON.stringify(out) + '\n');
  console.log(`biometry.json: n=${N}, EFW ${Math.min(...efw)}–${Math.max(...efw)} g`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main();
}
