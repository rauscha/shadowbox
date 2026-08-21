# shadowbox — design spec (sub-project A: the first three rungs)

**Date:** 2026-08-20
**Status:** approved in brainstorming; awaiting owner review of this written spec
**Owner:** Andrew Rausch
**URL when live:** `andrewrausch.com/shadowbox/`

---

## 1. Purpose

An interactive, visual statistics teaching site. The long arc runs least squares →
regression → covariance → PCA → UMAP: every method on the ladder answers one question —
*which shadow of this data should I look at?* — hence the name.

Two audiences, in priority order:

1. **Andrew** — learning mechanism honestly (the bar: could teach it, not just nod at it).
2. **MFM fellows and students** — a permanent, self-narrating teaching tool. If it works
   for audience 1 built honestly, audience 2 falls out.

Design goal: **in perpetuity.** Every technical choice below bends toward a site that
still teaches in 2041 with zero maintenance.

## 2. Context: the four sub-projects

Decided during brainstorming; only A is specced here.

- **A — Explainer library** (this spec): self-contained interactive essay-pages, one
  concept each.
- **B — Trellis**: the prerequisite graph, shared navigation, and the two-audience track
  system. Mostly *extraction* from what A builds.
- **C — Chooser**: "I have this data and this question — what method, and why?" A
  decision aid with citation discipline; deliberately last.
- **D — Comparison lab**: same data through many methods, same method across many
  datasets. Cheap if and only if instruments are first-class (§5).

Sub-project A slice: **three rungs** — least squares → covariance geometry → PCA — with
**eight instruments** (owner chose to keep basis-rotation and scree rather than cut to
five). UMAP is rung 4, next slice.

## 3. Prior art (inspiration, and what's missing)

- setosa.io *Ordinary Least Squares Regression* and *Principal Component Analysis* —
  the drag-and-watch idiom.
- Brown's *Seeing Theory* — ladder pacing and tone.
- Distill's *How to Use t-SNE Effectively* and PAIR's *Understanding UMAP* — honesty
  about what embeddings don't mean; the precomputed-embedding trick for static hosting.

Gaps shadowbox fills: a connected spine (OLS→PCA as one least-squares story), a clinical
idiom (MFM data, staged against synthetic), and colorblind-safe encoding throughout.

## 4. Hosting, repo, and platform rules

- **Standalone repo `shadowbox`**, GitHub Pages from `main`, lands at
  `andrewrausch.com/shadowbox/` (same pattern as `critter-radar`, `iut-calculator`).
  Gets a card on the parent site's `apps.html` when rung 1 is real (via the
  add-app-card flow, owner-approved).
- **Pure static.** No build pipeline in the deploy path, no framework, no runtime
  dependencies, no `node_modules`. `git push` is the deploy.
- **Hand-run scripts whose output is committed** are allowed (the `build_cv.py`
  precedent): poster-frame generation (§6), Python test fixtures (§11).
- **ES modules** (`.mjs`) for all JS, loaded via `<script type="module">`. This breaks
  `file://` viewing (unlike the parent site's classic-script choice); accepted because
  the same modules must import cleanly in `node --test` and in the poster script.
  Local preview: `python -m http.server 8000`.
- **Math notation:** hand-authored MathML (native in all evergreen browsers), no KaTeX,
  no CDN. Formulas are sparse by design — the figures carry the argument; formulas are
  shorthand appearing *after* the idea is visible.
- Site is its own visual world (no parent-site sidebar — the `doppler` precedent) but
  reads as Andrew's: IBM Plex via Google Fonts (with real fallback stacks, the parent
  precedent), and the parent's `--color-*` token *values copied into*
  `css/shadowbox.css` — never a runtime link to the parent stylesheet. Self-contained
  by construction.
- Dark mode via `prefers-color-scheme`, same mechanism as the parent site.

## 5. The instrument contract (the architectural decision)

> **An instrument is a pure function from state to SVG markup, plus a control spec.**

Each instrument is one `.mjs` module exporting:

```js
export const name = 'fit-scatter';
export const defaults = { slope: 0.5, intercept: 1.2, dataset: 'synthetic-line' };
export const posterState = { ...defaults, /* the chosen interesting configuration */ };
export const controls = [   // declarative; the hydration runtime builds UI from this
  { id: 'slope', kind: 'slider', min: -3, max: 3, step: 0.01, label: 'slope' },
  { id: 'points', kind: 'drag-points' },   // direct manipulation on the SVG
];
export function render(state) { /* -> complete SVG markup string, no DOM access */ }
```

One `render(state)` therefore runs in four places with zero rewrites: Node (poster
frames), browser (every interaction), tests (geometry assertions on the string), and
side-by-side (sub-project D). Nothing is page-shaped.

**Hydration runtime** (`js/lib/hydrate.mjs`, small and boring): mounts an instrument
into a placeholder, builds controls from the spec, re-renders on input. **Linked
instruments** (fit-scatter ↔ loss-bowl) share a page-level state object with a plain
subscribe/notify — no store library.

**Interaction accessibility:** every draggable handle is also keyboard-operable
(focusable, arrow keys nudge, shift+arrow coarse) with `aria-label` and a visible focus
ring. Colorblind-safety is §9; this is the motor/keyboard half.

## 6. Static-first: poster frames

Every instrument ships a **poster frame**: a real committed SVG of a deliberately chosen
interesting state, inlined into the page HTML. JS *replaces* it with the live instrument
on load. The rationale is archival, not just resilience: when the JS eventually stops
running (the honest 15-year failure mode), the pages still teach, still print, and are
still legible to search engines.

`tools/poster.mjs` (hand-run) imports each instrument, calls `render(posterState)`, and
injects the result into the page between comment markers:

```html
<!-- poster:fit-scatter --> ...generated SVG... <!-- /poster:fit-scatter -->
```

Injection is idempotent (regenerate any time, diff stays clean). Poster states are
declared next to each instrument (`posterState` export).

## 7. Content design — the three rungs

Each rung is an essay built from instruments (approved shape 3): prose carries a real
argument; instruments are the evidence. Each rung opens with a collapsed
**"Start from zero"** `<details>` block holding that rung's prerequisite, written
self-contained so sub-project B can later hoist it to a standalone page (a move, not a
rewrite). Andrew skips them; fellows expand them.

Every rung teaches mechanism on **synthetic data with visible ground truth first**, then
re-runs the identical instrument on **real clinical data** where truth is unknown — and
the contrast is itself the lesson (approved: "both, staged").

### Rung 1 — Least squares (`least-squares.html`)

Start from zero: what a line's two knobs mean; what "error of a prediction" is.

Instruments:

1. **`fit-scatter`** — draggable line over a scatter; residuals drawn as literal
   squares, dot-screen filled (§9) so *total error = total ink*. Live sum readout.
   Points drag too (watch the fit chase; feel leverage).
2. **`loss-bowl`** — the (slope, intercept) plane, total error as a viridis+contour
   surface: **a bowl**. Bidirectionally linked to fit-scatter: drag the line, the
   marker moves in the bowl; drag the marker, the line moves. Best fit = bottom of
   the bowl. This linkage is the page's centerpiece and the seed of gradient descent
   (paying off in the UMAP rung later).
   - Mode: **squared vs absolute error** toggle — the bowl grows a crease; "squared"
     is a choice with consequences, not a law.

The closed form appears *after* the bowl makes it believable: the bottom can be solved,
not searched (MathML, brief).

**Staged data:** synthetic points scattered around a known true line (drawn, labeled,
dashed) with a **resample** button — the fit wobbles around a truth you can see. Then
NCHS natality: birthweight vs gestational age, where no true line exists and the
relationship visibly isn't linear. The rung ends on that honest sting: *the machine
happily fits a line whether or not a line is the right question.*

### Rung 2 — Covariance geometry (`covariance.html`)

Start from zero: mean, and variance as spread along an axis.

Instruments:

3. **`cloud-ellipse`** — point cloud with its covariance ellipse, and a live 2×2
   covariance matrix rendered as four numbers **bidirectionally bound** to the
   geometry: drag the cloud's spread/tilt, the numbers move; edit a number, the cloud
   reshapes. Leave-behind image: *the covariance matrix IS an ellipse.*
4. **`units-trap`** — same cloud, unit switches on each axis (mm↔cm, g↔kg). The
   ellipse distorts wildly; the correlation readout doesn't move. Motivates
   standardization, which rung 3 needs.

**Staged data:** synthetic cloud with a ρ dial (truth known because you dialed it).
Then a real biometry pair — head circumference vs estimated fetal weight — where
"millimetres vs grams" isn't a contrived gotcha, it's Tuesday. The essay must state
plainly that EFW is *computed from* biometry (including HC), so part of that tight
correlation is by construction — an honest aside the target audience would otherwise
catch us on, and itself a small lesson in derived variables.

### Rung 3 — PCA (`pca.html`)

Start from zero: matrices as transformations; eigenvectors as the directions a
transformation doesn't rotate (written for fellows; Andrew skips).

Instruments:

5. **`axis-projector`** — one line through the cloud, rotatable by hand. Two readouts
   live simultaneously: **variance of the projection** onto the line, and **total
   squared perpendicular distance** to the line. One climbs as the other falls;
   extremes at the identical angle. *Maximizing variance and minimizing error are one
   act seen from two sides.* PCA stops being arbitrary here.
6. **`three-lines`** — OLS y~x, OLS x~y, and PC1 overlaid on the same cloud, each with
   its own residual geometry drawn in its own stripe orientation (§9): vertical,
   horizontal, perpendicular ticks. *Three lines through the same points, because
   three different questions.* The explicit bridge back to rung 1.
7. **`basis-spin`** — the cloud rotating into PC coordinates: axes become PC1/PC2, the
   ellipse straightens. "The data in new coordinates," made concrete (owner kept this).
8. **`scree`** — variance-explained bars, linked to basis-spin. Modest in 2D; the
   payoff is the 4-variable clinical case:
   - **Clinical payoff:** PCA on BPD, HC, AC, FL together. PC1 emerges as *overall
     fetal size*, PC2 as *head-vs-body proportion* — a true, well-established
     morphometric result, and implicitly what growth-standard papers do. A
     **raw vs standardized** toggle shows the units decision changing the answer —
     the honest PCA lesson, closing the loop from units-trap.

## 8. Data

All datasets are small committed JSON in `data/`, each file carrying its own
provenance block (source, year, extraction method, citation, license note).

- **Synthetic:** generated in-browser by a seeded PRNG (mulberry32); default seeds
  committed so pages render identically for everyone; "resample" draws a new seed.
  Ground truth (true line, true ρ) always carried in state and drawable.
- **NCHS natality** (rung 1): birthweight and gestational age (plus a couple of
  covariates banked for future rungs), ≤500 points, provenance under `data/README.md`.
  Concrete initial route: the OpenIntro `births14` sample (1,000 births drawn from the
  2014 NCHS natality file; openly licensed, citable, kilobytes not gigabytes),
  downsampled. A direct extract from a raw NCHS public-use file (multi-GB) is the
  documented upgrade path, not a prerequisite.
- **Fetal biometry** (rungs 2–3): **simulated from published reference centiles and
  correlation structure** (Hadlock-era / WHO fetal growth parameters), labeled plainly
  on-page as "simulated from published parameters." Rationale: individual-level public
  fetal biometry data effectively doesn't exist without a data request, and the
  PC1-size / PC2-proportion result is robust to simulation from published covariance.
  The JSON format is documented so real data can be swapped in later without touching
  instruments. Owner is the domain authority on whether the simulated values look right.

## 9. Visual system

**Hard constraint: the owner is colorblind. No meaning rides on hue alone, ever.**
Translucent color washes are banned for anything meaningful.

The texture system (approved; the Lichtenstein vocabulary — dots AND stripes AND
solids, separated by heavy outlines, each with a different job):

- **Ben-Day dot screens carry magnitude** ("how much"): residual-square fills, error
  totals. Dots are coarse (Lichtenstein-scale, ~r=3px on a 12px grid), quantized to
  ≤5 density steps — no continuous screens, which avoids moiré and drag shimmer.
  Patterns use `patternUnits="userSpaceOnUse"`, so a growing square gains dots at
  fixed density: **dot count ∝ area ∝ squared error — the best-fit line spends the
  least ink**, and dragging toward the optimum visibly de-inks the page.
- **Stripe orientation carries direction/category** ("which way"): vertical hatch =
  y~x residuals, horizontal = x~y, perpendicular-to-line = PC1. The fill itself
  teaches the projection geometry.
- **Solids + heavy outlines carry structure** ("what it is"): points, fitted lines,
  the ellipse.
- **Surfaces** (loss bowl, any heatmap): ~~**viridis** — perceptually uniform, so the
  information rides on luminance — with **drawn contour lines** on top, so the surface
  reads as topography rather than a color wash.~~
  **AMENDED 2026-08-20 (owner art direction, evening):** surfaces are **graduated ink
  halftone** — dot area linear in the normalized value (`js/lib/halftone.mjs`), bare
  paper at the minimum, dots fusing toward solid at the maximum — with the same drawn
  contour lines on top. Andrew's rule, from the Reflections-series reference he sent:
  dots that show a **gradient must vary in size/weight** (true Lichtenstein
  gradation); dots that merely fill a counted area stay a **fine uniform screen**
  ("you can just see the area"). Information still rides on luminance — ink coverage —
  so the encoding remains colorblind-safe and inverts cleanly in dark mode. Viridis
  retired from the codebase with this change.
- Lines: distinct dash patterns AND direct labels welded to line ends — no
  cross-referenced legends. Point classes: distinct glyph shapes, not hue.
- Hue, when used, comes from Okabe-Ito (blue #0072B2 / vermillion #D55E00 first), and
  is always duplicated by a texture/dash/label channel — the deck-engine discipline.
- Chrome: IBM Plex Serif/Sans/Mono; the parent site's `--color-*` token vocabulary;
  dark mode inverts to light ink on dark ground (reverse halftone — also canon
  Lichtenstein).
- Every figure must be legible in pure grayscale by construction; spot-check by
  desaturating.

## 10. Math core and numerics

`js/math/core.mjs` — pure functions, no DOM, no dependencies:

- `mean`, `variance`, `covariance`, `corr`, `standardize`
- `ols(xs, ys)` → slope/intercept/residuals/SSE; `lossSurface(xs, ys, grid)` for the bowl
- `eigSym2(sxx, sxy, syy)` — closed-form 2×2 symmetric eigen (angle + values)
- `jacobiEigen(A)` — general symmetric Jacobi rotation (needed for 4-var biometry PCA)
- `pca(X, {standardize})` → components, variance explained, scores
- `mulberry32(seed)` + a gaussian sampler

Numerics rules:

- **Every 2×2 case runs through both eigensolvers in tests** — closed form and Jacobi
  must agree. A free cross-check for the bug class you can't eyeball.
- **Eigenvectors are sign-ambiguous.** All comparisons — tests and any render logic —
  compare *directions*, and `pca()` normalizes sign by convention (largest-magnitude
  component positive) at its boundary so rendering is stable frame-to-frame (no
  flip-flicker while dragging).
- Jacobi: iterate until max off-diagonal < 1e-12 or 50 sweeps; assert symmetric input.

## 11. Testing

The deck-engine discipline (`power.py` ↔ `power.test.mjs`), ported:

- `reference/fixtures.py` — numpy computes ground truth for a battery of cases (OLS
  fits, covariance matrices, 2×2 and 4×4 eigen, PCA on the committed biometry data,
  loss-surface spot values) and writes `test/fixtures.json`. Hand-run; output
  committed; Python needed only when the reference changes.
- **Runner: `node --test`** (built into Node 24; zero dependencies). Owner delegated
  the call; decided for the builtin: a devDependency would be the only thing in the
  repo able to bit-rot, and the tests are plain fixture comparisons. Migrating to
  vitest later is a rename — a reversible door.
- `test/math.test.mjs` — JS math vs fixtures (tolerance 1e-9; eigen compared as
  directions per §10; dual-solver agreement on all 2×2 cases).
- `test/instruments.test.mjs` — for each instrument: `render(defaults)` and
  `render(posterState)` return well-formed SVG (parseable, single root, viewBox);
  targeted geometry assertions (residual-square areas sum to the SSE readout; PC1
  angle in the SVG matches `eigSym2`; three-lines slopes match ols / inverse-ols / pca).
- `test/poster.test.mjs` — poster injection round-trip is idempotent.

## 12. Repo layout

```
shadowbox/
  index.html                 # trellis stub: three rungs, honest "more coming"
  least-squares.html         # rung 1
  covariance.html            # rung 2
  pca.html                   # rung 3
  css/shadowbox.css          # tokens; texture patterns live in per-page SVG defs
  js/
    math/core.mjs
    instruments/{fit-scatter,loss-bowl,cloud-ellipse,units-trap,
                 axis-projector,three-lines,basis-spin,scree}.mjs
    lib/hydrate.mjs
  data/*.json + data/README.md           # datasets with provenance
  figures/*.svg                          # committed poster frames
  tools/poster.mjs                       # hand-run; injects posters into HTML
  reference/fixtures.py                  # numpy ground truth → test/fixtures.json
  test/*.test.mjs + test/fixtures.json
  docs/superpowers/specs/                # this file
  CLAUDE.md                              # repo conventions (solo dev, main, no PRs)
```

## 13. Milestones

- **M1 — skeleton + math core.** Repo, CLAUDE.md, css tokens, `core.mjs`,
  `fixtures.py`, fixtures committed, `node --test` green. *Accept: both eigensolvers
  agree; JS matches numpy.*
- **M2 — rung 1.** fit-scatter + loss-bowl linked, staged data incl. the NCHS extract,
  essay prose, posters, tests. *Accept: page teaches with JS disabled; drag is smooth;
  "least ink" visibly works.*
- **M3 — rung 2.** cloud-ellipse + units-trap, biometry pair, prose, posters, tests.
- **M4 — rung 3.** axis-projector, three-lines, basis-spin, scree, the 4-variable
  biometry payoff, prose, posters, tests.
- **M5 — polish + publish.** index/trellis stub, cross-rung nav, print check,
  grayscale check, keyboard pass, GitHub Pages live, apps.html card (owner approves
  the card and the push separately).

Each milestone is a natural stop point; no autonomous run chains more than two of them
without a checkpoint (per global session rules).

## 14. Risks

- **Moiré / drag shimmer** from dot screens → coarse, quantized screens only (§9).
- **Eigen sign flicker** while dragging → sign convention at the `pca()` boundary (§10).
- **Loss-bowl cost** (grid recompute per drag frame) → the surface recomputes only when
  the *data* changes; marker moves are an overlay draw.
- **Pattern-fill performance** on low-end devices → patterns are per-SVG defs, reused;
  point counts capped (≤500) per instrument.
- **Poster injection corrupting pages** → idempotent markers + round-trip test (§11).
- **Biometry realism** → simulated from published parameters, labeled on-page,
  owner-reviewed; the swap path to real data is documented (§8).

## 15. Decision log (owner-approved, 2026-08-20)

1. Endpoint: mechanism-first for Andrew, doubling as a permanent fellow-facing teaching
   tool on the public site.
2. Decompose into A/B/C/D; A first, as a three-rung slice ending at PCA; UMAP next slice.
3. Data: both worlds, staged — synthetic truth first, clinical reality second, the
   contrast as the lesson.
4. Shape: essays composed of first-class instruments (pure state→SVG + control spec).
5. Repo/hosting: standalone repo → GitHub Pages at `andrewrausch.com/shadowbox/`;
   static-first with committed poster frames; hand-run generator scripts only.
6. Name: **shadowbox**.
7. Scope: all eight instruments, including basis-spin and scree.
8. Textures: Ben-Day dots = magnitude, stripe orientation = direction, heavy outline =
   structure; viridis + contours for surfaces; no hue-only meaning anywhere.
9. Tests: numpy reference → committed fixtures → `node --test` (builtin over vitest).
