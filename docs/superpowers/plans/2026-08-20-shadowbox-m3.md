# M3 — rung 2: covariance geometry (short plan, off spec §7/§8/§13)

Written overnight 2026-08-20. Foundations already exist: `covariance`/`corr`/`eigSym2`/
`synthCloud` in core.mjs, hydrate runtime, poster pipeline, halftone design language,
prose-lint. Prose gets written in the human register from the start and linted.

## Shape

- **New lib `js/lib/cloud.mjs`** — shared cloud/ellipse geometry:
  `chol2(sxx, sxy, syy)` (2×2 Cholesky), `whiten(xs, ys)` (returns base points with
  exact sample mean 0 and identity sample covariance, so transformed clouds carry the
  target covariance *exactly* — matrix readout equals displayed-cloud covariance, no
  sampling slop), `ellipsePath(cx, cy, Sigma, k, scale)` via eigSym2.
- **`cloud-ellipse` instrument** — state {sxx, sxy, syy} + fixed whitened base cloud.
  Renders: points (dots), covariance ellipse (heavy outline, k=2), PC1 stripe hint
  inside the ellipse (direction channel), and the 2×2 matrix as four in-SVG numbers.
  Bidirectional: drag x-spread / y-spread / tilt handles → Σ updates; drag a matrix
  number vertically (or arrow keys) → cloud reshapes. sxy handle drives both
  off-diagonals; |sxy| clamped to 0.99·√(sxx·syy) to stay positive-definite.
  Controls: ρ slider + resample (both `needsTruth`-gated so real-data mounts drop them).
- **`units-trap` instrument** — same store as the synthetic cloud-ellipse mount (linked
  like fit-scatter↔loss-bowl). Big matrix numbers, small cloud, unit toggles per axis
  (mm↔cm, g↔kg). Covariance entries jump by 10×/1000×/10⁶; r readout does not move.
  Third mount runs on the real biometry pair with real-unit toggles.
- **hydrate**: add declarative `needsTruth` gating to controlsMarkup (replaces nothing;
  the two hardcoded id checks stay for rung 1 compatibility).
- **Data `data/biometry.json`** via `tools/make-biometry.mjs`: GA ~ 24–40w, biometry
  (HC, AC, FL in cm) from smooth GA medians with correlated lognormal-ish noise, then
  **EFW = Hadlock 1985 three-parameter formula** log10(W) = 1.326 − 0.00326·AC·FL +
  0.0107·HC + 0.0438·AC + 0.158·FL — so the dataset *constructionally* embodies the
  EFW-circularity aside (§7). Provenance block cites Hadlock 1985; the GA median
  curves are marked "provisional, owner to eyeball" unless verified tonight. Page
  labels the data "simulated from published parameters" per §8.
- **Essay `covariance.html`** — start-from-zero (mean; variance as spread along an
  axis); beats: cloud → ellipse → *the covariance matrix IS an ellipse* → units trap →
  correlation as the unit-proof number → real HC-vs-EFW pair (mm vs g is Tuesday) →
  EFW-circularity aside → bridge to rung 3 (standardization). Poster markers for the
  three mounts; footer nav both directions; index.html rung 2 goes live.

## Order (TDD where testable)

1. hydrate `needsTruth` + test.
2. cloud.mjs (chol2/whiten/ellipsePath) + tests (whiten exactness; chol reconstruction;
   ellipse axes match eigSym2 on knowns).
3. cloud-ellipse + tests (matrix readout == state Σ; drag inverts; PSD clamp holds;
   prefixed ids; graduated design rules hold — no hue-only meaning).
4. units-trap + tests (unit toggle scales covariance entries exactly, r invariant to
   1e-12; labels swap).
5. make-biometry.mjs + data + tests (EFW matches Hadlock formula on the generated
   rows; provenance present; ranges clinically sane: e.g. EFW ~600–4000 g over range).
6. Essay + posters (poster.mjs configs) + prose-lint + browser QA light/dark.
7. Commit per task; push at the end of M3.

## Accept (spec §13 M3)

cloud-ellipse + units-trap live and linked, biometry pair present and labeled,
prose teaches with JS off, posters committed, `node --test` green.

## Deliberately deferred

- Rung 3 instruments (M4), publish/apps card (M5, Andrew's call), any real (non-
  simulated) biometry data (documented upgrade path).
