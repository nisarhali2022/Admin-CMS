import { getQuizDates } from './dates.js'

const DEFAULT_QUIZ_STATE = {
  title: 'Daily Quiz',
  slug: 'daily-quiz',
  description: 'Global quiz update.',
  isPublished: true,
  updatedAt: null,
}

function getStore() {
  if (!globalThis.__ADMIN_CMS_GLOBAL_QUIZ__) {
    globalThis.__ADMIN_CMS_GLOBAL_QUIZ__ = {
      ...DEFAULT_QUIZ_STATE,
      updatedAt: new Date().toISOString(),
    }
  }

  return globalThis.__ADMIN_CMS_GLOBAL_QUIZ__
}

function serializeQuiz(state = getStore(), now = new Date()) {
  const dates = getQuizDates(now)

  return {
    ...state,
    ...dates,
    visibleTitle: `${state.title} - ${dates.visibleDateLabel}`,
    seoTitle: `${state.title} - ${dates.seoDateLabel}`,
    schemaDate: dates.seoDate,
    global: true,
    websiteScoped: false,
  }
}

export function getGlobalQuiz(now = new Date()) {
  return serializeQuiz(getStore(), now)
}

export function updateGlobalQuiz(payload, now = new Date()) {
  const current = getStore()
  const next = {
    ...current,
    title: payload.title,
    slug: payload.slug,
    description: payload.description,
    isPublished: payload.isPublished,
    updatedAt: now.toISOString(),
  }

  globalThis.__ADMIN_CMS_GLOBAL_QUIZ__ = next
  return serializeQuiz(next, now)
}
