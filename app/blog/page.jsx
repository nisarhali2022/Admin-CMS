import { Suspense } from 'react';
import { getPosts } from '@/lib/wordpress';
import { SITE_CONFIG } from '@/lib/constants';
import PostGrid from '@/components/posts/PostGrid';
import Sidebar from '@/components/layout/Sidebar';
import Pagination from '@/components/navigation/Pagination';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';
import AdBanner from '@/components/ads/AdBanner';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export const revalidate = 3600;

export async function generateMetadata() {
  const title = `Blog | ${SITE_CONFIG.name}`;
  const description = `Read the latest news and articles on ${SITE_CONFIG.name}`;
  const canonical = `${SITE_CONFIG.siteUrl}/blog`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
      images: [{ url: `${SITE_CONFIG.siteUrl}${SITE_CONFIG.defaultOgImage}` }],
    },
  };
}

export default async function BlogPage({ searchParams }) {
  const resolvedSearch = await searchParams;
  const currentPage = Number(resolvedSearch?.page) || 1;

  // Fetch all posts (excluding the daily quiz if desired)
  const { posts, totalPages } = await getPosts({
    page: currentPage,
    perPage: SITE_CONFIG.postsPerPage,
    excludeSlugs: ['daily-quiz'],
  });

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Blog' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={breadcrumbItems} />

      {/* Header */}
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl sm:text-3xl text-text-primary">
          Our Blog
        </h1>
        <p className="text-text-secondary mt-2 text-sm max-w-2xl">
          Latest news, updates, and articles.
        </p>
      </div>

      <AdBanner position="top" />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <section>
          <PostGrid posts={posts} />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath="/blog"
          />
        </section>

        <Suspense fallback={<LoadingSpinner size="lg" className="py-10" />}>
          <Sidebar />
        </Suspense>
      </div>
    </div>
  );
}
