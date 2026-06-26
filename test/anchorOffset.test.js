import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const css = readFileSync(new URL('../styles/globals.css', import.meta.url), 'utf8');

test('global anchor offsets account for the fixed header', () => {
  assert.match(css, /scroll-padding-top\s*:\s*80px/);
  assert.match(css, /scroll-margin-top\s*:\s*80px/);
  assert.match(css, /@media\s*\(min-width:\s*768px\)/);
  assert.match(css, /scroll-padding-top\s*:\s*110px/);
  assert.match(css, /scroll-margin-top\s*:\s*110px/);
  assert.match(css, /main\s+\[id\]\s*,\s*[\r\n\s]*\.prose\s+\[id\]/);
});
