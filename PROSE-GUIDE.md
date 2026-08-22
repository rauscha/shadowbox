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

**8. Plain sequencing words.** "The most obvious option would be..." / "The next
obvious options are..." Not "The obvious move is" / "There are two natural ways."

**9. One thought, one paragraph.** He merged two of mine that were split for
pacing.

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
