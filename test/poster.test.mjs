import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { injectPoster } from '../tools/poster.mjs';

test('injectPoster replaces marker content idempotently', () => {
  const page = `<p>a</p>\n<!-- poster:k1 -->old<!-- /poster:k1 -->\n<p>b</p>`;
  const once = injectPoster(page, 'k1', '<svg>new</svg>');
  assert.ok(once.includes('<!-- poster:k1 -->\n<svg>new</svg>\n<!-- /poster:k1 -->'));
  assert.ok(!once.includes('old'));
  assert.equal(injectPoster(once, 'k1', '<svg>new</svg>'), once);   // idempotent
  assert.throws(() => injectPoster(page, 'missing', '<svg/>'));      // unknown marker = loud failure
});

test('every lesson-4 poster marker exists and holds a rendered SVG', () => {
  const html = readFileSync(new URL('../kmeans.html', import.meta.url), 'utf8');
  for (const key of ['kmeans-step-blobs', 'restart-roulette-blobs', 'elbow-blobs', 'label-vs-truth-biometry']) {
    const m = html.match(new RegExp(`<!-- poster:${key} -->([\\s\\S]*?)<!-- /poster:${key} -->`));
    assert.ok(m, `marker missing: ${key}`);
    assert.match(m[1], /<svg[^>]*viewBox="0 0 640 460"/, `${key} holds no rendered SVG`);
    assert.ok(!m[1].includes(String.fromCharCode(0x2014)), `${key} carries an em-dash`);
  }
});

test('lesson 4 teaches with JavaScript off', () => {
  // The posters are the archival layer. If a figure is empty without JS, the
  // page does not teach in 2041 and does not print today.
  const html = readFileSync(new URL('../kmeans.html', import.meta.url), 'utf8');
  assert.equal((html.match(/<svg/g) || []).length >= 4, true);
});
