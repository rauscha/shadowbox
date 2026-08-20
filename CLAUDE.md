# shadowbox

Interactive visual statistics explainers (least squares → PCA → UMAP), pure static,
served at andrewrausch.com/shadowbox/. Spec: docs/superpowers/specs/.

## Rules

- Solo dev. `main` is the working branch; push means push `main`; no PRs.
- Zero runtime dependencies, no node_modules, no build step. Hand-run scripts with
  committed output only (`tools/poster.mjs`, `reference/fixtures.py`).
- Tests: `node --test test/` (Node 24). Fixtures: `uv run --with numpy python reference/fixtures.py`.
- Preview: `python -m http.server 8000` (ES modules — file:// won't work).
- Owner is colorblind: no meaning on hue alone, ever. Dots carry magnitude, stripe
  orientation carries direction, heavy outline carries structure; surfaces are
  quantized viridis + drawn contours. No translucent fills for meaning.
- Every SVG id is prefixed `sb-${idKey}-`; unique idKey per instrument instance per page.
- Posters: `node tools/poster.mjs` regenerates figures/ and re-injects into pages
  between `<!-- poster:KEY -->` markers (idempotent). Run after changing any instrument.
