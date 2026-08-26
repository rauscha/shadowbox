// Poster-frame generator. Hand-run:  node tools/poster.mjs
// Renders each configured instrument state to a committed SVG (figures/) and
// injects it into its page between <!-- poster:KEY --> markers, idempotently.
// The posters are the archival layer: with JS off (or dead, in 2041) the pages
// still teach, print, and index.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import * as fitScatter from '../js/instruments/fit-scatter.mjs';
import * as lossBowl from '../js/instruments/loss-bowl.mjs';
import * as cloudEllipse from '../js/instruments/cloud-ellipse.mjs';
import * as unitsTrap from '../js/instruments/units-trap.mjs';
import * as axisProjector from '../js/instruments/axis-projector.mjs';
import * as threeLines from '../js/instruments/three-lines.mjs';
import * as basisSpin from '../js/instruments/basis-spin.mjs';
import * as scree from '../js/instruments/scree.mjs';
import * as kmeansStep from '../js/instruments/kmeans-step.mjs';
import * as restartRoulette from '../js/instruments/restart-roulette.mjs';
import * as elbow from '../js/instruments/elbow.mjs';
import * as labelVsTruth from '../js/instruments/label-vs-truth.mjs';
import { synthLine, ols, detrend, standardize } from '../js/math/core.mjs';

export function injectPoster(html, key, svg) {
  const re = new RegExp(`<!-- poster:${key} -->[\\s\\S]*?<!-- /poster:${key} -->`);
  if (!re.test(html)) throw new Error(`marker not found: poster:${key}`);
  return html.replace(re, `<!-- poster:${key} -->\n${svg}\n<!-- /poster:${key} -->`);
}

const root = new URL('..', import.meta.url);
const inRepo = p => new URL(p, root);

function synState() {
  const d = synthLine({ seed: 11, n: 12, slope: 0.62, intercept: 1.1, noise: 0.9 });
  return d;
}

const CONFIGS = [{
  file: 'least-squares.html',
  posters: [
    {
      key: 'fit-scatter-synthetic', instrument: fitScatter,
      state: () => {
        const d = synState();
        // deliberately wrong line: the poster should show fat, countable squares
        return { ...fitScatter.defaults, idKey: 'fs-syn', xs: d.xs, ys: d.ys, truth: d.truth, slope: 0.15, intercept: 3.2 };
      },
    },
    {
      key: 'loss-bowl-synthetic', instrument: lossBowl,
      state: () => {
        const d = synState();
        return { ...lossBowl.defaults, idKey: 'lb-syn', xs: d.xs, ys: d.ys, slope: 0.15, intercept: 3.2, loss: 'squared' };
      },
    },
    {
      key: 'fit-scatter-births', instrument: fitScatter,
      state: () => {
        let b;
        try {
          b = JSON.parse(readFileSync(inRepo('data/births.json'), 'utf8'));
        } catch {
          // offline fallback: labeled placeholder, never a silent substitution
          console.error('warning: data/births.json missing - births poster uses a labeled placeholder');
          const d = synthLine({ seed: 99, n: 60, slope: 190, intercept: -3600, noise: 420, xMin: 30, xMax: 42 });
          return { ...fitScatter.defaults, idKey: 'fs-births', xs: d.xs, ys: d.ys, residuals: false,
            ...ols(d.xs, d.ys),
            labels: { x: 'gestational age (weeks)', y: 'birthweight (g)', title: 'placeholder - real data pending' } };
        }
        const fit = ols(b.xs, b.ys);
        return { ...fitScatter.defaults, idKey: 'fs-births', xs: b.xs, ys: b.ys, residuals: false,
          slope: fit.slope, intercept: fit.intercept,
          labels: { x: 'gestational age (weeks)', y: 'birthweight (g)', title: 'every birth is a point. the line is a choice.' } };
      },
    },
  ],
}, {
  file: 'covariance.html',
  posters: [
    {
      key: 'cloud-ellipse-synthetic', instrument: cloudEllipse,
      state: () => ({ ...cloudEllipse.defaults, idKey: 'ce-syn',
        labels: { x: 'x', y: 'y', title: 'drag the cloud. or drag the matrix.' } }),
    },
    {
      key: 'units-trap-synthetic', instrument: unitsTrap,
      state: () => ({ ...unitsTrap.defaults, idKey: 'ut-syn',
        xName: 'length', yName: 'weight',
        labels: { title: 'same cloud. new units. watch the matrix.' } }),
    },
    {
      key: 'units-trap-biometry', instrument: unitsTrap,
      state: () => {
        const d = JSON.parse(readFileSync(inRepo('data/biometry.json'), 'utf8'));
        return { ...unitsTrap.defaults, idKey: 'ut-bio', xs: d.hc, ys: d.efw,
          xName: 'head circumference', yName: 'estimated fetal weight',
          labels: { title: '350 simulated scans - INTERGROWTH-21st centiles, not patients' } };
      },
    },
  ],
}, {
  file: 'pca.html',
  posters: [
    {
      key: 'axis-projector-synthetic', instrument: axisProjector,
      // angle 0 on purpose: the poster should open on a bad line, with fat drops
      state: () => ({ ...axisProjector.defaults, idKey: 'ap-syn', angleDeg: 0,
        labels: { x: 'x', y: 'y', title: 'turn the line. the two numbers trade.' } }),
    },
    {
      key: 'three-lines-synthetic', instrument: threeLines,
      state: () => ({ ...threeLines.defaults, idKey: 'tl-syn',
        labels: { x: 'x', y: 'y', title: 'three lines through the same points.' } }),
    },
    {
      key: 'basis-spin-synthetic', instrument: basisSpin,
      // t = 1: the poster shows the destination, axes already spun onto PC1/PC2
      state: () => ({ ...basisSpin.defaults, idKey: 'bs-syn', t: 1,
        labels: { x: 'x', y: 'y', pc1: 'PC1', pc2: 'PC2', title: 'same cloud. new pair of directions.' } }),
    },
    {
      key: 'scree-biometry', instrument: scree,
      state: () => {
        const d = JSON.parse(readFileSync(inRepo('data/biometry.json'), 'utf8'));
        return { ...scree.defaults, idKey: 'sc-bio',
          columns: [d.bpd, d.hc, d.ac, d.fl], names: ['BPD', 'HC', 'AC', 'FL'],
          standardize: false, unit: 'mm squared',
          note: '350 simulated scans, 20-40 weeks',
          labels: { title: 'four measurements. how the spread divides.' } };
      },
    },
    {
      key: 'scree-biometry-adjusted', instrument: scree,
      state: () => {
        const d = JSON.parse(readFileSync(inRepo('data/biometry.json'), 'utf8'));
        // same detrend the page runs client-side, so poster and hydrated view agree
        const cols = [d.bpd, d.hc, d.ac, d.fl].map(c => standardize(detrend(c, d.ga, 2)));
        return { ...scree.defaults, idKey: 'sc-bioz',
          columns: cols, names: ['BPD', 'HC', 'AC', 'FL'],
          standardize: true, unit: '',
          note: 'same scans, gestational age removed first',
          labels: { title: 'size for dates. the spread divides differently.' } };
      },
    },
  ],
}, {
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
      key: 'elbow-blobs', instrument: elbow,
      // Ruling 2026-08-25: this figure opens on BLOBS, in the poster and in the
      // live mount alike. Biometry's curve has no bend and its verdict line
      // declines to name a k, so opening there would sit beside prose reading
      // "there is a real bend, and the figure puts it at k=3". The prose walks
      // blobs, then births, then biometry, so blobs is the correct load state
      // and all three stay reachable through the dataset buttons.
      state: () => {
        const c = JSON.parse(readFileSync(inRepo('data/blobs.json'), 'utf8')).configs.blobs;
        return { ...elbow.defaults, idKey: 'el-blobs', dataset: 'blobs',
          columns: [c.xs, c.ys], standardize: false, kMax: 10,
          note: '150 generated points, three blobs',
          labels_: { title: 'three blobs make this data. the curve finds all three.' } };
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
}];

function main() {
  mkdirSync(inRepo('figures/'), { recursive: true });
  for (const cfg of CONFIGS) {
    const pagePath = inRepo(cfg.file);
    let html = readFileSync(pagePath, 'utf8');
    for (const p of cfg.posters) {
      const svg = `<!-- generated by tools/poster.mjs -->\n${p.instrument.render(p.state())}`;
      writeFileSync(inRepo(`figures/${p.key}.svg`), svg + '\n');
      html = injectPoster(html, p.key, svg);
      console.log(`poster: ${p.key} -> figures/${p.key}.svg + ${cfg.file}`);
    }
    writeFileSync(pagePath, html);
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main();
}
