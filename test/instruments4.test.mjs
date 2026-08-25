// Render and geometry tests for the four lesson-4 instruments, plus the shared
// marks module. Same shape as test/instruments3.test.mjs: assert on data-role
// attributes so the tests describe what the reader sees rather than how the SVG
// string happens to be assembled.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { MARK_KINDS, MAX_MARKS, markPath, markFor, partitionSegments } from '../js/lib/marks.mjs';

const EM_DASH = String.fromCharCode(0x2014);   // never typed literally, only tested for
const roles = (svg, role) => (svg.match(new RegExp(`data-role="${role}"`, 'g')) || []).length;
const attrs = (svg, role) =>
  [...svg.matchAll(new RegExp(`<[a-z]+ data-role="${role}"[^>]*>`, 'g'))].map(m => {
    const o = {};
    for (const a of m[0].matchAll(/([a-z0-9-]+)="([^"]*)"/g)) o[a[1]] = a[2];
    return o;
  });
const texts = (svg, role) =>
  [...svg.matchAll(new RegExp(`data-role="${role}"[^>]*>([^<]*)<`, 'g'))].map(m => m[1]);

// ------------------------------------------------------------------- marks

test('there are exactly six mark kinds and they are all different paths', () => {
  assert.equal(MARK_KINDS.length, 6);
  assert.equal(MAX_MARKS, 6);
  const ds = MARK_KINDS.map(k => markPath(k, 10, 10, 4).d);
  assert.equal(new Set(ds).size, 6, 'two marks share a path, so two clusters would look identical');
});

test('four marks are filled silhouettes and two are stroke-only line marks', () => {
  const filled = MARK_KINDS.filter(k => markPath(k, 0, 0, 3).filled);
  assert.deepEqual(filled, ['circle', 'square', 'triangle', 'diamond']);
  assert.deepEqual(MARK_KINDS.filter(k => !markPath(k, 0, 0, 3).filled), ['plus', 'cross']);
});

test('a mark is centred where it is drawn and scales with its radius', () => {
  // Both checks are parity-free on purpose. An SVG path interleaves coordinates
  // with arc radii and flags, and H and V take a single coordinate, so reading
  // the numbers as alternating x and y is wrong: it misreads the plus mark's
  // `H` and `V` operands as a y of 100.
  const nums = d => d.match(/-?\d+(\.\d+)?/g).map(Number);
  for (const kind of MARK_KINDS) {
    // Drawn far from the origin, every coordinate-sized number must sit near the
    // centre it was asked for. Radii and flags stay small and are skipped.
    for (const v of nums(markPath(kind, 1000, 1000, 4).d).filter(v => Math.abs(v) >= 100)) {
      assert.ok(v >= 994 && v <= 1006, `${kind} drawn away from its centre: ${v}`);
    }
    // Doubling r doubles the mark's reach, whatever commands it is built from.
    const reach = r => Math.max(...nums(markPath(kind, 0, 0, r).d).map(Math.abs));
    assert.ok(Math.abs(reach(8) - 2 * reach(4)) < 1e-9,
      `${kind} must scale with r: ${reach(4)} then ${reach(8)}`);
  }
});

test('markFor maps a cluster index to a kind and refuses to go past six', () => {
  assert.equal(markFor(0), 'circle');
  assert.equal(markFor(5), 'cross');
  assert.throws(() => markFor(6), /six/i, 'the shape budget must fail loudly, not wrap around');
});

test('two centers give a straight boundary on their perpendicular bisector', () => {
  const frame = {
    plot: { x0: 0, y0: 0, x1: 200, y1: 200 },
    invX: px => (px - 100) / 20,          // data 0 sits at screen x 100
    invY: py => (100 - py) / 20,
    x: v => 100 + v * 20,
    y: v => 100 - v * 20,
  };
  const segs = partitionSegments([[-1, 0], [1, 0]], frame, { n: 40 });
  assert.ok(segs.length > 10, 'a wall across the plot should be many short segments');
  for (const [x0, y0, x1, y1] of segs) {
    assert.ok(Math.abs(x0 - 100) < 3 && Math.abs(x1 - 100) < 3,
      `the bisector of (-1,0) and (1,0) is the vertical line x=0: got ${x0}, ${x1}`);
    assert.ok(y0 >= 0 && y1 <= 200);
  }
});

test('one center has no boundary at all', () => {
  const frame = {
    plot: { x0: 0, y0: 0, x1: 100, y1: 100 },
    invX: px => px, invY: py => py, x: v => v, y: v => v,
  };
  assert.deepEqual(partitionSegments([[50, 50]], frame, { n: 20 }), []);
});

test('the partition is drawn once, not once per side', () => {
  const frame = {
    plot: { x0: 0, y0: 0, x1: 200, y1: 200 },
    invX: px => (px - 100) / 20, invY: py => (100 - py) / 20,
    x: v => 100 + v * 20, y: v => 100 - v * 20,
  };
  const segs = partitionSegments([[-1, -1], [1, -1], [0, 1]], frame, { n: 48 });
  const keys = segs.map(s => [Math.round(s[0] + s[2]), Math.round(s[1] + s[3])].join(':'));
  assert.equal(new Set(keys).size, keys.length, 'a wall traced from both sides would double every segment');
});
