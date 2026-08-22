// shadowbox hydration runtime. Small and boring on purpose.
// An instrument is {name, defaults, posterState, controls, render, applyDrag}.
// mount() swaps an inline poster SVG for the live instrument and wires:
//   - declarative controls (sliders / toggles / actions) below the SVG
//   - pointer drags on [data-drag] elements, routed through instrument.applyDrag
//   - keyboard drags (tab to a handle, arrows nudge, shift = coarse)
// Pure helpers (createStore, controlsMarkup, clientToViewBox) are node-tested;
// DOM binding is exercised in the browser QA pass.

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

export function controlsMarkup(controls, state) {
  const parts = [];
  for (const c of controls) {
    // Controls that only make sense on synthetic data declare needsTruth.
    if (c.needsTruth && !state.truth) continue;
    // A truth toggle has nothing to show when the dataset carries no truth.
    if (c.id === 'showTruth' && !state.truth) continue;
    // The residual toggle only earns its place on dense data; sparse data always draws them.
    if (c.id === 'residuals' && (!state.xs || state.xs.length <= 60)) continue;
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

// Invert an affine screen CTM {a,b,c,d,e,f}: client px -> viewBox units.
export function clientToViewBox(m, cx, cy) {
  const det = m.a * m.d - m.b * m.c;
  const x = cx - m.e, y = cy - m.f;
  return { x: (m.d * x - m.c * y) / det, y: (m.a * y - m.b * x) / det };
}

export function mount(el, instrument, store, { actions = {}, overlay = {} } = {}) {
  const full = () => ({ ...store.get(), ...overlay });
  let dragging = null;          // {id, index} while a pointer drag is live
  let raf = 0;

  function markup() {
    const state = full();
    return `${instrument.render(state)}\n<div class="controls">${controlsMarkup(instrument.controls, state)}</div>`;
  }

  function bind() {
    const svg = el.querySelector('svg');
    if (!svg) return;

    // An instrument may export applyControl(state, id, value) to derive extra
    // state from a control change (e.g. the rho dial also rewrites sxy).
    const apply = (id, value) => {
      const partial = instrument.applyControl
        ? instrument.applyControl(full(), id, value)
        : { [id]: value };
      store.set(partial);
    };
    el.querySelectorAll('input[data-control]').forEach(input => {
      input.addEventListener('input', () => apply(input.dataset.control, Number(input.value)));
    });
    el.querySelectorAll('button[data-control]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.control;
        const cur = store.get()[id];
        const onVal = btn.dataset.on === 'true' ? true : btn.dataset.on === 'false' ? false : btn.dataset.on;
        const offVal = btn.dataset.off === 'true' ? true : btn.dataset.off === 'false' ? false : btn.dataset.off;
        apply(id, cur === onVal ? offVal : onVal);
      });
    });
    el.querySelectorAll('button[data-action]').forEach(btn => {
      btn.addEventListener('click', () => { const fn = actions[btn.dataset.action]; if (fn) fn(store); });
    });

    svg.addEventListener('pointerdown', ev => {
      const t = ev.target.closest('[data-drag]');
      if (!t) return;
      dragging = { id: t.dataset.drag, index: Number(t.dataset.index || 0) };
      svg.setPointerCapture(ev.pointerId);
      ev.preventDefault();
    });
    svg.addEventListener('pointermove', ev => {
      if (!dragging) return;
      const m = svg.getScreenCTM();
      if (!m) return;
      const p = clientToViewBox(m, ev.clientX, ev.clientY);
      store.set(instrument.applyDrag(full(), { ...dragging, x: p.x, y: p.y }));
    });
    const end = () => { dragging = null; };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);

    svg.addEventListener('keydown', ev => {
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
    // Preserve keyboard focus across the innerHTML swap.
    const focused = document.activeElement && el.contains(document.activeElement)
      ? { drag: document.activeElement.dataset?.drag, index: document.activeElement.dataset?.index }
      : null;
    el.innerHTML = markup();
    bind();
    if (focused && focused.drag) {
      const again = el.querySelector(`[data-drag="${focused.drag}"][data-index="${focused.index ?? 0}"]`)
        || el.querySelector(`[data-drag="${focused.drag}"]`);
      if (again) again.focus();
    }
  }

  store.subscribe(() => {
    if (raf) return;
    // rAF never fires in a hidden tab; fall back so state changes still land.
    const schedule = typeof document !== 'undefined' && document.hidden
      ? cb => setTimeout(cb, 16)
      : requestAnimationFrame;
    raf = schedule(() => { raf = 0; rerender(); });
  });

  rerender();
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
