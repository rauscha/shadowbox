// prose-lint — count the mechanical tells of AI-written essay prose in a page.
// Hand-run: node tools/prose-lint.mjs least-squares.html
// This is a linter, not a detector: it counts habits (sting density, em-dashes,
// "not X, it is Y" turns, triads, missing hedges/first person, flat sentence
// rhythm) and quotes the offending lines so a rewrite can attack them directly.
// Born from owner feedback 2026-08-20: "this whole thing is VERY AI tone."

import { readFileSync } from 'node:fs';

export function extractProse(html) {
  const noSvg = html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
  const blocks = [...noSvg.matchAll(/<(p|h1|h2|h3|summary)\b[^>]*>([\s\S]*?)<\/\1>/g)]
    .map(m => m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
    .filter(t => t.length > 0 && !/^shadowbox/.test(t));
  return blocks;
}

const sentences = text => text.split(/(?<=[.!?])\s+(?=[A-Z“"])/).filter(s => s.trim().length > 0);
const words = text => text.split(/\s+/).filter(Boolean);

export function lint(blocks) {
  const paras = blocks.filter(b => words(b).length > 15);   // headings/kicker excluded
  const all = blocks.join(' ');
  const nWords = words(all).length;
  const findings = [];
  const add = (metric, detail, quote) => findings.push({ metric, detail, quote });

  // 1. em-dash density (human essays: well under 1 per 100 words)
  const dashes = (all.match(/—/g) || []).length;
  const dashRate = dashes / nWords * 100;
  if (dashRate > 0.8) add('em-dash density', `${dashes} em-dashes in ${nWords} words (${dashRate.toFixed(1)}/100w)`);

  // 2. "not X. It is Y" / "not X but Y" reversal turns
  for (const p of paras) {
    for (const s of sentences(p)) {
      if (/\bis not\b.*\.\s*It is\b/.test(s) || /\bnot\b[^.]{3,40},?\s+(but|it is)\b/i.test(s))
        add('not-X-but-Y turn', 'reversal construction', s);
    }
  }

  // 3. paragraph-final sting: closing sentence under 9 words reads as a mic-drop
  let stings = 0;
  for (const p of paras) {
    const ss = sentences(p);
    const last = ss[ss.length - 1] || '';
    if (ss.length >= 2 && words(last).length <= 8) { stings++; add('closing sting', `${words(last).length}-word closer`, last); }
  }
  const stingRate = stings / Math.max(paras.length, 1);

  // 4. semicolon / imperative triads
  for (const p of paras) {
    for (const s of sentences(p)) {
      if ((s.match(/;/g) || []).length >= 2) add('triad', 'double-semicolon parallel list', s);
    }
  }

  // 5. prophetic second person
  for (const p of paras) {
    for (const s of sentences(p)) {
      if (/\bYou (will|are about to)\b/.test(s)) add('prophetic you', 'narrated future for the reader', s);
    }
  }

  // 6. anaphora: consecutive sentences opening with the same word
  for (const p of paras) {
    const ss = sentences(p).map(s => (words(s)[0] || '').toLowerCase().replace(/[^a-z]/g, ''));
    for (let i = 1; i < ss.length; i++) {
      if (ss[i] && ss[i] === ss[i - 1] && !['the', 'a', 'it'].includes(ss[i]))
        add('anaphora', `consecutive sentences open with "${ss[i]}"`);
    }
  }

  // 7. missing human texture: hedges and first person
  const hedges = (all.match(/\b(maybe|probably|roughly|more or less|I think|I suspect|seems|sort of|in practice|honestly)\b/gi) || []).length;
  const firstPerson = (all.match(/\bI\b|\bmy\b/g) || []).length;
  if (hedges === 0) add('no hedges', 'zero tentative language in the whole essay — nothing is ever approximate');
  if (firstPerson <= 1) add('no author', `first person appears ${firstPerson}x — no person behind the prose`);

  // 8. sentence-length burstiness (stdev/mean of sentence word counts; flat = suspect)
  const lens = paras.flatMap(p => sentences(p).map(s => words(s).length));
  const mean = lens.reduce((a, b) => a + b, 0) / lens.length;
  const sd = Math.sqrt(lens.reduce((a, b) => a + (b - mean) ** 2, 0) / lens.length);
  const burst = sd / mean;

  // 9. dramatic personification of the subject matter
  for (const p of paras) {
    for (const s of sentences(p)) {
      if (/\b(machine|fit|line|surface|landscape)\b[^.]*\b(fears|happily|does not care|quietly|wants|knows)\b/i.test(s))
        add('personification', 'the apparatus has feelings', s);
    }
  }

  return { findings, stats: { words: nWords, paras: paras.length, dashRate: +dashRate.toFixed(2), stingRate: +stingRate.toFixed(2), hedges, firstPerson, burstiness: +burst.toFixed(2) } };
}

function main(file) {
  const html = readFileSync(file, 'utf8');
  const blocks = extractProse(html);
  const { findings, stats } = lint(blocks);
  console.log(`prose-lint: ${file}`);
  console.log(`  ${stats.words} words, ${stats.paras} paragraphs`);
  console.log(`  em-dashes/100w: ${stats.dashRate}   closing-sting rate: ${stats.stingRate}   hedges: ${stats.hedges}   first-person: ${stats.firstPerson}   burstiness: ${stats.burstiness}`);
  console.log(`  ${findings.length} findings\n`);
  for (const f of findings) {
    console.log(`- [${f.metric}] ${f.detail || ''}`);
    if (f.quote) console.log(`    "${f.quote}"`);
  }
}

if (process.argv[2]) main(process.argv[2]);
