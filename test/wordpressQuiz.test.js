import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getQuizFromPrimaryTarget,
  saveQuizToTargets,
} from '../lib/wordpressQuiz.js'
import { formatQuizContent, normalizeQuizQuestions } from '../lib/quiz.js'

function makeQuestions() {
  return normalizeQuizQuestions(
    Array.from({ length: 5 }, (_, index) => ({
      question: `Question ${index + 1}?`,
      options: ['One', 'Two', 'Three', 'Four'],
      answer: 'One',
    }))
  )
}

function makeTarget(key, label, apiUrl) {
  return {
    key,
    label,
    apiUrl,
    user: `user-${key}`,
    pass: `pass-${key}`,
  }
}

function makeRevalidateTarget(key, label, apiUrl, revalidateUrl, revalidatePath = '') {
  return {
    ...makeTarget(key, label, apiUrl),
    revalidateUrl,
    revalidateSecret: `revalidate-secret-${key}`,
    revalidatePath,
  }
}

test('getQuizFromPrimaryTarget reads the quiz from the first target', async () => {
  const originalFetch = globalThis.fetch
  const questions = makeQuestions()

  globalThis.fetch = async () =>
    new Response(
      JSON.stringify([
        {
          id: 55,
          content: { rendered: formatQuizContent(questions) },
        },
      ]),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    )

  try {
    const result = await getQuizFromPrimaryTarget([
      makeTarget('1', 'Main Site', 'https://one.test/wp-json/wp/v2'),
    ])

    assert.equal(result.id, 55)
    assert.equal(result.source.label, 'Main Site')
    assert.equal(result.questions.length, 5)
    assert.equal(result.questions[0].answer, 'One')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('saveQuizToTargets returns partial success results', async () => {
  const originalFetch = globalThis.fetch
  const questions = makeQuestions()

  globalThis.fetch = async (url, options = {}) => {
    const href = String(url)

    if (href.includes('two.test')) {
      return new Response(JSON.stringify({ message: 'WordPress unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (options.method === 'PUT') {
      return new Response(JSON.stringify({ id: 101 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify([{ id: 101 }]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const results = await saveQuizToTargets(questions, [
      makeTarget('1', 'Main Site', 'https://one.test/wp-json/wp/v2'),
      makeTarget('2', 'Second Site', 'https://two.test/wp-json/wp/v2'),
    ])

    assert.deepEqual(
      results.map((result) => ({
        label: result.label,
        ok: result.ok,
        id: result.id || null,
      })),
      [
        { label: 'Main Site', ok: true, id: 101 },
        { label: 'Second Site', ok: false, id: null },
      ]
    )
    assert.match(results[1].message, /WordPress unavailable/)
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('saveQuizToTargets reports revalidate failures after successful save', async () => {
  const originalFetch = globalThis.fetch
  const questions = makeQuestions()
  const calls = []

  globalThis.fetch = async (url, options = {}) => {
    const href = String(url)
    calls.push({
      href,
      method: options.method || 'GET',
      body: options.body || '',
      secret: options.headers?.['x-revalidate-secret'] || '',
    })

    if (href.includes('/api/revalidate')) {
      return new Response(JSON.stringify({ message: 'Invalid revalidate secret' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (options.method === 'PUT') {
      return new Response(JSON.stringify({ id: 101 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify([{ id: 101 }]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const results = await saveQuizToTargets(questions, [
      makeRevalidateTarget(
        '1',
        'Main Site',
        'https://one.test/wp-json/wp/v2',
        'https://one.test/api/revalidate'
      ),
    ])

    assert.equal(results[0].ok, true)
    assert.equal(results[0].revalidate.configured, true)
    assert.equal(results[0].revalidate.ok, false)
    assert.match(results[0].revalidate.message, /Invalid revalidate secret/)
    assert.deepEqual(
      calls.map((call) => call.method),
      ['GET', 'PUT', 'POST']
    )
    assert.equal(calls[2].body, '{}')
    assert.equal(calls[2].secret, 'revalidate-secret-1')
  } finally {
    globalThis.fetch = originalFetch
  }
})

test('saveQuizToTargets sends configured revalidate path', async () => {
  const originalFetch = globalThis.fetch
  const questions = makeQuestions()
  let revalidateBody = null

  globalThis.fetch = async (url, options = {}) => {
    const href = String(url)

    if (href.includes('/api/revalidate')) {
      revalidateBody = JSON.parse(options.body)
      return new Response(JSON.stringify({ revalidated: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    if (options.method === 'PUT') {
      return new Response(JSON.stringify({ id: 101 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify([{ id: 101 }]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const results = await saveQuizToTargets(questions, [
      makeRevalidateTarget(
        '1',
        'Tele Answer Today',
        'https://tele-answer.test/wp-json/wp/v2',
        'https://tele-answer.test/api/revalidate',
        '/telenor/telenor-packages'
      ),
    ])

    assert.equal(results[0].ok, true)
    assert.equal(results[0].revalidate.ok, true)
    assert.deepEqual(revalidateBody, { path: '/telenor/telenor-packages' })
  } finally {
    globalThis.fetch = originalFetch
  }
})
