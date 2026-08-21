# Session hand-off — 2026-08-21 (machine: desktop, C:\claudeyard)

## STATE (read this first)
- Branch: `main`, clean, synced: yes. 65/65 tests green.
- **shadowbox is PUBLIC and LIVE at https://andrewrausch.com/shadowbox/** (Pages on
  `main`, HTTPS enforced, custom domain picked up automatically).
- Rungs 1 and 2 are published. Both essays were **rewritten from scratch** this
  session after Andrew rejected the prose three times. Rung 3's instruments are
  built and tested but the page does not exist yet.
- The one thing gating further writing: Andrew's verdict on the rewritten prose.

## Done this session
- **Prose rewritten, on a completely different brief.** The real defect was not
  tone: the pages toured their own figures and never taught the subject. Rung 1
  never said what least squares *is* before showing widgets; rung 2 never defined
  covariance. Both now read as answers to "teach me how this works" — define the
  term, motivate each step, answer the obvious objection. index.html's slogan copy
  went too.
- **Owner corrections applied.** (a) Caps are NOT his emphasis; he uses bold, and
  caps appear in chat only because chat lacks bold. A shouted line had shipped;
  it's gone. (b) His slide-deck voice profile is **not** the model for a teaching
  chapter — writing toward it is what produced the unreadable draft.
- **Dot colour fixed per his note:** new `--ink-dot` token (grey) used only by the
  halftone screens, so large fused dots stop reading as a solid black mass, while
  structural outlines keep full `--ink` weight. Verified light + dark.
- **Em-dashes purged repo-wide** (0 remaining outside the linters' own regexes).
  This is his single most reliable AI tell: 0-2% across 414 genuine slides vs 84%
  in the one confirmed-AI deck in his collection.
- **`tools/voice-lint.mjs`** added — guardrail only, with the scope caveat in its
  header. Both essays: 0 FAIL.
- **M4 instruments built** by a subagent: axis-projector, three-lines, basis-spin,
  scree, plus `test/instruments3.test.mjs`. Committed, suite green at 65.
- Repo flipped public, Pages enabled, live URL verified serving the new copy.

## Next up
1. **Get Andrew's read on the prose** (rung 1 "Why squares?", rung 2's covariance
   definition). Everything else in the writing lane waits on this.
2. **Write `pca.html`** and wire it: mounts for the four instruments, poster configs
   in `tools/poster.mjs`, `node tools/poster.mjs`, links from index + rung-2 footer.
   Instruments are done; this is page assembly. Write its prose only after (1).
3. **Re-measure the PCA result before claiming it.** The subagent never filed its
   report, so "PC1 = overall size, PC2 = head-vs-body proportion" on the 4-variable
   biometry data is unverified. Run it and look before writing that sentence.
4. apps.html card on andrewrausch.com — unblocked now that the site is public.

## Watch out for
- **Do not write prose toward a style guide.** Three rewrites failed that way. The
  target is: write what you'd write if he asked the question in chat. Clarity first;
  the linter is a guardrail against tics, never a thing to write toward.
- Never type an em-dash in this repo (source, comments, figure labels, prose).
  Use a spaced hyphen. `node tools/voice-lint.mjs <page>` enforces it.
- Use `<strong>`, never all-caps, for emphasis.
- `node --test` with **no** directory argument (passing `test/` breaks on this
  Windows Node). Re-run `node tools/poster.mjs` after touching any instrument.
- Two eigensolvers must keep agreeing; eigenvector comparisons are direction-based
  (sign normalised in `pca()`/`signNorm`) — don't "fix" a sign flip by editing
  expected values.
- The site is public now, so sloppy copy is visible immediately.
- Leftover empty worktree at
  `C:/rauscha.github.io/.claude/worktrees/objective-mcclintock-817c73` — verified
  clean, same commit as master, nothing stranded. Safe to remove.
- Unrelated repos left dirty on purpose (hp-review, mfm-round-2/3, digi-me) — see
  the bottom of NEXT-STEPS.md. Not this session's work; don't blind-commit them.
