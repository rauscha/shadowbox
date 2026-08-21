# Session hand-off — 2026-08-20 (machine: desktop, C:\claudeyard)

## STATE (read this first)
- Branch: `main`, clean, synced: yes — pushed to https://github.com/rauscha/shadowbox (private). Laptop can pull.
- shadowbox (interactive stats-explainer site, eventual home andrewrausch.com/shadowbox/) went from nothing to: approved spec, M1+M2 executed. Rung 1 "Least squares" is a finished interactive essay — linked fit-scatter + loss-bowl instruments, dot-screen residual squares ("least ink"), 400 real NCHS births, committed SVG poster frames so it teaches with JS off. 27/27 tests, numpy-pinned math core (OLS, covariance, dual eigensolvers, PCA) already built for rungs 2–3.
- Read `docs/superpowers/specs/2026-08-20-shadowbox-design.md` before building anything — it carries the whole decision log.

## Done this session
- Spec (3 rungs: least squares → covariance → PCA; UMAP is the next slice) + M1/M2 plan, both committed.
- Math core pinned against numpy fixtures (`reference/fixtures.py` → `test/fixtures.json`); closed-form 2×2 and Jacobi eigensolvers cross-checked.
- Instruments: fit-scatter (drag line/points, squares↔sticks, truth overlay) and loss-bowl (quantized viridis + marching-squares contours, draggable marker), linked through one store.
- Hydration runtime (declarative controls, pointer + keyboard drags, focus survives rerender, hidden-tab fallback).
- Data: `data/births.json` — OpenIntro births14 (2014 NCHS natality), provenance + regenerable converter.
- Poster pipeline (`tools/poster.mjs`, idempotent) + committed figures; essay page `least-squares.html`; README; browser QA (interactions, dark mode down to SVG ink, mobile overflow).

## Next up
- **Andrew decides: flip the repo public + enable GitHub Pages** when rung 1 (or 2) feels ready — that's what puts it at andrewrausch.com/shadowbox/.
- Andrew eyeballs rung 1 (`python -m http.server 8000` in the repo → localhost:8000/least-squares.html): overall look + a desaturated/grayscale glance — the one QA step that needed human eyes.
- M3 = rung 2 (covariance): write its short plan off spec §7/§13 (cloud-ellipse + units-trap instruments, simulated-from-published-centiles biometry pair per §8), then build. Foundations (eigSym2, synthCloud, hydrate) already exist.
- Check the separate background task "Fix stale font claim in rauscha.github.io CLAUDE.md" — as of hand-off that repo shows NO such commit, so it's unfinished or unstarted.

## Watch out for
- Repo is **private** for now — Pages/public URL doesn't exist until Andrew flips it public and enables Pages.
- Two eigensolvers must keep agreeing; eigenvector comparisons are direction-based (sign is normalized in `pca()`/`signNorm`) — don't "fix" a sign flip by editing expected values.
- `node --test` (no directory argument — passing `test/` breaks on this Windows Node).
- After editing any instrument, rerun `node tools/poster.mjs` so committed posters match the code (idempotent; test guards the injector).
- The rung-2 essay must include the EFW-circularity aside (EFW is computed from biometry incl. HC) — spec §7 flags it; the audience would catch it.
