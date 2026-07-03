'use client'

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body>
        <main className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center text-slate-950">
          <h1 className="mb-3 text-2xl font-bold">Temporarily unavailable</h1>
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
        </main>
      </body>
    </html>
  )
}
