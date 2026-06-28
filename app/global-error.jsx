'use client'

export default function GlobalError({ reset }) {
  return (
    <html lang="en">
      <body>
        <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center">
          <h1 className="text-2xl font-bold mb-3">Temporarily unavailable</h1>
          <p className="text-gray-600 max-w-md mb-6">
            The admin app could not finish loading. Please try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => reset()}
            className="px-5 py-2.5 rounded-lg bg-blue-700 text-white font-semibold"
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  )
}
