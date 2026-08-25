# shadowbox - next steps

## Decisions waiting on Andrew
- [x] ~~Read the rewritten prose and rule on it~~ - done 2026-08-22. He rewrote
      lesson 1's opening himself, scored lesson 2 ("these actually look pretty
      good", one flourish cut), and scored lesson 3's outline before it was
      written. Nine rules plus 7b and 10-13 are in PROSE-GUIDE.md.
- [ ] **Read the lesson-4 spec and rule on it** - blocking. The implementation plan
      waits on this. `docs/superpowers/specs/2026-08-24-shadowbox-kmeans-design.md`.
- [ ] **Half-step decision in `kmeans-step`** - assign and recompute as two separate
      visible moves (doubles the clicks to convergence, but it is the mechanism), or
      one combined step. Specced as half-steps; never ruled on.
- [ ] apps.html card on andrewrausch.com - now unblocked, the site is public.
- [x] ~~Flip public + enable Pages~~ - done 2026-08-21. Live at
      https://andrewrausch.com/shadowbox/ (HTTPS enforced, custom domain automatic).
- [x] ~~Dot colour~~ - done: `--ink-dot` grey token for halftone screens only.
- [x] ~~Biometry sim parameters~~ - Andrew accepted them ("doesn't have to be a
      worthwhile study question, can just show association").

## Build queue (spec §13)
- [x] ~~**M3 - lesson 2, covariance**~~ - done 2026-08-20/21.
- [x] ~~**M4 - lesson 3, PCA**~~ - done 2026-08-22. `pca.html` live with all four
      instruments plus a fifth figure (scree on GA-adjusted residuals). Every
      number in the prose is pinned by `test/pca-claims.test.mjs`.
- [x] ~~**M5 - polish**~~ - done 2026-08-22. Trellis nav across all three lessons
      (current page marked by glyph + weight + luminance, never colour). Real
      print stylesheet: tokens collapse to ink on white, controls and nav hidden,
      collapsibles forced open via a beforeprint handler, figures and headings
      protected from page breaks, footer links print their URLs. Keyboard was
      already built (tabindex, aria-labels, keydown, focus restored across
      re-render) and is verified. Grayscale verified: `--accent-warm` is used by
      no instrument, and the three line families in three-lines carry distinct
      dash patterns, so nothing depends on hue.
- [ ] **M6 - lesson 4, k-means** - spec written 2026-08-24 and **waiting on Andrew's
      read**: `docs/superpowers/specs/2026-08-24-shadowbox-kmeans-design.md`. Four
      instruments (`kmeans-step`, `restart-roulette`, `elbow`, `label-vs-truth`), one
      new data file (`data/blobs.json`), one additive contract change (optional
      `step(state)` export plus a Play loop in `hydrate.mjs`). Build order is
      `tools/make-blobs.mjs` then `test/kmeans-claims.test.mjs` then instruments then
      prose - the test exists before the prose, deliberately.
- [ ] **M7 - lesson 5, UMAP** - deferred. Teaches k-nearest-neighbours inside itself.
      Inherits lesson 4's two "start from zero" blocks (distance between rows;
      iterative optimisation) and its Play control surface, which is designed to accept
      a precomputed frame index because UMAP cannot optimise live in the browser.

  **Queue changed shape 2026-08-24.** UMAP was lesson 4; k-means was not on the ladder
  at all. k-means went first because iterative optimisation has to be taught somewhere
  the truth is still visible, and lessons 1 to 3 are all closed-form. Note for anyone
  reading later: UMAP does **not** use k-means. Its first step is a kNN graph. The two
  share a letter and nothing else, and lesson 5 says so out loud.

## Loose threads
- [x] ~~PCA claim unverified~~ - measured 2026-08-22. "PC1 = overall size" holds
      (97.98% raw / 97.53% standardized). **"PC2 = head-vs-body proportion" does
      not** - it is head-vs-abdomen only in raw mm, becomes abdomen-vs-rest when
      standardized, and is ~1% of the variance either way. The page teaches the
      flip instead of asserting either reading. The real finding: all six
      pairwise correlations are 0.958-0.972 because gestational age drives all
      four measurements, so PC1 is GA in disguise.
- [ ] Empty leftover worktree in the site repo:
      `C:/rauscha.github.io/.claude/worktrees/objective-mcclintock-817c73`.
      Re-checked 2026-08-24: it now sits at `f38fde7` while master has moved to
      `28ed0fc`, so it is no longer "the same commit" - but `git merge-base
      --is-ancestor` confirms f38fde7 is fully contained in master, with no
      uncommitted changes. Nothing stranded. Clear it with:
      `git -C C:/rauscha.github.io worktree remove .claude/worktrees/objective-mcclintock-817c73`
- [x] ~~Stale font claim in rauscha.github.io CLAUDE.md~~ - fixed and pushed (7e574d7).
- [x] ~~index.html slogan closers~~ - rewritten 2026-08-21.

## Not this project, but noticed while checking worktrees (untouched)
- `hp-review` has ~17 uncommitted modifications (NEXT_STEPS.md, README.md, SKILL.md,
  scripts/aggregate.py, reference/*.md) from another session, plus a worktree at
  `C:/claudeyard/hp-data-batch1` holding untracked `_grading_pipeline/` output dirs.
- `mfm-round-2`: untracked `scripts/lor_orchestrate.py`.
- `mfm-round-3`: untracked `SESSION-3-NOTES.md`.
- `digi-me`: two `.prev` log files (junk).
Left alone deliberately - not this session's work, and committing another session's
half-finished state blindly is how things get lost.
