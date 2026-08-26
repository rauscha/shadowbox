# Lesson 4 (k-means) - prose outline, for scoring

Terse bullets, one per paragraph, naming the claim that paragraph makes. Written
before any drafting, per your instruction after the first PCA draft lost the
thread. Score it, cut what does not earn its place, and I draft each bullet
separately from what survives.

Every number below is already pinned by `test/kmeans-claims.test.mjs`, which was
written before this outline existed.

---

## Opening

- k-means splits a cloud of points into a number of groups you choose in
  advance, and gives every point a single integer saying which group it is in.
- Your framing carries the spine: this is no longer a projection, but it is
  still a projection in the Plato's Cave sense. A representation of something
  else, possibly true, possibly false, flattened either way.
- What changed from lessons 1 to 3: there is no direction to rotate and no line
  to tilt. You choose a number, and the algorithm returns exactly that many
  groups whether or not that many groups exist.
- This is also the first lesson with no formula. Lessons 1 to 3 all had
  closed-form answers: you solve, and you are done. Here you start from a guess
  and improve it, and that idiom is a prerequisite for lesson 5.

## Start from zero: the distance between two rows (collapsible)

- Two measurements make a point on a plane, and the distance between two points
  is the ruler distance. Four measurements make a point in four dimensions, and
  the same arithmetic still works even though you cannot picture it.
- Self-contained. Written so lesson 5 can reference it instead of restating it.

## Start from zero: what it means to improve a guess (collapsible)

- Some problems have a formula. Others you attack by guessing, scoring the
  guess, changing it so the score improves, and stopping when nothing changes.
- Self-contained, same reason.

## One step, twice

- The mechanism, stated plainly first: put k centers down anywhere. Assign every
  point to its nearest center. Move every center to the middle of the points
  that chose it. Repeat.
- Interaction copy: press **Step** to assign every point to its nearest center,
  then press it again to move the centers. Naming which half you are watching is
  the whole reason the button does one half at a time.
- What the score is, in words: the total squared distance from each point to its
  own center. Never the acronym.
- Name the mechanism, not the outcome: each half of the step can only lower that
  total, which is why the algorithm always settles, and also why it settles
  wherever it happened to start.
- It stops when an assignment pass moves nothing. That is convergence, and this
  is the point where a reader should be told convergence is a statement about
  the algorithm, not about the data.

## Six starts

- The starting centers are random, so the answer is random. Six starts on the
  same data at the same k, side by side.
- The figure counts its own answers rather than promising a number.
- On the generated blobs, five of six starts land on the same answer and one
  lands somewhere much worse: 89.7 against 506.8. About one start in six, which
  matches the 15 percent measured across sixty starts.
- Gloss **k-means++** here, before the toggle asks anyone to care: it seeds the
  centers far apart from each other instead of at random. Turn it on and all six
  starts find the same answer.
- Hedge honestly, because it is not a cure: at k=5 on the same blobs it still
  leaves 40 distinct answers and a 15 percent spread.
- Crescents is the paragraph that has to land. Two interleaved half-moons, every
  start agrees to within 0.2 percent, and every start is 75 percent right at
  best. Agreement is not correctness. (No antithesis - say it as one sentence
  reporting two different things.)
- Why it fails there, mechanism not outcome: the groups k-means can draw are
  bounded by straight lines between centers, and a crescent is not.

## How many groups?

- You chose k. Nobody gave it to you. So the obvious question is whether the
  data can tell you what k should be.
- The usual answer is the elbow method, and it is worth showing because people
  really use it: plot the total against k and look for the bend.
- The cost always falls as k rises, all the way to one cluster per point at
  zero. So the curve can never say stop; it can only bend.
- On blobs there is a real bend, and the figure finds it at k=3, which is the
  true answer.
- On births the drops run 40, 32, 23, 15, 14, 12 percent. No bend. On the
  biometry it drops to 10 percent and then climbs back to 21, so that curve does
  not even fall steadily.
- Both real datasets are continua, not clumps. The verdict line under the figure
  is computed from the curve, not asserted by me.

## The algorithm never saw the dates

- Cluster the four biometry measurements. Then plot the groups against
  gestational age, which the algorithm never saw.
- At k=3 the groups average 22.8, 28.7 and 35.7 weeks and their ranges overlap
  rather than merely abut. The labels account for 0.871 of the variation in
  gestational age, climbing to 0.941 at k=5. (Written out in words, never as a
  symbol.)
- Name what happened, plainly: the groups are recovering gestational age.
  (Was "gestational age wearing a costume". Cut 2026-08-25 - too cute. It was
  memorable because it did not fit the register, and that is a defect, not a
  feature.)
- Say out loud that this is the same finding as PC1 in lesson 3, reached by
  unrelated machinery. Two different methods converging on one answer is what
  makes it more than a curiosity.
- The handoff: this is four dimensions, so you cannot check it by eye. That
  discomfort is what lesson 5 is for.

## What this lesson refuses to claim

- The hinge, one line, carrying the reader from being taught to auditing what
  they were taught.
- There is no right k for either real dataset. Both are continua.
- The biometry has no clusters. It has a gradient in gestational age.
- SGA / AGA / LGA are not recoverable from the births cloud. Asked for three
  groups it returns 10, 159 and 231, splitting mostly on weight with heavily
  overlapping gestational ages, and nothing in its output says it missed.
  **Ruled in, 2026-08-25, with a better reason than the one I offered.** Not
  "the reader expected those groups". The real point: SGA / AGA / LGA are
  **arbitrary human-drawn lines on a continuum, defined by percentile cut
  points rather than by any outcome boundary.** So k-means is not failing to
  find them. It is showing they were never in the data to begin with - they
  are administrative thresholds laid over a gradient. That reframes the whole
  refusal section: the biometry has a gradient, and the clinical categories
  stacked on top of it are cuts, not clusters.
  Drafting note: this is the lesson's strongest paragraph. Do not soften it
  into "k-means struggles with these categories" - the categories are the
  thing under examination, not the algorithm.
- Convergence is not correctness. Crescents already proved it.
- One sentence on why lesson 2's units trap does not spring here: raw
  millimetres and standardized values agree on 93.7 percent of the labels,
  because gestational age dominates so completely that any scaling finds the
  same slices.
- Lesson 5 is UMAP, and it does **not** use k-means. Its first step is a
  k-nearest-neighbour graph. The two share a letter and nothing else, said here
  so lesson 5 does not have to undo an assumption this page created.

---

## Three rulings, 2026-08-25 - all settled, nothing outstanding

1. **Crescents stays under "six starts".** No separate heading. It belongs to
   the figure it sits beside.

2. **"Gestational age wearing a costume" is cut.** Too cute. His reasoning is
   the durable part and generalizes past this line: it was memorable *because
   it did not fit*, and it is not always good to be the proud nail. A line
   that stands out by being tonally alien to everything around it is a defect
   in the register, however quotable it is on its own.

3. **The SGA / AGA / LGA refusal is in, and gets a stronger reason than mine.**
   See that bullet above. The teaching lands because the categories are
   arbitrary human delineations based on percentile cuts, not on outcomes -
   so the failure to recover them is a fact about the categories, not a
   limitation of the method.

**Status:** the outline is approved. Task 11 drafts each surviving bullet
separately, in the register of the rest of the site, with the drafting note on
bullet 3 respected.
