# shadowbox

Interactive visual statistics explainers. Every method on the ladder - least squares,
covariance, PCA, eventually UMAP - casts a shadow of the data and asks you to judge
the object from it. These pages let you move the light.

Each lesson is an essay built from **instruments**: pure `render(state) → SVG` modules
you drag, with every idea taught twice - first on synthetic data with the truth drawn
on screen, then on real clinical data where no one has the truth.

## Lessons

1. **[Least squares](least-squares.html)** - residuals as literal dot-screened
   squares (*the best fit spends the least ink*), the loss landscape as a bowl you
   can drag, and 400 real births from the 2014 NCHS natality file. **Live.**
2. **[Covariance](covariance.html)** - the matrix is an ellipse, and the units
   trap that hides a correlation in plain sight. **Live.**
3. **[PCA](pca.html)** - the long axis of the data, found two ways that turn out
   to be one way. **Live.**
4. **[k-means](kmeans.html)** - groups you choose in advance, six random starts
   that disagree with each other, and 350 simulated growth scans where the
   clusters turn out to be recovering gestational age. Generated data in
   `data/blobs.json`. **Live.**

## Running it

- Preview: `python -m http.server 8000` then http://localhost:8000/ (ES modules - `file://` won't work)
- Tests: `node --test` (Node ≥ 20; zero dependencies)
- Regenerate numpy ground truth: `uv run --with numpy python reference/fixtures.py`
- Regenerate poster frames after changing an instrument: `node tools/poster.mjs`

## Design commitments

- **Pure static, zero runtime dependencies, no build step.** Hand-run scripts with
  committed output only. Built to still work in 2041.
- **Static-first:** every figure ships as a committed SVG poster frame inlined in the
  page; JS upgrades it to a live instrument. With JS off the page still teaches and
  prints.
- **Colorblind-safe by construction:** no meaning rides on hue alone. Dot screens
  carry magnitude, stripe orientation carries direction, heavy outlines carry
  structure; surfaces are graduated ink halftone - dot area linear in the value,
  bare paper at the minimum - with drawn contour lines.
- **Numerics pinned:** the JS math core is tested against numpy fixtures
  (`reference/fixtures.py` → `test/fixtures.json`), with dual eigensolvers
  cross-checked on every 2×2 case.

Spec and plans live in `docs/superpowers/`.
