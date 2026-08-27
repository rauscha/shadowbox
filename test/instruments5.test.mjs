// Render and geometry tests for the four lesson-5 instruments. Same shape as
// test/instruments4.test.mjs: assert on data-role attributes so the tests
// describe what the reader sees rather than how the SVG string is assembled.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const EM_DASH = String.fromCharCode(0x2014);
const roles = (svg, role) => (svg.match(new RegExp(`data-role="${role}"`, 'g')) || []).length;
const attrs = (svg, role) =>
  [...svg.matchAll(new RegExp(`<[a-z]+ data-role="${role}"[^>]*>`, 'g'))].map(m => {
    const o = {};
    for (const a of m[0].matchAll(/([a-z0-9-]+)="([^"]*)"/g)) o[a[1]] = a[2];
    return o;
  });
const texts = (svg, role) =>
  [...svg.matchAll(new RegExp(`data-role="${role}"[^>]*>([^<]*)<`, 'g'))].map(m => m[1]);

const read = p => JSON.parse(readFileSync(new URL(`../data/${p}`, import.meta.url), 'utf8'));
const BLOBS = read('blobs.json');
const BIO = read('biometry.json');

// --------------------------------------------------------------- knn-graph

import * as KG from '../js/instruments/knn-graph.mjs';

const kgState = (over = {}) => {
  const c = BLOBS.configs.crescents;
  return { ...KG.defaults, idKey: 'kg1', dataset: 'crescents',
    columns: [c.xs, c.ys], truth: c.labels, k: 5, ...over };
};

test('knn-graph draws every point and every edge of the graph', () => {
  const st = kgState();
  const svg = KG.render(st);
  assert.match(svg, /^<svg[^>]*viewBox="0 0 640 460"/);
  assert.match(svg, /<\/svg>\s*$/);
  assert.equal(roles(svg, 'pt'), 150);
  assert.equal(roles(svg, 'edge'), KG.graphOf(st).head.length);
});

test('knn-graph has no seed control at all, and that absence is the lesson', () => {
  const ids = KG.controls.map(c => c.id);
  assert.ok(!ids.includes('seed'), 'the graph does not depend on a seed, so it must not offer one');
  assert.ok(!ids.includes('reset'), 'there is nothing to restart');
});

test('the same data and the same neighbours give byte-identical markup', () => {
  assert.equal(KG.render(kgState()), KG.render(kgState()));
});

test('edge weight is drawn as line weight, and the strongest edge is the heaviest', () => {
  const st = kgState();
  const g = KG.graphOf(st);
  const drawn = attrs(KG.render(st), 'edge').map(e => Number(e['stroke-width']));
  assert.equal(drawn.length, g.weight.length);
  const strongest = g.weight.indexOf(Math.max(...g.weight));
  const weakest = g.weight.indexOf(Math.min(...g.weight));
  assert.ok(drawn[strongest] > drawn[weakest],
    'membership strength must read as ink weight, or "neighbour" looks like a yes/no relation');
  assert.ok(Math.min(...drawn) > 0, 'an edge drawn at zero width is an edge the reader never sees');
});

test('more neighbours means more edges, on every dataset', () => {
  for (const name of ['blobs', 'crescents', 'uniform']) {
    const c = BLOBS.configs[name];
    const at = k => KG.graphOf(kgState({ dataset: name, columns: [c.xs, c.ys], truth: c.labels, k })).head.length;
    assert.ok(at(3) < at(10) && at(10) < at(25), `${name}: the edge count must climb with k`);
  }
});

test('at few neighbours the crescents graph stays inside each arc; at many it bridges them', () => {
  // The single picture behind every crescents result in the claims table, and
  // the reason the answer depends on a number the reader chose.
  const c = BLOBS.configs.crescents;
  const bridges = k => {
    const st = kgState({ k, dataset: 'crescents', columns: [c.xs, c.ys], truth: c.labels });
    const g = KG.graphOf(st);
    let n = 0;
    for (let e = 0; e < g.head.length; e++) if (c.labels[g.head[e]] !== c.labels[g.tail[e]]) n++;
    return n / g.head.length;
  };
  const few = bridges(3), many = bridges(30);
  assert.ok(few < many, `bridging must grow with k: ${few.toFixed(3)} at k=3, ${many.toFixed(3)} at k=30`);
  assert.ok(few < 0.05, `at k=3 the graph should almost never cross arcs, got ${few.toFixed(3)}`);
});

test('biometry computes its neighbours on all four measurements, not on the two it draws', () => {
  // The decision recorded in the plan's File Structure section. The neighbours
  // are four-dimensional; the picture is a shadow of them, and some edges will
  // visibly cross it. That discomfort is lesson 4's closer made literal.
  const st = kgState({ dataset: 'biometry',
    columns: [BIO.bpd, BIO.hc, BIO.ac, BIO.fl], truth: null, k: 5 });
  assert.equal(KG.rowsOf(st)[0].length, 4, 'the graph must see four columns');
  assert.equal(KG.positionsOf(st)[0].length, 2, 'the drawing must see two');

  const svg = KG.render(st);
  assert.equal(roles(svg, 'pt'), 350);
  assert.match(texts(svg, 'note').join(' '), /four/i,
    'the figure must say out loud that the neighbours were found on all four measurements');

  // At least one drawn edge is much longer than the typical one: a
  // four-dimensional neighbour that the two-dimensional picture cannot justify.
  const len = attrs(svg, 'edge').map(e =>
    Math.hypot(Number(e.x2) - Number(e.x1), Number(e.y2) - Number(e.y1)));
  const sorted = [...len].sort((a, b) => a - b);
  const med = sorted[sorted.length >> 1];
  assert.ok(Math.max(...len) > 4 * med,
    'if no edge looks wrong in the shadow, the figure is not teaching what it was chosen to teach');
});

test('knn-graph refuses a k the data cannot support', () => {
  assert.throws(() => KG.graphOf(kgState({ k: 200 })), /k/);
});
