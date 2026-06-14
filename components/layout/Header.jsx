'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { NAV_LINKS, SITE_CONFIG } from '@/lib/constants'
import { useSearch } from '@/hooks/useSearch'

export default function Header() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()
  const {
    query: searchQuery,
    setQuery: setSearchQuery,
    handleSearch,
  } = useSearch({
    clearOnSearch: true,
    onSearch: () => setSearchOpen(false),
  })

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setSearchOpen(false)
  }, [pathname])

  const isActive = (href) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Top announcement bar */}
      <div className="bg-primary text-white text-xs py-1.5 px-4 text-center hidden md:block">
        🎉 Get Today&apos;s Telenor Quiz Answers Daily — Win 150 MB Free Internet Every Day!
      </div>

      <header
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          scrolled ? 'bg-white shadow-md' : 'bg-white border-b border-border'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link href="/" className="flex-shrink-0">
              <Image
                src={SITE_CONFIG.logoUrl}
                alt={SITE_CONFIG.name}
                width={220}
                height={50}
                className="h-11 w-auto object-contain"
                priority
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-0.5">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 text-sm font-semibold rounded transition-colors duration-150 whitespace-nowrap ${
                    isActive(link.href)
                      ? 'text-primary border-b-2 border-primary'
                      : 'text-text-primary hover:text-primary hover:bg-primary-light'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* Right: search + hamburger */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 rounded-full hover:bg-surface transition-colors"
                aria-label="Toggle search"
              >
                {searchOpen ? (
                  <svg className="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </button>

              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="lg:hidden p-2 rounded-full hover:bg-surface transition-colors"
                aria-label="Toggle menu"
              >
                {menuOpen ? (
                  <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Search bar */}
          {searchOpen && (
            <div className="pb-3 pt-1">
              <form onSubmit={handleSearch} className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search quiz answers, articles..."
                  className="flex-1 border border-border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  autoFocus
                />
                <button type="submit" className="btn-primary text-sm py-2 px-4 rounded-lg">
                  Search
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-border bg-white shadow-lg">
            <div className="max-w-7xl mx-auto px-4 py-3">
              <nav className="flex flex-col gap-1">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-4 py-3 text-sm font-semibold rounded-lg transition-colors ${
                      isActive(link.href)
                        ? 'bg-primary-light text-primary'
                        : 'text-text-primary hover:bg-surface'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="border-t border-border mt-2 pt-2">
                  <Link href="/contact-us" className="px-4 py-3 text-sm font-semibold rounded-lg text-text-primary hover:bg-surface block">
                    Contact
                  </Link>
                  <Link href="/about-us" className="px-4 py-3 text-sm font-semibold rounded-lg text-text-primary hover:bg-surface block">
                    About
                  </Link>
                </div>
              </nav>
            </div>
          </div>
        )}
      </header>
    </>
  )
}
