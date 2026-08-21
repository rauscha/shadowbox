# shadowbox — next steps

(Newly created this session — no prior next-steps doc existed in this repo.)

## Decisions waiting on Andrew
- [x] ~~Create the GitHub repo + push~~ — done 2026-08-20: https://github.com/rauscha/shadowbox (private)
- [ ] **Flip public + enable Pages** when ready — that's what puts it at andrewrausch.com/shadowbox/.
- [ ] apps.html card on andrewrausch.com — recommend waiting until the site is public.
- [ ] Eyeball rung 1, including a desaturated/grayscale glance (the one un-automated QA step).

## Build queue (spec §13)
- [x] ~~**M3 — rung 2, covariance**~~ — done overnight 2026-08-20/21: cloud-ellipse +
      units-trap linked, INTERGROWTH-simulated biometry pair (labeled), EFW aside,
      posters, 46/46 tests, browser-QA'd light+dark. Awaiting Andrew's eyeball.
- [ ] **M4 — rung 3, PCA**: axis-projector (variance vs perpendicular error, twin readouts),
      three-lines (y~x / x~y / PC1, stripe orientations), basis-spin, scree with the
      4-variable BPD/HC/AC/FL payoff (PC1 = size, PC2 = proportion) + raw-vs-standardized toggle.
- [ ] **M5 — polish + publish**: index/trellis nav, print + grayscale + keyboard passes,
      Pages live, apps card.
- [ ] Rung 4 (next slice, own spec addendum): UMAP — high-dimensional distance +
      iterative-optimization "start from zero" blocks, precomputed embeddings.

## Loose threads
- [x] ~~Stale font claim in rauscha.github.io CLAUDE.md~~ — fixed and pushed
      overnight 2026-08-21 (7e574d7): Lato → IBM Plex Serif/Sans/Mono, verified
      against stylesheet.css and index.html first.
- [ ] (optional, noticed in passing) index.html blurb still has two slogan-y
      AI-ish closers ("These pages let you move the light." / "The contrast is
      the lesson.") — left alone since they read as deliberate site voice;
      Andrew judges.

## Done (this session, 2026-08-20)
- [x] Spec + M1/M2 plan (docs/superpowers/)
- [x] M1: math core pinned to numpy; viridis/contours; 27-test suite
- [x] M2: rung 1 live — fit-scatter + loss-bowl linked, births data, posters, essay, QA
