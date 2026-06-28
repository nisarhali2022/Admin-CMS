export default function QuizAnswerCards({ questions }) {
  if (!questions?.length) {
    return (
      <div
        className="my-6 rounded-lg border border-border bg-surface px-4 py-5 text-sm text-text-secondary shadow-sm"
        role="status"
      >
        <p className="font-semibold text-text-primary">
          Today's quiz answers are temporarily unavailable.
        </p>
        <p className="mt-1">
          Please refresh this page or check again shortly.
        </p>
      </div>
    )
  }

  const optionLabels = ['A', 'B', 'C', 'D']

  return (
    <div className="space-y-5 my-6">
      {questions.map((q, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-xl border border-border bg-white shadow-sm"
        >
          <div className="flex items-center gap-3 bg-primary px-5 py-3">
            <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-accent text-center text-sm font-bold leading-none text-white">
              {i + 1}
            </span>
            <p className="font-semibold leading-snug text-white">Question {i + 1}</p>
          </div>

          <div className="space-y-4 px-5 py-5">
            <div>
              <div className="rounded-lg border border-border bg-white px-4 py-2.5 text-[15px] text-text-primary">
                {q.question}
              </div>
            </div>

            {q.options.length > 0 && (
              <div>
                <p className="mb-2 text-sm font-bold uppercase tracking-wide text-text-secondary">
                  Options
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {q.options.map((opt, j) => {
                    const correct =
                      opt.toLowerCase().trim() === q.answer.toLowerCase().trim()

                    return (
                      <div key={j} className="flex items-center gap-2">
                        <span
                          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border text-sm font-bold ${
                            correct
                              ? 'border-green-500 bg-green-500 text-white'
                              : 'border-border bg-white text-text-secondary'
                          }`}
                          aria-hidden="true"
                        >
                          {correct ? '\u2713' : optionLabels[j] || j + 1}
                        </span>
                        <span
                          className={`flex min-h-10 flex-1 items-center rounded-lg border px-4 py-2 text-[15px] ${
                            correct
                              ? 'border-green-500 bg-green-50 text-green-800 font-semibold'
                              : 'border-border bg-white text-text-primary'
                          }`}
                        >
                          {opt}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-4 py-3">
              <span className="font-bold text-green-800">Answer:</span>
              <span className="font-bold text-green-800">{q.answer}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
