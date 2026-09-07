import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test, afterEach } from 'node:test'
import { triggerRevalidationForActiveWebsites } from 'cms-core/cms/services/revalidation'
import { getGlobalQuiz, updateGlobalQuiz } from 'cms-core/quiz/state'
import { normalizeQuizQuestions, validateQuizPayload } from 'cms-core/quiz/validators'

const originalFetch = global.fetch
const originalEnv = { ...process.env }

function setAdminEnv() {
  process.env.ADMIN_SECRET = 'secret'
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://project.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-role-key'
  process.env.CMS_ENCRYPTION_KEY = Buffer.alloc(32, 1).toString('base64')
}

function sampleQuestions(count = 5) {
  return Array.from({ length: count }, (_, index) => ({
    question: `Question ${index + 1}?`,
    options: ['Alpha', 'Beta', 'Gamma', 'Delta'].map(
      (option) => `${option} ${index + 1}`,
    ),
    answer: `Alpha ${index + 1}`,
  }))
}

afterEach(() => {
  global.fetch = originalFetch
  process.env = { ...originalEnv }
})

test('quiz validation accepts 5 to 10 complete questions', () => {
  assert.equal(normalizeQuizQuestions(sampleQuestions()).length, 5)
  assert.equal(normalizeQuizQuestions(sampleQuestions(10)).length, 10)

  assert.throws(
    () => normalizeQuizQuestions(sampleQuestions().slice(0, 4)),
    /between 5 and 10 questions/,
  )

  assert.throws(
    () => normalizeQuizQuestions(sampleQuestions(11)),
    /between 5 and 10 questions/,
  )

  assert.throws(
    () =>
      normalizeQuizQuestions([
        ...sampleQuestions().slice(0, 4),
        { question: 'Incomplete?', options: ['A', 'B', 'C', ''], answer: 'A' },
      ]),
    /must have 4 options/,
  )

  assert.throws(
    () =>
      normalizeQuizQuestions([
        ...sampleQuestions().slice(0, 4),
        { question: 'Bad answer?', options: ['A', 'B', 'C', 'D'], answer: 'Z' },
      ]),
    /answer must match an option/,
  )
})

test('quiz validation keeps only current quiz data and remains global', () => {
  const payload = validateQuizPayload({
    questions: sampleQuestions(),
    websiteId: 'must-not-be-used',
  })

  assert.deepEqual(Object.keys(payload), ['questions', 'isPublished'])
  assert.equal(Object.hasOwn(payload, 'websiteId'), false)
  assert.equal(payload.questions.length, 5)
})

test('quiz UI keeps option typing separate from answer selection', async () => {
  const source = await readFile('features/quiz/QuizManager.jsx', 'utf8')

  assert.match(source, /function setAnswer\(questionIndex, option\)/)
  assert.match(source, /onClick=\{\(\) => setAnswer\(questionIndex, option\)\}/)
  assert.match(source, /question\.answer\.trim\(\) !== ''/)
  assert.match(source, /const MIN_QUESTIONS = 5/)
  assert.match(source, /const MAX_QUESTIONS = 10/)
  assert.match(source, /function addQuestion\(\)/)
  assert.match(source, /function removeLastQuestion\(\)/)
  assert.match(source, /aria-label="Add question"/)
  assert.match(source, /aria-label="Remove last question"/)
  assert.match(source, /\{form\.questions\.length\} \/ \{MAX_QUESTIONS\} questions/)
  assert.match(source, /form\.questions\.length >= MAX_QUESTIONS/)
  assert.match(source, /form\.questions\.length <= MIN_QUESTIONS/)
})

test('quiz state reads and writes Supabase-backed global quiz without website scope', async () => {
  setAdminEnv()
  const calls = []

  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })

    if (String(url).includes('/cms_global_quiz?select=')) {
      return Response.json([])
    }

    if (String(url).endsWith('/cms_global_quiz')) {
      const body = JSON.parse(options.body)

      return Response.json([
        {
          quiz_id: '11111111-1111-4111-8111-111111111111',
          ...body,
          updated_at: '2026-07-04T16:30:00.000Z',
        },
      ])
    }

    throw new Error(`Unexpected URL ${url}`)
  }

  const quiz = await updateGlobalQuiz(
    {
      questions: sampleQuestions(),
      isPublished: true,
    },
  )

  assert.equal(quiz.global, true)
  assert.equal(quiz.websiteScoped, false)
  assert.equal(Object.hasOwn(quiz, 'websiteId'), false)
  assert.equal(Object.hasOwn(quiz, 'title'), false)
  assert.equal(Object.hasOwn(quiz, 'slug'), false)
  assert.equal(Object.hasOwn(quiz, 'description'), false)
  assert.equal(Object.hasOwn(quiz, 'visibleDate'), false)
  assert.equal(Object.hasOwn(quiz, 'seoDate'), false)
  assert.equal(quiz.questions.length, 5)
  assert.equal(quiz.quizId, '11111111-1111-4111-8111-111111111111')
  assert.ok(calls.some((call) => call.url.includes('/rest/v1/cms_global_quiz')))
  assert.ok(calls.every((call) => !String(call.options.body || '').includes('website_id')))
  assert.ok(calls.every((call) => !String(call.options.body || '').includes('visible_date')))
  assert.ok(calls.every((call) => !String(call.options.body || '').includes('seo_date')))
})

test('quiz state falls back to legacy id column before corrective migration is applied', async () => {
  setAdminEnv()
  const calls = []

  global.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options })

    if (String(url).includes('select=quiz_id')) {
      return Response.json(
        { message: 'column cms_global_quiz.quiz_id does not exist', code: '42703' },
        { status: 400 },
      )
    }

    if (String(url).includes('select=id')) {
      return Response.json([])
    }

    if (String(url).endsWith('/cms_global_quiz')) {
      const body = JSON.parse(options.body)

      assert.equal(body.title, 'Daily Quiz')
      assert.equal(body.slug, 'daily-quiz')
      assert.equal(typeof body.visible_date, 'string')
      assert.equal(typeof body.seo_date, 'string')

      return Response.json([
        {
          id: '22222222-2222-4222-8222-222222222222',
          questions: body.questions,
          is_published: body.is_published,
          updated_at: '2026-07-04T16:30:00.000Z',
        },
      ])
    }

    throw new Error(`Unexpected URL ${url}`)
  }

  const quiz = await updateGlobalQuiz({
    questions: sampleQuestions(),
    isPublished: true,
  })

  assert.equal(quiz.quizId, '22222222-2222-4222-8222-222222222222')
  assert.equal(quiz.global, true)
  assert.ok(calls.some((call) => call.url.includes('select=id')))
})

test('global quiz revalidation notifies every active website and keeps failures visible', async () => {
  setAdminEnv()
  const calls = []
  const activeWebsiteId = '33333333-3333-4333-8333-333333333333'
  const inactiveWebsiteId = '44444444-4444-4444-8444-444444444444'

  global.fetch = async (url, options = {}) => {
    const stringUrl = String(url)
    calls.push({ url: stringUrl, options })

    if (stringUrl.includes('/rest/v1/cms_websites?select=')) {
      return Response.json([
        {
          id: activeWebsiteId,
          name: 'Public site',
          slug: 'public-site',
          primary_domain: 'site.example',
          is_active: true,
        },
        {
          id: inactiveWebsiteId,
          name: 'Inactive site',
          slug: 'inactive-site',
          primary_domain: 'inactive.example',
          is_active: false,
        },
      ])
    }

    if (stringUrl.includes('/rest/v1/cms_site_settings?select=')) {
      assert.match(stringUrl, new RegExp(`website_id=eq\\.${activeWebsiteId}`))
      return Response.json([
        {
          website_id: activeWebsiteId,
          revalidation_url: 'https://site.example/api/revalidate',
          revalidation_secret_encrypted: null,
        },
      ])
    }

    if (stringUrl === 'https://site.example/api/revalidate') {
      const body = JSON.parse(options.body)
      assert.deepEqual(body.paths, ['/', '/page-sitemap.xml', '/sitemap_index.xml'])
      assert.equal(body.event, 'global_quiz.updated')
      return Response.json({ revalidated: true })
    }

    throw new Error(`Unexpected URL ${stringUrl}`)
  }

  const result = await triggerRevalidationForActiveWebsites({
    event: 'global_quiz.updated',
    resourceType: 'global_quiz',
    resourceId: 'quiz-id',
    paths: ['/', '/page-sitemap.xml', '/sitemap_index.xml'],
  })

  assert.equal(result.attempted, true)
  assert.equal(result.ok, true)
  assert.equal(result.results.length, 1)
  assert.equal(result.results[0].websiteId, activeWebsiteId)
  assert.equal(result.results[0].websiteDomain, 'site.example')
  assert.equal(
    calls.filter((call) => call.url === 'https://site.example/api/revalidate').length,
    1
  )
  assert.ok(calls.every((call) => !call.url.includes(inactiveWebsiteId)))
})

test('global quiz API saves the quiz before requesting homepage revalidation', async () => {
  const source = await readFile('app/api/quiz/route.js', 'utf8')

  assert.match(source, /const quiz = await updateGlobalQuiz/)
  assert.match(source, /triggerRevalidationForActiveWebsites/)
  assert.match(source, /event: 'global_quiz\.updated'/)
  assert.match(source, /paths: \['\/', '\/page-sitemap\.xml', '\/sitemap_index\.xml'\]/)
  assert.match(source, /cmsJson\(\{ quiz, revalidation \}\)/)
})

test('global quiz migrations create and simplify current-only quiz storage', async () => {
  const createSql = await readFile(
    'setup-provisioning/supabase/migrations/202607050007_global_quiz.sql',
    'utf8',
  )
  const simplifySql = await readFile(
    'setup-provisioning/supabase/migrations/202607050008_simplify_global_quiz.sql',
    'utf8',
  )
  const permissionsSql = await readFile(
    'setup-provisioning/supabase/migrations/202607050009_fix_quiz_function_permissions.sql',
    'utf8',
  )
  const flexibleQuestionsSql = await readFile(
    'setup-provisioning/supabase/migrations/202609080001_flexible_global_quiz_questions.sql',
    'utf8',
  )

  assert.match(createSql, /create table public\.cms_global_quiz/)
  assert.doesNotMatch(`${createSql}\n${simplifySql}`, /website_id/)
  assert.match(createSql, /questions jsonb not null/)
  assert.match(createSql, /cms_global_quiz_questions_valid/)
  assert.match(createSql, /jsonb_array_length\(input_questions\) < 5/)
  assert.match(createSql, /jsonb_array_length\(input_questions\) > 10/)
  assert.match(simplifySql, /rename column id to quiz_id/)
  assert.match(simplifySql, /drop column if exists title/)
  assert.match(simplifySql, /drop column if exists slug/)
  assert.match(simplifySql, /drop column if exists description/)
  assert.match(simplifySql, /drop column if exists visible_date/)
  assert.match(simplifySql, /drop column if exists seo_date/)
  assert.match(simplifySql, /drop column if exists created_at/)
  assert.match(simplifySql, /cms_global_quiz_singleton_idx/)
  assert.match(simplifySql, /'quizId', q\.quiz_id/)
  assert.match(simplifySql, /where q\.is_published = true/)
  assert.match(simplifySql, /grant execute on function public\.cms_public_get_current_quiz\(\) to anon/)
  assert.match(createSql, /grant execute on function public\.cms_global_quiz_questions_valid\(jsonb\) to service_role/)
  assert.match(permissionsSql, /grant execute on function public\.cms_global_quiz_questions_valid\(jsonb\) to service_role/)
  assert.match(createSql, /grant select, insert, update, delete on table public\.cms_global_quiz to service_role/)
  assert.match(flexibleQuestionsSql, /drop constraint if exists cms_global_quiz_questions_valid_check/)
  assert.match(flexibleQuestionsSql, /jsonb_array_length\(input_questions\) < 5/)
  assert.match(flexibleQuestionsSql, /jsonb_array_length\(input_questions\) > 10/)
  assert.match(flexibleQuestionsSql, /notify pgrst, 'reload schema'/)
})
