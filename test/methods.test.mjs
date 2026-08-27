// The comparison matrix behind every lesson's closing card, pinned so it cannot
// grow holes. Spec: docs/superpowers/specs/2026-08-27-shadowbox-method-cards-design.md
//
// Completeness is the point. A picker with a missing pair cannot answer "why not
// X?", and missing pairs are exactly what accumulates when five panels are
// written months apart. Everything else here protects the format from drifting
// into five paragraphs of equal weight.

import test from 'node:test';
import assert from 'node:assert/strict';
import { METHODS } from '../js/data/methods.mjs';

const EM_DASH = String.fromCharCode(0x2014);
const records = () => Object.entries(METHODS);
const sentences = s => s.split(/(?<=[.!?])\s+/).filter(t => t.trim().length);

test('every record carries the fields a card and a picker both need', () => {
  for (const [id, m] of records()) {
    assert.equal(typeof m.name, 'string', id);
    assert.ok(Number.isInteger(m.lesson) && m.lesson >= 1, id);
    assert.ok(['method', 'lens'].includes(m.kind), `${id}: kind ${m.kind}`);
    assert.equal(typeof m.when, 'string', id);
    assert.ok(Array.isArray(m.assumes), id);
    assert.equal(typeof m.gives, 'string', id);
    assert.equal(typeof m.notInstead, 'object', id);
  }
});

test('lesson numbers are unique, so the ladder has one method per rung', () => {
  const ls = records().map(([, m]) => m.lesson);
  assert.equal(new Set(ls).size, ls.length);
});

test('covariance is the only lens, and it is one deliberately', () => {
  // Nobody chooses covariance over k-means. Forcing a "when would you use this
  // instead" card onto lesson 2 would be subtly untrue, and the picker must
  // never offer it as an answer to "which test should I run". Spec §3.1.
  const lenses = records().filter(([, m]) => m.kind === 'lens').map(([id]) => id);
  assert.deepEqual(lenses, ['covariance']);
});

test('the comparison matrix has no holes', () => {
  // THE load-bearing test. Every record must compare against every method the
  // reader has already met.
  for (const [id, m] of records()) {
    const priors = records().filter(([, p]) => p.lesson < m.lesson).map(([pid]) => pid);
    for (const p of priors) {
      const e = m.notInstead[p];
      assert.ok(e, `${id} has no "why not ${p}" entry, and the reader has already met ${p}`);
      assert.ok(typeof e.text === 'string' && e.text.trim().length > 0, `${id} vs ${p}: empty text`);
      assert.ok(['deep', 'brief'].includes(e.depth), `${id} vs ${p}: depth ${e.depth}`);
    }
  }
});

test('no card compares against a method the reader has not met yet', () => {
  for (const [id, m] of records()) {
    for (const other of Object.keys(m.notInstead)) {
      assert.ok(METHODS[other], `${id} compares against unknown ${other}`);
      assert.ok(METHODS[other].lesson < m.lesson,
        `${id} (lesson ${m.lesson}) compares forward against ${other} (lesson ${METHODS[other].lesson})`);
    }
  }
});

test('depth is honest: deep entries argue, brief entries do not', () => {
  // Without this the tiering collapses into five paragraphs of equal weight,
  // which is the format's most likely failure. Spec §4.1.
  for (const [id, m] of records()) {
    for (const [other, e] of Object.entries(m.notInstead)) {
      const n = sentences(e.text).length;
      if (e.depth === 'deep') assert.ok(n >= 2, `${id} vs ${other}: deep needs two sentences, has ${n}`);
      else assert.equal(n, 1, `${id} vs ${other}: brief must be one sentence, has ${n}`);
    }
  }
});

test('records hold plain text, never markup', () => {
  // The picker will render this in a layout nobody has designed yet. A record
  // carrying page-specific markup only works on one surface. Spec §3.2.
  const strings = m => [m.name, m.when, m.gives, ...m.assumes,
    ...Object.values(m.notInstead).map(e => e.text)];
  for (const [id, m] of records()) {
    for (const s of strings(m)) {
      assert.ok(!s.includes('<'), `${id}: markup in a record - ${s.slice(0, 40)}`);
      assert.ok(!s.includes(EM_DASH), `${id}: em-dash in a record`);
    }
  }
});

test('no card contains a bare k, because a card is read out of context', () => {
  // k counts groups in lesson 4 and neighbours in lesson 5, and a card is often
  // the only part a hurried reader opens. Token match, not a judgment call.
  const strings = m => [m.when, m.gives, ...m.assumes,
    ...Object.values(m.notInstead).map(e => e.text)];
  for (const [id, m] of records()) {
    for (const s of strings(m)) {
      assert.ok(!/\bk\b/.test(s), `${id}: bare k - say clusters or neighbours: ${s.slice(0, 60)}`);
    }
  }
});

test('lesson 5 keeps its own vocabulary bans inside its card', () => {
  const s = JSON.stringify(METHODS.umap);
  assert.ok(!/n_neighbors/.test(s), 'say neighbours');
  assert.ok(!/fuzzy simplicial/i.test(s), 'say: the graph of who is near whom');
});
