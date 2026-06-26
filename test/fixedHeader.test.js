import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const header = readFileSync(
  new URL('../components/layout/Header.jsx', import.meta.url),
  'utf8',
);

test('header uses a fixed wrapper with layout spacing', () => {
  assert.match(header, /className="fixed left-0 right-0 top-0 z-50 w-full"/);
  assert.match(header, /className="relative w-full overflow-x-clip border-b border-border bg-white"/);
  assert.match(header, /aria-hidden="true" className="h-16 md:h-\[5\.5rem\]"/);
  assert.doesNotMatch(header, /sticky top-0/);
});
