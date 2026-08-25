# shadowbox - design addendum: lesson 4, k-means (M6)

Addendum to `2026-08-20-shadowbox-design.md`. That spec covered sub-project A as a
three-lesson slice ending at PCA. This adds lesson 4. Lesson 5 (UMAP) is named here
only where lesson 4 has to build something it will inherit.

Every number in this document was measured before it was written, against the
committed data. That order is deliberate: the lesson-3 plan asserted "PC2 =
head-vs-body proportion" from textbook expectation, and the claim was half wrong when
someone finally ran it. See §7 for the claims table and where each number came from.

## 1. Why k-means is on this ladder at all

Lessons 1 to 3 flatten the data by projecting it: a line, an axis, a pair of
eigenvectors. Lesson 4 flattens harder. Each point becomes a single integer.

The owner's framing, which the page opens with and which resolves the apparent break
in the spine:

> k-means is no longer a projection, but it is still a projection in the Plato's Cave
> sense - a representation of something else, possibly true, possibly false, but
> flattened either way.

So the ladder's question is unchanged. Which shadow of this data should I look at, and
did the flattening keep anything true? What changes is that there is no longer a
direction to rotate or a line to tilt. You choose a number, and the algorithm returns
exactly that many groups, whether or not that many groups exist.

Lesson 4 is also where the site first teaches **iterative optimization**. Lessons 1 to 3
all have closed-form answers; you solve and you are done. k-means has no formula. That
idiom - start from a guess, improve, stop when nothing moves - is a prerequisite for
UMAP, and it is far cheaper to teach in 2D where the truth is still visible.

## 2. Approach, decided

- **Mechanism-first.** Build the machinery, let the picture fall out. Not
  picture-first-then-caveats.
- **Staged data**, per the parent spec: synthetic with visible ground truth, then real
  clinical data where truth is unknown, and the contrast is the lesson.
- **k-means is lesson 4; UMAP is lesson 5**, and lesson 5 teaches k-nearest-neighbors
  inside itself. k-means is not a component of UMAP and the page must not imply it is.
  UMAP's first step is a kNN graph; the two are unrelated machinery that share a letter.

## 3. Instruments

Four. Parity with lesson 3.

### 3.1 `kmeans-step` - the mechanism, and only the mechanism

Scatter plus k centroids. **Step advances one half-step**, alternating *assign* and
*recompute*, so the two moves are never blurred into one. The state carries a `phase`
field with the two values `assign` and `update`, and the halves are separately visible:
assignment redraws membership with the centroids frozen; recompute moves the centroids
with membership frozen.

Controls: `k` slider (2-6), Step, Play, Reset-with-new-seed, dataset toggle
(blobs / crescents / uniform / births / biometry).

### 3.2 `restart-roulette` - the same question, six different answers

Six random initializations on the same data at the same k, as small multiples, each
labeled with its objective and ranked. Click one to load it into `kmeans-step`.
Toggle random seeding versus k-means++.

Three datasets, three genuinely different behaviors, all measured (§7):

| dataset | restarts | what it teaches |
|---|---|---|
| blobs, k=3 | 5 optima, best 89.7 / worst 608.9, **579% spread**, 15% land wrong | instability is real, visible, and the objective tells you which one won |
| crescents, k=2 | 3 optima, **0.2% spread**, purity stuck at 0.747 | every restart agrees and every restart is wrong. Agreement is not correctness |
| uniform, k=3 | 27 optima, 7.9% spread, ++ barely helps | with no structure to find, better seeding cannot save you |

The k-means++ toggle has a real payoff on blobs: 60 of 60 identical, purity 1.00, zero
spread. It is not a cure, and the page says so: at k=5 on the same blobs, ++ still
leaves 40 distinct optima and a 15.1% spread.

### 3.3 `elbow` - the method people actually use, failing on their own data

Objective against k, with a dataset selector. Structural callback to `scree` from
lesson 3.

The elbow is visible on blobs, where a true k exists. It **vanishes on both real
datasets**: births falls 40%, 32%, 23%, 15%, 14%, 12% as k goes 2 to 7, and biometry
does the same. Both are continua. There is no k to find, and the curve does not tell
you that; it just keeps going down.

### 3.4 `label-vs-truth` - the closer, and the handoff to lesson 5

Cluster the four biometry variables (BPD, HC, AC, FL), then plot the cluster labels
against gestational age, which the algorithm never saw. `k` slider, 2 to 5.

The share of variation in GA accounted for by the labels climbs 0.719 to 0.871 to
0.916 to 0.941. At k=3 the cluster GA means are 22.8, 28.7 and 35.7 weeks and the
ranges very nearly tile the interval. The clusters are gestational age wearing a
costume.

Same punchline as PC1 in lesson 3, reached by unrelated machinery, which is the point
worth making out loud. And because this is 4 dimensions, the reader cannot check it by
eye. That discomfort is exactly what lesson 5 exists to address.

## 4. Encoding

Cluster identity is a **new channel** for this site, and it must not be hue (owner is
colorblind; parent spec §9).

- **Membership is dot shape**: circle, square, triangle, diamond, plus, cross.
- **The partition boundary is a heavy drawn outline**, traced by classifying a grid and
  running the existing `js/lib/contours.mjs` tracer over the label field.
- **The shape budget caps k at 6, and that cap binds only instruments that draw
  membership**: `kmeans-step`, `restart-roulette`, `label-vs-truth`. `elbow` draws a
  curve and no cluster identity at all, so it sweeps k = 1 to 10 freely. This scoping
  was missed in the first draft of this design and caught on a cold read; an elbow
  instrument capped at 6 would cripple the one instrument whose whole job is the shape
  of the curve across k.

Everything survives grayscale and print by construction rather than by later audit.

## 5. Prose requirements specific to this lesson

Per `PROSE-GUIDE.md`, plus three terms a cold read showed are load-bearing and
unglossed. Two independent naive readers flagged all three.

- **Never write "WCSS" on the page.** Call it what it is: *the total squared distance
  from each point to its own center*. This is the same move lesson 1 made with "the
  total area of all the squares." The acronym is fine in code and in this spec.
- **Never write "eta-squared" on the page.** Call it *the share of the variation in
  gestational age that the labels account for*.
- **Gloss k-means++ before the toggle asks the reader to care**: it seeds the centers
  far apart from each other instead of at random.
- **Name controls as controls.** "Press **Step** to assign every point to its nearest
  center" beats "Step advances one half-step," which a reader parsed as a noun.
- **A hinge before the scope sections.** The page shifts from teaching to auditing at
  "what this lesson refuses to claim"; one line has to carry the reader across.
- Follow the established process: terse outline in bullets, scored by the owner, then
  each bullet drafted separately, then a straight read-through to fix the joins.

## 6. Data

### New: `data/blobs.json`, via `tools/make-blobs.mjs` (hand-run, committed output)

Three configurations, 150 points each, 2D, seeded mulberry32, **with committed true
labels** so ground truth is drawable.

| config | seed | shape | k | why it is here |
|---|---|---|---|---|
| `blobs` | 42 | 3 gaussians, sd 0.55, centers (-2.2,-1.4) (2.4,-1.0) (0.2,2.6) | 3 | k-means wins cleanly; restarts diverge loudly; ++ fixes it |
| `crescents` | 43 | two interleaved half-moons, radius 2, noise 0.13 | 2 | convex cells cannot recover it, and every restart agrees anyway |
| `uniform` | 44 | uniform on a 6x6 square | 3 | nothing to find, partitioned confidently regardless |

### Reused as-is

`data/births.json` and `data/biometry.json`. No new provenance work.

## 7. Claims table, pinned by `test/kmeans-claims.test.mjs`

Mirrors `test/pca-claims.test.mjs`. Every number that appears in the prose is pinned
here and the build fails if the prose drifts. All values below are measured, not
expected.

| claim | value | source |
|---|---|---|
| biometry, labels vs GA, k=2/3/4/5 | 0.719 / 0.871 / 0.916 / 0.941 | standardized BPD,HC,AC,FL; ++ init; seed 11 |
| biometry k=3 cluster GA means | 22.8 / 28.7 / 35.7 wk | same |
| births k=3 cluster sizes | 10 / 159 / 231 | standardized GA,BW; ++ init; seed 7 |
| births k=3, variation accounted for | GA 0.532, birthweight 0.650 | same |
| births restart spread, k=3, random | 10 optima / 60 seeds, 2.9% | non-++ init, seeds 1-60 |
| blobs restart spread, k=3, random | 5 optima, 579.1%, 15% land wrong | seeds s*7919, s=1..60 |
| blobs restart spread, k=3, ++ | 1 optimum, 0.0%, purity 1.00 | same |
| blobs k=5, ++ | 40 optima, 15.1% spread | same |
| crescents k=2, either init | 3 optima, 0.2% spread, purity 0.75 | same |
| crescents, best-objective solution | recovers 74.7% of true labels | same |
| uniform k=3, random / ++ | 7.9% / 7.6% spread, 27 optima both | same |
| elbow, births, drop % k=2..7 | 40, 32, 23, 15, 14, 12 | ++ init, seed 3 |
| elbow, biometry, drop % k=2..7 | 72, 52, 35, 28, 10, 21 | same |
| raw mm vs standardized, biometry k=3 | 93.7% label agreement | see §8 |

## 8. What the lesson refuses to claim

- That there is a right k for either real dataset. There is not; both are continua.
- That the biometry has clusters. It has a gradient in gestational age.
- That SGA/AGA/LGA are recoverable from the births cloud. Asked for three groups,
  k-means returns 10 / 159 / 231 with heavily overlapping GA ranges, splitting mostly
  on weight. It does not find the clinical categories, and nothing in its output says
  it missed.
- That convergence means correctness. Crescents is the proof: every restart agrees and
  every restart is 75% right at best.
- **Cut from the earlier sketch:** the units-trap callback. Measured dead - raw mm
  versus standardized gives 93.7% label agreement and 0.866 vs 0.871, because the GA
  signal dominates so completely that any scaling still finds GA slices. It survives as
  one sentence explaining why the trap that sprang in lesson 3 does not spring here.

## 9. Contract change

One, and it is additive.

Instruments gain an **optional `step(state)` export** returning the next state.
`render(state)` stays pure and untouched, so poster generation, Node rendering and the
existing geometry tests are unaffected. Instruments without `step` behave exactly as
today.

`js/lib/hydrate.mjs` gains a Play loop: `requestAnimationFrame`, capped near **4 steps
per second**. That cap is honest to an algorithm that converges in about ten iterations,
and it avoids re-rendering halftone screens at 60fps.

**Designed for lesson 5:** the same control surface accepts a precomputed frame index
instead of a live `step`, because UMAP's optimization is too expensive to run live in
the browser. Lesson 5 inherits the transport rather than rebuilding it.

## 10. Milestone M6, accept criteria

- Page teaches with JS disabled: every instrument has a committed poster frame.
- Every number in the prose is pinned by `test/kmeans-claims.test.mjs`; `node --test`
  green.
- Grayscale-legible by construction: membership is shape, boundary is outline, no
  meaning on hue anywhere.
- Step and Play are keyboard-operable with `aria-label`s and a visible focus ring;
  focus survives re-render.
- Prints: collapsibles forced open, controls hidden, figures and headings not broken
  across pages.
- `tools/poster.mjs` re-run after every instrument change; injection round-trips clean.

## 11. Risks

- **Play loop cost.** `render` returns a full SVG string, so Play re-renders everything
  each frame. Mitigated by the 4 steps/sec cap and the parent spec's 500-point cap.
- **Shape budget.** Six distinguishable shapes is the ceiling; k caps at 6 on the three
  membership-drawing instruments. Boundary outlines carry the partition regardless.
- **Boundary tracing at high k.** Grid classification plus `contours.mjs` is O(grid x k);
  keep the grid coarse and quantized, same as the halftone screens.
- **Overselling instability.** The births restart spread is 2.9%, which is small. The
  page states it plainly as small rather than letting "10 distinct optima" imply drama.
- **Implying k-means is part of UMAP.** It is not. Lesson 5 opens by saying so.

## 12. Deferred to lesson 5 (M7)

k-nearest-neighbor graphs, UMAP itself, precomputed optimization trajectories, and the
high-dimensional distance block's second half. The two "start from zero" blocks written
for lesson 4 (distance between rows; iterative optimization) are written self-contained
so lesson 5 references them rather than restating them, and so sub-project B can hoist
them to standalone pages later.
