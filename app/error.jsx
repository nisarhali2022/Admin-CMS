'use client'

export default function ErrorPage({ reset }) {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
      <h1 className="font-heading font-bold text-2xl text-text-primary mb-3">
        Temporarily unavailable
      </h1>
      <p className="text-text-secondary max-w-md mb-6">
        The admin app could not finish loading. Please try again in a moment.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="px-5 py-2.5 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors"
      >
        Try again
      </button>
    </div>
  )
}
