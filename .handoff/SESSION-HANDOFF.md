# Session hand-off - 2026-08-24 (machine: desktop)

## STATE (read this first)
- Branch: `main`, clean, synced with `origin/main`.
- Lessons 1 to 3 are live at https://andrewrausch.com/shadowbox/. M1 through M5 closed.
- **The build queue changed shape this session.** k-means is now lesson 4; UMAP moved to
  lesson 5. The lesson-4 spec is written, committed, and **waiting on Andrew's read**.
  Nothing is being built until he rules on it.

## Done this session
- **Reframed the queue.** UMAP does not use k-means; its first step is a
  k-nearest-neighbour graph. The two share a letter and nothing else. But k-means still
  belongs first, because it is where iterative optimisation gets taught in 2D where the
  truth is still visible, and lessons 1 to 3 all had closed-form answers.
- **Andrew's framing is the lesson's spine.** k-means is not a projection, but it is
  still a projection in the Plato's Cave sense: a representation of something else,
  possibly true, possibly false, flattened either way. That resolves the apparent break
  in the ladder without the page having to apologise for it.
- **Measured before writing**, which is the lesson-3 scar. Findings that changed the
  design: biometry clusters are gestational age in a costume (0.871 of GA variation
  accounted for at k=3, up to 0.941 at k=5); no elbow on either real dataset; blobs
  restarts spread 579% and k-means++ fixes them 60 of 60; crescents restarts all agree
  at 0.2% spread and all are 74.7% right at best; the units-trap callback is dead at
  93.7% agreement and was cut.
- **Two cold readers** (Haiku and Opus, no repo access) reviewed the design outline.
  They caught a real design bug - the six-shape cap on k was unscoped and would have
  crippled the `elbow` instrument - plus three load-bearing unglossed terms. Both fixed
  in the spec.
- **Spec committed:** `docs/superpowers/specs/2026-08-24-shadowbox-kmeans-design.md`.
- **Measurement scripts preserved** into `reference/kmeans-probe-real.mjs` and
  `reference/kmeans-probe-synthetic.mjs`. Both verified to reproduce the spec's §7
  numbers from the repo root.

## Next up
1. **Andrew reads the spec.** Blocking - the implementation plan waits on it.
2. **Rule on the half-step decision** in `kmeans-step`: assign and recompute as two
   separate visible moves (doubles the clicks to convergence, but it is the mechanism),
   versus one combined step. Specced as half-steps; he never ruled.
3. **Then `writing-plans`** to turn the spec into an M6 implementation plan.
4. **M6 starts with `tools/make-blobs.mjs` and `test/kmeans-claims.test.mjs`**, both
   before a word of prose. The spec's §7 table is the test's contents.

## Watch out for
- **Do not let prose get written before the claims test exists.** That inversion is
  exactly what produced the wrong PC2 claim in lesson 3.
- **The synthetic generators in `reference/kmeans-probe-synthetic.mjs` are the spec for
  `data/blobs.json`** (§6). Seeds 42 / 43 / 44. If they drift, every restart number in
  §7 drifts with them.
- **M6 is a large multi-task build** (4 instruments, a contract change to `hydrate.mjs`,
  a new data file, a claims test, prose, posters). Commit after each instrument;
  consider `/compact` between them.
- **Open decision unrelated to lesson 4:** the `apps.html` card on andrewrausch.com,
  unblocked since the site went public. Never actioned. Say the word and it gets drafted
  through the `add-app-card` flow, which shows the diff before pushing.
- **Site-repo worktree, now verified harmless.** `C:/rauscha.github.io/.claude/worktrees/
  objective-mcclintock-817c73` sits at `f38fde7`, which this session confirmed is a
  fully-merged ancestor of `master` with no uncommitted changes. Nothing stranded.
  Clear it whenever with:
  `git -C C:/rauscha.github.io worktree remove .claude/worktrees/objective-mcclintock-817c73`
- **Other repos still holding another session's loose work, deliberately untouched:**
  `hp-review` (17 modifications, 2 worktrees, plus `C:/claudeyard/hp-data-batch1`),
  `mfm-round-2` (1), `mfm-round-3` (1), `digi-me` (2). Unchanged since 2026-08-22.
  Committing another session's half-finished state blindly is how things get lost.
