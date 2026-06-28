import test from 'node:test'
import assert from 'node:assert/strict'
import {
  QuizTargetConfigError,
  getQuizTargets,
} from '../lib/quizTargets.js'

test('getQuizTargets returns complete numbered targets', () => {
  const targets = getQuizTargets({
    QUIZ_SITE_1_LABEL: 'Main',
    QUIZ_SITE_1_WORDPRESS_API_URL: 'https://one.test/wp-json/wp/v2/',
    QUIZ_SITE_1_WP_ADMIN_USER: 'admin-one',
    QUIZ_SITE_1_WP_ADMIN_PASS: 'pass-one',
    QUIZ_SITE_1_REVALIDATE_URL: 'https://one.test/api/revalidate/',
    QUIZ_SITE_1_REVALIDATE_SECRET: 'secret-one',
    QUIZ_SITE_1_REVALIDATE_PATH: '/telenor/telenor-packages',
    QUIZ_SITE_2_LABEL: 'Second',
    QUIZ_SITE_2_WORDPRESS_API_URL: 'https://two.test/wp-json/wp/v2',
    QUIZ_SITE_2_WP_ADMIN_USER: 'admin-two',
    QUIZ_SITE_2_WP_ADMIN_PASS: 'pass-two',
  })

  assert.deepEqual(
    targets.map(
      ({
        key,
        label,
        apiUrl,
        user,
        pass,
        revalidateUrl,
        revalidateSecret,
        revalidatePath,
      }) => ({
        key,
        label,
        apiUrl,
        user,
        pass,
        revalidateUrl,
        revalidateSecret,
        revalidatePath,
      })
    ),
    [
      {
        key: '1',
        label: 'Main',
        apiUrl: 'https://one.test/wp-json/wp/v2',
        user: 'admin-one',
        pass: 'pass-one',
        revalidateUrl: 'https://one.test/api/revalidate',
        revalidateSecret: 'secret-one',
        revalidatePath: '/telenor/telenor-packages',
      },
      {
        key: '2',
        label: 'Second',
        apiUrl: 'https://two.test/wp-json/wp/v2',
        user: 'admin-two',
        pass: 'pass-two',
        revalidateUrl: '',
        revalidateSecret: '',
        revalidatePath: '',
      },
    ]
  )
})

test('getQuizTargets rejects incomplete configured targets', () => {
  assert.throws(
    () =>
      getQuizTargets({
        QUIZ_SITE_1_WORDPRESS_API_URL: 'https://one.test/wp-json/wp/v2',
        QUIZ_SITE_1_WP_ADMIN_USER: 'admin-one',
      }),
    QuizTargetConfigError
  )
})

test('getQuizTargets requires at least one complete target', () => {
  assert.throws(() => getQuizTargets({}), /No quiz websites are configured/)
})

test('getQuizTargets rejects incomplete revalidate settings', () => {
  assert.throws(
    () =>
      getQuizTargets({
        QUIZ_SITE_1_WORDPRESS_API_URL: 'https://one.test/wp-json/wp/v2',
        QUIZ_SITE_1_WP_ADMIN_USER: 'admin-one',
        QUIZ_SITE_1_WP_ADMIN_PASS: 'pass-one',
        QUIZ_SITE_1_REVALIDATE_URL: 'https://one.test/api/revalidate',
      }),
    /Incomplete revalidate configuration/
  )
})
