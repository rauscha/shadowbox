# shadowbox - next steps

## Decisions waiting on Andrew
- [x] ~~Read the rewritten prose and rule on it~~ - done 2026-08-22. He rewrote
      lesson 1's opening himself, scored lesson 2 ("these actually look pretty
      good", one flourish cut), and scored lesson 3's outline before it was
      written. Nine rules plus 7b and 10-13 are in PROSE-GUIDE.md.
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
- [ ] **M5 - polish + publish**: trellis nav, print + grayscale + keyboard passes,
      apps card.
- [ ] Lesson 4 (next slice, own spec addendum): UMAP - high-dimensional distance +
      iterative-optimization "start from zero" blocks, precomputed embeddings.

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
      Verified clean and at the same commit as master - nothing stranded, safe to
      remove with `git worktree remove` whenever.
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
