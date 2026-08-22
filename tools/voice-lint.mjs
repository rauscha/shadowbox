// voice-lint - check page prose against Andrew's measured writing voice.
// Hand-run:  node tools/voice-lint.mjs least-squares.html
//
// This is NOT a generic "does it sound like AI" checker. Every rule below comes
// from C:\claudeyard\teratology\work\voice-profile.md, which was built from 414
// slides across 11 of his genuine decks, with two decks excluded as not-his and
// the differences measured. Where that profile gives a number, it is used here.
//
// The single loudest finding in that corpus study: his genuine decks carry an
// em-dash rate of 0-2%. The one deck confirmed AI-generated ran 84%. So the
// em-dash is a hard fail here, not a density score.
//
// READ PROSE-GUIDE.md FIRST. That file is the target for these pages; this
// linter is only a tripwire for known tics. The guide is derived from an edit
// Andrew actually made, so it beats anything measured from the deck corpus.
//
// IMPORTANT SCOPE NOTE (owner correction, 2026-08-21). These pages are teaching
// chapters, not slides, and the deck voice is NOT the target. Chasing it
// produced prose he called "nearly incomprehensible... forcing a tone/style
// that is falling very, very flat." The page has to read the way he'd explain
// the topic if you asked him in conversation: define the terms, motivate each
// step, answer the obvious objection. Clarity first; everything below is a
// guardrail against known tics, not a style to write toward.
//
// SUBJECT-MIX RULE IS INVERTED FOR THIS GENRE (2026-08-22). The corpus is
// we-dominant (109/30/17) because slide decks address a room. The best
// interactive stats explainers on the web are emphatically you-dominant, and
// they contract constantly. Measured from the sources themselves:
//   setosa Explained Visually  "your job is to choose betas ... That's OLS!"
//                              "At some point, you probably asked your parents"
//   rpsychologist correlation  "By moving the slider you will see how the shape
//                              of the data changes"
//   r2d3 visual intro to ML    "you could argue that a home above 240 ft ..."
// So a high you-count on these pages is CORRECT and the we-dominant warning
// should be ignored here. The contraction warning is real: this genre is spoken.
//
// Also corrected by the owner: the voice-profile claim that he shouts in caps
// instead of bolding is WRONG. He uses bold. The all-caps in his chat messages
// is only because chat has no bold or italic. In HTML, use <strong>.

import { readFileSync } from 'node:fs';

export function extractProse(html) {
  // Math is stripped too: a MathML multiplication dot is not a middot separator,
  // and flattened equations are not prose.
  const noSvg = html
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<math[\s\S]*?<\/math>/g, ' MATH ');
  const grab = tag => [...noSvg.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'g'))]
    .map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
  return {
    headings: grab('h2').concat(grab('h3')),
    paras: grab('p').filter(t => !/^shadowbox/.test(t)),
    summaries: grab('summary'),
  };
}

const words = t => t.split(/\s+/).filter(Boolean);
const sentences = t => t.split(/(?<=[.!?])\s+(?=[A-Z“"])/).filter(s => s.trim());

// A heading that states a claim rather than asking or naming. His corpus: 0/414.
// Heuristic: contains a finite verb phrase and is not a question.
const ASSERTION = /\b(is|are|was|were|isn'?t|aren'?t|means?|shows?|makes?|has|have|can|will|does|do|becomes?|turns?|gives?|tells?|lives?|costs?)\b/i;

export function lint(html) {
  const { headings, paras, summaries } = extractProse(html);
  const all = [...headings, ...paras, ...summaries].join(' ');
  const body = paras.join(' ');
  const n = words(all).length;
  const fails = [], warns = [];

  // --- HARD FAILS (measured 0 in the genuine corpus) ---
  const emDashes = (all.match(/—/g) || []).length;
  if (emDashes) fails.push({ rule: 'em-dash', detail: `${emDashes} em-dash characters. Genuine corpus 0-2% of slides; the confirmed-AI deck ran 84%. Use a spaced hyphen ( - ).` });

  for (const h of headings) {
    if (!h.includes('?') && ASSERTION.test(h))
      fails.push({ rule: 'assertion heading', detail: `"${h}" states a claim. Zero assertion titles in 414 genuine slides; his titles ask or name, the body answers.` });
    if (words(h).length > 5)
      warns.push({ rule: 'heading length', detail: `"${h}" is ${words(h).length} words. Corpus mean 3.05, median 2, 90th pct 5.` });
  }

  if (/\s·\s/.test(body))
    fails.push({ rule: 'middot separator', detail: 'Interpunct used as a separator in body prose. 0 occurrences in the genuine corpus.' });

  if (/[↓↑→]/.test(all))
    fails.push({ rule: 'unicode arrows', detail: 'He types -> instead. 1 unicode arrow in the whole corpus.' });

  // --- REGISTER ---
  // Exclamations and question-titles are slide habits and are NOT required in a
  // teaching chapter; they were fails in an earlier revision and that was wrong.
  const q = (all.match(/\?/g) || []).length;
  const bang = (all.match(/!/g) || []).length;
  const headingQs = headings.filter(h => h.includes('?')).length;

  const ACRONYMS = /\b(EFW|HC|AC|FL|BPD|SSE|OLS|PCA|PC1|PC2|US|UMAP|NCHS|SVG|INTERGROWTH|MATH)\b/g;
  if (/\b[A-Z]{3,}\b/.test(body.replace(ACRONYMS, '')))
    warns.push({ rule: 'shouting', detail: 'All-caps emphasis in body prose. He uses bold; caps only appear in chat because chat lacks bold.' });

  const count = re => (all.match(re) || []).length;
  const we = count(/\b(we|we['’]?re|we['’]?ve|us|our)\b/gi);
  const you = count(/\b(you|you['’]?re|you['’]?ll|you['’]?ve|your)\b/gi);
  const I = count(/\b(I|I['’]?m|I['’]?ve|my|me)\b/g);
  // Corpus ratio: we=109, you=30, I=17. "We" is the default subject.
  if (we < you) warns.push({ rule: 'subject mix', detail: `we=${we}, you=${you}, I=${I}. Corpus is we-dominant (109/30/17); "we" is the field, "you" is the reader, "I" is a spice.` });
  if (I > we / 2) warns.push({ rule: 'too much I', detail: `I appears ${I}x against we=${we}. "I" is reserved for asides, disclosures and jokes.` });

  const contractions = count(/\b\w+['’](s|t|re|ve|ll|d|m)\b/g);
  if (contractions < n / 250) warns.push({ rule: 'few contractions', detail: `${contractions} contractions in ${n} words. He contracts constantly.` });

  // --- SHAPE (the rhetoric he does not write) ---
  for (const p of paras) {
    const ss = sentences(p);
    const last = ss[ss.length - 1] || '';
    if (ss.length >= 3 && words(last).length <= 6 && /^(That|This|It|And|So)\b/.test(last))
      warns.push({ rule: 'mic-drop closer', detail: `"${last}"` });
    for (const s of ss) {
      if (/\b(is|are|was|were)\s+not\b[^.]{0,60}\.\s*(It|That|They)\s+(is|are)\b/.test(s) || /\bnot\s+\w+[^.]{0,30},\s+but\b/.test(s))
        warns.push({ rule: 'not-X-but-Y', detail: s.slice(0, 110) });
      if ((s.match(/;/g) || []).length >= 2)
        warns.push({ rule: 'parallel triad', detail: `${s.slice(0, 90)} ... (he does not write rhetoric-shaped lists)` });
    }
  }

  // --- ASIDES: he uses " - ", plentifully ---
  const spacedHyphen = (body.match(/ - /g) || []).length;

  const stats = {
    words: n, headings: headings.length, questions: q, headingQuestions: headingQs,
    exclamations: bang, we, you, I, contractions, spacedHyphen, emDashes,
  };
  return { fails, warns, stats };
}

function main(file) {
  const { fails, warns, stats } = lint(readFileSync(file, 'utf8'));
  console.log(`voice-lint: ${file}`);
  console.log(`  ${stats.words} words | we/you/I = ${stats.we}/${stats.you}/${stats.I} | ? ${stats.questions} (${stats.headingQuestions} in headings) | ! ${stats.exclamations}`);
  console.log(`  contractions ${stats.contractions} | " - " asides ${stats.spacedHyphen} | em-dashes ${stats.emDashes}`);
  console.log(`  ${fails.length} FAIL, ${warns.length} warn\n`);
  for (const f of fails) console.log(`  FAIL [${f.rule}] ${f.detail}`);
  for (const w of warns) console.log(`  warn [${w.rule}] ${w.detail}`);
  process.exitCode = fails.length ? 1 : 0;
}

if (process.argv[2]) main(process.argv[2]);
