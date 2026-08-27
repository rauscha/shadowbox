# shadowbox - design addendum: method cards (M8)

Addendum to `2026-08-20-shadowbox-design.md`. Adds one closing disclosure panel to every
lesson, answering three questions the lessons currently answer only by implication: when
you would use this method, why you would reach for it instead of one of the earlier ones,
and how it differs from them as a test.

Owner's framing, 2026-08-27: *"a mini version of the future aim of making a statistical
test tree/picker."* That sentence is the design constraint that matters most. If these
panels were only five nice paragraphs, hand-written HTML would be the right answer. They
are not: they are the first authored form of the comparison data a picker will later route
on, which is why the content lives in a data module and the pages are generated from it.

## 1. Scope, and the order it lands in

**Lesson 5 first, lessons 1 to 4 backfilled after.** Ruled by the owner 2026-08-27.

Lesson 5's prose is unwritten at the time of this spec (M7 task 9), so its card can be
written alongside its prose rather than retrofitted into finished text. That is the whole
reason for the ordering, and it means M7 absorbs a small amount of this work:

- **M7 gains** `js/data/methods.mjs`, `tools/methods.mjs`, `test/methods.test.mjs`, and the
  `umap` record. M7's prose task writes the umap record's sentences, because they are
  prose. M7's accept criteria gain the marker pair and the generator run.
- **M8 is this spec's remaining work**: the four earlier records, their cards, and the
  markers in the four earlier pages.

**Known risk of that order**, accepted: lesson 5 defines the shape, and backfilling may
reveal the shape is wrong for an earlier lesson. Section 3's `kind` field is the one place
that risk was already anticipated and absorbed.

## 2. What a card is

One `<details>` at the very end of each lesson, after the closing instrument and before the
trellis nav. New class `method-card`, deliberately distinct from `from-zero`:

| | `from-zero` | `method-card` |
|---|---|---|
| points | forward, into the lesson | backward, across the ladder |
| answers | "I do not know this prerequisite" | "which of these should I actually use" |
| position | inline, where the idea first bites | once, at the end |
| count per page | zero or more | exactly one |

Closed by default. `js/lib/hydrate.mjs` already forces every `<details>` open at
`beforeprint` and closes it again afterward, so the card prints with no new work.

**The summary line follows one formula on all five pages**, so a reader who meets it in
lesson 2 recognises it in lesson 5:

> When to use \<method\>, and when to reach for something else.

**Three sections inside, in this order:**

1. **When you would use it.** The question the method answers, in the reader's terms rather
   than the method's.
2. **What it assumes, and what it hands back.** The mechanical part, and the part a picker
   routes on.
3. **Why not the others.** The comparison matrix of §4. **Lesson 1 omits this section
   entirely** - there are no earlier methods, and a card that says "nothing to compare
   against yet" is noise.

## 3. The record model

`js/data/methods.mjs` exports one ordered object. Every record is plain data:

```js
export const METHODS = {
  leastSquares: {
    name: 'least squares',
    lesson: 1,
    kind: 'method',
    when: 'you want to predict one number from another, and you want to know how wrong the prediction usually is.',
    assumes: [
      'that a straight line is a fair description of the relationship',
      'that being wrong by the same amount matters equally everywhere',
    ],
    gives: 'a slope, an intercept, and one residual per observation.',
    notInstead: {},
  },
  // ... covariance, pca, kmeans, umap
};
```

### 3.1 `kind`: `'method'` or `'lens'`

The five lessons are not five interchangeable methods, and pretending otherwise produces
one dishonest card.

- **`'method'`** - something you *do*, chosen instead of alternatives. Least squares, PCA,
  k-means, UMAP. "When would you use this" is a real question with a real answer.
- **`'lens'`** - something you *understand* so that later methods make sense. **Covariance
  is the only one.** Nobody chooses covariance over k-means. Forcing "when would you use
  this instead" onto lesson 2 would produce a panel that is subtly untrue, and this site's
  whole character is not doing that.

A lens card replaces section 1's heading and question. Instead of *when you would use it*,
it answers **what this buys you further up the ladder** - which is the honest version of
the same service for a reader deciding whether to read the lesson at all.

The future picker routes only on `kind: 'method'`, so covariance can never surface as the
answer to "which test should I run".

### 3.2 Records hold plain text, never markup

No `<`, no HTML entities, no `<em>`. Two reasons, and the second is the load-bearing one:

1. The generator escapes text into HTML, so markup in a record would double-escape or
   inject.
2. **The picker will render this data in a layout nobody has designed yet.** A record
   carrying page-specific markup is a record that only works on one surface. Pinned by a
   test.

### 3.3 Sentences, not fragments

Every prose field holds real sentences that survive being read aloud, because
`PROSE-GUIDE.md`'s rules apply to generated text exactly as they do to hand-written text. A
record full of noun-phrases produces a panel that reads like a spec sheet, which is the
failure mode this format is most prone to.

## 4. The comparison matrix

**Complete and backward-only.** Every method carries a `notInstead` entry for every method
with a *lower* lesson number. Ten pairs across five lessons: 0 + 1 + 2 + 3 + 4.

**Complete, because a picker with a hole cannot answer "why not X?".** Holes are exactly
what accumulates when five panels are written months apart, and the completeness test in §6
is what prevents it.

**Backward-only, and this is load-bearing twice over.** A reader in lesson 2 has not met
k-means, so a forward comparison would be incomprehensible. And because each pair is stated
exactly once, from the later lesson's side, **two cards can never contradict each other**.
The asymmetry is a feature, not a limitation to fix later.

### 4.1 Tiering

Each entry declares its own depth:

```js
notInstead: {
  kmeans: { depth: 'deep', text: 'Both hand you something that looks like groups. k-means always returns exactly the number you asked for; this returns a picture you have to read groups out of yourself, and it may not have any.' },
  covariance: { depth: 'brief', text: 'Covariance describes one cloud with one ellipse.' },
},
```

- **`deep`** - a genuine confusion a reader could act on wrongly. Two sentences or more.
- **`brief`** - a distant relative. One sentence.

Both bounds are enforced by test (§6), so the tiering stays honest rather than drifting
into five paragraphs of equal weight.

**Rendered order:** all `deep` entries first, then all `brief`, each group in descending
lesson order. The method the reader just came from is the confusion most likely to be live,
so it goes first.

**Tiering carries no colour.** Depth reads through sentence count, grouping and position.
Per the parent spec's §9 and the owner's hard constraint, nothing on this site encodes
meaning in hue.

## 5. Rendering and the generator

**The pages must teach with JS disabled** - the same requirement that puts a committed
poster frame under every instrument. So a card cannot be client-rendered. It is generated
into the committed HTML.

`tools/methods.mjs` is hand-run, exactly like `tools/poster.mjs`, and reuses that file's
marker idiom:

```html
<!-- methods:umap -->
<details class="method-card"> ... generated ... </details>
<!-- /methods:umap -->
```

Injection is idempotent: running the tool twice leaves the tree unchanged. `injectPoster`
in `tools/poster.mjs` already implements exactly this and is the function to copy or share.

Section 2's assumptions render as a real `<ul>`; the comparison entries render as a `<dl>`
with the method name as `<dt>`. Semantic markup rather than styled `<div>`s, so the card
survives being read by a screen reader in the order it is written.

## 6. Tests, in `test/methods.test.mjs`

**The completeness test is the load-bearing one.** It is what makes the future picker
possible, and it is the reason this is a data module rather than five hand-written panels:

- **Completeness.** Every record has a `notInstead` entry, with non-empty text, for every
  record with a lower `lesson`. No holes, ever.
- **No forward references.** No record may carry a `notInstead` key for an equal or higher
  lesson number. A reader cannot be told about a method they have not met.
- **Depth is honest.** A `deep` entry is at least two sentences; a `brief` entry is exactly
  one. Prevents the tiering collapsing into uniform paragraphs.
- **Records are plain text.** No `<` in any string field, so the picker can render them
  anywhere (§3.2).
- **Every lesson page carries exactly one card**, inside its marker pair.
- **Injection round-trips.** Running the generator twice changes nothing.
- **House rules.** No em-dash anywhere. Per-lesson vocabulary bans still apply: lesson 5's
  card may not contain the strings `n_neighbors` or `fuzzy simplicial set`. **No card may
  contain the bare token `k` at all** - it must read *clusters* or *neighbours*, because a
  card is read out of the lesson's context, often as the only part a hurried reader opens,
  and `k` means two unrelated things across lessons 4 and 5. Asserted as a token match, not
  a judgment call.
- **`kind` is valid** and only `covariance` is a lens - stated as an explicit assertion so a
  future record cannot quietly reclassify itself.

## 7. What the cards refuse to do

- **No recommendation the data cannot support.** A card says what each method assumes and
  returns; it does not tell the reader which one is best, because that depends on a question
  the card cannot see.
- **No accuracy claims between methods.** Lesson 5 already establishes that UMAP is not a
  strict improvement on k-means but a different bet. A card that ranked methods would
  contradict the lesson it closes.
- **No new numbers.** Every quantitative claim on a page is pinned by that lesson's claims
  test. Cards are qualitative, so they add no pinning burden and cannot drift from a
  measurement.

## 8. Relationship to the picker

Deliberately out of scope, and named so the data model does not quietly foreclose it:

- The picker reads `METHODS`, filters `kind === 'method'`, and routes on `when` and
  `assumes`.
- `notInstead` supplies its "why not that one" answers directly, which is why completeness
  is enforced now rather than when the picker is built.
- Nothing in this spec builds a tree, a decision graph, or a routing UI.

## 9. Accept criteria

Split, because the work lands in two milestones (§1) and a single list would let M7 be
judged against criteria only M8 can meet.

**M7 (lesson 5 only) is done when:**

- `js/data/methods.mjs`, `tools/methods.mjs` and `test/methods.test.mjs` exist, with the
  `umap` record complete and the four earlier records present at minimum viable depth: a
  `name`, a `lesson`, and a `kind`. The completeness test of §6 checks the pairs a record
  actually needs, so a stub record with no `notInstead` is legal only while its own lesson
  has no card.
- `umap.html` carries exactly one card, in its marker pair, generated.
- The remaining §6 tests are green for the records that exist.

**M8 (the backfill) is done when everything above holds and:**

- All five records are complete prose, not stubs.
- All five lessons carry exactly one card, at the end, in its marker pair.
- `node tools/methods.mjs` regenerates every card and re-injects idempotently; a second run
  leaves the tree clean.
- Cards print (collapsibles forced open) and are keyboard-operable, which a real `<summary>`
  gives for free.
- Grayscale-legible by construction: no card encodes anything in hue.
- The prose linters (`tools/prose-lint.mjs`, `tools/voice-lint.mjs`) run over each page with
  its card in place and show no regression against the pre-card baseline.

## 10. Risks

- **Generated prose fighting the voice guide.** The mitigation is §3.3: records hold real
  sentences. If the cards read like a spec sheet, the fix is better sentences in the data,
  never a switch to hand-written HTML - that would forfeit the completeness guarantee.
- **Lesson 5 defines the shape for lessons written earlier.** Accepted with the ordering.
  `kind` absorbs the one mismatch already visible; another may appear during M8, and the
  spec should be amended rather than the earlier lesson bent to fit.
- **The card competing with the lesson's own closer.** Every lesson ends on a deliberate
  note - lesson 5's is three unrelated methods landing on the same answer. A card placed
  after that must read as an appendix the reader may open, not as a second ending. If it
  reads as a second ending, move it above the closing instrument in M8 and amend §2.
- **Ten pairs is the fifth lesson's ceiling, not the tenth's.** At ten lessons the matrix is
  45 pairs and a card carries nine comparisons, which will not fit the format. That is a
  real limit, and the point at which the picker stops being optional. Noted, not solved.

## 11. Deferred

- The picker itself (§8).
- Any comparison to a method shadowbox does not teach.
- Cross-linking a card's entry to the other lesson's page. Cheap to add later; not needed
  for the cards to work.
- Machine-readable export of `METHODS` as JSON for reuse outside this site.
