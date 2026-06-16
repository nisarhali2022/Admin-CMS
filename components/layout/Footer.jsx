import Link from 'next/link'
import Image from 'next/image'
import { SITE_CONFIG } from '@/lib/constants'

const menuLinks = [
  { label: 'Home', href: '/' },
  { label: 'Telecom', href: '/telecom' },
  { label: 'Global', href: '/global' },
  { label: 'Telenor', href: '/telenor' },
  { label: 'Blog', href: '/blog' },
]

const moreLinks = [
  { label: 'About us', href: '/about-us' },
  { label: 'Contact us', href: '/contact-us' },
  { label: 'Privacy Policy', href: '/privacy-policy' },
  { label: 'Terms of Service', href: '/terms-of-service' },
  { label: 'Disclaimer', href: '/disclaimer' },
]

function FooterHeading({ children }) {
  return (
    <h3 className="text-white font-heading font-bold text-lg mb-5 border-l-4 border-accent pl-3">
      {children}
    </h3>
  )
}

function FooterLinkList({ links }) {
  return (
    <ul className="space-y-2.5">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="text-gray-300 hover:text-accent text-sm transition-colors flex items-center gap-2"
          >
            <span className="text-accent font-bold">›</span>
            {link.label}
          </Link>
        </li>
      ))}
    </ul>
  )
}

export default function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="bg-navy text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          <div>
            <Link href="/" className="block mb-4">
              <Image
                src={SITE_CONFIG.logoUrl}
                alt={SITE_CONFIG.name}
                width={180}
                height={40}
                className="h-10 w-auto object-contain brightness-0 invert"
              />
            </Link>
            <FooterHeading>About us</FooterHeading>
            <p className="text-gray-300 text-sm leading-relaxed">
              We offer accurate and reliable information to help users in
              Pakistan earn free internet and rewards. This platform is
              independently operated and is not associated with Telenor
              Pakistan. All content is created to guide users and enhance their
              Telenor quiz experience.
            </p>
          </div>

          <div>
            <FooterHeading>Menu</FooterHeading>
            <FooterLinkList links={menuLinks} />
          </div>

          <div>
            <FooterHeading>More Link</FooterHeading>
            <FooterLinkList links={moreLinks} />
          </div>

          <div>
            <FooterHeading>Disclaimer</FooterHeading>
            <p className="text-gray-300 text-sm leading-relaxed">
              This website is an independent platform that provides general
              quiz-related information and tips for the My Telenor App. We are
              not affiliated with, authorized by, or endorsed by Telenor
              Pakistan. All content is shared for informational purposes only,
              and users are advised to confirm details through official Telenor
              sources.
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm">
          <p className="text-gray-400">
            © {year} {SITE_CONFIG.name}. All rights reserved.
          </p>

          <div className="flex gap-5">
            <Link href="/privacy-policy" className="text-gray-400 hover:text-white">
              Privacy Policy
            </Link>
            <Link href="/contact-us" className="text-gray-400 hover:text-white">
              Contact
            </Link>
            <Link href="/about-us" className="text-gray-400 hover:text-white">
              About
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
