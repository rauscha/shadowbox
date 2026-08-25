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
