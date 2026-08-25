import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStore, controlsMarkup, clientToViewBox } from '../js/lib/hydrate.mjs';
import { playTick, PLAY_FPS, mount, updateControls } from '../js/lib/hydrate.mjs';

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

test('the Play loop never leaves the same callback scheduled twice', () => {
  // The scheduling slice of the loop is cheaply testable in node even though the
  // rest of mount is not: it only references requestAnimationFrame and document,
  // so stubbing those two exercises the real pump and maybePlay. Worth having,
  // because the bug this pins produces no visible symptom - lastStep is shared,
  // so the step rate stays correct while pending callbacks pile up - and a
  // browser QA pass would not have caught it.
  const pending = [];
  const g = globalThis;
  const savedRaf = g.requestAnimationFrame, savedDoc = g.document;
  g.requestAnimationFrame = fn => pending.push(fn);
  g.document = { hidden: false, activeElement: null };
  try {
    const el = {
      innerHTML: '', querySelector: () => null, querySelectorAll: () => [], contains: () => false,
      // mount() now wires drag listeners onto el itself, once, regardless of
      // whether this instrument ever drags anything (it does not: no step
      // above touches applyDrag). Needed so bindDrag() has something to call.
      addEventListener: () => {}, setPointerCapture: () => {},
    };
    const store = createStore({ play: true, i: 0 });
    mount(el, {
      controls: [], render: () => '<svg></svg>', applyDrag: () => ({}),
      step: s => ({ i: s.i + 1 }),
    }, store);
    for (const now of [0, 300, 600, 900, 1200]) {
      for (const fn of pending.splice(0, pending.length)) fn(now);
      // pump is one stable reference; each rerender wrapper is a fresh closure.
      // So a repeated reference is precisely a double-scheduled pump.
      const seen = new Map();
      for (const fn of pending) seen.set(fn, (seen.get(fn) || 0) + 1);
      const worst = Math.max(0, ...seen.values());
      assert.ok(worst <= 1, `at ${now}ms one callback is scheduled ${worst} times over`);
    }
  } finally {
    g.requestAnimationFrame = savedRaf;
    g.document = savedDoc;
  }
});

test('pointer and keyboard drag listeners live on the container, attached exactly once, never on the replaceable svg', () => {
  // Mobile drag bug, cause 1: rerender() does el.innerHTML = markup() every
  // frame, so a listener attached to the <svg> (or to any [data-drag] handle
  // inside it) dies with that node about one frame into a touch drag. el -
  // the mount() container - is the only node that never gets replaced, only
  // its contents do. Two stub objects stand in for "the node that survives"
  // and "the node that gets thrown away every render", so a listener landing
  // on the wrong one is visible directly, with no DOM required.
  const g = globalThis;
  const savedDoc = g.document;
  g.document = { activeElement: null };
  try {
    const svgStub = { listeners: [], addEventListener: t => svgStub.listeners.push(t) };
    const controlsStub = { querySelectorAll: () => [] };
    const el = {
      innerHTML: '',
      listeners: [],
      addEventListener: t => el.listeners.push(t),
      querySelector: sel => sel === 'svg' ? svgStub : sel === '.controls' ? controlsStub : null,
      querySelectorAll: () => [],
      contains: () => false,
      setPointerCapture: () => {},
    };
    const store = createStore({ x: 0 });
    const { rerender } = mount(el, { controls: [], render: () => '<svg></svg>', applyDrag: () => ({}) }, store);

    // Several rerenders - standing in for several frames of a drag, or several
    // slider ticks. Bind-once matters as much as bind-where: a listener
    // reattached on every rerender would stack a duplicate on the one node
    // that never gets torn down.
    for (let i = 0; i < 5; i++) rerender();

    const DRAG_TYPES = ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'keydown'];
    for (const type of DRAG_TYPES) {
      const count = el.listeners.filter(t => t === type).length;
      assert.equal(count, 1, `expected exactly one ${type} listener on the container, saw ${count}`);
    }
    assert.deepEqual(svgStub.listeners, [], 'no drag listener should live on the svg that innerHTML replaces');
  } finally {
    g.document = savedDoc;
  }
});

test('shadowbox.css declares touch-action: none on drag handles and range inputs', () => {
  // Mobile drag bug, cause 2: with no touch-action declared, every drag target
  // computes to "auto", so once a touch capture lapses (cause 1, above, or
  // simply a slow finger) the browser's scroll-gesture recognizer claims the
  // touch instead. Crude to test by reading the stylesheet as text, but it is
  // the one thing standing between this bug and its return.
  const css = readFileSync(new URL('../css/shadowbox.css', import.meta.url), 'utf8');

  const dragRule = css.match(/svg\s*\[data-drag\]\s*\{([^}]*)\}/);
  assert.ok(dragRule, 'expected a "svg [data-drag]" rule in shadowbox.css');
  assert.match(dragRule[1], /touch-action:\s*none/);

  const rangeRule = css.match(/\.controls\s+input\[type="range"\]\s*\{([^}]*)\}/);
  assert.ok(rangeRule, 'expected a ".controls input[type=\"range\"]" rule in shadowbox.css');
  assert.match(rangeRule[1], /touch-action:\s*none/);
});

test('updateControls updates existing nodes in place when the control set is unchanged', () => {
  // Mobile drag bug, cause 1 (the slider-specific half): a native range-input
  // drag is bound to the exact DOM node it started on. The old code rebuilt
  // the whole .controls block - a fresh el.innerHTML - on every value change,
  // so the slider a reader had their finger on stopped existing mid-drag. The
  // fix updates the surviving node's value in place instead, and only rebuilds
  // when a control actually appears or disappears (needsTruth / showTruth /
  // residuals in controlsMarkup).
  const controls = [
    { id: 'slope', kind: 'slider', min: -3, max: 3, step: 0.01, label: 'slope' },
    { id: 'showTruth', kind: 'toggle', label: 'show the true line', on: true, off: false },
  ];
  const slider = { dataset: { control: 'slope' }, value: '1.5' };
  const toggle = { dataset: { control: 'showTruth' }, attrs: {}, setAttribute(name, v) { this.attrs[name] = v; } };
  const container = { innerHTML: 'sentinel-untouched', querySelectorAll: () => [slider, toggle] };

  const updatedInPlace = updateControls(container, controls, { slope: 2.25, showTruth: true, truth: { a: 1 } });

  assert.equal(updatedInPlace, true);
  assert.equal(slider.value, '2.25', 'the existing slider node\'s value was updated');
  assert.equal(toggle.attrs['aria-pressed'], 'true', 'the existing toggle node was updated');
  assert.equal(container.innerHTML, 'sentinel-untouched', 'the container was never rebuilt');
});

test('updateControls signals a rebuild when a control appears or disappears, and touches nothing itself', () => {
  const controls = [
    { id: 'slope', kind: 'slider', min: -3, max: 3, step: 0.01, label: 'slope' },
    { id: 'residuals', kind: 'toggle', label: 'show the squares', on: true, off: false },
  ];
  const slider = { dataset: { control: 'slope' }, value: '0' };
  const residuals = { dataset: { control: 'residuals' }, attrs: {}, setAttribute(name, v) { this.attrs[name] = v; } };
  const container = { innerHTML: 'sentinel-untouched', querySelectorAll: () => [slider, residuals] };

  // residuals only shows for dense data (xs.length > 60, see visibleControls);
  // 10 points gates it out, so the visible set shrinks from 2 controls to 1.
  const rebuildNeeded = updateControls(container, controls, { slope: 1, residuals: true, xs: new Array(10) });

  assert.equal(rebuildNeeded, false, 'a changed control set must signal a rebuild');
  assert.equal(container.innerHTML, 'sentinel-untouched', 'updateControls itself never rebuilds - the caller does');
  assert.equal(slider.value, '0', 'nothing gets touched once a mismatch is found');
});
