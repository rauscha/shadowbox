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

## Coming with rungs 2–3

Fetal biometry (HC/BPD/AC/FL) — simulated from published reference centiles and
correlation structure, labeled as such on-page; format will be documented here.
