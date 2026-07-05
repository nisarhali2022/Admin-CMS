import { SupabaseAdminError, supabaseAdminRequest } from '../supabase/adminRest.js'
import { EMPTY_QUIZ_QUESTIONS } from './validators.js'

const QUIZ_SELECT = 'quiz_id,questions,is_published,updated_at'
const LEGACY_QUIZ_SELECT = 'id,questions,is_published,updated_at'

const DEFAULT_QUIZ_STATE = {
  quizId: null,
  questions: EMPTY_QUIZ_QUESTIONS,
  isPublished: true,
  updatedAt: null,
}

function cloneQuestions(questions = EMPTY_QUIZ_QUESTIONS) {
  return questions.map((item) => ({
    question: item.question || '',
    options: Array.isArray(item.options) ? [...item.options] : ['', '', '', ''],
    answer: item.answer || '',
  }))
}

function rowToState(row) {
  if (!row) return { ...DEFAULT_QUIZ_STATE, questions: cloneQuestions() }

  return {
    quizId: row.quiz_id || row.id,
    questions: cloneQuestions(row.questions),
    isPublished: Boolean(row.is_published),
    updatedAt: row.updated_at,
  }
}

function serializeQuiz(row) {
  const state = rowToState(row)

  return {
    ...state,
    global: true,
    websiteScoped: false,
  }
}

async function getLatestQuizRow() {
  try {
    const rows = await supabaseAdminRequest(
      `cms_global_quiz?select=${QUIZ_SELECT}&order=updated_at.desc&limit=1`
    )

    return {
      row: rows?.[0] || null,
      primaryKey: 'quiz_id',
    }
  } catch (error) {
    if (!isMissingQuizIdColumnError(error)) throw error

    const rows = await supabaseAdminRequest(
      `cms_global_quiz?select=${LEGACY_QUIZ_SELECT}&order=updated_at.desc&limit=1`
    )

    return {
      row: rows?.[0] || null,
      primaryKey: 'id',
    }
  }
}

export async function getGlobalQuiz() {
  const current = await getLatestQuizRow()

  return serializeQuiz(current.row)
}

export async function updateGlobalQuiz(payload) {
  const current = await getLatestQuizRow()
  const body = {
    questions: payload.questions,
    is_published: payload.isPublished,
  }
  const currentId = current.row?.[current.primaryKey]

  const rows = currentId
    ? await supabaseAdminRequest(
        `cms_global_quiz?${current.primaryKey}=eq.${encodeURIComponent(currentId)}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
          body,
        }
      )
    : await supabaseAdminRequest('cms_global_quiz', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
        body: current.primaryKey === 'id' ? { ...getLegacyRequiredFields(), ...body } : body,
      })

  return serializeQuiz(rows?.[0])
}

function isMissingQuizIdColumnError(error) {
  if (!(error instanceof SupabaseAdminError)) return false

  const details = [
    error.message,
    error.details?.message,
    error.details?.hint,
    error.details?.details,
    error.details?.code,
  ]
    .filter(Boolean)
    .join(' ')

  return /quiz_id/i.test(details) && /(does not exist|not find|schema cache|column)/i.test(details)
}

function getLegacyRequiredFields() {
  const today = new Date().toISOString().slice(0, 10)

  return {
    title: 'Daily Quiz',
    slug: 'daily-quiz',
    description: null,
    visible_date: today,
    seo_date: today,
  }
}
