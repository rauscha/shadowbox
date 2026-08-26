// shadowbox hydration runtime. Small and boring on purpose.
// An instrument is {name, defaults, posterState, controls, render, applyDrag}.
// mount() swaps an inline poster SVG for the live instrument and wires:
//   - declarative controls (sliders / toggles / actions) below the SVG
//   - pointer drags on [data-drag] elements, routed through instrument.applyDrag
//   - keyboard drags (tab to a handle, arrows nudge, shift = coarse)
// Pure helpers (createStore, controlsMarkup, visibleControls, updateControls,
// clientToViewBox, playTick) are node-tested; DOM binding is exercised in the
// browser QA pass.
//
// rerender() calls instrument.render(state) on every state change, which hands
// back a whole new <svg> string - every frame is a full re-render (see
// PLAY_FPS below), and nothing here diffs it against the last one. That means
// the <svg> element itself, and anything inside it, is a different node after
// every render. So the pointer and keyboard drag listeners live on el - the
// mount() container, the one node that is never replaced, only its contents
// are - and are attached exactly once, not inside a function that runs on
// every render. Anything that needs the current svg (getScreenCTM for a drag,
// getBBox for a keyboard nudge) looks it up live via el.querySelector('svg')
// rather than closing over a reference, because a closed-over one goes stale
// the moment the next render lands. Native <input type="range"> drags are the
// one exception this file cannot delegate its way out of: the browser binds
// that drag to the specific node, so the controls block is the one part of
// markup() that is updated in place rather than rebuilt on every render -
// see updateControls.

export function createStore(initial) {
  let state = { ...initial };
  const subs = new Set();
  return {
    get: () => state,
    set(partial, { silent = false } = {}) {
      state = { ...state, ...partial };
      if (!silent) for (const fn of subs) fn(state);
    },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
  };
}

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

// The control descriptors that actually render for a given state, in render
// order. Shared by controlsMarkup (first render, poster hand-run scripts) and
// updateControls (every render after that), so the two cannot disagree about
// what "the same set of controls" means: the kind check below keeps this
// filter's output restricted to exactly the kinds controlsMarkup knows how to
// render, so the two always produce the same count for the same input.
export function visibleControls(controls, state) {
  return controls.filter(c => {
    // Keep this in sync with the kinds controlsMarkup renders below. A kind
    // neither of them recognizes must be invisible to both, or visibleControls
    // would count a control that never gets a DOM node, updateControls would
    // never find enough nodes to match it, and the controls block would
    // rebuild on every single render forever - silently reintroducing the
    // exact bug this file exists to fix, for just that one instrument.
    if (!['slider', 'toggle', 'action'].includes(c.kind)) return false;
    // Controls that only make sense on synthetic data declare needsTruth.
    if (c.needsTruth && !state.truth) return false;
    // A truth toggle has nothing to show when the dataset carries no truth.
    if (c.id === 'showTruth' && !state.truth) return false;
    // The residual toggle only earns its place on dense data; sparse data always draws them.
    if (c.id === 'residuals' && (!state.xs || state.xs.length <= 60)) return false;
    return true;
  });
}

export function controlsMarkup(controls, state) {
  const parts = [];
  for (const c of visibleControls(controls, state)) {
    if (c.kind === 'slider') {
      parts.push(`<label>${esc(c.label)}<input type="range" data-control="${c.id}" min="${c.min}" max="${c.max}" step="${c.step}" value="${state[c.id]}"></label>`);
    } else if (c.kind === 'toggle') {
      const pressed = state[c.id] === c.on;
      parts.push(`<button type="button" data-control="${c.id}" data-on="${esc(c.on)}" data-off="${esc(c.off)}" aria-pressed="${pressed}">${esc(c.label)}</button>`);
    } else if (c.kind === 'action') {
      parts.push(`<button type="button" data-action="${c.id}">${esc(c.label)}</button>`);
    }
  }
  return parts.join('\n');
}

// Updates an already-rendered .controls container's nodes in place when the
// visible control set (which ids, which kinds, in what order) has not
// changed - only a control's *value* moves on most renders, and the node
// carrying it is exactly what a native range-input drag is bound to. Returns
// true when it updated in place. Returns false, having touched nothing, when
// a control has appeared, disappeared, or reordered - the caller must rebuild
// via controlsMarkup in that case, same as it always has.
export function updateControls(container, controls, state) {
  const visible = visibleControls(controls, state);
  const nodes = container.querySelectorAll('[data-control],[data-action]');
  if (nodes.length !== visible.length) return false;

  // Keyed on kind as well as id, not just id: a slider and a toggle both carry
  // data-control, and a repeated id with a different kind (never seen today,
  // but nothing forbids it in a future instrument) must count as a mismatch
  // rather than matching a <button> against a slider descriptor and writing
  // .value onto it. The node's own kind comes from its tag, since a plain
  // object has no dataset.kind to read.
  const keyOf = c => `${c.kind}:${c.id}`;
  const nodeKeyOf = n => {
    if (n.dataset.action) return `action:${n.dataset.action}`;
    return `${n.tagName === 'INPUT' ? 'slider' : 'toggle'}:${n.dataset.control}`;
  };
  for (let i = 0; i < visible.length; i++) {
    if (nodeKeyOf(nodes[i]) !== keyOf(visible[i])) return false;
  }

  for (let i = 0; i < visible.length; i++) {
    const c = visible[i], node = nodes[i];
    if (c.kind === 'slider') {
      node.value = String(state[c.id]);
    } else if (c.kind === 'toggle') {
      node.setAttribute('aria-pressed', String(state[c.id] === c.on));
    }
    // action buttons carry no per-render state to sync.
  }
  return true;
}

// Invert an affine screen CTM {a,b,c,d,e,f}: client px -> viewBox units.
export function clientToViewBox(m, cx, cy) {
  const det = m.a * m.d - m.b * m.c;
  const x = cx - m.e, y = cy - m.f;
  return { x: (m.d * x - m.c * y) / det, y: (m.a * y - m.b * x) / det };
}

// Play is capped rather than free-running: render returns a whole SVG string, so
// every frame is a full re-render, and the algorithm converges in about ten
// iterations anyway. Pure so it can be node-tested; the loop that calls it is
// DOM and is exercised in the browser QA pass.
export const PLAY_FPS = 4;
export function playTick(lastMs, nowMs, fps) { return nowMs - lastMs >= 1000 / fps; }

export function mount(el, instrument, store, { actions = {}, overlay = {} } = {}) {
  const full = () => ({ ...store.get(), ...overlay });
  let dragging = null;          // {id, index} while a pointer drag is live
  let raf = 0;
  let playRaf = 0, lastStep = -Infinity;

  function markup() {
    const state = full();
    return `${instrument.render(state)}\n<div class="controls">${controlsMarkup(instrument.controls, state)}</div>`;
  }

  // Attaches listeners to whatever is currently inside controlsEl. Called only
  // right after those nodes were just built (first render, or a controls
  // rebuild below) - never on an in-place value update, because those nodes
  // already carry listeners from the render that created them; reattaching on
  // every render would stack a second, third, ... handler on any control a
  // reader never stops touching. Scoped to controlsEl rather than el: no
  // instrument's SVG emits [data-control] or [data-action] today, but if one
  // ever did, querying el would both re-listen it on every controls rebuild
  // and silently drop its listener on every in-place update (the SVG is
  // replaced by outerHTML on a path that never calls this function again).
  function bindControls(controlsEl) {
    // An instrument may export applyControl(state, id, value) to derive extra
    // state from a control change (e.g. the rho dial also rewrites sxy).
    const apply = (id, value) => {
      const partial = instrument.applyControl
        ? instrument.applyControl(full(), id, value)
        : { [id]: value };
      store.set(partial);
    };
    controlsEl.querySelectorAll('input[data-control]').forEach(input => {
      input.addEventListener('input', () => apply(input.dataset.control, Number(input.value)));
    });
    controlsEl.querySelectorAll('button[data-control]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.control;
        const cur = store.get()[id];
        const onVal = btn.dataset.on === 'true' ? true : btn.dataset.on === 'false' ? false : btn.dataset.on;
        const offVal = btn.dataset.off === 'true' ? true : btn.dataset.off === 'false' ? false : btn.dataset.off;
        apply(id, cur === onVal ? offVal : onVal);
      });
    });
    controlsEl.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => { const fn = actions[btn.dataset.action]; if (fn) fn(store); });
    });
  }

  // Pointer and keyboard drag listeners live on el and are attached exactly
  // once, here, never inside rerender() or bindControls(). el is the only
  // node mount() never replaces (see the file header): a listener attached to
  // the svg itself, or reattached on every render, is the mobile drag bug.
  function bindDrag() {
    el.addEventListener('pointerdown', ev => {
      const t = ev.target.closest('[data-drag]');
      if (!t) return;
      dragging = { id: t.dataset.drag, index: Number(t.dataset.index || 0) };
      try {
        el.setPointerCapture(ev.pointerId);
      } catch {
        // The browser can refuse a pointer id it does not consider active
        // (real-world: none observed; reproduced only by a synthetically
        // dispatched PointerEvent in testing). dragging is already set above,
        // so the drag still proceeds through the delegated pointermove on el
        // either way - this only keeps preventDefault below from being
        // skipped by a throw it has nothing to do with.
      }
      ev.preventDefault();
    });
    el.addEventListener('pointermove', ev => {
      if (!dragging) return;
      // Looked up live, not closed over: the svg render() handed back last
      // frame is not the one that exists now.
      const svg = el.querySelector('svg');
      const m = svg && svg.getScreenCTM();
      if (!m) return;
      const p = clientToViewBox(m, ev.clientX, ev.clientY);
      store.set(instrument.applyDrag(full(), { ...dragging, x: p.x, y: p.y }));
    });
    const end = () => { dragging = null; };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);

    el.addEventListener('keydown', ev => {
      const t = ev.target.closest('[data-drag]');
      if (!t) return;
      const step = ev.shiftKey ? 16 : 4;
      const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[ev.key];
      if (!d) return;
      ev.preventDefault();
      const box = t.getBBox();
      const cx = box.x + box.width / 2 + d[0];
      const cy = box.y + box.height / 2 + d[1];
      store.set(instrument.applyDrag(full(), { id: t.dataset.drag, index: Number(t.dataset.index || 0), x: cx, y: cy }));
    });
  }

  function rerender() {
    // Preserve keyboard focus across whatever DOM surgery happens below.
    const focused = document.activeElement && el.contains(document.activeElement)
      ? { drag: document.activeElement.dataset?.drag, index: document.activeElement.dataset?.index }
      : null;

    const state = full();
    const controlsEl = el.querySelector('.controls');
    if (!controlsEl) {
      // Nothing built yet (the very first render: el still holds only the
      // static poster svg). Build both halves and wire the controls that just
      // appeared.
      el.innerHTML = markup();
      bindControls(el.querySelector('.controls'));
    } else {
      // instrument.render always hands back a whole new <svg> string (see the
      // file header), so the svg keeps being replaced every render - that
      // part of the bug is fixed by bindDrag() above, not by preserving this
      // node. Only .controls gets the cheaper path: same control set updates
      // in place (this is what lets a mid-drag <input type="range"> survive
      // its own oninput-triggered rerender); a changed set rebuilds and
      // rebinds, same as it always has.
      const svgEl = el.querySelector('svg');
      if (svgEl) svgEl.outerHTML = instrument.render(state);
      if (!updateControls(controlsEl, instrument.controls, state)) {
        controlsEl.innerHTML = controlsMarkup(instrument.controls, state);
        bindControls(controlsEl);
      }
    }

    if (focused && focused.drag) {
      const again = el.querySelector(`[data-drag="${focused.drag}"][data-index="${focused.index ?? 0}"]`)
        || el.querySelector(`[data-drag="${focused.drag}"]`);
      if (again) again.focus();
    }
  }

  // An instrument may export step(state) -> partial state. If it does, mount
  // drives it while state.play is true. Instruments without step never enter
  // this path, which is what makes the contract change additive.
  //
  // Exhaustion is signalled by step() returning an empty partial, not by mount
  // reading a state field. mount must not know what "converged" means for any
  // particular instrument: lesson 5 will drive a precomputed frame index through
  // this same loop, and it runs out of frames rather than converging.
  function pump(now) {
    playRaf = 0;
    const s = full();
    if (!s.play || !instrument.step) return;
    if (playTick(lastStep, now, PLAY_FPS)) {
      lastStep = now;
      const next = instrument.step(s);
      if (!next || !Object.keys(next).length) { store.set({ play: false }); return; }
      store.set(next);
    }
    // Guarded, and the guard is load-bearing. store.set notifies synchronously,
    // the subscriber calls maybePlay, and playRaf is still 0 at that moment, so
    // maybePlay schedules the next frame. Assigning unconditionally here would
    // overwrite that schedule without cancelling it, leaving two pump callbacks
    // pending and one more on every tick after. It has no visible symptom, since
    // lastStep is shared and the step rate stays correct, which is exactly why
    // it needs a test rather than a browser pass.
    if (!playRaf) playRaf = requestAnimationFrame(pump);
  }
  function maybePlay() {
    if (!playRaf && instrument.step && full().play) playRaf = requestAnimationFrame(pump);
  }

  store.subscribe(() => {
    maybePlay();
    if (raf) return;
    // rAF never fires in a hidden tab; fall back so state changes still land.
    const schedule = typeof document !== 'undefined' && document.hidden
      ? cb => setTimeout(cb, 16)
      : requestAnimationFrame;
    raf = schedule(() => { raf = 0; rerender(); });
  });

  bindDrag();
  rerender();
  maybePlay();
  return { rerender };
}

// Collapsibles are optional on screen and part of the text on paper. CSS alone
// cannot reliably force a closed <details> open for printing, so open them at
// beforeprint and put them back afterwards.
if (typeof window !== 'undefined') {
  window.addEventListener('beforeprint', () => {
    for (const d of document.querySelectorAll('details:not([open])')) {
      d.dataset.printOpened = '1';
      d.open = true;
    }
  });
  window.addEventListener('afterprint', () => {
    for (const d of document.querySelectorAll('details[data-print-opened]')) {
      d.open = false;
      delete d.dataset.printOpened;
    }
  });
}
