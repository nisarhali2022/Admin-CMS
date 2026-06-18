import test from 'node:test'
import assert from 'node:assert/strict'

process.env.WORDPRESS_API_URL = 'https://example.test'

async function getWordPressModule() {
  return import('../lib/wordpress.js')
}

test('a successful empty WordPress slug response means missing content', async () => {
  const { getPostBySlug } = await getWordPressModule()
  const originalFetch = globalThis.fetch
  let calls = 0

  globalThis.fetch = async () => {
    calls += 1
    return new Response('[]', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    assert.equal(await getPostBySlug('missing-post'), null)
    assert.equal(calls, 1)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('a temporary WordPress failure retries once and then throws', async () => {
  const { getPostBySlug, WordPressApiError } = await getWordPressModule()
  const originalFetch = globalThis.fetch
  const originalConsoleError = console.error
  let calls = 0

  globalThis.fetch = async () => {
    calls += 1
    return new Response('{}', { status: 503 })
  }
  console.error = () => {}

  try {
    await assert.rejects(
      () => getPostBySlug('temporarily-unavailable'),
      (error) =>
        error instanceof WordPressApiError &&
        error.status === 503
    )
    assert.equal(calls, 2)
  } finally {
    globalThis.fetch = originalFetch
    console.error = originalConsoleError
  }
})
