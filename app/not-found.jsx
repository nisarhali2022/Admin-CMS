import Link from 'next/link'

export const metadata = {
  title: 'Not Found',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center text-slate-950">
      <h1 className="text-3xl font-bold">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-slate-600">
        This rebuild workspace is for the private admin CMS. Public website
        pages are not served from this app.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-lg bg-slate-950 px-5 py-3 font-semibold text-white transition-colors hover:bg-slate-800"
      >
        Go home
      </Link>
    </div>
  )
}

