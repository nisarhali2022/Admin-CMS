import Link from 'next/link'
import { NAV_LINKS } from '@/lib/constants'

export default function HeaderControls() {
  return (
    <div className="flex items-center gap-1">
      <details className="group">
        <summary
          className="flex cursor-pointer list-none rounded-full p-2 transition-colors hover:bg-surface [&::-webkit-details-marker]:hidden"
          aria-label="Toggle search"
        >
          <svg className="h-5 w-5 text-text-primary group-open:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <svg className="hidden h-5 w-5 text-text-primary group-open:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </summary>
        <div className="absolute left-0 right-0 top-full border-b border-border bg-white px-4 pb-3 pt-1 shadow-sm">
          <form
            action="/search"
            method="get"
            className="mx-auto flex max-w-7xl gap-2"
          >
            <input
              type="search"
              name="q"
              placeholder="Search quiz answers, articles..."
              className="flex-1 rounded-lg border border-border px-4 py-2 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button type="submit" className="btn-primary rounded-lg px-4 py-2 text-sm">
              Search
            </button>
          </form>
        </div>
      </details>

      <div className="lg:hidden">
        <input
          id="mobile-menu-toggle"
          type="checkbox"
          className="peer sr-only"
        />
        <label
          htmlFor="mobile-menu-toggle"
          className="flex cursor-pointer rounded-full p-2 transition-colors hover:bg-surface peer-checked:[&_.menu-close]:block peer-checked:[&_.menu-open]:hidden"
          aria-label="Toggle menu"
        >
          <svg className="menu-open h-6 w-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
          <svg className="menu-close hidden h-6 w-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </label>
        <div className="absolute left-0 right-0 top-full hidden border-t border-border bg-white shadow-lg peer-checked:block">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-4 py-3 text-sm font-semibold text-text-primary transition-colors hover:bg-surface"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 border-t border-border pt-2">
              <Link
                href="/contact-us"
                className="block rounded-lg px-4 py-3 text-sm font-semibold text-text-primary hover:bg-surface"
              >
                Contact
              </Link>
              <Link
                href="/about-us"
                className="block rounded-lg px-4 py-3 text-sm font-semibold text-text-primary hover:bg-surface"
              >
                About
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}
