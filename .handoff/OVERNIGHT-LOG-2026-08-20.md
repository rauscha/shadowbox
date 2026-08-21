# Overnight run — 2026-08-20 (desktop)

Andrew's brief (21:23, verbatim intent):
1. Dot treatment is wrong — I did uniform Ben-Day dots, just big. The Lichtenstein
   reference (Reflections series) uses **varying dot sizes/weights to render gradients**.
   Rule he gave: need a gradient → graduated dots; dots that merely count → plain area is enough.
2. Rung 1 essay prose reads VERY AI. Find a good "is it AI" tester / linter and iterate
   until it sounds human.
3. Continue to next rung (M3, covariance) per spec.
4. De-AI that essay too.

Also queued (from NEXT-STEPS loose threads): stale font claim in rauscha.github.io
CLAUDE.md (says Lato; site uses IBM Plex) — one-line fix + push, end of night.

## Pre-flight decisions (he's gone; calls made, not guessed)
- Dot policy comes straight from his message — no open decision.
- AI-tester: no accounts may be created; will use free no-login web detectors via the
  in-app browser + a local tell-linter; if detectors unreachable, linter + rewrite and
  say so honestly.
- M3 follows the approved spec's decision log; plan-then-build as the hand-off prescribed.
- NOT touching: repo visibility / Pages (Andrew's call), apps.html card (waits on public).

## Done (running)
- **T1 committed (6859de6): Lichtenstein graduated halftone.** New js/lib/halftone.mjs
  (offset lattice, dot area linear in normalized loss, bare paper at minimum, fuse at
  max). Loss-bowl now renders it with paper-cased contours; the minimum literally
  becomes the least-inked spot on the page, which the viridis version contradicted
  (dark purple minimum). Residual-square screen made 4x finer so it reads as flat
  tone/area. Viridis + rowBands deleted. Tests 28/28 (new tests pin GRADUATION, i.e.
  >15 distinct radii). Posters regenerated. Verified in Chrome light + dark (reverse
  halftone works). CLAUDE.md/README/spec amended (dated owner-art-direction addendum).
- **T2 committed (e6f3f56): de-AI pass on rung 1 essay, 4 iterations.** New reusable
  tools/prose-lint.mjs (counts stings, dashes, triads, hedges, personification...).
  Register now: contractions, first person, varied rhythm, concrete numbers
  (29.5→3.7 SSE arc, slope 0.7/0.4, Legendre-vs-Gauss 1805 priority fight).
  **Caught a real factual error while verifying numbers: births fit slope is ~125
  g/week, not "two hundred"** — fixed, with a serial-growth vs cross-section aside.
  Detector evidence (honest): GPTZero rated the ORIGINAL 'AI 100%' and a 2011 Gelman
  control 'Human 100%' (instrument valid); Sapling rated original opening 78.1% fake
  → rewrite opening 2.3%; but conceptual middle/tail chunks stay 95-100% on Sapling
  across all 4 iterations — an LLM-prose ceiling I documented rather than thrashed.
  GPTZero re-verdict on the final text blocked by anonymous-scan quota (resets;
  recheck tomorrow). qwen3:14b used as local judge; ZeroGPT tested and discarded
  (rated the VERY-AI original '0% AI' — no discrimination).

## Deferred / waiting on Andrew
- (nothing yet)
