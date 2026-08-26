# How to write the prose on these pages

Derived from an actual edit Andrew made (2026-08-22) to the opening of
least-squares.html, plus a study of the best interactive stats explainers on the
open web. **This file, not `tools/voice-lint.mjs`, is the target.** The linter is
a guardrail against known tics; it is built from a slide-deck corpus and its
subject-mix rule is wrong for this genre.

Andrew's framing: this is a **speech and teaching** register, not the terser
descriptive style of his decks.

## The rules, each one taken from a change he made

**1. Name the subject in the first clause.** Do not set up, do not define the
problem space first.

> he wrote: "Least squares is a method of fitting the best line to a set of data points."
> I had written: "Fitting a line to data means picking one line out of infinitely many."

Every good explainer on the web does this. setosa: "Principal component analysis
(PCA) is a technique used to emphasize variation and bring out strong patterns in
a dataset." rpsychologist: "Correlation is one of the most widely used tools in
statistics."

**2. Gloss jargon inline, in parentheses, at first use.** Both directions:
technical term for a plain word, plain word for a technical term.

> "We need a rule (a statistical method) to compare each candidate line"
> "the difference from each data point to the candidate line (the residual)"

**3. Give the alias the reader will meet elsewhere.**

> "In statistical contexts it's also called ordinary least squares, or OLS."

I had omitted OLS entirely. A reader who leaves this page and reads anything else
needs that word.

**4. Hedge honestly.** "probably the most common one out there" beats "It's so
standard that". Do not overclaim to sound authoritative.

**5. Cut the why-you-should-care sentence.** He deleted mine outright:

> "...which makes it worth seeing what the rule actually does and what it costs you."

The reader is already on the page. Selling the topic mid-explanation is
throat-clearing.

**6. Name the mechanism, not just the outcome.**

> he wrote: "even a very bad line that balances its badness could have a low score"
> I had written: "a line can score zero while missing every point badly"

His says *why* it happens. Mine only says *that* it happens.

**7. No punchy fragments for rhythm.** He deleted "The signs have to go." A
sentence that exists for cadence rather than information gets cut. This is the
single most reliable tell in my failed drafts.

**7b. No balanced pairs either.** Same species as rule 7, caught 2026-08-22.
Antithesis and chiasmus are cadence, not information. Both of these were cut on
sight:

> "That is all three numbers can buy, and it is exactly what they buy."
> "reading a covariance matrix entry by entry tells you so little, and why seeing it as an ellipse tells you so much"

A balanced pair is fine only when the two halves are genuinely two different
things being reported, not one thing said twice in mirror. "part of that is fetal
biology and part of it is arithmetic" stays, because there really are two
sources.

**8. Plain sequencing words.** "The most obvious option would be..." / "The next
obvious options are..." Not "The obvious move is" / "There are two natural ways."

**9. One thought, one paragraph.** He merged two of mine that were split for
pacing.

**10. Cut the scaffolding verb phrase.** From his 2026-08-22 edit of the PCA
opening:

> he wrote: "Principal component analysis finds the directions a cloud of data points actually spreads along"
> I had written: "Principal component analysis is a method for finding the directions a cloud of data actually spreads along"

"X is a method for finding Y" is "X finds Y" with padding. Same for "is what
happens when you", "is the number that answers", "is the bookkeeping that holds".

**11. Gloss with a parenthetical, not a sentence.** "(typically written PCA)"
beats "It is almost always shortened to PCA." A whole sentence spent on an
abbreviation is a whole sentence the reader has to carry.

**12. Nothing the main line depends on may live in a collapsible.** This is what
broke the first PCA draft. The projection/shadow idea was defined inside the
"start from zero" block, then the body said "the line whose shadows are spread
out" as though it had been established. His note: *"here your point about shadows
is NOT hinted at at all and I don't follow what you're talking about."* The
start-from-zero blocks are for readers who want more background, never for a term
the body is about to use.

**13. Name the frame of reference.** He *added* "in your coordinate system" to
"figures out which way the ellipse is pointing". Pointing relative to what was
missing, and it is the whole content of the sentence.

**14. Cut the line that is memorable because it does not fit.** From his ruling
on the lesson-4 outline, 2026-08-25. I proposed "the clusters are gestational
age wearing a costume", and flagged it myself as the most memorable line in the
outline and the least like the register around it. He cut it: *"too cute.
memorable because it doesn't fit - not always good to be the proud nail."*

This generalises rule 7. Rule 7 catches the punchy fragment; rule 14 catches the
quotable metaphor. The tell is the same in both: I notice a line is doing
something different from its neighbours and read that as strength. It is not. If
a line's appeal is that it stands out from the register around it, that is the
argument for cutting it.

> **Standing exception, ruled 2026-08-26.** `pca.html` reads "PC1 here is
> gestational age wearing a disguise". That is the same metaphor family, and it
> **stays**. Lesson 3's prose was approved on 2026-08-22, before this rule
> existed, and Andrew ruled explicitly that it is not to be changed. Do not
> sweep it out under rule 14. Rules here are not retroactive against text he has
> already signed off.

## Process: outline, then one bullet at a time

His instruction after the first PCA draft lost the thread halfway down:

> "Rather than writing the text all as one (where you're losing the thread),
> write your terse outline of points first, based on the guides of the example
> websites you showed me before. Then instead of writing this all at once, write
> each bullet of your outline separately. You can then read over it all again
> together and see how you would like to better connect the sections."

So: outline first, in bullets, checked. Then draft each bullet on its own. Then
read the whole thing straight through and fix the joins. Writing 1,900 words in
one pass is how a page ends up with a section that assumes a term the previous
section never introduced.

## Interaction copy

Imperative plus consequence, always naming the control and what it does:

> "Drag the line to slide it, the round handles to tilt it."
> setosa: "Drag the sample data to see the betas change."
> rpsychologist: "By moving the slider you will see how the shape of the data changes."

Never "the figure below illustrates."

**Give the reader a job and then tell them what they just did.** setosa's best
move: "your job is to choose betas ... so that the total area of all the squares
is as small as possible. **That's OLS!**" Our version: "Try to get the total
down. It starts at 29.5, and the best these twelve points allow is about 3.7."
followed by "...and that is the entire definition."

## Subject mix

**you**-dominant, **we** for the shared enterprise, **I** rarely and only for
things I actually did (generating the synthetic data). Contract freely; this
register is spoken. The linter's we-dominant warning comes from the deck corpus
and should be ignored on these pages.

## Hard rules

- Never an em-dash. Spaced hyphen instead. This is his loudest AI tell: 0-2%
  across 414 genuine slides, 84% in the one confirmed-AI deck.
- `<strong>`, never all-caps, for emphasis.
- Never write toward this file the way I wrote toward the linter. If a rule here
  fights clarity, clarity wins and the rule is wrong.
