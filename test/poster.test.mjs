import test from 'node:test';
import assert from 'node:assert/strict';
import { injectPoster } from '../tools/poster.mjs';

test('injectPoster replaces marker content idempotently', () => {
  const page = `<p>a</p>\n<!-- poster:k1 -->old<!-- /poster:k1 -->\n<p>b</p>`;
  const once = injectPoster(page, 'k1', '<svg>new</svg>');
  assert.ok(once.includes('<!-- poster:k1 -->\n<svg>new</svg>\n<!-- /poster:k1 -->'));
  assert.ok(!once.includes('old'));
  assert.equal(injectPoster(once, 'k1', '<svg>new</svg>'), once);   // idempotent
  assert.throws(() => injectPoster(page, 'missing', '<svg/>'));      // unknown marker = loud failure
});
