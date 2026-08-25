# Pending decisions - for Andrew (updated 2026-08-24, end of session)

Everything from the 2026-08-21 list is now resolved. What is actually open:

## 1. Read the lesson-4 spec and rule on it (blocking)

`docs/superpowers/specs/2026-08-24-shadowbox-kmeans-design.md`, committed and pushed.
Nothing gets built until you have read it. The implementation plan is the next step
after your yes.

The two things most worth your eye:

- **§3.4 `label-vs-truth`** is the clinical payoff, and it is measured, not expected:
  cluster the four biometry variables and the labels account for 0.871 of the variation
  in gestational age at k=3, climbing to 0.941 at k=5. Same punchline as PC1 in lesson
  3, reached by unrelated machinery. You are the domain authority on whether that lands
  as a lesson or as a curiosity.
- **§8, what the lesson refuses to claim**, particularly the SGA/AGA/LGA line. Asked for
  three groups, k-means on the births cloud returns 10 / 159 / 231 with heavily
  overlapping gestational-age ranges, splitting mostly on weight. It does not recover
  the clinical categories. I read that as the better lesson; you may read it differently.

## 2. The half-step decision in `kmeans-step`

Assign and recompute as two separate visible moves, or one combined step per click?
Half-steps double the clicks to convergence but they are the actual mechanism, and
mechanism-first was the brief. Specced as half-steps. You never ruled, and it is the one
choice that changes how the core instrument feels to use.

## 3. apps.html card on andrewrausch.com

Still open, still unblocked, still never actioned - carried over since 2026-08-21. The
site is public, so the card can go in whenever. Say the word and it gets drafted for
your approval; the `add-app-card` flow shows you the diff before anything is pushed.

---

## Resolved since the last list
- **The prose** - ruled on 2026-08-22. You rewrote lesson 1's opening yourself, scored
  lesson 2, and scored lesson 3's outline before it was written. Rules 1 to 13 are in
  `PROSE-GUIDE.md`.
- **The PCA claim** - measured 2026-08-22. PC1 = overall size holds; PC2 = head-vs-body
  proportion does not. The page teaches the flip instead of asserting either reading.
- **Lesson 4's identity** - decided 2026-08-24. k-means, not UMAP. UMAP is lesson 5.
