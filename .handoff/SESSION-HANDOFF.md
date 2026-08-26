# Session hand-off - 2026-08-26 (machine: desktop)

## STATE (read this first)

- Branch: `main` at `c95bb29`, clean, pushed, synced with `origin/main`.
- **M6 is complete and lesson 4 is live** at https://andrewrausch.com/shadowbox/kmeans.html.
  Four lessons now ship: least squares, covariance, PCA, k-means. 177 tests pass, poster
  generation is idempotent, and the page teaches with JavaScript off. Every number in the
  prose is pinned by a test that was written before the prose existed. The next milestone
  is M7, lesson 5, UMAP, and nothing blocks starting it.

## Done this session

- **Lesson 4 shipped end to end**: four instruments (`kmeans-step`, `restart-roulette`,
  `elbow`, `label-vs-truth`), `data/blobs.json`, `js/lib/marks.mjs` (the shape channel),
  `kmeans.html`, four committed poster frames, nav and index wired.
- **Prose cleared as written.** The draft lives at `.handoff/LESSON-4-PROSE-DRAFT.md` and
  its header records what was ruled, including two short sentences that were cleared with
  them in and must not be tidied away later.
- **Mobile drag bug fixed** (`c397076`). Touch drags were dying after one animation frame
  because the node under the finger was destroyed on every re-render. Drag listeners now
  live on the mount container, controls update in place, and `touch-action: none` is
  scoped to handles and sliders only so pages still scroll.
- **Keyboard defect fixed.** The six roulette panels carried `role="button"` and
  `tabindex="0"` but the page listened only for `click`, so they did nothing for anyone
  not using a mouse. Enter and Space now work.
- **Two untested colorblind-shape holes closed.** Nothing asserted that clusters get
  different shapes on `restart-roulette`, or that `kmeans-step`'s legend matches the
  points it keys. Both were holes in the tests, not the drawing.
- `.gitattributes` added (`* text=auto eol=lf`), measured to cost zero content diff.

## Next up

1. **M7, lesson 5, UMAP.** Spec first. `NEXT-STEPS.md` records what it inherits (the two
   "start from zero" blocks, the Play surface built to take a precomputed frame index, the
   shape channel in `marks.mjs`) and the one thing it must **not** inherit blindly: the
   k=6 cap, which binds only instruments drawing membership as a mark per point. This is a
   large multi-task build - commit after each task and consider `/compact` between them.
2. **Stranded work in other sandbox projects** - see "Watch out for". `hp-review` is the
   one that matters.
3. **`apps.html` card on andrewrausch.com** - still open, unblocked since 2026-08-21,
   never actioned. Carried in `.handoff/PENDING-DECISIONS.md`.

## Watch out for

- **`hp-review` has 984 insertions across 12 files sitting uncommitted, last commit two
  weeks ago**, on branch `grader-skill`. This is real source work (scripts, SKILL.md,
  README, plans) that exists only in that working tree. Not touched here because it is not
  this session's work. It wants committing.
- **`hp-data-batch1` is a worktree of `hp-review` sitting on a detached HEAD** (`be4ace8`)
  with 12MB of untracked grading-pipeline output. Detached HEAD is fragile. The output is
  generated data, but the state is worth resolving deliberately.
- Loose untracked files elsewhere: `mfm-round-2/scripts/lor_orchestrate.py`,
  `mfm-round-3/SESSION-3-NOTES.md`, `mfm-round-4/SESSION-4-NOTES.md`, and two stale
  `.log.prev` files in `digi-me`. `app-review` is clean and its side branch is merged.
- **iOS Safari is accepted, not verified.** Every measurement of the mobile drag fix was
  Blink under DevTools emulation. Ismely will check a real iPhone. If drags still die
  mid-gesture, that is a *second* mechanism and wants its own investigation, not a re-run
  of the same fix. Recorded under "Accepted, not verified" in `NEXT-STEPS.md`.
- **`pca.html:888` keeps "gestational age wearing a disguise"** by explicit ruling, even
  though the same metaphor was cut from lesson 4. Lesson 3's prose was approved before
  that rule existed. `PROSE-GUIDE.md` rule 14 carries the standing exception. Do not
  sweep it out for consistency.
- **The house-rules test sweep drives a hand-written list of four instrument names**
  (`test/instruments4.test.mjs`). Lesson 5's instruments must be added to it or it passes
  by simply not looking at them.
- Filed as future work, deliberately not done: `band-mean`/`band-n` inside the clip group
  in `label-vs-truth` (cannot trigger on fixed data), the double-mount case in
  `hydrate.mjs` (no live caller), and three small refactors that belong with lesson 5.
