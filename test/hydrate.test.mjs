import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, controlsMarkup, clientToViewBox } from '../js/lib/hydrate.mjs';
import { playTick, PLAY_FPS } from '../js/lib/hydrate.mjs';

test('store merges, notifies, respects silent', () => {
  const s = createStore({ a: 1, b: 2 });
  let seen = 0;
  s.subscribe(() => seen++);
  s.set({ a: 5 });
  assert.equal(s.get().a, 5); assert.equal(s.get().b, 2); assert.equal(seen, 1);
  s.set({ b: 9 }, { silent: true });
  assert.equal(seen, 1); assert.equal(s.get().b, 9);
});

test('controlsMarkup renders ranges, toggles, actions with current state', () => {
  const html = controlsMarkup([
    { id: 'slope', kind: 'slider', min: -3, max: 3, step: 0.01, label: 'slope' },
    { id: 'loss', kind: 'toggle', label: 'absolute error', on: 'absolute', off: 'squared' },
    { id: 'resample', kind: 'action', label: 'resample' },
  ], { slope: 1.5, loss: 'squared' });
  assert.match(html, /data-control="slope"[^>]*value="1.5"/);
  assert.match(html, /aria-pressed="false"/);
  assert.match(html, /data-action="resample"/);
});

test('controlsMarkup hides truth toggle when state.truth is null', () => {
  const controls = [{ id: 'showTruth', kind: 'toggle', label: 'show the true line', on: true, off: false }];
  assert.match(controlsMarkup(controls, { showTruth: false, truth: { slope: 1 } }), /data-control="showTruth"/);
  assert.equal(controlsMarkup(controls, { showTruth: false, truth: null }), '');
});

test('clientToViewBox inverts a scale+translate', () => {
  const m = { a: 2, b: 0, c: 0, d: 2, e: 10, f: 20 };
  const p = clientToViewBox(m, 10 + 2 * 7, 20 + 2 * 9);
  assert.ok(Math.abs(p.x - 7) < 1e-9 && Math.abs(p.y - 9) < 1e-9);
});

test('playTick gates the loop to the frame budget', () => {
  assert.equal(PLAY_FPS, 4);
  const gap = 1000 / PLAY_FPS;
  assert.equal(playTick(0, gap - 1, PLAY_FPS), false);
  assert.equal(playTick(0, gap, PLAY_FPS), true);
  assert.equal(playTick(0, gap + 1, PLAY_FPS), true);
});

test('playTick fires immediately on the first frame after Play is pressed', () => {
  // lastStep starts at -Infinity so the reader sees a move on the same tick they
  // clicked, rather than a quarter second of nothing.
  assert.equal(playTick(-Infinity, 0, PLAY_FPS), true);
});
