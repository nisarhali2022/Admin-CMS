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

  return (
    <div className="space-y-3 my-6">
      {questions.map((q, i) => (
        <div
          key={i}
          className="border border-border rounded-lg overflow-hidden shadow-sm"
        >
          <div className="bg-primary px-4 py-3 flex items-center gap-3">
            <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-accent text-center text-xs font-bold leading-none text-white">
              {i + 1}
            </span>
            <p className="text-white font-semibold leading-snug">
              {q.question}
            </p>
          </div>

          {q.options.length > 0 && (
            <div className="bg-surface px-4 py-3 grid grid-cols-2 gap-2 border-b border-border">
              {q.options.map((opt, j) => {
                const correct =
                  opt.toLowerCase().trim() === q.answer.toLowerCase().trim()

                return (
                  <span
                    key={j}
                    className={`block w-full px-3 py-1.5 rounded-full text-center text-base font-medium border ${
                      correct
                        ? 'bg-green-50 border-green-500 text-green-800 font-bold'
                        : 'bg-white border-border text-text-secondary'
                    }`}
                  >
                    {opt}
                  </span>
                )
              })}
            </div>
          )}

          <div className="bg-green-50 px-4 py-2 flex items-center gap-2">
            <span className="text-green-800 font-bold">Answer:</span>
            <span className="text-green-800 font-bold">{q.answer}</span>
          </div>
        </div>
      ))}
    </div>
  )
}
