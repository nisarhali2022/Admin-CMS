import test from 'node:test'
import assert from 'node:assert/strict'
import { selectLatestNewsPosts } from '../lib/latestNewsSelection.js'

function makePosts(count) {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    title: `Post ${index + 1}`,
  }))
}

test('latest news selection keeps the two newest posts fixed', () => {
  const selected = selectLatestNewsPosts(makePosts(60), 6, 2, () => 0.5)

  assert.equal(selected.length, 6)
  assert.equal(selected[0].id, 1)
  assert.equal(selected[1].id, 2)
})

test('latest news random pool excludes the two fixed posts and avoids duplicates', () => {
  const selected = selectLatestNewsPosts(makePosts(60), 6, 2, () => 0.25)
  const ids = selected.map((post) => post.id)
  const uniqueIds = new Set(ids)

  assert.equal(selected.length, 6)
  assert.equal(uniqueIds.size, selected.length)
  assert.deepEqual(ids.slice(0, 2), [1, 2])
  assert.ok(ids.slice(2).every((id) => id > 2))
})

test('latest news selection returns all available posts when fewer than limit exist', () => {
  const selected = selectLatestNewsPosts(makePosts(4), 6, 2, () => 0.75)
  const ids = selected.map((post) => post.id)

  assert.equal(selected.length, 4)
  assert.deepEqual(ids.slice(0, 2), [1, 2])
  assert.equal(new Set(ids).size, selected.length)
})
