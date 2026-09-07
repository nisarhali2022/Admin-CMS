import { CmsValidationError } from '../cms/http/errors.js'

export const MIN_QUIZ_QUESTIONS = 5
export const MAX_QUIZ_QUESTIONS = 10

export const EMPTY_QUIZ_QUESTIONS = Array.from({ length: MIN_QUIZ_QUESTIONS }, () => ({
  question: '',
  options: ['', '', '', ''],
  answer: '',
}))

export function normalizeQuizQuestions(questions) {
  if (
    !Array.isArray(questions) ||
    questions.length < MIN_QUIZ_QUESTIONS ||
    questions.length > MAX_QUIZ_QUESTIONS
  ) {
    throw new CmsValidationError(
      `Quiz must have between ${MIN_QUIZ_QUESTIONS} and ${MAX_QUIZ_QUESTIONS} questions.`,
      {
        code: 'QUIZ_QUESTION_COUNT',
        details: {
          minimum: MIN_QUIZ_QUESTIONS,
          maximum: MAX_QUIZ_QUESTIONS,
        },
      },
    )
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
