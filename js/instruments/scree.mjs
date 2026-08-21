// scree - how the spread is divided among the components, as bars that always
// carry their own number in text, plus the loadings that say what the first two
// components actually are. The bar is a picture of a number, never the only
// copy of it.
// The standardize toggle is where rung 2 comes home to roost: on raw fetal
// biometry the answer is dominated by whichever measurement happens to be
// numerically biggest (abdominal circumference, in millimetres); give every
// variable the same spread first and the same data answers differently. Neither
// answer is wrong. The units were a decision, and this is the decision showing.
// Pure: render(state) -> SVG string.

import { pca } from '../math/core.mjs';
import { colorCloud } from '../lib/cloud.mjs';
import { baseFor } from './cloud-ellipse.mjs';
import { F } from '../lib/frame.mjs';

export const name = 'scree';

export const defaults = {
  idKey: 'scree',
  columns: null,                      // [[...], [...]] one array per variable
  names: null,                        // ['BPD', 'HC', 'AC', 'FL']
  standardize: false,
  unit: '',                           // e.g. 'mm squared', printed with the total
  note: 'simulated data',
  sxx: 1.6, sxy: 0.84, syy: 0.9, seed: 5, n: 80,   // fallback 2-variable cloud
  labels: { title: 'how the spread divides up.' },
};

export const posterState = null;      // set per page in tools/poster.mjs

export const controls = [
  { id: 'standardize', kind: 'toggle', label: 'standardize each variable', on: true, off: false },
];

const W = 640, H = 460;
const LEFT = { x: 28, barX: 80, barW: 160, top: 74, height: 176 };
const PANEL = { x: 320, w: 300, rowH: 26, half: 90, zeroDx: 150 };

const num = (v, d = 2) => { const r = +v.toFixed(d); return (Object.is(r, -0) ? 0 : r).toFixed(d); };
const signed = v => `${v >= 0 ? '+' : ''}${num(v)}`;
const big = v => (Math.abs(v) >= 1000 ? String(Math.round(v)) : num(v));

export function columnsOf(state) {
  const st = { ...defaults, ...state };
  if (st.columns && st.columns.length >= 2) {
    const names = st.names && st.names.length === st.columns.length
      ? st.names : st.columns.map((_, i) => `v${i + 1}`);
    return { cols: st.columns, names };
  }
  const { xs, ys } = colorCloud(baseFor(st.seed, st.n), st.sxx, st.sxy, st.syy);
  return { cols: [xs, ys], names: st.names && st.names.length === 2 ? st.names : ['x', 'y'] };
}

export function stats(state) {
  const st = { ...defaults, ...state };
  const { cols, names } = columnsOf(st);
  const X = cols[0].map((_, i) => cols.map(c => c[i]));
  const out = pca(X, { standardize: st.standardize === true });
  const total = out.values.reduce((a, b) => a + b, 0);
  return { ...out, names, total, p: cols.length, standardized: st.standardize === true };
}

// A factual reading of one component's loadings: which variables lead it, and
// whether they pull together or against each other. The interpretation belongs
// to the prose; this only reports what the numbers say.
export function loadingCaption(vector, names, cut = 0.2) {
  const maxAbs = vector.reduce((t, v) => Math.max(t, Math.abs(v)), 0) || 1;
  const lead = vector.map((v, j) => ({ v, name: names[j] })).filter(o => Math.abs(o.v) >= cut * maxAbs);
  const pos = lead.filter(o => o.v > 0).map(o => o.name);
  const neg = lead.filter(o => o.v < 0).map(o => o.name);
  if (!pos.length || !neg.length) return `every variable the same sign`;
  return `mainly ${pos.join(', ')} against ${neg.join(', ')}`;
}

function loadingPanel(id, vector, names, py, title) {
  const px = PANEL.x, zx = px + PANEL.zeroDx;
  const parts = [];
  parts.push(`<text x="${px}" y="${py + 12}" font-size="12.5" fill="var(--heading)">${title}</text>`);
  const top = py + 24;
  parts.push(`<line x1="${zx}" y1="${top}" x2="${zx}" y2="${top + vector.length * PANEL.rowH}" stroke="var(--border)" stroke-width="1.5"/>`);
  parts.push(`<text x="${zx}" y="${top - 3}" text-anchor="middle" font-size="10" fill="var(--text-light)">0</text>`);
  for (let j = 0; j < vector.length; j++) {
    const v = vector[j];
    const cy = top + j * PANEL.rowH + PANEL.rowH / 2;
    const w = Math.max(Math.abs(v) * PANEL.half, 1.5);
    const x = v >= 0 ? zx : zx - w;
    parts.push(`<text x="${px + 40}" y="${F(cy + 4)}" text-anchor="end" font-size="12" fill="var(--text)">${names[j]}</text>`);
    parts.push(`<rect data-role="loading" data-sign="${v >= 0 ? 'pos' : 'neg'}" x="${F(x)}" y="${F(cy - 7)}" width="${F(w)}" height="14" fill="url(#${id(v >= 0 ? 'up' : 'down')})" stroke="var(--ink)" stroke-width="1.75"/>`);
    parts.push(`<text data-role="loading-value" x="${px + PANEL.w - 2}" y="${F(cy + 4)}" text-anchor="end" font-size="12" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--heading)">${signed(v)}</text>`);
  }
  return { markup: parts.join('\n'), bottom: top + vector.length * PANEL.rowH };
}

export function render(state) {
  const st = { ...defaults, ...state };
  const { idKey, labels } = st;
  const id = s => `sb-${idKey}-${s}`;
  const S = stats(st);
  const p = S.p;
  const parts = [];

  parts.push(`<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" font-family="'IBM Plex Sans', Arial, sans-serif">`);
  parts.push(`<title>Variance explained by each principal component as labelled bars, with the loadings of the first two components shown as signed bars per variable, and a toggle between raw and standardized variables.</title>`);
  parts.push(`<defs>`
    + `<pattern id="${id('screen')}" width="5" height="5" patternUnits="userSpaceOnUse"><circle cx="2.5" cy="2.5" r="1.2" fill="var(--ink)"/></pattern>`
    + `<pattern id="${id('up')}" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M2.5 0v5" stroke="var(--ink)" stroke-width="1.4"/></pattern>`
    + `<pattern id="${id('down')}" width="5" height="5" patternUnits="userSpaceOnUse"><path d="M0 2.5h5" stroke="var(--ink)" stroke-width="1.4"/></pattern>`
    + `</defs>`);

  parts.push(`<text x="${LEFT.x}" y="26" font-size="14" fill="var(--text)" font-family="'IBM Plex Serif', Georgia, serif" font-style="italic">${labels.title}</text>`);
  parts.push(`<text data-role="mode" x="${W - 20}" y="26" text-anchor="end" font-size="12" fill="var(--heading)">${S.standardized ? 'standardized' : 'raw units'}</text>`);
  parts.push(`<text x="${LEFT.x}" y="52" font-size="11" fill="var(--text-light)">share of total variance, written out</text>`);

  // scree bars: length is the picture, the percentage is the fact
  const rowH = Math.min(56, LEFT.height / p);
  const top = LEFT.top + (LEFT.height - rowH * p) / 2;
  const barH = Math.min(26, rowH - 16);
  for (let i = 0; i < p; i++) {
    const cy = top + i * rowH + rowH / 2;
    const w = Math.max(S.explained[i] * LEFT.barW, 2);
    parts.push(`<text x="${LEFT.x}" y="${F(cy + 4)}" font-size="12.5" fill="var(--heading)">PC${i + 1}</text>`);
    parts.push(`<rect data-role="bar" data-pc="${i + 1}" x="${LEFT.barX}" y="${F(cy - barH / 2)}" width="${F(w)}" height="${barH}" fill="url(#${id('screen')})" stroke="var(--ink)" stroke-width="2"/>`);
    parts.push(`<text data-role="pct" x="${F(LEFT.barX + w + 8)}" y="${F(cy + 4)}" font-size="13" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--heading)">${(100 * S.explained[i]).toFixed(2)}%</text>`);
    parts.push(`<text data-role="eigenvalue" x="${LEFT.x}" y="${F(cy + 18)}" font-size="10" fill="var(--text-light)">var ${big(S.values[i])}</text>`);
  }

  const totalUnit = S.standardized ? ' (one per variable, by construction)' : (st.unit ? ` (${st.unit})` : '');
  parts.push(`<text data-role="total" x="${LEFT.x}" y="${F(LEFT.top + LEFT.height + 30)}" font-size="12" font-family="'IBM Plex Mono', Consolas, monospace" fill="var(--heading)">total = ${big(S.total)}${totalUnit}</text>`);
  parts.push(`<text x="${LEFT.x}" y="${F(LEFT.top + LEFT.height + 48)}" font-size="11" fill="var(--text-light)">${S.standardized ? 'each variable rescaled to spread 1' : 'each variable in its own units'}</text>`);
  if (st.note) parts.push(`<text data-role="note" x="${LEFT.x}" y="${H - 14}" font-size="11" fill="var(--text-light)">${st.note}</text>`);

  // what the first two components are made of
  const pct = i => `${(100 * S.explained[i]).toFixed(2)}%`;
  const one = loadingPanel(id, S.vectors[0], S.names, 58, `PC1 weights, ${pct(0)} of the spread`);
  parts.push(one.markup);
  parts.push(`<text data-role="caption-pc1" x="${PANEL.x}" y="${F(one.bottom + 16)}" font-size="11.5" fill="var(--text)">${loadingCaption(S.vectors[0], S.names)}</text>`);

  const twoTop = one.bottom + 40;
  const two = loadingPanel(id, S.vectors[1], S.names, twoTop, `PC2 weights, ${pct(1)} of the spread`);
  parts.push(two.markup);
  parts.push(`<text data-role="caption-pc2" x="${PANEL.x}" y="${F(two.bottom + 16)}" font-size="11.5" fill="var(--text)">${loadingCaption(S.vectors[1], S.names)}</text>`);

  parts.push(`<text x="${PANEL.x}" y="${F(two.bottom + 40)}" font-size="10.5" fill="var(--text-light)">bar direction and the printed sign both carry the sign;</text>`);
  parts.push(`<text x="${PANEL.x}" y="${F(two.bottom + 54)}" font-size="10.5" fill="var(--text-light)">a component may be flipped whole, so only the split means anything.</text>`);

  parts.push(`</svg>`);
  return parts.join('\n');
}

export function applyDrag() { return {}; }
