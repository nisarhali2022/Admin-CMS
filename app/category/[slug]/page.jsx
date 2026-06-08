import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import {
  getCategoryBySlug,
  getPostsByCategory,
  getAllCategorySlugs,
} from '@/lib/wordpress';
import { SITE_CONFIG } from '@/lib/constants';
import PostGrid from '@/components/posts/PostGrid';
import Sidebar from '@/components/layout/Sidebar';
import Pagination from '@/components/navigation/Pagination';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';
import AdBanner from '@/components/ads/AdBanner';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getAllCategorySlugs();
  return slugs.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: 'Not Found | ' + SITE_CONFIG.siteName };

  const title = `${category.name} Archives | ${SITE_CONFIG.siteName}`;
  const description =
    category.description ||
    `Browse all ${category.name} posts on ${SITE_CONFIG.siteName}`;
  const canonical = `${SITE_CONFIG.siteUrl}/category/${slug}`;

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

export default async function CategoryPage({ params, searchParams }) {
  const { slug } = await params;
  const resolvedSearch = await searchParams;
  const currentPage = Number(resolvedSearch?.page) || 1;

  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  const { posts, totalPages } = await getPostsByCategory(
    category.id,
    currentPage,
    SITE_CONFIG.postsPerPage
  );

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: category.name },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={breadcrumbItems} />

      {/* Category Header */}
      <div className="mb-6">
        <h1 className="font-merriweather font-bold text-2xl sm:text-3xl text-text-primary">
          {category.name}
        </h1>
        {category.description && (
          <p className="text-text-secondary mt-2 text-sm max-w-2xl">
            {category.description}
          </p>
        )}
        <p className="text-xs text-text-secondary mt-1">
          {category.count} post{category.count !== 1 ? 's' : ''}
        </p>
      </div>

      <AdBanner position="top" />

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
        <section>
          <PostGrid posts={posts} />
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            basePath={`/category/${slug}`}
          />
        </section>

        <Suspense fallback={<LoadingSpinner size="lg" className="py-10" />}>
          <Sidebar />
        </Suspense>
      </div>
    </div>
  );
}