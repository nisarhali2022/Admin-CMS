import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import {
  getCategoryBySlug,
  getPageBySlug,
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

import FeaturedImage from '@/components/posts/FeaturedImage';
import PostMeta from '@/components/posts/PostMeta';
import TableOfContents from '@/components/posts/TableOfContents';
import { generateTocAndInjectIds } from '@/lib/toc';
import AdInArticle from '@/components/ads/AdInArticle';
import ShareButtons from '@/components/ui/ShareButtons';
import { stripHtml, truncateText, injectAdAfterFirstParagraph } from '@/lib/utils';

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getAllCategorySlugs();
  return slugs.map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  
  // 1. Is it a category?
  const category = await getCategoryBySlug(slug);
  if (category) {
    const title = `${category.name} Archives | ${SITE_CONFIG.siteName}`;
    const description = category.description || `Browse all ${category.name} posts on ${SITE_CONFIG.siteName}`;
    const canonical = `${SITE_CONFIG.siteUrl}/${slug}`;
    return {
      title,
      description,
      alternates: { canonical },
      openGraph: { title, description, url: canonical, type: 'website', images: [{ url: `${SITE_CONFIG.siteUrl}${SITE_CONFIG.defaultOgImage}` }] },
    };
  }

  // 2. Is it a page?
  const page = await getPageBySlug(slug);
  if (page) {
    const yoast = page.yoast_head_json;
    const title = yoast?.title || `${page.title?.rendered} | ${SITE_CONFIG.siteName}`;
    const description = yoast?.description || truncateText(stripHtml(page.excerpt?.rendered || page.content?.rendered || ''), 160);
    const imageUrl = page._embedded?.['wp:featuredmedia']?.[0]?.source_url || `${SITE_CONFIG.siteUrl}${SITE_CONFIG.defaultOgImage}`;
    const canonical = `${SITE_CONFIG.siteUrl}/${slug}`;
    return {
      title, description, alternates: { canonical },
      openGraph: { title, description, url: canonical, type: 'article', publishedTime: page.date, modifiedTime: page.modified, images: [{ url: imageUrl }] },
      twitter: { card: 'summary_large_image', title, description, images: [imageUrl] },
    };
  }

  return { title: 'Not Found | ' + SITE_CONFIG.siteName };
}

export default async function SlugPage({ params, searchParams }) {
  const { slug } = await params;

  // 1. Check if Category
  const category = await getCategoryBySlug(slug);
  if (category) {
    const resolvedSearch = await searchParams;
    const currentPage = Number(resolvedSearch?.page) || 1;
    const { posts, totalPages } = await getPostsByCategory(category.id, currentPage, SITE_CONFIG.postsPerPage);

    const breadcrumbItems = [
      { label: 'Home', href: '/' },
      { label: category.name },
    ];

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Breadcrumbs items={breadcrumbItems} />
        <div className="mb-6">
          <h1 className="font-heading font-bold text-2xl sm:text-3xl text-text-primary">{category.name}</h1>
          {category.description && <p className="text-text-secondary mt-2 text-sm max-w-2xl">{category.description}</p>}
          <p className="text-xs text-text-secondary mt-1">{category.count} post{category.count !== 1 ? 's' : ''}</p>
        </div>
        <AdBanner position="top" />
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <section>
            <PostGrid posts={posts} />
            <Pagination currentPage={currentPage} totalPages={totalPages} basePath={`/${slug}`} />
          </section>
          <Suspense fallback={<LoadingSpinner size="lg" className="py-10" />}>
            <Sidebar />
          </Suspense>
        </div>
      </div>
    );
  }

  // 2. Check if Page
  const page = await getPageBySlug(slug);
  if (page) {
    const { modifiedHtml, toc } = generateTocAndInjectIds(page.content?.rendered || '');
    const adMarker = '<!--AD_IN_ARTICLE-->';
    const contentWithAd = injectAdAfterFirstParagraph(modifiedHtml, adMarker);
    const [beforeAd, afterAd] = contentWithAd.split(adMarker);
    
    const breadcrumbItems = [{ label: 'Home', href: '/' }, { label: stripHtml(page.title?.rendered || '') }];

    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <article>
            <Breadcrumbs items={breadcrumbItems} />
            <PostMeta post={page} />
            <div className="mt-5 mb-6"><FeaturedImage post={page} priority /></div>
            <TableOfContents toc={toc} />
            <div className="prose prose-lg max-w-none prose-headings:font-heading prose-headings:text-text-primary prose-a:text-accent hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-sm prose-blockquote:border-l-4 prose-blockquote:border-accent" dangerouslySetInnerHTML={{ __html: beforeAd }} />
            <AdInArticle />
            {afterAd && <div className="prose prose-lg max-w-none prose-headings:font-heading prose-headings:text-text-primary prose-a:text-accent hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-sm" dangerouslySetInnerHTML={{ __html: afterAd }} />}
            <div className="mt-8"><AdBanner position="after-content" /></div>
            <ShareButtons title={stripHtml(page.title?.rendered || '')} url={`${SITE_CONFIG.siteUrl}/${slug}`} />
          </article>
          <Suspense fallback={<LoadingSpinner size="lg" className="py-10" />}><Sidebar /></Suspense>
        </div>
      </div>
    );
  }

  notFound();
}