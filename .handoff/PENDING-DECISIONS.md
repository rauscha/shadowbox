# Pending decisions — for Andrew (written overnight 2026-08-20 → 21)

Each card is self-contained; one answer each unblocks cleanly.

## 1. Eyeball the new Lichtenstein look (rung 1) and the new rung 2
`python -m http.server 8000` in the repo → localhost:8000. Rung 1's loss-bowl is
now a graduated ink halftone (dot size = error; the minimum is literally the
barest paper on the page) and the residual squares use a 4× finer screen that
reads as flat tone. Rung 2 (covariance.html) is entirely new. Check light AND
dark, plus your desaturated/grayscale glance. Everything is var()-driven ink on
paper, so it should survive any color vision — but that's your call to make.

## 2. Does the prose pass your ear now?
Both essays rewritten/written in a plain professor register (contractions,
first person, no mic-drops; tools/prose-lint.mjs keeps score). Detector state,
honestly: GPTZero rated the ORIGINAL rung 1 "AI 100%" and a 2011 Gelman control
"Human 100%", but its anonymous scan quota ran out before the final text got a
verdict — rerun gptzero.me on the final prose whenever (quota resets). Sapling:
original opening 78% fake → final opening 2.3%; the densest explainer chunks
still sit high (80–99%) across every iteration — that looks like a floor for
LLM-drafted didactic prose. If your read still says "AI," the reliable fix is a
10-minute voice pass from you dictating over my draft; happy to apply it.

## 3. Biometry simulation parameters (owner is domain authority)
data/biometry.json: HC/AC/FL/BPD from the official INTERGROWTH-21st per-week
tables (Papageorghiou, Lancet 2014), EFW computed via Hadlock 1985 — so the
HC↔EFW r = 0.93 is partly by construction, which the essay says out loud. The
three SIMULATION choices (not published facts): GA ~ U(20,40); within-GA
z-score correlation 0.6; EFW noise ≈7.5%. If the scatter looks clinically off
to you, tune the constants at the top of tools/make-biometry.mjs and rerun it.

## 4. Flip the repo public + enable Pages (standing decision)
Rungs 1 and 2 are now both live locally. Whenever they feel ready, public +
Pages puts them at andrewrausch.com/shadowbox/. apps.html card waits on that.

## 5. Next build = M4, rung 3 (PCA)
axis-projector, three-lines, basis-spin, scree + the 4-variable BPD/HC/AC/FL
payoff. The data is already banked (biometry.json carries all four measures)
and both eigensolvers are tested. Say go (or hand it to another overnight run).
