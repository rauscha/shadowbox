# data provenance

Every dataset in this directory is small, committed JSON with a provenance block in
the file itself. Instruments never fetch anything external.

## births.json

- **What:** 400 births — gestational age (weeks) vs birthweight (grams).
- **Source:** OpenIntro `births14`, itself a random sample of 1,000 births from the
  **2014 NCHS natality public-use file** (US births).
- **URL:** https://www.openintro.org/data/csv/births14.csv
- **License:** CC BY-SA 4.0 (OpenIntro data).
- **Transform:** dropped rows missing `weeks`/`weight`; pounds → grams
  (× 453.59237, rounded); seeded downsample 1,000 → 400 (mulberry32, seed 20260820);
  sorted by weeks. Reruns are byte-identical.
- **Regenerate:**
  `curl -L -o <tmp>/births14.csv https://www.openintro.org/data/csv/births14.csv`
  `node tools/make-births.mjs <tmp>/births14.csv <retrieved-date>`
- **Upgrade path:** a direct extract from a raw NCHS natality public-use file
  (multi-GB download) can replace this file without touching any instrument —
  keep the same JSON shape (`xs`, `ys`, provenance block).

## biometry.json (rungs 2–3)

- **What:** 350 SIMULATED fetal scans — gestational age (weeks) plus HC, AC, FL,
  BPD (mm) and EFW (g). **Not patient data**, and labeled as simulated on-page.
- **Centile source:** INTERGROWTH-21st Fetal Growth Standards — Papageorghiou et
  al., *Lancet* 2014;384:869-79. Per-week means/SDs transcribed from the official
  z-score tables published at intergrowth21.com (© University of Oxford), and
  spot-checked against the fitted equations reproduced in Ohuma & Altman, *Stat
  Med* 2019 (doi:10.1002/sim.8018; HC) and Wang et al., *PLoS ONE* 2016
  (doi:10.1371/journal.pone.0159733; FL). Retrieved 2026-08-20 via PubMed/PMC and
  intergrowth21.com.
- **EFW:** computed from the simulated HC/AC/FL with the Hadlock three-parameter
  model (Hadlock et al., *Am J Obstet Gynecol* 1985;151:333-7), then given
  multiplicative noise. Because EFW is *derived from* biometry, part of the
  HC↔EFW correlation is by construction — that is the point the rung-2 essay
  makes out loud.
- **Simulation parameters** (choices, not published facts; tune in the tool):
  GA ~ U(20, 40); within-GA cross-correlation of biometry z-scores 0.6;
  EFW noise SD 0.031 log10 (≈7.5%). Seeded (mulberry32, seed 21); reruns are
  byte-identical.
- **Regenerate:** `node tools/make-biometry.mjs`
- **Upgrade path:** real individual-level biometry (needs a data request) can
  replace this file without touching any instrument — same JSON shape.
