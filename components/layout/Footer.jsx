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

            {/* Social Icons */}
            <div className="flex gap-3">

              {/* Facebook */}
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/10 hover:bg-blue-600 rounded-full flex items-center justify-center transition-colors"
                aria-label="Facebook"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z" />
                </svg>
              </a>

              {/* Twitter */}
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/10 hover:bg-sky-500 rounded-full flex items-center justify-center transition-colors"
                aria-label="Twitter"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z" />
                </svg>
              </a>

              {/* WhatsApp */}
              <a
                href="https://wa.me/"
                target="_blank"
                rel="noopener noreferrer"
                className="w-9 h-9 bg-white/10 hover:bg-green-500 rounded-full flex items-center justify-center transition-colors"
                aria-label="WhatsApp"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                </svg>
              </a>

            </div>
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
                <Link href="/about" className="text-gray-300 hover:text-accent text-sm flex items-center gap-2">
                  <span className="text-accent font-bold">›</span> About Us
                </Link>
              </li>

              <li>
                <Link href="/contact" className="text-gray-300 hover:text-accent text-sm flex items-center gap-2">
                  <span className="text-accent font-bold">›</span> Contact Us
                </Link>
              </li>

              <li>
                <Link href="/privacy-policy" className="text-gray-300 hover:text-accent text-sm flex items-center gap-2">
                  <span className="text-accent font-bold">›</span> Privacy Policy
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
            <Link href="/contact" className="text-gray-400 hover:text-white">
              Contact
            </Link>
            <Link href="/about" className="text-gray-400 hover:text-white">
              About
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}