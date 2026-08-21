# shadowbox — next steps

## Decisions waiting on Andrew
- [ ] **Read the rewritten prose and rule on it.** Specifically the "Why squares?"
      section of rung 1 and the covariance definition in rung 2. Previous three
      attempts failed; this one is written to a different brief (see Watch out for).
      That verdict gates writing rung 3's prose.
- [ ] apps.html card on andrewrausch.com — now unblocked, the site is public.
- [x] ~~Flip public + enable Pages~~ — done 2026-08-21. Live at
      https://andrewrausch.com/shadowbox/ (HTTPS enforced, custom domain automatic).
- [x] ~~Dot colour~~ — done: `--ink-dot` grey token for halftone screens only.
- [x] ~~Biometry sim parameters~~ — Andrew accepted them ("doesn't have to be a
      worthwhile study question, can just show association").

## Build queue (spec §13)
- [x] ~~**M3 — rung 2, covariance**~~ — done 2026-08-20/21.
- [ ] **M4 — rung 3, PCA** — *instruments built, page not written.*
      `axis-projector`, `three-lines`, `basis-spin`, `scree` are committed and their
      tests pass (suite is 65 green). Still to do: write `pca.html`, wire the mounts,
      add the poster configs to `tools/poster.mjs`, run `node tools/poster.mjs`,
      link it from index.html + the rung-2 footer. **Do not write its prose until
      Andrew rules on the rung 1/2 rewrite.**
- [ ] **M5 — polish + publish**: trellis nav, print + grayscale + keyboard passes,
      apps card.
- [ ] Rung 4 (next slice, own spec addendum): UMAP — high-dimensional distance +
      iterative-optimization "start from zero" blocks, precomputed embeddings.

## Loose threads
- [ ] The PCA subagent's written report never arrived before the session ended.
      Its code is committed and green, but **its measured PCA numbers were never
      reported** — so the claim "PC1 = overall size, PC2 = head-vs-body proportion"
      on the 4-variable biometry data is *not yet verified by me*. Re-measure before
      putting that claim in prose.
- [ ] Empty leftover worktree in the site repo:
      `C:/rauscha.github.io/.claude/worktrees/objective-mcclintock-817c73`.
      Verified clean and at the same commit as master — nothing stranded, safe to
      remove with `git worktree remove` whenever.
- [x] ~~Stale font claim in rauscha.github.io CLAUDE.md~~ — fixed and pushed (7e574d7).
- [x] ~~index.html slogan closers~~ — rewritten 2026-08-21.

## Not this project, but noticed while checking worktrees (untouched)
- `hp-review` has ~17 uncommitted modifications (NEXT_STEPS.md, README.md, SKILL.md,
  scripts/aggregate.py, reference/*.md) from another session, plus a worktree at
  `C:/claudeyard/hp-data-batch1` holding untracked `_grading_pipeline/` output dirs.
- `mfm-round-2`: untracked `scripts/lor_orchestrate.py`.
- `mfm-round-3`: untracked `SESSION-3-NOTES.md`.
- `digi-me`: two `.prev` log files (junk).
Left alone deliberately — not this session's work, and committing another session's
half-finished state blindly is how things get lost.
