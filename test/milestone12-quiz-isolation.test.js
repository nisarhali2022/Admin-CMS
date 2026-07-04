import assert from 'node:assert/strict'
import { test } from 'node:test'
import { getQuizDates } from '../lib/quiz/dates.js'
import { getGlobalQuiz, updateGlobalQuiz } from '../lib/quiz/state.js'
import { validateQuizPayload } from '../lib/quiz/validators.js'

function resetQuizStore() {
  delete globalThis.__ADMIN_CMS_GLOBAL_QUIZ__
}

test('quiz dates use Karachi visible date and six-hour SEO offset', () => {
  const dates = getQuizDates(new Date('2026-07-04T16:30:00.000Z'))

  assert.equal(dates.timeZone, 'Asia/Karachi')
  assert.equal(dates.visibleDateLabel, 'July 4, 2026')
  assert.equal(dates.visibleDate, '2026-07-04')
  assert.equal(dates.seoDateLabel, 'July 5, 2026')
  assert.equal(dates.seoDate, '2026-07-05')
})

test('quiz state is global and does not require website scope', () => {
  resetQuizStore()

  const quiz = updateGlobalQuiz(
    {
      title: 'Daily SIM Quiz',
      slug: 'daily-sim-quiz',
      description: 'One global quiz update for all websites.',
      isPublished: true,
    },
    new Date('2026-07-04T16:30:00.000Z'),
  )
  const nextRead = getGlobalQuiz(new Date('2026-07-04T16:30:00.000Z'))

  assert.equal(quiz.global, true)
  assert.equal(quiz.websiteScoped, false)
  assert.equal(Object.hasOwn(quiz, 'websiteId'), false)
  assert.equal(nextRead.title, 'Daily SIM Quiz')
  assert.equal(nextRead.visibleTitle, 'Daily SIM Quiz - July 4, 2026')
  assert.equal(nextRead.seoTitle, 'Daily SIM Quiz - July 5, 2026')

  resetQuizStore()
})

test('quiz validation normalizes slug without website input', () => {
  const payload = validateQuizPayload({
    title: 'Daily Balance Quiz',
    slug: '',
    description: 'A global quiz update.',
  })

  assert.deepEqual(payload, {
    title: 'Daily Balance Quiz',
    slug: 'daily-balance-quiz',
    description: 'A global quiz update.',
    isPublished: true,
  })
})
