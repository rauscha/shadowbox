# shadowbox M1+M2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Repo skeleton, tested math core with numpy-pinned fixtures, and a live rung 1 (least-squares essay with linked fit-scatter + loss-bowl instruments, staged synthetic→clinical data, committed poster frames).

**Architecture:** Pure-static site; each instrument is a pure `render(state) -> SVG string` + declarative `controls` + pure `applyDrag(state, drag)` in one `.mjs` module; a small hydration runtime mounts instruments, builds controls, and routes pointer/keyboard drags; a hand-run poster script injects committed SVG poster frames between HTML comment markers.

**Tech Stack:** Vanilla ES modules, `node --test` (Node 24 builtin), Python+numpy (hand-run, fixtures only), GitHub Pages. Zero runtime dependencies, no `node_modules`, no build step.

**Spec:** `docs/superpowers/specs/2026-08-20-shadowbox-design.md`

## Global Constraints

- No runtime dependencies, no `node_modules`, no build pipeline; hand-run scripts with committed output only.
- All JS as ES modules (`.mjs`); pages load via `<script type="module">`; preview with `python -m http.server 8000` (file:// will not work).
- Tests: `node --test` only. Reference truth: `reference/fixtures.py` → committed `test/fixtures.json`, regenerated only by hand (`uv run --with numpy python reference/fixtures.py`).
- **Statistics convention: sample statistics everywhere (n−1), matching `np.cov`/`np.var(ddof=1)`.**
- **Eigenvector sign convention: largest-magnitude component positive; all vector comparisons compare directions, not signs.**
- **Colorblind rules (hard):** no meaning on hue alone; no translucent fills for meaning; dots = magnitude, stripe orientation = direction, heavy outline = structure; surfaces = quantized viridis + drawn contour lines; direct labels, never color-keyed legends.
- **SVG id discipline:** every `id` inside an instrument's SVG is prefixed `sb-${state.idKey}-…` (`idKey` defaults to instrument name). Two instances of one instrument on one page MUST get distinct `idKey`s.
- Poster markers in HTML: `<!-- poster:KEY -->…<!-- /poster:KEY -->`; injection must be idempotent.
- Commit after every task; `main` is the working branch; no PRs.

---

### Task 1: Repo scaffold (CLAUDE.md, .gitignore, tokens CSS, index stub)

**Files:**
- Create: `CLAUDE.md`, `.gitignore`, `css/shadowbox.css`, `index.html`

**Interfaces:**
- Produces: CSS custom properties consumed by all pages: `--bg --surface --border --text --text-light --heading --accent --accent-warm --ink` (light + dark values); classes `.essay`, `.instrument`, `.controls`, `.readout`, `details.from-zero`.

- [ ] **Step 1: Write `.gitignore`**

```
__pycache__/
.DS_Store
```

- [ ] **Step 2: Write `CLAUDE.md`**

```markdown
# shadowbox

Interactive visual statistics explainers (least squares → PCA → UMAP), pure static,
served at andrewrausch.com/shadowbox/. Spec: docs/superpowers/specs/.

## Rules
- Solo dev. `main` is the working branch; push means push `main`; no PRs.
- Zero runtime dependencies, no node_modules, no build step. Hand-run scripts with
  committed output only (`tools/poster.mjs`, `reference/fixtures.py`).
- Tests: `node --test` (Node 24). Fixtures: `uv run --with numpy python reference/fixtures.py`.
- Preview: `python -m http.server 8000` (ES modules — file:// won't work).
- Owner is colorblind: no meaning on hue alone, ever. Dots carry magnitude, stripe
  orientation carries direction, heavy outline carries structure; surfaces are
  quantized viridis + drawn contours. No translucent fills for meaning.
- Every SVG id is prefixed `sb-${idKey}-`; unique idKey per instrument instance per page.
- Posters: `node tools/poster.mjs` regenerates figures/ and re-injects into pages
  between `<!-- poster:KEY -->` markers (idempotent). Run after changing any instrument.
```

- [ ] **Step 3: Write `css/shadowbox.css`** — parent-site token values copied (light: bg `#fbfcfd`, surface `#eef1f4`, border `#d9dee4`, text `#3b4252`, text-light `#5a6270`, heading `#0d121b`, accent `#1e4a7a`, accent-warm `#c1272d`; dark: bg `#0e1116`, surface `#181d26`, border `#2a3340`, text `#b8bdc7`, text-light `#8d95a3`, heading `#eef1f5`, accent lightened `#7ea9d8`, accent-warm `#e06a6f`), `--ink` = `#1a1f2b` light / `#dfe4ec` dark (the halftone ink). IBM Plex via Google Fonts `<link>` in pages, stacks `'IBM Plex Serif', Georgia, serif` (essay), `'IBM Plex Sans', Arial, sans-serif` (UI), `'IBM Plex Mono', Consolas, monospace` (readouts). Layout: `.essay{max-width:44rem;margin:0 auto;padding:2rem 1.25rem;font-family:var(--font-serif);line-height:1.65}`; `.instrument{margin:2rem 0}` with `svg{width:100%;height:auto;display:block}`; `.controls` = flex row of labeled ranges/buttons (sans, 0.85rem); `.readout{font-family:var(--font-mono)}`; `details.from-zero` = bordered summary block; visible `:focus-visible{outline:3px solid var(--accent);outline-offset:2px}`; `@media print` hides `.controls`.

- [ ] **Step 4: Write `index.html`** — head boilerplate (charset, viewport, title `shadowbox`, description, Plex fonts link, stylesheet), `.essay` body: h1 `shadowbox`, tagline paragraph: *"Every method here casts a shadow of the data and asks you to judge the object from it. These pages let you move the light."* Rung list: link `least-squares.html` (“1 · Least squares — what ‘best fit’ buys you”), unlinked li items for rung 2 (covariance) and rung 3 (PCA) marked “coming”. Footer line: “Andrew Rausch · part of andrewrausch.com”.

- [ ] **Step 5: Verify + commit**

Run: `python -m http.server 8000` → open `http://localhost:8000/` — tokens render, dark mode flips with OS setting.
```bash
git add -A && git commit -m "scaffold: tokens, index stub, repo rules"
```

---

### Task 2: math core — stats, OLS, loss surface (TDD)

**Files:**
- Create: `js/math/core.mjs`, `test/math.test.mjs`

**Interfaces:**
- Produces (exact signatures, consumed by everything later):
  `mean(xs)`, `variance(xs)`, `sd(xs)`, `covariance(xs,ys)`, `corr(xs,ys)`, `standardize(xs)`,
  `sse(xs,ys,slope,intercept)`, `sae(xs,ys,slope,intercept)`,
  `ols(xs,ys) -> {slope,intercept,residuals,sse}`,
  `lossSurface(xs,ys,{s0,s1,b0,b1,n=48,loss='squared'}) -> {values,min,max,minAt:[slope,intercept],s0,s1,b0,b1,n}` (values[j][i], j=intercept row, i=slope col).

- [ ] **Step 1: Write failing hand-computable tests**

```js
// test/math.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as M from '../js/math/core.mjs';

const close = (a, b, tol = 1e-12) => assert.ok(Math.abs(a - b) < tol, `${a} !~ ${b}`);

test('sample stats on tiny exact cases', () => {
  close(M.mean([1, 2, 3]), 2);
  close(M.variance([1, 2, 3]), 1);            // sample, n-1
  close(M.sd([1, 2, 3]), 1);
  close(M.covariance([1, 2, 3], [2, 4, 6]), 2);
  close(M.corr([1, 2, 3], [2, 4, 6]), 1);
  const z = M.standardize([1, 2, 3]);
  close(z[0], -1); close(z[1], 0); close(z[2], 1);
});

test('ols recovers an exact line and minimises sse', () => {
  const { slope, intercept, sse } = M.ols([0, 1, 2], [1, 3, 5]);
  close(slope, 2); close(intercept, 1); close(sse, 0);
  const f = M.ols([0, 1, 2, 3], [0, 1, 1, 2]);
  const at = M.sse([0, 1, 2, 3], [0, 1, 1, 2], f.slope, f.intercept);
  close(at, f.sse);
  assert.ok(at <= M.sse([0, 1, 2, 3], [0, 1, 1, 2], f.slope + 0.01, f.intercept));
  assert.ok(at <= M.sse([0, 1, 2, 3], [0, 1, 1, 2], f.slope, f.intercept + 0.01));
});

test('sae is the absolute-error total', () => {
  close(M.sae([0, 1], [1, 1], 0, 0), 2);
});

test('lossSurface grid contains the ols minimum', () => {
  const xs = [0, 1, 2, 3], ys = [0, 1, 1, 2];
  const fit = M.ols(xs, ys);
  const g = M.lossSurface(xs, ys, { s0: fit.slope - 1, s1: fit.slope + 1, b0: fit.intercept - 1, b1: fit.intercept + 1, n: 41 });
  close(g.minAt[0], fit.slope, 0.06);
  close(g.minAt[1], fit.intercept, 0.06);
  assert.equal(g.values.length, 41);
  assert.equal(g.values[0].length, 41);
});
```

- [ ] **Step 2: Run to verify failure** — `node --test test/` → FAIL (module not found).

- [ ] **Step 3: Implement `js/math/core.mjs` (stats half)**

```js
export function mean(xs) { let s = 0; for (const x of xs) s += x; return s / xs.length; }
export function variance(xs) { const m = mean(xs); let s = 0; for (const x of xs) s += (x - m) ** 2; return s / (xs.length - 1); }
export function sd(xs) { return Math.sqrt(variance(xs)); }
export function covariance(xs, ys) {
  const mx = mean(xs), my = mean(ys); let s = 0;
  for (let i = 0; i < xs.length; i++) s += (xs[i] - mx) * (ys[i] - my);
  return s / (xs.length - 1);
}
export function corr(xs, ys) { return covariance(xs, ys) / (sd(xs) * sd(ys)); }
export function standardize(xs) { const m = mean(xs), s = sd(xs); return xs.map(x => (x - m) / s); }

export function sse(xs, ys, slope, intercept) {
  let t = 0;
  for (let i = 0; i < xs.length; i++) { const r = ys[i] - (slope * xs[i] + intercept); t += r * r; }
  return t;
}
export function sae(xs, ys, slope, intercept) {
  let t = 0;
  for (let i = 0; i < xs.length; i++) t += Math.abs(ys[i] - (slope * xs[i] + intercept));
  return t;
}
export function ols(xs, ys) {
  const slope = covariance(xs, ys) / variance(xs);
  const intercept = mean(ys) - slope * mean(xs);
  const residuals = xs.map((x, i) => ys[i] - (slope * x + intercept));
  return { slope, intercept, residuals, sse: sse(xs, ys, slope, intercept) };
}
export function lossSurface(xs, ys, { s0, s1, b0, b1, n = 48, loss = 'squared' } = {}) {
  const f = loss === 'absolute' ? sae : sse;
  const values = []; let min = Infinity, max = -Infinity, minAt = [s0, b0];
  for (let j = 0; j < n; j++) {
    const b = b0 + (b1 - b0) * j / (n - 1); const row = [];
    for (let i = 0; i < n; i++) {
      const s = s0 + (s1 - s0) * i / (n - 1); const v = f(xs, ys, s, b);
      row.push(v);
      if (v < min) { min = v; minAt = [s, b]; }
      if (v > max) max = v;
    }
    values.push(row);
  }
  return { values, min, max, minAt, s0, s1, b0, b1, n };
}
```

- [ ] **Step 4: Run to verify pass** — `node --test test/` → all PASS.

- [ ] **Step 5: Commit** — `git add -A && git commit -m "math: sample stats, ols, loss surface (hand-pinned tests)"`

---

### Task 3: math core — eigen, PCA, RNG/synthetic (TDD)

**Files:**
- Modify: `js/math/core.mjs`, `test/math.test.mjs`

**Interfaces:**
- Produces: `signNorm(v)`, `eigSym2(sxx,sxy,syy) -> {values:[l1,l2],vectors:[v1,v2],angle}` (l1≥l2, angle in radians of v1),
  `jacobiEigen(A) -> {values,vectors}` (desc order, vectors = array of sign-normalized eigenvector arrays; throws on asymmetric input),
  `pca(X,{standardize=false}) -> {values,vectors,explained,scores,means,sds}` (X = rows of observations),
  `mulberry32(seed) -> () => number`, `gaussian(rng)`,
  `synthLine({seed,n,slope,intercept,noise,xMin,xMax}) -> {xs,ys,truth}`,
  `synthCloud({seed,n,rho,sdX,sdY,meanX,meanY}) -> {xs,ys,truth}`.

- [ ] **Step 1: Write failing tests**

```js
function sameDirection(u, v, tol = 1e-9) {
  const dot = u.reduce((s, x, i) => s + x * v[i], 0);
  const nu = Math.hypot(...u), nv = Math.hypot(...v);
  return Math.abs(Math.abs(dot) / (nu * nv) - 1) < tol;
}

test('eigSym2 closed form on known matrices', () => {
  const e = M.eigSym2(2, 1, 2);                    // [[2,1],[1,2]] -> 3, 1, 45°
  close(e.values[0], 3); close(e.values[1], 1);
  close(e.angle, Math.PI / 4);
  assert.ok(sameDirection(e.vectors[0], [1, 1]));
  const d = M.eigSym2(5, 0, 2);                    // diagonal
  close(d.values[0], 5); assert.ok(sameDirection(d.vectors[0], [1, 0]));
  const f = M.eigSym2(2, 0, 5);                    // top eigenvector is y
  close(f.values[0], 5); assert.ok(sameDirection(f.vectors[0], [0, 1]));
});

test('jacobiEigen agrees with eigSym2 on every 2x2 and handles 4x4', () => {
  for (const [a, b, c] of [[2, 1, 2], [5, 0, 2], [1, -0.9, 1], [3, 0.5, 0.5]]) {
    const j = M.jacobiEigen([[a, b], [b, c]]), e = M.eigSym2(a, b, c);
    close(j.values[0], e.values[0], 1e-9); close(j.values[1], e.values[1], 1e-9);
    assert.ok(sameDirection(j.vectors[0], e.vectors[0]));
  }
  const A = [[4, 1, 0.5, 0], [1, 3, 0.2, 0.1], [0.5, 0.2, 2, 0.3], [0, 0.1, 0.3, 1]];
  const j = M.jacobiEigen(A);
  close(j.values.reduce((s, v) => s + v, 0), 4 + 3 + 2 + 1, 1e-9);   // trace preserved
  assert.ok(j.values[0] >= j.values[1] && j.values[1] >= j.values[2]);
  assert.throws(() => M.jacobiEigen([[1, 2], [3, 4]]));
});

test('pca on a plane-embedded cloud finds the plane', () => {
  const X = [[0, 0], [1, 1], [2, 2], [3, 3.1], [4, 3.9]];    // ~diagonal line
  const p = M.pca(X);
  assert.ok(p.explained[0] > 0.99);
  assert.ok(sameDirection(p.vectors[0], [1, 1], 0.02));
  close(p.explained[0] + p.explained[1], 1);
  assert.equal(p.scores.length, 5);
});

test('mulberry32 is deterministic; synth generators carry truth', () => {
  const a = M.mulberry32(42), b = M.mulberry32(42);
  close(a(), b()); close(a(), b());
  const s = M.synthLine({ seed: 7, n: 10, slope: 2, intercept: 1, noise: 0.5 });
  assert.equal(s.xs.length, 10);
  close(s.truth.slope, 2);
  const t = M.synthLine({ seed: 7, n: 10, slope: 2, intercept: 1, noise: 0.5 });
  close(s.xs[3], t.xs[3]);                                   // same seed, same data
  const c = M.synthCloud({ seed: 3, n: 500, rho: 0.8 });
  close(M.corr(c.xs, c.ys), 0.8, 0.06);                      // statistically near rho
});
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement (append to core.mjs)**

```js
export function signNorm(v) {
  let k = 0;
  for (let i = 1; i < v.length; i++) if (Math.abs(v[i]) > Math.abs(v[k])) k = i;
  return v[k] < 0 ? v.map(x => -x) : v.slice();
}
export function eigSym2(sxx, sxy, syy) {
  const half = (sxx + syy) / 2;
  const d = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy * sxy);
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const v1 = [Math.cos(angle), Math.sin(angle)];
  return { values: [half + d, half - d], vectors: [signNorm(v1), signNorm([-v1[1], v1[0]])], angle };
}
export function jacobiEigen(A) {
  const n = A.length;
  const a = A.map(r => r.slice());
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++)
    if (Math.abs(a[i][j] - a[j][i]) > 1e-9) throw new Error('jacobiEigen: not symmetric');
  const V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0));
  for (let sweep = 0; sweep < 50; sweep++) {
    let off = 0;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) off = Math.max(off, Math.abs(a[p][q]));
    if (off < 1e-12) break;
    for (let p = 0; p < n - 1; p++) for (let q = p + 1; q < n; q++) {
      if (Math.abs(a[p][q]) < 1e-15) continue;
      const theta = (a[q][q] - a[p][p]) / (2 * a[p][q]);
      const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
      const c = 1 / Math.sqrt(t * t + 1), s = t * c;
      for (let k = 0; k < n; k++) { const kp = a[k][p], kq = a[k][q]; a[k][p] = c * kp - s * kq; a[k][q] = s * kp + c * kq; }
      for (let k = 0; k < n; k++) { const pk = a[p][k], qk = a[q][k]; a[p][k] = c * pk - s * qk; a[q][k] = s * pk + c * qk; }
      for (let k = 0; k < n; k++) { const vp = V[k][p], vq = V[k][q]; V[k][p] = c * vp - s * vq; V[k][q] = s * vp + c * vq; }
    }
  }
  const pairs = a.map((_, i) => ({ value: a[i][i], vector: V.map(row => row[i]) }));
  pairs.sort((x, y) => y.value - x.value);
  return { values: pairs.map(p => p.value), vectors: pairs.map(p => signNorm(p.vector)) };
}
export function pca(X, { standardize: std = false } = {}) {
  const n = X.length, p = X[0].length;
  const cols = Array.from({ length: p }, (_, j) => X.map(r => r[j]));
  const means = cols.map(mean), sds = cols.map(sd);
  const C = cols.map((c, j) => std ? c.map(v => (v - means[j]) / sds[j]) : c.map(v => v - means[j]));
  const S = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => {
    let t = 0; for (let k = 0; k < n; k++) t += C[i][k] * C[j][k]; return t / (n - 1);
  }));
  const { values, vectors } = jacobiEigen(S);
  const total = values.reduce((s, v) => s + v, 0);
  const scores = Array.from({ length: n }, (_, k) => vectors.map(v => {
    let t = 0; for (let j = 0; j < p; j++) t += v[j] * C[j][k]; return t;
  }));
  return { values, vectors, explained: values.map(v => v / total), scores, means, sds: std ? sds : null };
}
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function gaussian(rng) {
  let u = 0, v = 0;
  while (u === 0) u = rng(); while (v === 0) v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
export function synthLine({ seed = 1, n = 12, slope = 0.6, intercept = 1, noise = 0.8, xMin = 0, xMax = 10 } = {}) {
  const rng = mulberry32(seed); const xs = [], ys = [];
  for (let i = 0; i < n; i++) {
    const x = xMin + (xMax - xMin) * rng();
    xs.push(x); ys.push(slope * x + intercept + noise * gaussian(rng));
  }
  return { xs, ys, truth: { slope, intercept } };
}
export function synthCloud({ seed = 1, n = 80, rho = 0.7, sdX = 1, sdY = 1, meanX = 0, meanY = 0 } = {}) {
  const rng = mulberry32(seed); const xs = [], ys = [];
  for (let i = 0; i < n; i++) {
    const z1 = gaussian(rng), z2 = gaussian(rng);
    xs.push(meanX + sdX * z1);
    ys.push(meanY + sdY * (rho * z1 + Math.sqrt(1 - rho * rho) * z2));
  }
  return { xs, ys, truth: { rho } };
}
```

- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** — `git commit -am "math: eigen (closed-form 2x2 + jacobi), pca, seeded synth"`

---

### Task 4: numpy reference fixtures + fixture battery

**Files:**
- Create: `reference/fixtures.py`, `test/fixtures.json` (generated, committed)
- Modify: `test/math.test.mjs`

**Interfaces:**
- Produces: `test/fixtures.json` shape:
  `{ ols: [{xs,ys,slope,intercept,sse}], stats: [{xs,ys,variance_x,covariance,corr}], eig2: [{sxx,sxy,syy,values,vector1}], eig4: [{matrix,values,vectors}], pca: [{X,standardize,explained,components}], loss: [{xs,ys,slope,intercept,sse,sae}] }`

- [ ] **Step 1: Write `reference/fixtures.py`**

```python
"""Ground truth for shadowbox's JS math core. Hand-run:
    uv run --with numpy python reference/fixtures.py
Writes test/fixtures.json (committed). ddof=1 everywhere (sample statistics)."""
import json, pathlib
import numpy as np

rng = np.random.default_rng(20260820)
out = {"ols": [], "stats": [], "eig2": [], "eig4": [], "pca": [], "loss": []}

def lst(a): return np.asarray(a, dtype=float).tolist()

datasets = [
    (np.array([0, 1, 2, 3, 4.0]), np.array([1.1, 1.9, 3.2, 3.8, 5.1])),
    (rng.uniform(0, 10, 25), None),
    (rng.uniform(20, 44, 40), None),
]
for xs, ys in datasets:
    if ys is None:
        ys = 0.7 * xs + 2 + rng.normal(0, 1.3, xs.size)
    A = np.vstack([xs, np.ones_like(xs)]).T
    slope, intercept = np.linalg.lstsq(A, ys, rcond=None)[0]
    r = ys - (slope * xs + intercept)
    out["ols"].append({"xs": lst(xs), "ys": lst(ys), "slope": slope, "intercept": intercept, "sse": float(r @ r)})
    out["stats"].append({"xs": lst(xs), "ys": lst(ys),
                         "variance_x": float(np.var(xs, ddof=1)),
                         "covariance": float(np.cov(xs, ys, ddof=1)[0, 1]),
                         "corr": float(np.corrcoef(xs, ys)[0, 1])})
    for s, b in [(0.0, 0.0), (slope + 0.5, intercept - 1.0)]:
        rr = ys - (s * xs + b)
        out["loss"].append({"xs": lst(xs), "ys": lst(ys), "slope": s, "intercept": b,
                            "sse": float(rr @ rr), "sae": float(np.abs(rr).sum())})

for sxx, sxy, syy in [(2, 1, 2), (5, 0, 2), (1, -0.9, 1), (3.7, 0.4, 0.9), (2, 0, 2)]:
    w, v = np.linalg.eigh(np.array([[sxx, sxy], [sxy, syy]], dtype=float))
    order = np.argsort(w)[::-1]
    out["eig2"].append({"sxx": sxx, "sxy": sxy, "syy": syy,
                        "values": lst(w[order]), "vector1": lst(v[:, order[0]])})

for _ in range(3):
    B = rng.normal(size=(4, 4)); A = B @ B.T + np.eye(4)   # SPD
    w, v = np.linalg.eigh(A); order = np.argsort(w)[::-1]
    out["eig4"].append({"matrix": [lst(row) for row in A],
                        "values": lst(w[order]),
                        "vectors": [lst(v[:, k]) for k in order]})

for std in (False, True):
    X = rng.normal(size=(30, 3)) @ np.array([[2, 0.5, 0], [0, 1, 0.3], [0, 0, 0.4]])
    Xc = (X - X.mean(0)) / (X.std(0, ddof=1) if std else 1.0)
    S = np.cov(Xc.T, ddof=1)
    w, v = np.linalg.eigh(S); order = np.argsort(w)[::-1]
    out["pca"].append({"X": [lst(row) for row in X], "standardize": std,
                       "explained": lst(w[order] / w.sum()),
                       "components": [lst(v[:, k]) for k in order]})

path = pathlib.Path(__file__).resolve().parent.parent / "test" / "fixtures.json"
path.write_text(json.dumps(out, indent=1))
print(f"wrote {path} ({path.stat().st_size} bytes)")
```

- [ ] **Step 2: Generate fixtures** — `uv run --with numpy python reference/fixtures.py` → `test/fixtures.json` exists, non-trivial size.

- [ ] **Step 3: Add fixture battery to `test/math.test.mjs`** (failing first only if math is wrong — battery is the point):

```js
import { readFileSync } from 'node:fs';
const FX = JSON.parse(readFileSync(new URL('./fixtures.json', import.meta.url)));

test('fixture battery: ols + stats + loss match numpy', () => {
  for (const c of FX.ols) {
    const f = M.ols(c.xs, c.ys);
    close(f.slope, c.slope, 1e-9); close(f.intercept, c.intercept, 1e-9); close(f.sse, c.sse, 1e-7);
  }
  for (const c of FX.stats) {
    close(M.variance(c.xs), c.variance_x, 1e-9);
    close(M.covariance(c.xs, c.ys), c.covariance, 1e-9);
    close(M.corr(c.xs, c.ys), c.corr, 1e-9);
  }
  for (const c of FX.loss) {
    close(M.sse(c.xs, c.ys, c.slope, c.intercept), c.sse, 1e-7);
    close(M.sae(c.xs, c.ys, c.slope, c.intercept), c.sae, 1e-7);
  }
});

test('fixture battery: eigen directions match numpy (sign-blind)', () => {
  for (const c of FX.eig2) {
    const e = M.eigSym2(c.sxx, c.sxy, c.syy);
    close(e.values[0], c.values[0], 1e-9); close(e.values[1], c.values[1], 1e-9);
    if (Math.abs(c.values[0] - c.values[1]) > 1e-9)      // direction undefined at ties
      assert.ok(sameDirection(e.vectors[0], c.vector1, 1e-7));
    const j = M.jacobiEigen([[c.sxx, c.sxy], [c.sxy, c.syy]]);
    close(j.values[0], e.values[0], 1e-9);
  }
  for (const c of FX.eig4) {
    const j = M.jacobiEigen(c.matrix);
    c.values.forEach((v, i) => close(j.values[i], v, 1e-8));
    c.vectors.forEach((v, i) => assert.ok(sameDirection(j.vectors[i], v, 1e-6)));
  }
});

test('fixture battery: pca matches numpy', () => {
  for (const c of FX.pca) {
    const p = M.pca(c.X, { standardize: c.standardize });
    c.explained.forEach((v, i) => close(p.explained[i], v, 1e-8));
    c.components.forEach((v, i) => assert.ok(sameDirection(p.vectors[i], v, 1e-6)));
  }
});
```

- [ ] **Step 4: Run** — `node --test test/` → PASS. If eigen directions fail only on near-tie cases, widen only that case's tolerance and say so in the commit message.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "reference: numpy fixtures + fixture battery pinning js math"`

---

### Task 5: viridis + contour/band helpers (TDD)

**Files:**
- Create: `js/lib/viridis.mjs`, `js/lib/contours.mjs`, `test/plot.test.mjs`

**Interfaces:**
- Produces: `VIRIDIS` (10 hex stops dark→light), `bandLevel(v,min,max,levels)` → int 0..levels-1, `bandColor(level,levels)` → hex, `contrastInk(level,levels)` → `'#111111' | '#f5f5f5'` (contour/label ink readable on that band);
  `rowBands(grid, levels) -> [{i0,i1,j,level}]` (run-merged per row), `isoSegments(grid, level) -> [[x0,y0,x1,y1], …]` in grid coordinates (i along slope axis, j along intercept axis).

- [ ] **Step 1: Failing tests**

```js
// test/plot.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { VIRIDIS, bandLevel, bandColor, contrastInk } from '../js/lib/viridis.mjs';
import { rowBands, isoSegments } from '../js/lib/contours.mjs';
import { lossSurface } from '../js/math/core.mjs';

test('viridis quantisation is monotone and in range', () => {
  assert.equal(VIRIDIS.length, 10);
  assert.equal(bandLevel(0, 0, 1, 9), 0);
  assert.equal(bandLevel(1, 0, 1, 9), 8);
  let prev = -1;
  for (let t = 0; t <= 1.0001; t += 0.05) {
    const l = bandLevel(t, 0, 1, 9);
    assert.ok(l >= prev); prev = l;
  }
  assert.match(bandColor(0, 9), /^#[0-9a-f]{6}$/);
  assert.ok(['#111111', '#f5f5f5'].includes(contrastInk(0, 9)));
  assert.notEqual(contrastInk(0, 9), contrastInk(8, 9));   // dark band gets light ink
});

test('rowBands merges runs and covers the grid', () => {
  const grid = { values: [[0, 0, 5, 5], [0, 1, 5, 9]], min: 0, max: 9, n: 4 };
  const bands = rowBands(grid, 3);
  for (const b of bands) assert.ok(b.i1 >= b.i0);
  const cells = bands.reduce((s, b) => s + (b.i1 - b.i0 + 1), 0);
  assert.equal(cells, 8);                                   // 2 rows x 4 cols
  assert.ok(bands.length < 8);                              // merging happened
});

test('isoSegments on a paraboloid ring: nonempty, on-level, inside grid', () => {
  const g = lossSurface([0, 1, 2, 3], [0, 1, 1, 2], { s0: -2, s1: 3, b0: -2, b1: 3, n: 25 });
  const level = (g.min + g.max) / 4;
  const segs = isoSegments(g, level);
  assert.ok(segs.length > 8);
  for (const [x0, y0, x1, y1] of segs)
    for (const c of [x0, y0, x1, y1]) assert.ok(c >= 0 && c <= 24);
});
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement**

```js
// js/lib/viridis.mjs
export const VIRIDIS = ['#440154', '#482878', '#3e4989', '#31688e', '#26828e',
  '#1f9e89', '#35b779', '#6ece58', '#b5de2b', '#fde725'];
export function bandLevel(v, min, max, levels) {
  if (max <= min) return 0;
  const t = (v - min) / (max - min);
  return Math.max(0, Math.min(levels - 1, Math.floor(t * levels)));
}
export function bandColor(level, levels) {
  const idx = Math.round(level * (VIRIDIS.length - 1) / (levels - 1));
  return VIRIDIS[idx];
}
export function contrastInk(level, levels) {
  return level < levels / 2 ? '#f5f5f5' : '#111111';   // viridis: low = dark bands
}
```

```js
// js/lib/contours.mjs
import { bandLevel } from './viridis.mjs';

export function rowBands(grid, levels) {
  const out = [];
  const { values, min, max } = grid;
  for (let j = 0; j < values.length; j++) {
    const row = values[j];
    let i0 = 0, cur = bandLevel(row[0], min, max, levels);
    for (let i = 1; i <= row.length; i++) {
      const lv = i < row.length ? bandLevel(row[i], min, max, levels) : -1;
      if (lv !== cur) { out.push({ i0, i1: i - 1, j, level: cur }); i0 = i; cur = lv; }
    }
  }
  return out;
}

// Marching squares, segments only. Grid values[j][i]; returns segments in grid coords.
export function isoSegments(grid, level) {
  const { values } = grid;
  const segs = [];
  const lerp = (a, b) => (level - a) / (b - a);
  for (let j = 0; j < values.length - 1; j++) {
    for (let i = 0; i < values[0].length - 1; i++) {
      const v00 = values[j][i], v10 = values[j][i + 1], v01 = values[j + 1][i], v11 = values[j + 1][i + 1];
      // Edge crossing points (x, y) in grid units; edges: top(v00-v10), right(v10-v11), bottom(v01-v11), left(v00-v01)
      const pts = [];
      if ((v00 > level) !== (v10 > level)) pts.push([i + lerp(v00, v10), j]);
      if ((v10 > level) !== (v11 > level)) pts.push([i + 1, j + lerp(v10, v11)]);
      if ((v01 > level) !== (v11 > level)) pts.push([i + lerp(v01, v11), j + 1]);
      if ((v00 > level) !== (v01 > level)) pts.push([i, j + lerp(v00, v01)]);
      if (pts.length === 2) segs.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
      else if (pts.length === 4) {                           // saddle: pair as-is (bowl surfaces have none)
        segs.push([pts[0][0], pts[0][1], pts[1][0], pts[1][1]]);
        segs.push([pts[2][0], pts[2][1], pts[3][0], pts[3][1]]);
      }
    }
  }
  return segs;
}
```

- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** — `git commit -am "plot: quantised viridis + row-band fills + marching-squares contours"`

---

### Task 6: hydration runtime

**Files:**
- Create: `js/lib/hydrate.mjs`, `test/hydrate.test.mjs`

**Interfaces:**
- Consumes: an instrument module `{name, defaults, posterState, controls, render, applyDrag}`.
- Produces:
  `createStore(initial) -> {get(), set(partial, {silent}), subscribe(fn) -> unsub}` (set merges, notifies unless silent; notify passes full state);
  `controlsMarkup(controls, state) -> string` (pure; range inputs `data-control=id`, toggle `<button data-control=id aria-pressed>`, action `<button data-action=id>`);
  `mount(el, instrument, store, {actions} = {}) -> {rerender}` — renders `instrument.render(store.get())` + controls into `el`, binds: input events → `store.set({[id]: number})`; toggle click → flips boolean; action click → `actions[id](store)`; pointer drag on `[data-drag]` (setPointerCapture, client→viewBox via `svg.getScreenCTM().inverse()`) → `store.set(instrument.applyDrag(store.get(), {id, index, x, y}))`; keyboard on `[data-drag]` (tabindex=0, arrows nudge ±4 viewBox px, shift ±16) → same applyDrag path; store.subscribe → rerender (skips rerender while that mount itself is mid-drag-frame via a flag; uses `requestAnimationFrame` coalescing).
- **Node-testable parts are pure:** `createStore`, `controlsMarkup`, `clientToViewBox(matrixLike, cx, cy)`. DOM binding is exercised in the browser at Task 10's verify step (accepted: no DOM emulator dependency).

- [ ] **Step 1: Failing tests for the pure parts**

```js
// test/hydrate.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore, controlsMarkup, clientToViewBox } from '../js/lib/hydrate.mjs';

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

test('clientToViewBox inverts a scale+translate', () => {
  // matrixLike: {a,b,c,d,e,f} — svg screen CTM. Here: scale 2, translate (10, 20).
  const m = { a: 2, b: 0, c: 0, d: 2, e: 10, f: 20 };
  const p = clientToViewBox(m, 10 + 2 * 7, 20 + 2 * 9);
  assert.ok(Math.abs(p.x - 7) < 1e-9 && Math.abs(p.y - 9) < 1e-9);
});
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement `js/lib/hydrate.mjs`.** Pure parts exactly as tested (`clientToViewBox` inverts the affine `{a,b,c,d,e,f}` by solving `x = (cx - e - c*y…)` — for the axis-aligned case used here: `x=(cx-e)/a`, `y=(cy-f)/d`, but implement the full 2×2 inverse so rotation never breaks it). `mount(el, instrument, store, {actions})`: build `<div class="instrument">` with the SVG (`render`) + `<div class="controls">` (`controlsMarkup`); one delegated `pointerdown` listener on the container finds `closest('[data-drag]')`, records `{id, index:+el.dataset.index||0}`, `setPointerCapture`, on `pointermove` converts coords and calls `store.set(instrument.applyDrag(store.get(), drag))`; `keydown` on focused `[data-drag]` synthesizes the same with the element's current center + arrow delta; store subscription rerenders via rAF coalescing, rebuilding innerHTML and restoring focus by `data-drag`+`data-index` match. ~120 lines; keep it boring.

- [ ] **Step 4: Run to verify pass** (pure parts).
- [ ] **Step 5: Commit** — `git commit -am "lib: hydration runtime (store, controls, drag/keyboard plumbing)"`

---

### Task 7: fit-scatter instrument (TDD)

**Files:**
- Create: `js/instruments/fit-scatter.mjs`, `test/instruments.test.mjs`

**Interfaces:**
- Consumes: `core.mjs` (`ols`, `sse`, `sae`), token colors via literal hex from CSS-var-safe pairs.
- Produces: module exports `name='fit-scatter'`, `defaults`, `posterState`, `controls`, `layout(state)` (exported for tests: `{x(v),y(v),invX(px),invY(py),plot:{x0,y0,x1,y1}}`), `render(state)`, `applyDrag(state, {id,index,x,y})`.
  State shape (also consumed by loss-bowl wiring in Task 10):
  `{ idKey, xs, ys, slope, intercept, loss:'squared'|'absolute', truth:{slope,intercept}|null, showTruth:bool, labels:{x,y,title}, domain:{x0,x1,y0,y1}|null }`.

- [ ] **Step 1: Failing tests**

```js
// test/instruments.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import * as FS from '../js/instruments/fit-scatter.mjs';
import { synthLine, ols, sse } from '../js/math/core.mjs';

const state = () => {
  const d = synthLine({ seed: 7, n: 12, slope: 0.6, intercept: 1, noise: 0.9 });
  const fit = ols(d.xs, d.ys);
  return { ...FS.defaults, idKey: 't1', xs: d.xs, ys: d.ys, slope: fit.slope, intercept: fit.intercept, truth: d.truth };
};

test('fit-scatter renders well-formed prefixed SVG with drag handles', () => {
  const svg = FS.render(state());
  assert.match(svg, /^<svg[^>]*viewBox="0 0 640 460"/);
  assert.match(svg, /<\/svg>\s*$/);
  assert.ok(!svg.includes('id="dots"'));                    // ids must be prefixed
  assert.ok(svg.includes('sb-t1-dots'));
  assert.ok(svg.includes('data-drag="points"'));
  assert.ok(svg.includes('data-drag="line-move"'));
  assert.ok((svg.match(/data-drag="line-rot"/g) || []).length === 2);
});

test('fit-scatter residual squares sum to SSE in pixel terms', () => {
  const s = state();
  const svg = FS.render(s);
  const L = FS.layout(s);
  const yScale = Math.abs(L.y(1) - L.y(0));
  const sides = [...svg.matchAll(/data-role="residual-square"[^>]*width="([0-9.]+)"/g)].map(m => +m[1]);
  assert.equal(sides.length, s.xs.length);
  const areaSum = sides.reduce((t, w) => t + w * w, 0);
  const expected = sse(s.xs, s.ys, s.slope, s.intercept) * yScale * yScale;
  assert.ok(Math.abs(areaSum - expected) / expected < 1e-6);
});

test('fit-scatter absolute mode renders sticks, not squares', () => {
  const svg = FS.render({ ...state(), loss: 'absolute' });
  assert.ok(!svg.includes('data-role="residual-square"'));
  assert.ok(svg.includes('data-role="residual-stick"'));
});

test('applyDrag: line-move keeps slope, moves intercept through cursor', () => {
  const s = state();
  const L = FS.layout(s);
  const target = { xd: 5, yd: 4 };
  const out = FS.applyDrag(s, { id: 'line-move', index: 0, x: L.x(target.xd), y: L.y(target.yd) });
  assert.ok(Math.abs(out.intercept - (target.yd - s.slope * target.xd)) < 1e-9);
  assert.equal(out.slope, undefined);                       // partial update only
});

test('applyDrag: points moves one data point', () => {
  const s = state();
  const L = FS.layout(s);
  const out = FS.applyDrag(s, { id: 'points', index: 3, x: L.x(2), y: L.y(2) });
  assert.ok(Math.abs(out.xs[3] - 2) < 1e-9 && Math.abs(out.ys[3] - 2) < 1e-9);
  assert.equal(out.xs.length, s.xs.length);
});
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement `js/instruments/fit-scatter.mjs`.**

Key implementation requirements (write in full, ~170 lines):

```js
export const name = 'fit-scatter';
export const defaults = { idKey: 'fit-scatter', xs: [], ys: [], slope: 0.5, intercept: 1,
  loss: 'squared', truth: null, showTruth: false, domain: null,
  labels: { x: 'x', y: 'y', title: 'drag the line. drag the points.' } };
export const controls = [
  { id: 'loss', kind: 'toggle', label: 'absolute error', on: 'absolute', off: 'squared' },
  { id: 'showTruth', kind: 'toggle', label: 'show the true line', on: true, off: false },
  { id: 'resample', kind: 'action', label: 'resample' },
];
export const posterState = null; // set per page in tools/poster.mjs configs
```

- `layout(state)`: viewBox 640×460, margins l=56 r=14 t=44 b=48; domain = `state.domain` or data extent padded 12% each side (and always containing the line's y at both x edges? No — clamp squares instead); linear `x(v)`, `y(v)` (y inverted), inverses.
- `render(state)`:
  - `<defs>`: dot pattern `id="sb-${idKey}-dots"` `patternUnits="userSpaceOnUse"` width/height 12, `<circle cx=6 cy=6 r=3 fill=var(--ink)>`; clipPath `sb-${idKey}-clip` = plot rect.
  - Frame + 4–5 ticks per axis (`niceTicks(min,max)` helper: step = 10^floor(log10(span)) halved/doubled to land 4–6 ticks), tick labels `.ts` 12px sans `fill="var(--text-light)"`, axis labels from `state.labels`, title top-left 14px `fill="var(--text)"`.
  - Truth line (if `truth && showTruth`): dashed `8 5`, `stroke="var(--text-light)"` 2px, direct label `truth` at its right end.
  - Residuals (clip to plot): squared mode — for each i: `yhat=slope*x+b`; side `s=|y(yi)-y(yhat_i)|` px; `<rect data-role="residual-square" x=px(xi) y=min(py,phat) width=s height=s fill="url(#sb-…-dots)" stroke="var(--ink)" stroke-width=2>`; absolute mode — `<rect data-role="residual-stick" x=px-5 width=10 y=min(py,phat) height=|py-phat|>` same fill/stroke.
  - Fitted line: `stroke="var(--accent)"` 3.5px, solid, label `fit` welded at right end 13px; body has invisible fat hit line (`stroke-width=18 stroke="transparent" data-drag="line-move"`), handles: 2 circles r=8 at x=20%/80% of domain on the line, `fill="var(--accent)" stroke="var(--bg)" stroke-width=2 data-drag="line-rot" data-index=0|1 tabindex="0"`.
  - Points: circle r=4.5 `fill="var(--heading)"` `data-drag="points" data-index=i tabindex="0"`, `aria-label="data point ${i+1}"`.
  - Readout (in-SVG, top right, mono 15px `fill="var(--heading)"`): squared → `Σ squares = ${total.toFixed(1)}`; absolute → `Σ |r| = ${…}` — total computed with `sse`/`sae`.
  - All colors via `var(--…)` so poster inherits page theme; **no hex literals in instrument SVG.**
- `applyDrag(state, {id,index,x,y})`:
  - `points`: clamp to domain, return `{xs, ys}` copies with point i at `(invX(x), invY(y))`.
  - `line-move`: `{intercept: invY(y) - state.slope * invX(x)}`.
  - `line-rot`: anchor = the other handle's data coords (`ax = domain x0 + (index===0? 0.8:0.2)*(x1-x0)`, `ay = slope*ax+intercept`); `m=(invY(y)-ay)/(invX(x)-ax)` guarded `|dx|>1e-6`, clamp to ±30; return `{slope:m, intercept: ay - m*ax}`.

- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** — `git commit -am "instrument: fit-scatter (dot-screen residual squares, drag line/points)"`

---

### Task 8: loss-bowl instrument (TDD)

**Files:**
- Create: `js/instruments/loss-bowl.mjs`
- Modify: `test/instruments.test.mjs`

**Interfaces:**
- Consumes: `lossSurface`, `ols` from core; `rowBands`, `isoSegments`, `bandColor`, `contrastInk`, `VIRIDIS`.
- Produces: exports `name='loss-bowl'`, `defaults`, `posterState=null`, `controls=[]` (driven entirely by drag + the linked fit-scatter), `ranges(state)` (exported: `{s0,s1,b0,b1}` centered on the OLS fit: `s0=fit.slope-1.5…`, `b0=fit.intercept-3*sdResid…`), `layout(state)`, `render(state)`, `applyDrag` (id `marker` → `{slope, intercept}` from inverse scales, clamped to ranges).
  State: `{ idKey, xs, ys, slope, intercept, loss, labels:{x:'slope',y:'intercept'} }`.

- [ ] **Step 1: Failing tests (append)**

```js
import * as LB from '../js/instruments/loss-bowl.mjs';

test('loss-bowl renders bands, contours, ols minimum and a draggable marker', () => {
  const s = state();                                        // reuse helper from fit-scatter tests
  const svg = LB.render({ ...LB.defaults, idKey: 'b1', xs: s.xs, ys: s.ys, slope: s.slope, intercept: s.intercept, loss: 'squared' });
  assert.match(svg, /^<svg[^>]*viewBox="0 0 640 460"/);
  assert.ok((svg.match(/data-role="band"/g) || []).length > 20);
  assert.ok((svg.match(/data-role="contour"/g) || []).length >= 4);
  assert.ok(svg.includes('data-drag="marker"'));
  assert.ok(svg.includes('data-role="minimum"'));
});

test('loss-bowl marker sits at (slope, intercept); applyDrag inverts it', () => {
  const s = state();
  const st = { ...LB.defaults, idKey: 'b2', xs: s.xs, ys: s.ys, slope: s.slope + 0.4, intercept: s.intercept - 1, loss: 'squared' };
  const L = LB.layout(st);
  const svg = LB.render(st);
  const m = svg.match(/data-drag="marker"[^>]*cx="([0-9.-]+)"[^>]*cy="([0-9.-]+)"/);
  assert.ok(Math.abs(+m[1] - L.x(st.slope)) < 0.5 && Math.abs(+m[2] - L.y(st.intercept)) < 0.5);
  const out = LB.applyDrag(st, { id: 'marker', index: 0, x: L.x(1.0), y: L.y(2.0) });
  assert.ok(Math.abs(out.slope - 1.0) < 1e-6 && Math.abs(out.intercept - 2.0) < 1e-6);
});

test('loss-bowl surface markup is cached per (xs,ys,loss)', () => {
  const s = state();
  const st = { ...LB.defaults, idKey: 'b3', xs: s.xs, ys: s.ys, slope: 0, intercept: 0, loss: 'squared' };
  const a = LB.render(st);
  const b = LB.render({ ...st, slope: 1 });                 // marker moved, same data
  const band = /(<g data-role="surface">[\s\S]*?<\/g>)/;
  assert.equal(a.match(band)[1], b.match(band)[1]);
});
```

- [ ] **Step 2: Run to verify failure.**

- [ ] **Step 3: Implement `js/instruments/loss-bowl.mjs`.** Requirements:
  - `ranges(state)`: `const fit = ols(xs,ys)`; `sR = 1.5`, `bR = Math.max(2, 3*Math.sqrt(fit.sse/(xs.length-1)))`; return `{s0:fit.slope-sR, s1:fit.slope+sR, b0:fit.intercept-bR, b1:fit.intercept+bR}`.
  - Surface: `lossSurface(xs, ys, {…ranges, n:48, loss})`; 9 levels; **memoize the whole `<g data-role="surface">…</g>` string in a module-level `WeakMap` keyed on the `xs` array, inner key `${loss}`** (drag frames reuse it; new data object → recompute).
  - Bands: `rowBands` → one `<rect data-role="band">` per run, `fill=bandColor(level,9)`, cell size = plot/(n-1), positioned with a half-cell offset; `shape-rendering="crispEdges"`.
  - Contours: 5 levels between min and max (geometric spacing toward the min so rings crowd the bottom of the bowl: levels at `min + (max-min)*t²`, t = 0.15,0.3,0.5,0.7,0.9); each `<path data-role="contour">`, `stroke=contrastInk(bandLevel(level…),9)`, width 1.25, fill none; label the outermost two contours with their rounded value (12px mono, ink color matched).
  - Minimum: `×` glyph (`<path data-role="minimum">`) at `minAt`, `stroke="var(--bg)"` outline under `stroke=VIRIDIS[9]`? No hue-only meaning: pair with 12px label `bottom of the bowl` welded beside it, `fill=contrastInk(0,9)`.
  - Marker: crosshair lines spanning the plot + `<circle data-drag="marker" tabindex="0" r="8" fill="none" stroke="var(--bg)" stroke-width="5">` under a second stroke `var(--heading)` 2.5px (double-stroke = visible on any band, no hue meaning).
  - Readout top-right (mono, in-SVG): `SSE = ${sse(xs,ys,slope,intercept).toFixed(1)}` (or `Σ|r|`).
  - Axes: ticks + labels `slope` / `intercept` (or `state.labels`).
- [ ] **Step 4: Run to verify pass.**
- [ ] **Step 5: Commit** — `git commit -am "instrument: loss-bowl (quantised viridis bands, contours, draggable marker)"`

---

### Task 9: births data (clinical stage for rung 1)

**Files:**
- Create: `tools/make-births.mjs`, `data/births.json`, `data/README.md`

**Interfaces:**
- Produces: `data/births.json`:
  `{ "source":"OpenIntro births14 (sample of 1,000 births from the 2014 NCHS natality public-use file)", "url":"https://www.openintro.org/data/csv/births14.csv", "license":"CC BY-SA 4.0 (OpenIntro data)", "retrieved":"2026-08-20", "n":400, "fields":{"x":"gestational age (weeks)","y":"birthweight (g)"}, "xs":[…], "ys":[…] }`

- [ ] **Step 1: Download the CSV** — `curl -L -o work/births14.csv https://www.openintro.org/data/csv/births14.csv` (create `work/`, gitignored? No — keep raw CSV out of the repo: download to the scratchpad, not the repo tree). Inspect the header: expect columns `weeks` (gestational age) and `weight` (pounds).
- [ ] **Step 2: Write `tools/make-births.mjs`** — Node script, no deps: reads the CSV path from `process.argv[2]`, parses (simple split — quote-free numeric columns), drops rows missing `weeks` or `weight`, converts pounds→grams (`*453.59237`, round to integer), seeded downsample to 400 via `mulberry32(20260820)` shuffle, writes `data/births.json` with the provenance block above (stamp `retrieved` from `process.argv[3]` — never from the clock — so reruns are reproducible).
- [ ] **Step 3: Run it** — `node tools/make-births.mjs <scratchpad>/births14.csv 2026-08-20`; sanity-print n, weeks range (~20–45), weight range (~500–5500 g).
- [ ] **Step 4: Write `data/README.md`** — provenance, license note, the exact command to regenerate, and the documented upgrade path (direct NCHS extract).
- [ ] **Step 5: Commit** — `git add -A && git commit -m "data: births (OpenIntro births14 / NCHS 2014), provenance + converter"`
- **Fallback if the download fails (offline):** skip Steps 1/3, still commit the converter + README, and in the checkpoint report state plainly that `births.json` is pending network — Task 10 then renders the clinical section from `synthLine` data with an explicit on-page `placeholder — real data pending` label. Do NOT silently substitute.

---

### Task 10: rung 1 page — least-squares.html

**Files:**
- Create: `least-squares.html`
- Modify: `index.html` (link becomes live — it already is; verify)

**Interfaces:**
- Consumes: both instruments, `hydrate.mjs` (`createStore`, `mount`), `synthLine`, `ols`, `data/births.json` (fetch).

- [ ] **Step 1: Build the page skeleton** — head boilerplate (fonts, css, title `least squares — shadowbox`), `.essay` main. Sections in order, each with real prose (drafted at execution; beats and load-bearing sentences fixed here):
  1. **Title + hook.** H1 `Least squares`. Opening line (verbatim): *“Before you trust any line through any scatter, you should get to choose one by hand and feel what ‘best’ costs.”*
  2. **`details.from-zero` — Start from zero:** what slope and intercept each do (two sentences each); what a prediction's error is (vertical gap). Self-contained; no instrument.
  3. **Instrument 1: fit-scatter (synthetic).** Mount `<div id="fs-syn">` wrapped by poster markers `<!-- poster:fit-scatter-synthetic -->…<!-- /poster:fit-scatter-synthetic -->`. Prose before it sets the task: drag until it looks right, watch `Σ squares`. Prose after names the trick: squares are literal; **the fit that wins is the one that spends the least ink.**
  4. **Instrument 2: loss-bowl, linked.** Mount `<div id="lb-syn">` + markers `poster:loss-bowl-synthetic`. Prose: every line you tried is one point in this plane; the landscape is the total error; **the best line was never a search through lines — it is the bottom of a bowl.** Toggle prompt: switch to absolute error and watch the bowl grow a crease (and the squares become sticks).
  5. **The closed form** (after the bowl): MathML, verbatim:
     `m̂ = Sxy / Sxx`, `b̂ = ȳ − m̂ x̄` as `<math>` markup with a one-line gloss: *the bottom of the bowl can be solved, not searched.*
  6. **Truth stage.** Prose + `show the true line` toggle + `resample`: the fit wobbles around a truth you can see, because you built it.
  7. **Clinical stage.** Second fit-scatter instance (idKey `fs-births`, markers `poster:fit-scatter-births`) on `data/births.json`: gestational age (weeks) vs birthweight (g). No truth toggle (`truth:null` — the control hides itself when `truth` is null; implement that in `controlsMarkup` consumption: filter `showTruth` control when `!state.truth`). Closing sting (verbatim): *“The machine happily fits a line whether or not a line is the right question. Nothing in the readout will tell you. The next two rungs build the eyes that do.”*
  8. Footer nav: ← shadowbox index · rung 2 (coming).
- [ ] **Step 2: Wire the module script** (bottom of page, `type="module"`): build synthetic store from `synthLine({seed:11, n:12, slope:0.62, intercept:1.1, noise:0.9})` with initial slope/intercept = a deliberately-off line (`slope: 0.15, intercept: 3.2` — poster shows visible fat squares); `mount` fs-syn and lb-syn **on the same store** (shared keys: xs, ys, slope, intercept, loss) — linkage costs nothing more; `resample` action: bump seed (`store._seed = (store._seed||11)+1`), regenerate `synthLine`, `store.set({xs,ys})`. Births section: `fetch('data/births.json')` then mount its own store; on fetch failure leave the poster frame in place (static fallback works by construction).
- [ ] **Step 3: Verify in the browser** — `python -m http.server 8000`; check: drag line (both handles + body), drag points, toggle absolute (squares→sticks, bowl creases), resample, truth toggle, marker drag drives the line and vice versa, keyboard: tab to a handle, arrows move it; births section loads; dark mode; print preview hides controls.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "rung 1: least-squares essay, linked instruments, staged data"`

---

### Task 11: poster tool + committed poster frames (TDD)

**Files:**
- Create: `tools/poster.mjs`, `test/poster.test.mjs`, `figures/*.svg` (generated, committed)
- Modify: `least-squares.html` (posters injected)

**Interfaces:**
- Produces: `injectPoster(html, key, svg) -> html` (pure, exported from `tools/poster.mjs`); CLI `node tools/poster.mjs` regenerates every configured poster.

- [ ] **Step 1: Failing test**

```js
// test/poster.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { injectPoster } from '../tools/poster.mjs';

test('injectPoster replaces marker content idempotently', () => {
  const page = `<p>a</p>\n<!-- poster:k1 -->old<!-- /poster:k1 -->\n<p>b</p>`;
  const once = injectPoster(page, 'k1', '<svg>new</svg>');
  assert.ok(once.includes('<!-- poster:k1 -->\n<svg>new</svg>\n<!-- /poster:k1 -->'));
  assert.ok(!once.includes('old'));
  assert.equal(injectPoster(once, 'k1', '<svg>new</svg>'), once);   // idempotent
  assert.throws(() => injectPoster(page, 'missing', '<svg/>'));      // unknown marker = loud failure
});
```

- [ ] **Step 2: Run to verify failure.**
- [ ] **Step 3: Implement `tools/poster.mjs`** — `injectPoster` via regex `new RegExp('<!-- poster:'+key+' -->[\\s\\S]*?<!-- /poster:'+key+' -->')` (throw if no match); poster configs:

```js
const CONFIGS = [{
  file: 'least-squares.html',
  posters: [
    { key: 'fit-scatter-synthetic', instrument: fitScatter,
      state: () => { const d = synthLine({ seed: 11, n: 12, slope: 0.62, intercept: 1.1, noise: 0.9 });
        return { ...fitScatter.defaults, idKey: 'fs-syn', ...d, truth: d.truth, slope: 0.15, intercept: 3.2 }; } },
    { key: 'loss-bowl-synthetic', instrument: lossBowl,
      state: () => { const d = synthLine({ seed: 11, n: 12, slope: 0.62, intercept: 1.1, noise: 0.9 });
        return { ...lossBowl.defaults, idKey: 'lb-syn', xs: d.xs, ys: d.ys, slope: 0.15, intercept: 3.2, loss: 'squared' }; } },
    { key: 'fit-scatter-births', instrument: fitScatter,
      state: () => { const b = JSON.parse(readFileSync('data/births.json'));
        const fit = ols(b.xs, b.ys);
        return { ...fitScatter.defaults, idKey: 'fs-births', xs: b.xs, ys: b.ys, ...fit,
          labels: { x: 'gestational age (weeks)', y: 'birthweight (g)', title: 'every birth is a point. the line is a choice.' } }; } },
  ],
}];
```

  Main: for each config, read file, for each poster `render(state())` → write `figures/${key}.svg` (with an added inline comment header `<!-- generated by tools/poster.mjs -->`) and `injectPoster` into the page; write page back. Guard: if `data/births.json` missing, render the births poster from a labeled synthetic substitute **with the on-page label ‘placeholder — real data pending’ inside the SVG title text**, and warn on stderr.
- [ ] **Step 4: Run tests + the tool** — `node --test test/` PASS; `node tools/poster.mjs` twice; `git diff --stat` after second run shows no changes (idempotent in practice).
- [ ] **Step 5: Verify no-JS teaching** — in the browser with JS disabled (or view-source), the page shows all three posters, prose intact.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "posters: committed static frames + idempotent injector"`

---

### Task 12: M2 polish + checkpoint

**Files:**
- Modify: whatever the checks below surface; Create: `README.md`

**Steps:**

- [ ] **Step 1: Full test run** — `node --test test/` → all green.
- [ ] **Step 2: Browser QA sweep** (local server + Browser pane): light + dark mode; mobile width (375px — controls wrap, SVG scales); keyboard-only operation of both instruments; print preview (posters print, controls hidden).
- [ ] **Step 3: Grayscale check** — screenshot rung 1, desaturate (any tool), confirm: fit vs truth distinguishable (solid vs dashed + labels), bands read as ordered luminance, marker visible on every band (double-stroke).
- [ ] **Step 4: Write `README.md`** — what shadowbox is, the rungs (1 live, 2–3 next), how to run tests/posters/preview, link to spec. One screen.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "m2: polish pass, readme"`
- [ ] **Step 6: CHECKPOINT — stop here.** Report to the owner: what shipped, test counts, any fallbacks taken (births download, tolerance widenings), and the decisions queued for him (publish to GitHub now or after rung 2; apps.html card timing; M3 next). Do not start M3.

---

## Self-Review (performed at write time)

1. **Spec coverage (M1+M2 scope):** §4 scaffold→T1; §5 contract→T6–T8 (`applyDrag` is an addition the spec's control-spec implies for drag kinds — recorded here as a contract refinement); §6 posters→T11; §7 rung 1 beats incl. both stings, truth stage, closed form, from-zero block→T10; §8 synthetic+births→T3/T9; §9 dots/outline/viridis+contours/direct labels/keyboard→T7/T8/T6; §10 math+conventions→T2/T3; §11 fixtures+node--test→T4; §13 M1 accept→T4 (dual-solver agreement test), M2 accept→T10 step 3, T11 step 5. Not in scope (M3+): rungs 2–3 instruments, apps card, publish.
2. **Placeholder scan:** prose drafting in T10 is specified by fixed beats + verbatim load-bearing sentences; no TBDs.
3. **Type consistency:** state keys (`xs, ys, slope, intercept, loss, truth, idKey, labels, domain`) uniform across T7/T8/T10/T11; store API (`get/set/subscribe`) uniform T6/T10; `layout` exported by both instruments; fixture shapes match between T4's Python and JS.
