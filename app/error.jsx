'use client'

export default function ErrorPage({ reset }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="mb-3 text-2xl font-bold text-slate-950">
        Temporarily unavailable
      </h1>
      <p className="mb-6 max-w-md text-slate-600">
        The admin app could not finish loading. Please try again in a moment.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-lg bg-slate-950 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-slate-800"
      >
        Try again
      </button>
    </div>
  )
}
