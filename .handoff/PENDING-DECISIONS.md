# Pending decisions - for Andrew (updated 2026-08-27)

One item is waiting on you.

## 1. The M7 spec (lesson 5, UMAP)

`docs/superpowers/specs/2026-08-27-shadowbox-umap-design.md`. Same gate lesson 4's
spec had - brief or read cold, your call. The three calls worth your attention are
flagged in its Section 2, because each reverses something a reasonable person would
have assumed:

- **UMAP runs live** (96ms worst case), so the precomputed frame index the lesson-4
  spec designed for is not needed. That is a correction to an approved spec.
- **`births.json` is dropped from this lesson only** - 78 duplicate rows out of 400
  and ~22% of k-th neighbours decided by floating-point rounding, which makes it
  unusable for anything built on a neighbour graph. It stays in lessons 1, 2 and 4.
- **The closer keeps its punchline**: the embedding recovers gestational age at
  0.973 against a ceiling of 0.972, so PCA, k-means and UMAP all land on the same
  answer by unrelated machinery.

Nothing is blocked meanwhile - the math core, the probes and the tests are committed
and green.

---

## Resolved since the last list
- **The apps.html card** - closed 2026-08-27. It had actually been added 2026-08-22;
  the stale part was that it named only three lessons. Andrew rewrote the copy himself
  and it is live. The new wording avoids enumerating lessons on purpose.
- **The lesson-3 "wearing a disguise" line** - ruled 2026-08-26: **it stays.** Same
  metaphor family as the one cut from lesson 4, but lesson 3's prose was approved on
  2026-08-22, before that ruling. Recorded as a standing exception in `PROSE-GUIDE.md`
  so a later sweep does not remove it.
- **iOS Safari verification** - accepted 2026-08-26 without a real-device check. Ismely
  will look at it on an iPhone; Andrew reports back only if it is still broken.
- **The lesson-4 prose** - cleared 2026-08-25, as written, with no edits. The three
  open questions in the outline were cleared unanswered, so the drafted answers stand.
  Two short sentences flagged as possible style violations were cleared with them in,
  and `.handoff/LESSON-4-PROSE-DRAFT.md` records that so a later tidy-up does not cut
  them. Your reframing of the SGA/AGA/LGA refusal is in the draft: the categories are
  arbitrary percentile cut points rather than outcome boundaries, so failing to recover
  them is a fact about the categories, not a limit of the method.
- **The lesson-4 spec** - approved 2026-08-25. Briefed rather than read cold. Both
  domain calls stand as written: `label-vs-truth` closes the lesson, and §8 keeps its
  refusal to recover SGA/AGA/LGA from the births cloud. The k=6 shape cap and the cut
  units-trap callback stand too.
- **The half-step decision** - ruled 2026-08-25: half-steps. Assign and recompute are
  two separate visible moves. The doubled click count is the accepted cost.
- **The prose** - ruled on 2026-08-22. You rewrote lesson 1's opening yourself, scored
  lesson 2, and scored lesson 3's outline before it was written. Rules 1 to 13 are in
  `PROSE-GUIDE.md`.
- **The PCA claim** - measured 2026-08-22. PC1 = overall size holds; PC2 = head-vs-body
  proportion does not. The page teaches the flip instead of asserting either reading.
- **Lesson 4's identity** - decided 2026-08-24. k-means, not UMAP. UMAP is lesson 5.
