import { Suspense } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { getPosts, getCategories } from '@/lib/wordpress';
import { SITE_CONFIG } from '@/lib/constants';
import { formatDate, getCategoryColor, truncateText, stripHtml } from '@/lib/utils';
import PostGrid from '@/components/posts/PostGrid';
import Sidebar from '@/components/layout/Sidebar';
import AdBanner from '@/components/ads/AdBanner';
import CategoryMenu from '@/components/navigation/CategoryMenu';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export const revalidate = 3600;

export async function generateMetadata() {
  return {
    title: 'Telenor Quiz Today — Get Daily Quiz Answers & Win Free Internet',
    description: SITE_CONFIG.tagline,
    alternates: { canonical: SITE_CONFIG.siteUrl },
    openGraph: {
      title: 'Telenor Quiz Today — Get Daily Quiz Answers & Win Free Internet',
      description: SITE_CONFIG.tagline,
      url: SITE_CONFIG.siteUrl,
      siteName: SITE_CONFIG.siteName,
      type: 'website',
      images: [{ url: `${SITE_CONFIG.siteUrl}${SITE_CONFIG.defaultOgImage}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Telenor Quiz Today — Get Daily Quiz Answers & Win Free Internet',
      description: SITE_CONFIG.tagline,
      images: [`${SITE_CONFIG.siteUrl}${SITE_CONFIG.defaultOgImage}`],
    },
  };
}

export default async function HomePage() {
  const data = await getPosts({ page: 1, perPage: 11 });
  const posts = data?.posts || [];

  const heroPost = posts[0] || null;
  const gridPosts = posts.slice(1);

  const heroImage =
    heroPost?._embedded?.['wp:featuredmedia']?.[0]?.source_url || null;
  const heroCategory =
    heroPost?._embedded?.['wp:term']?.[0]?.[0] || null;
  const heroExcerpt = heroPost
    ? truncateText(stripHtml(heroPost.excerpt?.rendered || ''), 160)
    : '';

  return (
    <main>
      {/* ── Hero Section ── */}
      {heroPost && (
        <section className="relative w-full h-[420px] sm:h-[500px] overflow-hidden bg-primary">
          {heroImage && (
            <Image
              src={heroImage}
              alt={heroPost.title?.rendered || ''}
              fill
              priority
              className="object-cover opacity-40"
              sizes="100vw"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

          <div className="relative z-10 flex flex-col justify-end h-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
            {heroCategory && (
              <Link
                href={`/category/${heroCategory.slug}`}
                className={`inline-block self-start mb-3 px-3 py-1 rounded-full text-xs font-semibold text-white ${getCategoryColor(heroCategory.slug)}`}
              >
                {heroCategory.name}
              </Link>
            )}

            <Link href={`/${heroPost.slug}`} className="group">
              <h1
                className="font-merriweather font-bold text-white text-2xl sm:text-4xl leading-tight mb-3 line-clamp-2 group-hover:text-accent transition-colors"
                dangerouslySetInnerHTML={{ __html: heroPost.title?.rendered }}
              />
            </Link>

            {heroExcerpt && (
              <p className="text-gray-200 text-sm sm:text-base mb-4 max-w-2xl line-clamp-2">
                {heroExcerpt}
              </p>
            )}

            <div className="flex items-center gap-4">
              <span className="text-gray-300 text-xs">
                {formatDate(heroPost.date)}
              </span>
              <Link
                href={`/${heroPost.slug}`}
                className="px-5 py-2 bg-accent text-white rounded font-medium text-sm hover:bg-orange-600 transition-colors"
              >
                Read More →
              </Link>
            </div>
          </div>
        </section>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Top Ad ── */}
        <div className="mt-6">
          <AdBanner position="top" />
        </div>

        {/* ── Main Content + Sidebar ── */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <section>
            <h2 className="font-merriweather font-bold text-xl text-text-primary mb-5">
              Latest Posts
            </h2>
            <PostGrid posts={gridPosts} />
          </section>

          <Suspense fallback={<LoadingSpinner size="lg" className="py-10" />}>
            <Sidebar />
          </Suspense>
        </div>

        {/* ── Categories Section ── */}
        <Suspense fallback={null}>
          <CategoryMenu />
        </Suspense>

        {/* ── Bottom Ad ── */}
        <div className="mb-10">
          <AdBanner position="bottom" />
        </div>
      </div>
    </main>
  );
}