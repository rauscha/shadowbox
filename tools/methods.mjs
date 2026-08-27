// Method-card generator. Hand-run:  node tools/methods.mjs
// Renders one <details class="method-card"> per lesson from js/data/methods.mjs
// and injects it into that lesson's page between <!-- methods:KEY --> markers,
// idempotently. Mirrors tools/poster.mjs's injectPoster exactly - see that file
// for why the injection has to be idempotent (a committed page and a
// regenerated one must agree byte for byte on a second run).
//
// Spec: docs/superpowers/specs/2026-08-27-shadowbox-method-cards-design.md

import { readFileSync, writeFileSync } from 'node:fs';
import { METHODS } from '../js/data/methods.mjs';

const esc = s => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export function injectCard(html, key, card) {
  const re = new RegExp(`<!-- methods:${key} -->[\\s\\S]*?<!-- /methods:${key} -->`);
  if (!re.test(html)) throw new Error(`marker not found: methods:${key}`);
  return html.replace(re, `<!-- methods:${key} -->\n${card}\n<!-- /methods:${key} -->`);
}

// deep entries first, then brief; each group in descending lesson order - the
// method the reader just came from is the confusion most likely to be live, so
// it goes first. Spec §4.1.
function orderedComparisons(notInstead) {
  const entries = Object.entries(notInstead);
  return entries.sort((a, b) => {
    const depthRank = e => (e[1].depth === 'deep' ? 0 : 1);
    const d = depthRank(a) - depthRank(b);
    if (d !== 0) return d;
    return METHODS[b[0]].lesson - METHODS[a[0]].lesson;
  });
}

export function renderCard(id) {
  const m = METHODS[id];
  if (!m) throw new Error(`unknown method: ${id}`);

  const parts = [];
  parts.push('<details class="method-card">');
  parts.push(`<summary>When to use ${esc(m.name)}, and when to reach for something else.</summary>`);

  // A lens (covariance, per spec §3.1) answers a different question in section
  // 1: nobody chooses it over a later method, so the heading never asks "when
  // would you use this instead".
  const heading1 = m.kind === 'lens' ? 'What this buys you further up the ladder' : 'When you would use it';
  parts.push(`<h3>${heading1}</h3>`);
  parts.push(`<p>${esc(m.when)}</p>`);

  parts.push('<h3>What it assumes, and what it hands back</h3>');
  parts.push('<ul>');
  for (const a of m.assumes) parts.push(`<li>${esc(a)}</li>`);
  parts.push('</ul>');
  parts.push(`<p>${esc(m.gives)}</p>`);

  // Lesson 1 has no earlier methods to compare against, and a card that says
  // "nothing to compare against yet" is noise, so this section is omitted
  // entirely rather than rendered empty. Spec §2.
  const comparisons = orderedComparisons(m.notInstead);
  if (comparisons.length) {
    parts.push('<h3>Why not the others</h3>');
    parts.push('<dl>');
    for (const [otherId, entry] of comparisons) {
      parts.push(`<dt>${esc(METHODS[otherId].name)}</dt>`);
      parts.push(`<dd>${esc(entry.text)}</dd>`);
    }
    parts.push('</dl>');
  }

  parts.push('</details>');
  return parts.join('\n');
}

const root = new URL('..', import.meta.url);
const inRepo = p => new URL(p, root);

// One page carries one card. M7 ships only the umap record's card; M8 adds the
// other four pages here alongside their records' real prose.
const PAGES = [
  { file: 'umap.html', id: 'umap' },
];

function main() {
  for (const { file, id } of PAGES) {
    const pagePath = inRepo(file);
    let html = readFileSync(pagePath, 'utf8');
    const card = renderCard(id);
    html = injectCard(html, id, card);
    writeFileSync(pagePath, html);
    console.log(`methods: ${id} -> ${file}`);
  }
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main();
}
