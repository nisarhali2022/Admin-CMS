import { CmsValidationError } from '../cms/http/errors.js'

export const EMPTY_QUIZ_QUESTIONS = Array.from({ length: 5 }, () => ({
  question: '',
  options: ['', '', '', ''],
  answer: '',
}))

export function normalizeQuizQuestions(questions) {
  if (!Array.isArray(questions) || questions.length !== 5) {
    throw new CmsValidationError('Quiz must have exactly 5 questions.', {
      code: 'QUIZ_QUESTION_COUNT',
      details: { expected: 5 },
    })
  }

  return questions.map((item, index) => {
    const question = typeof item?.question === 'string' ? item.question.trim() : ''
    const options = Array.isArray(item?.options)
      ? item.options.map((option) => (typeof option === 'string' ? option.trim() : ''))
      : []
    const answer = typeof item?.answer === 'string' ? item.answer.trim() : ''

    if (!question) {
      throw new CmsValidationError(`Question ${index + 1} is empty.`, {
        code: 'QUIZ_QUESTION_REQUIRED',
        details: { index },
      })
    }

    if (options.length !== 4 || options.some((option) => !option)) {
      throw new CmsValidationError(`Question ${index + 1} must have 4 options.`, {
        code: 'QUIZ_OPTIONS_REQUIRED',
        details: { index, expected: 4 },
      })
    }

    if (!answer || !options.some((option) => option.toLowerCase() === answer.toLowerCase())) {
      throw new CmsValidationError(`Question ${index + 1} answer must match an option.`, {
        code: 'QUIZ_ANSWER_INVALID',
        details: { index },
      })
    }

    return {
      question,
      options,
      answer: options.find((option) => option.toLowerCase() === answer.toLowerCase()),
    }
  })
}

export function validateQuizPayload(payload) {
  return {
    questions: normalizeQuizQuestions(payload?.questions),
    isPublished:
      typeof payload?.isPublished === 'boolean' ? payload.isPublished : true,
  }
}
