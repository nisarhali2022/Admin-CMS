import Link from 'next/link'
import Image from 'next/image'
import { getLatestPosts } from '@/lib/wordpress'
import { SITE_CONFIG, NAV_LINKS } from '@/lib/constants'
import { formatDate, getFirstCategory } from '@/lib/utils'

export default async function Footer() {
  const recentPosts = await getLatestPosts(5)
  const year = new Date().getFullYear()

  return (
    <footer className="bg-navy text-white mt-12">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">

          {/* Column 1: About */}
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

            <p className="text-gray-300 text-sm leading-relaxed mb-5">
              Your daily source for Telenor Quiz answers. Win 150 MB free internet every day by answering all 5 quiz questions correctly in the My Telenor App.
            </p>

          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h3 className="text-white font-heading font-bold text-lg mb-5 border-l-4 border-accent pl-3">
              Quick Links
            </h3>

            <ul className="space-y-2.5">
              {NAV_LINKS.map((link) => (
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

              <li>
                <Link href="/about-us" className="text-gray-300 hover:text-accent text-sm flex items-center gap-2">
                  <span className="text-accent font-bold">›</span> About Us
                </Link>
              </li>

              <li>
                <Link href="/contact-us" className="text-gray-300 hover:text-accent text-sm flex items-center gap-2">
                  <span className="text-accent font-bold">›</span> Contact Us
                </Link>
              </li>

              <li>
                <Link href="/privacy-policy" className="text-gray-300 hover:text-accent text-sm flex items-center gap-2">
                  <span className="text-accent font-bold">›</span> Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/terms-of-service" className="text-gray-300 hover:text-accent text-sm flex items-center gap-2">
                  <span className="text-accent font-bold">›</span> Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/disclaimer" className="text-gray-300 hover:text-accent text-sm flex items-center gap-2">
                  <span className="text-accent font-bold">›</span> Disclaimer
                </Link>
              </li>
              <li>
                <Link href="/editorial-policy" className="text-gray-300 hover:text-accent text-sm flex items-center gap-2">
                  <span className="text-accent font-bold">›</span> Editorial Policy
                </Link>
              </li>
              <li>
                <Link href="/corrections-policy" className="text-gray-300 hover:text-accent text-sm flex items-center gap-2">
                  <span className="text-accent font-bold">›</span> Corrections Policy
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Recent Posts */}
          <div>
            <h3 className="text-white font-heading font-bold text-lg mb-5 border-l-4 border-accent pl-3">
              Recent Posts
            </h3>

            <ul className="space-y-4">
              {recentPosts.map((post) => {
                const categorySlug = getFirstCategory(post)?.slug || 'uncategorized';
                return (
                <li key={post.id} className="flex gap-3 group">
                  <span className="text-accent font-bold text-lg leading-none mt-0.5 flex-shrink-0">
                    ›
                  </span>

                  <div>
                    <Link
                      href={`/${categorySlug}/${post.slug}`}
                      className="text-gray-300 group-hover:text-white text-sm leading-snug transition-colors line-clamp-2"
                    >
                      <span
                        dangerouslySetInnerHTML={{
                          __html: post.title.rendered
                        }}
                      />
                    </Link>

                    <span className="text-gray-500 text-xs mt-1 block">
                      {formatDate(post.date)}
                    </span>
                  </div>
                </li>
              );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
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
