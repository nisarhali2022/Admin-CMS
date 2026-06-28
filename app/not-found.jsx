import Link from 'next/link'

export const metadata = {
  title: 'Not Found',
  robots: { index: false, follow: false },
}

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center text-center px-4">
      <h1 className="font-heading font-bold text-3xl text-text-primary">
        Page not found
      </h1>
      <p className="mt-3 text-text-secondary max-w-md">
        This project is now a private quiz admin. Public website pages are not
        available here.
      </p>
      <Link
        href="/"
        className="mt-6 px-5 py-3 rounded-lg bg-primary text-white font-semibold hover:bg-primary-dark transition-colors"
      >
        Go to admin login
      </Link>
    </div>
  )
}

