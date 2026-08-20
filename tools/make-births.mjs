// Convert the OpenIntro births14 CSV into data/births.json (committed).
// Hand-run:  node tools/make-births.mjs <path-to-births14.csv> <retrieved-date>
// The raw CSV stays out of the repo; this script + the JSON are the record.
// Seeded downsample so reruns are byte-identical.

import { readFileSync, writeFileSync } from 'node:fs';
import { mulberry32 } from '../js/math/core.mjs';

const [, , csvPath, retrieved] = process.argv;
if (!csvPath || !retrieved) {
  console.error('usage: node tools/make-births.mjs <births14.csv> <YYYY-MM-DD>');
  process.exit(1);
}

const LB_TO_G = 453.59237;
const TARGET_N = 400;

const lines = readFileSync(csvPath, 'utf8').trim().split(/\r?\n/);
const header = lines[0].split(',');
const iWeeks = header.indexOf('weeks');
const iWeight = header.indexOf('weight');
if (iWeeks < 0 || iWeight < 0) { console.error('expected columns weeks, weight'); process.exit(1); }

const rows = [];
for (const line of lines.slice(1)) {
  const cells = line.split(',');
  const weeks = Number(cells[iWeeks]);
  const weight = Number(cells[iWeight]);
  if (!Number.isFinite(weeks) || !Number.isFinite(weight)) continue;   // drop NA
  rows.push({ weeks, grams: Math.round(weight * LB_TO_G) });
}

// seeded Fisher-Yates, then take the first TARGET_N
const rng = mulberry32(20260820);
for (let i = rows.length - 1; i > 0; i--) {
  const j = Math.floor(rng() * (i + 1));
  [rows[i], rows[j]] = [rows[j], rows[i]];
}
const sample = rows.slice(0, TARGET_N).sort((a, b) => a.weeks - b.weeks || a.grams - b.grams);

const out = {
  source: 'OpenIntro births14 (sample of 1,000 births from the 2014 NCHS natality public-use file)',
  url: 'https://www.openintro.org/data/csv/births14.csv',
  license: 'CC BY-SA 4.0 (OpenIntro data)',
  retrieved,
  n: sample.length,
  fields: { x: 'gestational age (weeks)', y: 'birthweight (g)' },
  xs: sample.map(r => r.weeks),
  ys: sample.map(r => r.grams),
};

writeFileSync(new URL('../data/births.json', import.meta.url), JSON.stringify(out) + '\n');
console.log(`wrote data/births.json: n=${out.n}, weeks ${Math.min(...out.xs)}-${Math.max(...out.xs)}, grams ${Math.min(...out.ys)}-${Math.max(...out.ys)} (dropped ${lines.length - 1 - rows.length} incomplete rows)`);
