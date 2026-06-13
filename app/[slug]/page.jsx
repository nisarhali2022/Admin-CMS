import { notFound } from 'next/navigation';
import { Suspense, lazy } from 'react';
import Link from 'next/link';
import {
  getPostBySlug,
  getPageBySlug,
  getLatestPosts,
  getRelatedPosts,
  getAllPostSlugs,
} from '@/lib/wordpress';
import { SITE_CONFIG } from '@/lib/constants';
import {
  formatDate,
  calculateReadingTime,
  getCategoryColor,
  stripHtml,
  truncateText,
  injectAdAfterFirstParagraph,
} from '@/lib/utils';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';
import FeaturedImage from '@/components/posts/FeaturedImage';
import PostMeta from '@/components/posts/PostMeta';
import PostCard from '@/components/posts/PostCard';
import PostGrid from '@/components/posts/PostGrid';
import TableOfContents from '@/components/posts/TableOfContents';
import { generateTocAndInjectIds } from '@/lib/toc';
import AdBanner from '@/components/ads/AdBanner';
import AdInArticle from '@/components/ads/AdInArticle';
import ShareButtons from '@/components/ui/ShareButtons';
import Sidebar from '@/components/layout/Sidebar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export const revalidate = 3600;

export async function generateStaticParams() {
  const slugs = await getAllPostSlugs();
  // Pre-build only the 50 most recent posts
  return slugs.slice(0, 50).map((item) => ({ slug: item.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  let post = await getPostBySlug(slug);
  if (!post) post = await getPageBySlug(slug);
  if (!post) return { title: 'Not Found | ' + SITE_CONFIG.siteName };

  const yoast = post.yoast_head_json;
  const title = yoast?.title || `${post.title?.rendered} | ${SITE_CONFIG.siteName}`;
  const description =
    yoast?.description ||
    truncateText(stripHtml(post.excerpt?.rendered || post.content?.rendered || ''), 160);

  const imageUrl =
    post._embedded?.['wp:featuredmedia']?.[0]?.source_url ||
    `${SITE_CONFIG.siteUrl}${SITE_CONFIG.defaultOgImage}`;

  const canonical = `${SITE_CONFIG.siteUrl}/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'article',
      publishedTime: post.date,
      modifiedTime: post.modified,
      images: [{ url: imageUrl }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function SlugPage({ params }) {
  const { slug } = await params;

  let post = await getPostBySlug(slug);
  let isPage = false;
  if (!post) {
    post = await getPageBySlug(slug);
    isPage = true;
  }
  if (!post) notFound();

  const category = post._embedded?.['wp:term']?.[0]?.[0] || null;
  const imageUrl = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null;
  const imageAlt =
    post._embedded?.['wp:featuredmedia']?.[0]?.alt_text ||
    post.title?.rendered ||
    '';

  const relatedPosts =
    !isPage && category
      ? await getRelatedPosts(category.id, post.id, 3)
      : [];

  const postUrl = `${SITE_CONFIG.siteUrl}/${slug}`;
  const readingTime = calculateReadingTime(post.content?.rendered || '');

  // Generate TOC and inject IDs
  const { modifiedHtml, toc } = generateTocAndInjectIds(post.content?.rendered || '');

  // Inject ad placeholder marker after first paragraph
  const adMarker = '<!--AD_IN_ARTICLE-->';
  const contentWithAd = injectAdAfterFirstParagraph(
    modifiedHtml,
    adMarker
  );
  // Split on the marker so we can render the React component in between
  const [beforeAd, afterAd] = contentWithAd.split(adMarker);

  // JSON-LD Article schema
  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title?.rendered,
    datePublished: post.date,
    dateModified: post.modified,
    image: imageUrl || `${SITE_CONFIG.siteUrl}${SITE_CONFIG.defaultOgImage}`,
    author: {
      '@type': 'Person',
      name: post._embedded?.author?.[0]?.name || SITE_CONFIG.siteName,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_CONFIG.siteName,
      url: SITE_CONFIG.siteUrl,
    },
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    ...(category
      ? [{ label: category.name, href: `/category/${category.slug}` }]
      : []),
    { label: stripHtml(post.title?.rendered || '') },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          {/* ── Main Article ── */}
          <article>
            <Breadcrumbs items={breadcrumbItems} />

            {/* Title */}
            {/* <h1
              className="font-merriweather font-bold text-2xl sm:text-4xl text-text-primary leading-tight mt-2 mb-4"
              dangerouslySetInnerHTML={{ __html: post.title?.rendered }}
            /> */}

            {/* Meta */}
            <PostMeta post={post} />

            {/* Featured Image */}
            <div className="mt-5 mb-6">
              <FeaturedImage
                post={post}
                priority
              />
            </div>

            {/* Table of Contents */}
            <TableOfContents toc={toc} />

            {/* Content with ad injection */}
            <div
              className="prose prose-lg max-w-none
                prose-headings:font-merriweather prose-headings:text-text-primary
                prose-a:text-accent hover:prose-a:underline
                prose-img:rounded-lg prose-img:shadow-sm
                prose-blockquote:border-l-4 prose-blockquote:border-accent"
              dangerouslySetInnerHTML={{ __html: beforeAd }}
            />

            <AdInArticle />

            {afterAd && (
              <div
                className="prose prose-lg max-w-none
                  prose-headings:font-merriweather prose-headings:text-text-primary
                  prose-a:text-accent hover:prose-a:underline
                  prose-img:rounded-lg prose-img:shadow-sm"
                dangerouslySetInnerHTML={{ __html: afterAd }}
              />
            )}

            {/* After-content ad */}
            <div className="mt-8">
              <AdBanner position="after-content" />
            </div>

            {/* Share Buttons */}
            <ShareButtons
              title={stripHtml(post.title?.rendered || '')}
              url={postUrl}
            />

            {/* Related Posts */}
            {relatedPosts.length > 0 && (
              <section className="mt-10">
                <h2 className="font-merriweather font-bold text-xl text-text-primary mb-5">
                  Related Posts
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {relatedPosts.map((p) => (
                    <PostCard key={p.id} post={p} />
                  ))}
                </div>
              </section>
            )}

          </article>

          {/* ── Sidebar ── */}
          <Suspense fallback={<LoadingSpinner size="lg" className="py-10" />}>
            <Sidebar />
          </Suspense>
        </div>
      </div>
    </>
  );
}