import { Suspense } from 'react';
import { searchPosts } from '@/lib/wordpress';
import { SITE_CONFIG } from '@/lib/constants';
import PostGrid from '@/components/posts/PostGrid';
import Sidebar from '@/components/layout/Sidebar';
import Pagination from '@/components/navigation/Pagination';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ searchParams }) {
  const resolvedSearch = await searchParams;
  const query = resolvedSearch?.q || '';
  return {
    title: query
      ? `Search Results for "${query}" | ${SITE_CONFIG.siteName}`
      : `Search | ${SITE_CONFIG.siteName}`,
    description: `Search results for "${query}" on ${SITE_CONFIG.siteName}`,
    robots: { index: false },
  };
}

export default async function SearchPage({ searchParams }) {
  const resolvedSearch = await searchParams;
  const query = resolvedSearch?.q || '';
  const currentPage = Number(resolvedSearch?.page) || 1;

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Search Results' },
  ];

  if (!query.trim()) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
        <Breadcrumbs items={breadcrumbItems} />
        <p className="text-5xl mb-4">🔍</p>
        <h1 className="font-merriweather font-bold text-2xl text-text-primary mb-2">
          What are you looking for?
        </h1>
        <p className="text-text-secondary">
          Enter a search term in the box above to find posts.
        </p>
      </div>
    );
  }

  const { posts, totalPages } = await searchPosts(query, currentPage);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="mb-6">
        <h1 className="font-merriweather font-bold text-2xl text-text-primary">
          Search Results for{' '}
          <span className="text-accent">&ldquo;{query}&rdquo;</span>
        </h1>
        {posts.length > 0 && (
          <p className="text-text-secondary text-sm mt-1">
            Showing page {currentPage} of {totalPages}
          </p>
        )}
      </div>

      {posts.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-5xl mb-4">😔</p>
          <p className="font-merriweather font-bold text-xl text-text-primary mb-2">
            No results found
          </p>
          <p className="text-text-secondary text-sm">
            Try different keywords or browse our categories.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <section>
            <PostGrid posts={posts} />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              basePath={`/search`}
            />
          </section>

          <Suspense fallback={<LoadingSpinner size="lg" className="py-10" />}>
            <Sidebar />
          </Suspense>
        </div>
      )}
    </div>
  );
}