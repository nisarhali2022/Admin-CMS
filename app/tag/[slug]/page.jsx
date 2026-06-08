import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getTagBySlug, getPosts } from '@/lib/wordpress';
import { SITE_CONFIG } from '@/lib/constants';
import PostGrid from '@/components/posts/PostGrid';
import Sidebar from '@/components/layout/Sidebar';
import Pagination from '@/components/navigation/Pagination';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';
import AdBanner from '@/components/ads/AdBanner';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const tag = await getTagBySlug(slug);
  if (!tag) return { title: 'Not Found | ' + SITE_CONFIG.siteName };

  const title = `${tag.name} | ${SITE_CONFIG.siteName}`;
  const description = `Browse all posts tagged "${tag.name}" on ${SITE_CONFIG.siteName}`;
  const canonical = `${SITE_CONFIG.siteUrl}/tag/${slug}`;

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

export default async function TagPage({ params, searchParams }) {
  const { slug } = await params;
  const resolvedSearch = await searchParams;
  const currentPage = Number(resolvedSearch?.page) || 1;

  const tag = await getTagBySlug(slug);
  if (!tag) notFound();

  const { posts, totalPages } = await getPosts({
    page: currentPage,
    perPage: SITE_CONFIG.postsPerPage,
    tagId: tag.id,
  });

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: `Tag: ${tag.name}` },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mb-6">
        <h1 className="font-merriweather font-bold text-2xl sm:text-3xl text-text-primary">
          Tag: {tag.name}
        </h1>
        <p className="text-xs text-text-secondary mt-1">
          {tag.count} post{tag.count !== 1 ? 's' : ''}
        </p>
      </div>

      <AdBanner position="top" />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <section>
          <PostGrid posts={posts || []} />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath={`/tag/${slug}`}
          />
        </section>

        <Suspense fallback={<LoadingSpinner size="lg" className="py-10" />}>
          <Sidebar />
        </Suspense>
      </div>
    </div>
  );
}