# shadowbox — next steps

(Newly created this session — no prior next-steps doc existed in this repo.)

## Decisions waiting on Andrew
- [ ] **Create the GitHub repo + push** (this is also the laptop-sync gate). Private now
      and public later is fine; Pages goes live at andrewrausch.com/shadowbox/ when public.
- [ ] apps.html card on andrewrausch.com — recommend waiting until the site is public.
- [ ] Eyeball rung 1, including a desaturated/grayscale glance (the one un-automated QA step).

## Build queue (spec §13)
- [ ] **M3 — rung 2, covariance**: plan then build. cloud-ellipse (live 2×2 matrix ↔ ellipse)
      + units-trap (mm↔cm, g↔kg; correlation invariant). Biometry pair simulated from
      published centiles, labeled as such (spec §8) — include the EFW-circularity aside (§7).
- [ ] **M4 — rung 3, PCA**: axis-projector (variance vs perpendicular error, twin readouts),
      three-lines (y~x / x~y / PC1, stripe orientations), basis-spin, scree with the
      4-variable BPD/HC/AC/FL payoff (PC1 = size, PC2 = proportion) + raw-vs-standardized toggle.
- [ ] **M5 — polish + publish**: index/trellis nav, print + grayscale + keyboard passes,
      Pages live, apps card.
- [ ] Rung 4 (next slice, own spec addendum): UMAP — high-dimensional distance +
      iterative-optimization "start from zero" blocks, precomputed embeddings.

## Loose threads
- [ ] Background task "Fix stale font claim in rauscha.github.io CLAUDE.md" (Lato → IBM Plex)
      shows no commit in that repo yet — finish or re-run it.

## Done (this session, 2026-08-20)
- [x] Spec + M1/M2 plan (docs/superpowers/)
- [x] M1: math core pinned to numpy; viridis/contours; 27-test suite
- [x] M2: rung 1 live — fit-scatter + loss-bowl linked, births data, posters, essay, QA
