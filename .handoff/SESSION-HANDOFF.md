# Session hand-off - 2026-08-27 (machine: desktop)

## STATE (read this first)

- Branch: `main`, clean, pushed, synced with `origin/main`.
- **M7's spec is written and waiting on your ruling**:
  `docs/superpowers/specs/2026-08-27-shadowbox-umap-design.md`. It was measured before it
  was written, per the standing rule - `js/math/umap.mjs` is already built and pinned
  against umap-learn 0.5.12, and `node --test` is green at **195 tests**. Nothing is
  blocked: the moment the spec is approved, the next step is `writing-plans` for the
  build. Four lessons remain live at https://andrewrausch.com/shadowbox/.

## Done this session

- **`apps.html` card refreshed** (site repo `df44fbe`). It had not been un-actioned - it
  went in 2026-08-22 and had simply frozen at three lessons. You rewrote the copy
  yourself; the new wording deliberately names **no lessons** so it cannot go stale again.
- **`index.html` fixed twice** (`a417b0a`). It enumerated three lessons in both the meta
  description and the opening paragraph, and - more seriously - promised "real fetal
  measurements". The biometry is 350 simulated scans and every lesson page says so, with
  "not patients" on the figures; the landing page was the one surface contradicting them.
- **UMAP core built and pinned** (`ff8e17e`): `js/math/umap.mjs`, `reference/umap-probe.py`
  (ground truth from umap-learn), `reference/umap-measure.mjs`, `test/umap.test.mjs`.
  Every rho exact, every sigma and edge weight within 1e-5, the a/b fit within 5.1e-6
  across a 28-point grid.
- **M7 spec written** (`4813bfc`). Four instruments, no new data files, **no contract
  change** - M6's Play loop already takes it.

## Next up

1. **Rule on the M7 spec.** Same gate lesson 4's spec had - brief or read cold. Its §2
   collects the four things measurement reversed, and each one changes a design decision,
   so that section is the one that actually needs you.
2. **Then `writing-plans` for M7.** Large multi-task build - commit after each task and
   consider `/compact` between them.
3. **One real-hardware check before M7 closes:** all UMAP timings are Node/V8. The claim
   that it runs live in a browser is an inference from 96 ms worst case, not a measurement.

## Watch out for

- **The research thread has moved out of this repo and must not come back.** The
  MFM/OB study ideas that came up in this session now live at
  `C:\claudeyard\research-ideas\MFM-EMBEDDING-STUDIES.md`, with the supporting power
  simulation at `C:\claudeyard\fgr-trajectory-power\`. Shadowbox is the teaching project;
  keeping real-research work here dilutes both. One thing does belong here: the **UCI
  Cardiotocography** dataset was wanted as a *teaching* dataset for a future lesson.
- **Four things measurement reversed, all recorded in the spec's §2.** Most consequential:
  UMAP runs live at 96 ms, so the precomputed frame index that the *approved* lesson-4
  spec designed for is unnecessary. That is a correction to an approved spec.
- **`births.json` is dropped from lesson 5 only.** 78 duplicate rows of 400, 129 points
  whose nearest neighbour sits at distance 0, ~22% of rows where the k-th neighbour is
  decided by rounding. It stays in lessons 1, 2 and 4, which never ask who your
  neighbours are.
- **`test/instruments4.test.mjs` drives a hand-written list of four instrument names.**
  Lesson 5's four must be added or the house-rules sweep passes by not looking at them.
- **Poster frames vs a live-computed instrument** is a new problem lesson 4 did not have:
  the poster must be generated from a fixed seed and the live instrument must start from
  that same seed, or the page visibly jumps when JS loads.
- **`pca.html:888` keeps "gestational age wearing a disguise"** by explicit ruling
  (`PROSE-GUIDE.md` rule 14). Do not sweep it out for consistency.
- **iOS Safari is accepted, not verified** - Ismely was checking the mobile drag fix on a
  real iPhone. If drags still die mid-gesture, that is a *second* mechanism and wants its
  own investigation, not a re-run of the same fix.
- **`hp-review`'s uncommitted work is deliberate and local-only** (ruled 2026-08-26). Do
  not commit it, do not push it, do not flag it as stranded. Same for the
  `hp-data-batch1` worktree of that repo.
