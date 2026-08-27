# shadowbox - design addendum: lesson 5, UMAP (M7)

Addendum to `2026-08-20-shadowbox-design.md` and `2026-08-24-shadowbox-kmeans-design.md`.
Lesson 5 closes sub-project A.

Every number in this document was measured before it was written, against the committed
data, by `reference/umap-measure.mjs` and `reference/umap-probe.py`. That order is the
standing correction to the lesson-3 plan, which asserted "PC2 = head-vs-body proportion"
from textbook expectation and was half wrong when someone finally ran it.

It earned its keep immediately. Four things in this spec are the opposite of what a
reasonable person would have written down from memory, and one of them reverses a design
decision recorded in the lesson-4 spec. They are collected in §2 rather than buried.

## 1. Why UMAP is on this ladder

Lessons 1 to 3 flatten by projecting: a line, an axis, a pair of eigenvectors. Lesson 4
flattens to a single integer per point. Lesson 5 flattens to a **position** - two numbers
per point - and those two numbers mean something only next to the points nearby.

The break from everything before it is not the output. It is the input. Least squares,
covariance, PCA and k-means all operate on the data. **UMAP does not touch the data after
the first step.** It builds a graph of who is near whom, throws the coordinates away, and
then draws that graph. Everything the picture can possibly know, it knows through the
graph, and the graph is built from a single choice: how many neighbours count as "near".

That gives the lesson its spine, and it is a spine the earlier lessons cannot offer:

> Stage 1 is deterministic and has no seed. Stage 2 is a seeded optimisation. Every
> run-to-run difference you will ever see in a UMAP plot comes from stage 2, and stage 2
> is only trying to draw what stage 1 already decided.

Measured, not asserted: `fuzzyGraph(X, k)` returns byte-identical edges and weights across
calls, on every dataset (§7). The seed does not enter until the layout.

Lesson 5 also has to teach **k-nearest-neighbours inside itself**, because nothing earlier
on the ladder needed it. That is a feature - kNN is the most reusable idea in the whole
series, and sub-project B can hoist it to a standalone page.

**UMAP does not use k-means.** They share a letter and nothing else; UMAP's first step is a
kNN graph. `kmeans.html` already says so out loud, and it already flags that lesson 4's `k`
counts groups while lesson 5's counts neighbours, so lesson 5 does not have to undo an
assumption it inherited.

## 2. What measurement changed, before anything was built

**(a) UMAP runs live in the browser. The lesson-4 spec said it could not.**

`2026-08-24-shadowbox-kmeans-design.md` §9 designed the Play surface to accept a
precomputed frame index "because UMAP's optimization is too expensive to run live in the
browser." Timed on the committed data, in Node:

| dataset | n | dims | k | graph | full 200-epoch run |
|---|---|---|---|---|---|
| blobs | 150 | 2 | 15 | 5 ms | 24 ms |
| blobs | 150 | 2 | 50 | 8 ms | 36 ms |
| biometry | 350 | 4 | 15 | 18 ms | 66 ms |
| biometry | 350 | 4 | 50 | 26 ms | 96 ms |

96 ms is the worst case on the largest dataset. A k slider can re-run the whole algorithm
on every input event and stay interactive. **Lesson 5 therefore runs live and ships no
precomputed frames**, which also avoids committing 39-93 KB of coordinates per
configuration. The Play surface is still used - it steps epochs - so M6's transport is
reused exactly as intended, just fed by a live `optimizeEpoch` rather than an index.

This is a correction to a prior spec, not a new decision, and it should be read as one.

**(b) `births.json` is unusable for any kNN method, and is dropped from this lesson.**

Whole weeks against rounded grams collide constantly. Measured:

| dataset | duplicate rows | points whose nearest neighbour is at distance 0 | rows where the k-th neighbour is a tie |
|---|---|---|---|
| births (n=400) | **78** | **129** | **88 at k=5, 98 at k=15** (22-25%) |
| blobs, crescents, uniform (n=150) | 0 | 0 | 0 |
| biometry (n=350) | 0 | 0 | 0 |

Where the k-th and (k+1)-th distances are equal, *which* neighbour you get is decided by
the last bits of the standardisation. Two correct implementations disagree, and they do:
counting the ambiguous rows in JS gives 87 and 94 where numpy gives 88 and 98. Even the
count of the ambiguity is ambiguous.

So births cannot appear in a lesson whose whole subject is the neighbour graph, and
`test/umap-fixtures.json` records the diagnosis rather than pinning one arbitrary
tie-break as ground truth. Lessons 1, 2 and 4 keep using births; none of them ask who your
neighbours are.

**(c) The obvious way to measure the closer understates it by a factor of three.**

The lesson-4 closer asked what share of the variation in gestational age the cluster
labels account for. The 2D analogue - regress GA on the two embedding coordinates - gives
R² anywhere from 0.261 to 0.971 depending on the seed, which reads as a wildly unstable
result. It is not. It is a straight line fitted to a curved arc.

Replacing it with a neighbourhood measure (predict each point's GA from the mean GA of its
15 neighbours in the embedding):

| | GA recovered |
|---|---|
| the original 4-D measurements - the ceiling anything could reach | **0.972** |
| the embedding, k=5 / 15 / 50, ten seeds each | **0.971-0.974** |
| lesson 4's k=3 cluster labels, for comparison | 0.871 |

Rock stable across every k and every seed. The embedding knows gestational age as well as
the four raw measurements do. **The linear reading was the wrong instrument and it lied**,
which is a lesson this site is unusually well placed to make.

**(d) A silent NaN is the failure mode this codebase is worst at showing.**

The first `fitAB` was plain Gauss-Newton. It fitted the default (min_dist 0.1, spread 1.0)
correctly and diverged elsewhere - a negative `b` past min_dist 0.8, no usable fit at all
at spread 5. A negative `b` inverts the attractive gradient and the layout flew apart to an
x-spread of 14,000; a negative `a` put a zero in the denominator and returned 150 NaN
coordinates. **A NaN embedding renders as an empty figure with no error reported
anywhere.** Replaced with damped Levenberg-Marquardt, matching scipy across a 28-point
(min_dist, spread) grid to 5.1e-6.

The measured "min_dist breaks past 0.75 × spread" that this produced was a bug in the
fitter, not a property of UMAP, and it does not appear in §7. Recorded here because it was
believed for about twenty minutes and written into a test before it was caught.

## 3. Instruments

Four. Parity with lessons 3 and 4.

### 3.1 `knn-graph` - stage one, and the idea the lesson has to teach first

Scatter plus the drawn k-nearest-neighbour edges. One slider: **k, 1 to 30**. Dataset
selector (blobs / crescents / uniform / biometry). No seed control, because there is
nothing to seed - and the absence of that control is the point being made.

Edge weight is the membership strength, drawn as **line weight**, so the graph shows that
"neighbour" is not a yes/no relation.

What it teaches, measured on crescents: at low k the graph runs *along* each arc; as k
climbs it starts bridging *between* the arcs. That single picture is the mechanism behind
every crescents result in §3.3, and it is why the answer depends on k.

### 3.2 `layout-play` - stage two, the part with the seed

The same optimisation idiom lesson 4 introduced, now with no visible truth to check
against. Random initialisation in [-10, 10], then edge-sampled SGD. Controls: **Play,
Step, Reset-with-new-seed**, k, and an epoch scrubber.

Reuses `hydrate.mjs`'s Play loop unchanged (§9). Runs live.

### 3.3 `seed-roulette` - the direct callback to `restart-roulette`

Six seeds, same data, same k, as small multiples. Each panel labelled with two numbers:
how much of the local neighbourhood survived, and how well the distances between far-apart
points survived.

This is where lesson 5's central honest claim lives, and it is the one the measurements
support most strongly. Across ten seeds at k=15:

| dataset | local structure kept | global distance agreement |
|---|---|---|
| blobs | 0.769-0.799 | 0.565-0.763 |
| crescents | 0.840-0.890 | 0.333-0.703 |
| uniform | 0.756-0.805 | 0.589-0.881 |
| biometry | 0.646-0.655 | 0.586-0.965 |

**Local structure is stable to the seed; global structure is not.** On biometry the local
number moves by 0.009 across ten seeds while the global one moves by 0.379. That is the
single most useful thing a reader can carry away about reading somebody else's UMAP plot,
and it is measured rather than folklore.

Dataset selector includes **uniform**, because the honest failure has to be reachable, not
merely described. See §8.

### 3.4 `umap-vs-truth` - the closer, and the third route to the same answer

Embed the four biometry measurements, then show the embedding against gestational age,
which the algorithm never saw. `k` slider.

- PCA's first component was gestational age in disguise (lesson 3).
- k-means' cluster labels were gestational age wearing a costume (lesson 4).
- The embedding recovers gestational age at 0.973 against a ceiling of 0.972 (this one).

Three unrelated machines, one answer, and the lesson says so plainly. GA is continuous, so
it cannot be a shape - it is drawn as **graduated dot area**, per the house rule that a
gradient must vary in size (§4).

## 4. Encoding

Nothing rides on hue; parent spec §9.

- **Graph edges are drawn lines**, with membership strength as **line weight** - an ink
  channel, so it survives grayscale and print.
- **Known class is dot shape**, reusing `js/lib/marks.mjs` from lesson 4. Blobs needs 3
  shapes, crescents 2. **The k=6 shape cap does not bind here at all**: no instrument in
  this lesson draws more than three classes, and `knn-graph` and `layout-play` draw no
  class membership whatsoever. Lesson 4's cap binds instruments that draw membership as a
  mark per point, and that scoping carries forward unchanged.
- **Gestational age is graduated dot area** in `umap-vs-truth` - dot area linear in GA,
  smallest dot at 20 weeks. This is the Lichtenstein rule the owner set on 2026-08-20:
  dots that show a *gradient* vary in size, dots that merely fill a counted area stay a
  fine uniform screen.
- **`k` is named on every instrument that has it**, because the reader arrives from lesson
  4 where `k` was a count of groups.

## 5. Prose requirements specific to this lesson

Per `PROSE-GUIDE.md`, plus the terms a cold read will find load-bearing and unglossed.

- **Never write "fuzzy simplicial set" on the page.** It is *the graph of who is near
  whom, with a weight saying how near*. The term is fine in code and in this spec.
- **Never write "n_neighbors" on the page**, and never let `k` be ambiguous. Lesson 4's
  `k` counted groups. Say *neighbours* every time.
- **Do not write "manifold"** without earning it. The page can say what it means - that the
  data is assumed to lie on some lower-dimensional shape, and that the assumption can be
  wrong - and §8 is where being wrong gets shown.
- **Gloss min_dist before any control asks the reader to care**: it sets how tightly points
  are allowed to pack, and it is cosmetic (§7).
- **The distance-between-clusters warning must be a statement, not a hedge.** It is the
  most common misreading of a UMAP plot in published work, it is measured here, and it
  gets a heading rather than a parenthesis.
- Follow the established process: terse outline in bullets, scored by the owner, each
  bullet drafted separately, then a straight read-through to fix the joins.

## 6. Data

**No new data files.** `data/blobs.json` (blobs / crescents / uniform) and
`data/biometry.json` are reused exactly as committed. `tools/make-blobs.mjs` is not re-run.

`data/births.json` is **excluded from this lesson only**, for the reason measured in §2(b).
No provenance work, no new tool, nothing to review.

Crescents earns its place twice over: it was built for lesson 4 to show that every restart
can agree and every restart can be wrong, and it turns out to be the exact shape that
separates the two lessons' methods (§7).

## 7. Claims table, to be pinned by `test/umap-claims.test.mjs`

All values measured by `reference/umap-measure.mjs` against the committed data, 200
epochs, min_dist 0.1 unless stated. **Embedding claims are ranges over seeds, never point
values** - a single embedding number is not a reproducible fact, and §2(a) means the page
computes a fresh one on every load.

| claim | value | source |
|---|---|---|
| the graph is seed-independent | identical edges + weights across calls | blobs (1398 edges, k=15), biometry (3329) |
| local structure kept, 10 seeds, k=15 | blobs 0.769-0.799; crescents 0.840-0.890; uniform 0.756-0.805; biometry 0.646-0.655 | 10 seeds |
| global distance agreement, same runs | blobs 0.565-0.763; crescents 0.333-0.703; uniform 0.589-0.881; biometry 0.586-0.965 | 10 seeds |
| local is stable, global is not (biometry) | local moves 0.009, global moves 0.379 | same |
| k is structural: blobs local structure, k=2/5/15/50 | 0.680 / 0.720 / 0.793 / 0.773 | seed 1 |
| k is structural: crescents recovered, k=2/5/15/50 | 0.607 / 0.627 / 0.753 / 1.000 | seed 1 |
| **min_dist is cosmetic**, 0 to 1.0 on blobs | local structure 0.771-0.845, class recovery **1.000 throughout** | seed 1, k=15, 7 values |
| k-means on raw crescents (lesson 4's number) | 0.747, every restart agreeing | `kmeans-claims` |
| crescents after UMAP, 30 seeds, k=5 | median 0.660, **1/30** reach 1.000 - worse than k-means | 30 seeds |
| crescents after UMAP, 30 seeds, k=15 | median 0.867, 8/30 reach 1.000 | 30 seeds |
| crescents after UMAP, 30 seeds, k=30 | median 1.000, 20/30 reach 1.000 | 30 seeds |
| crescents after UMAP, 30 seeds, k=50 | median 1.000, **25/30** reach 1.000, worst 0.833 | 30 seeds |
| uniform: apparent grouping, raw square | 0.444 | best k-means k=2..6 |
| uniform: apparent grouping after UMAP | k=5 0.538-0.669; k=15 0.559-0.636; k=50 0.586-0.622 | 5 seeds each |
| biometry GA recovered, original 4-D | 0.972 | neighbourhood measure, k=15 |
| biometry GA recovered, embedding | 0.971-0.974 at k=5, 15 and 50 | 10 seeds each |
| lesson 4's k=3 labels on the same data | 0.871 | `kmeans-claims` |
| the linear reading of the same closer | 0.261-0.971, an artifact of curvature | §2(c) |
| runtime, worst case | 96 ms, biometry k=50, 200 epochs | Node 24 |

Fidelity of the implementation itself is pinned separately by `test/umap.test.mjs` against
`reference/umap-probe.py` (umap-learn 0.5.12): every rho exact, every sigma and edge weight
within 1e-5, the a/b fit within 5.1e-6 across 28 grid points.

## 8. What the lesson refuses to claim

- **That distance between clusters means anything.** Global distance agreement swings from
  0.333 to 0.703 across seeds on crescents alone, on data whose true structure never moved.
- **That the shape of a cluster means anything.** Same evidence.
- **That UMAP finds structure k-means cannot.** It can, and only sometimes: on crescents at
  k=50, 25 of 30 seeds recover both arcs exactly - but **at k=5 the median is 0.660, worse
  than the 0.747 k-means got for free**. The method is not a strict improvement, it is a
  different bet, and the bet depends on a number you chose.
- **That an apparent group is a real group.** The uniform square has no structure by
  construction. k-means on the raw square already scores 0.444 because a partition always
  exists; after UMAP that rises to 0.54-0.67. **UMAP makes structureless data look more
  structured, not less.** This is the honest failure and it gets its own instrument state.
- **That the biometry has clusters.** It has a gradient in gestational age, and the
  embedding reproduces that gradient almost perfectly (0.973) while showing it as an arc
  that a reader will be tempted to cut into groups.
- **That the picture is the data.** Nothing here is a projection. There is no inverse, no
  loading, no axis with a meaning. The two numbers are wherever the optimiser stopped.

## 9. Contract change

**None.** Measured, and worth stating because the lesson-4 spec expected one.

`js/lib/hydrate.mjs` already drives `instrument.step(state)` while `state.play` is true,
caps at `PLAY_FPS = 4`, and treats an empty return as exhaustion. Its own comment
anticipates a frame-index caller. Lesson 5's `layout-play` implements `step(state)` as one
call to `optimizeEpoch`, which is already exported. `render(state)` stays pure. No new
control kind is needed: k and the epoch scrubber are `slider`, the rest are actions.

M6 built the transport correctly and lesson 5 pays nothing for it.

## 10. Milestone M7, accept criteria

- Page teaches with JS disabled: every instrument has a committed poster frame.
- Every number in the prose is pinned by `test/umap-claims.test.mjs`, written before the
  prose exists; `node --test` green.
- `test/instruments4.test.mjs` drives a hand-written list of four instrument names. **The
  four new instruments must be added to it**, or the house-rules sweep passes by not
  looking at them.
- Grayscale-legible by construction: edges are weight, class is shape, GA is dot area.
- Play, Step and every slider keyboard-operable with `aria-label`s and a visible focus
  ring; focus survives re-render.
- Prints: collapsibles forced open, controls hidden, figures and headings unbroken.
- `tools/poster.mjs` re-run after every instrument change; injection round-trips clean.
- Nav and `index.html` updated to five lessons. The index and the `apps.html` card were
  de-enumerated on 2026-08-27 precisely so this step touches neither.

## 11. Risks

- **Live re-run on slider drag.** 96 ms worst case is fine for a discrete change and too
  slow for a 60 Hz drag. Recompute on `change`, not `input`, for k; the epoch scrubber
  reads existing state and is free.
- **Browser is not Node.** All timings are Node 24 (V8). Safari and Firefox may be 2-3×
  slower, which keeps the worst case under 300 ms, but this is an inference and should be
  checked once on real hardware before the milestone closes.
- **The layout is chaotic in its parameters.** Changing min_dist by 1e-6 moves the local
  structure number from 0.882 to 0.861. Summary statistics over seeds are stable; single
  coordinates are not. This is why §7 forbids point-value embedding claims.
- **Reading `seed-roulette` as instability theatre.** The local numbers barely move. The
  page must not let six different-looking panels imply the method is unreliable, when what
  the panels show is that the *unstable* part is the part you were never supposed to read.
- **Crescents overclaiming.** It is tempting to present k=50 (25/30 perfect) as UMAP
  beating k-means. §8 requires the k=5 result on the same slide.
- **Poster frames and a live-computed instrument.** The poster must be generated from a
  fixed seed and the live instrument must start from that same seed, or the page visibly
  jumps when JS loads. Lesson 4 did not have this problem because its poster state was
  fully determined by the controls.

## 12. Deferred

- Spectral initialisation. umap-learn defaults to it; this lesson uses random
  initialisation because watching the layout resolve from noise is the entire point of
  `layout-play`, and because spectral init would need an eigendecomposition of a 350×350
  Laplacian. Worth a sentence on the page, not an implementation.
- Approximate nearest neighbours (NN-Descent). Exact brute force is affordable at n ≤ 400
  and removes a source of run-to-run noise the lesson would have to explain away.
- Supervised UMAP, `densMAP`, and any metric other than Euclidean.
- The `births` tie pathology as teachable content. It is real and it is interesting, but it
  belongs to a lesson about data quality rather than to this one.
- Sub-project B may hoist the kNN block and lesson 4's two "start from zero" blocks to
  standalone pages; both are written self-contained with that in mind.
