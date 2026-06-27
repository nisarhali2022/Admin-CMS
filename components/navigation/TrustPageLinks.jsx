import Link from 'next/link'

const trustLinks = [
  { label: 'About Us', href: '/about-us' },
  { label: 'Contact Us', href: '/contact-us' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms of Service', href: '/terms-of-service' },
  { label: 'Disclaimer', href: '/disclaimer' },
  { label: 'Editorial Policy', href: '/editorial-policy' },
  { label: 'Corrections Policy', href: '/corrections-policy' },
]

export default function TrustPageLinks() {
  return (
    <nav
      aria-label="Related trust pages"
      className="mt-8 rounded-xl border border-border bg-surface p-4"
    >
      <p className="font-heading text-base font-bold text-text-primary">
        Related pages
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {trustLinks.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex rounded-full border border-border bg-white px-3 py-1 text-sm text-text-secondary transition-colors hover:border-accent hover:text-accent"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  )
}
