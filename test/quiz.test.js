import test from 'node:test'
import assert from 'node:assert/strict'
import {
  escapeHtml,
  formatQuizContent,
  normalizeQuizQuestions,
} from '../lib/quiz.js'

function makeQuestions() {
  return Array.from({ length: 5 }, (_, index) => ({
    question: ` Question ${index + 1}? `,
    options: [' One ', 'Two', 'Three', 'Four'],
    answer: 'one',
  }))
}

test('normalizeQuizQuestions trims values and restores option casing', () => {
  const questions = normalizeQuizQuestions(makeQuestions())

  assert.equal(questions.length, 5)
  assert.equal(questions[0].question, 'Question 1?')
  assert.deepEqual(questions[0].options, ['One', 'Two', 'Three', 'Four'])
  assert.equal(questions[0].answer, 'One')
})

test('normalizeQuizQuestions rejects an answer outside the options', () => {
  const questions = makeQuestions()
  questions[2].answer = 'Five'

  assert.throws(
    () => normalizeQuizQuestions(questions),
    /answer must match one of its options/
  )
})

test('quiz HTML escapes admin-controlled text', () => {
  const questions = normalizeQuizQuestions(makeQuestions())
  questions[0].question = '<script>alert("x")</script>'
  questions[0].options[0] = 'A & B'
  questions[0].answer = 'A & B'

  const html = formatQuizContent(questions)

  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/)
  assert.match(html, /A &amp; B/)
  assert.equal(escapeHtml(`'"<&>`), '&#39;&quot;&lt;&amp;&gt;')
})
