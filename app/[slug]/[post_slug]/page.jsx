import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getPostBySlug, getRelatedPosts } from '@/lib/wordpress';
import { SITE_CONFIG } from '@/lib/constants';
import { stripHtml, truncateText, injectAdAfterFirstParagraph } from '@/lib/utils';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';
import FeaturedImage from '@/components/posts/FeaturedImage';
import PostMeta from '@/components/posts/PostMeta';
import PostCard from '@/components/posts/PostCard';
import TableOfContents from '@/components/posts/TableOfContents';
import { generateTocAndInjectIds } from '@/lib/toc';
import AdBanner from '@/components/ads/AdBanner';
import AdInArticle from '@/components/ads/AdInArticle';
import ShareButtons from '@/components/ui/ShareButtons';
import Sidebar from '@/components/layout/Sidebar';
import LoadingSpinner from '@/components/ui/LoadingSpinner';

export const revalidate = 3600;

export async function generateMetadata({ params }) {
  const { slug, post_slug } = await params;
  const post = await getPostBySlug(post_slug);
  if (!post) return { title: 'Not Found | ' + SITE_CONFIG.siteName };

  const yoast = post.yoast_head_json;
  const title = yoast?.title || `${post.title?.rendered} | ${SITE_CONFIG.siteName}`;
  const description = yoast?.description || truncateText(stripHtml(post.excerpt?.rendered || post.content?.rendered || ''), 160);
  const imageUrl = post._embedded?.['wp:featuredmedia']?.[0]?.source_url || `${SITE_CONFIG.siteUrl}${SITE_CONFIG.defaultOgImage}`;
  const canonical = `${SITE_CONFIG.siteUrl}/${slug}/${post_slug}`;

  return {
    title, description, alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'article', publishedTime: post.date, modifiedTime: post.modified, images: [{ url: imageUrl }] },
    twitter: { card: 'summary_large_image', title, description, images: [imageUrl] },
  };
}

export default async function PostPage({ params }) {
  const { slug, post_slug } = await params;

  const post = await getPostBySlug(post_slug);
  if (!post) notFound();

  const category = post._embedded?.['wp:term']?.[0]?.[0] || null;
  const relatedPosts = category ? await getRelatedPosts(category.id, post.id, 3) : [];

  const postUrl = `${SITE_CONFIG.siteUrl}/${slug}/${post_slug}`;

  const { modifiedHtml, toc } = generateTocAndInjectIds(post.content?.rendered || '');
  const adMarker = '<!--AD_IN_ARTICLE-->';
  const contentWithAd = injectAdAfterFirstParagraph(modifiedHtml, adMarker);
  const [beforeAd, afterAd] = contentWithAd.split(adMarker);

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title?.rendered,
    datePublished: post.date,
    dateModified: post.modified,
    author: { '@type': 'Person', name: post._embedded?.author?.[0]?.name || SITE_CONFIG.siteName },
    publisher: { '@type': 'Organization', name: SITE_CONFIG.siteName, url: SITE_CONFIG.siteUrl },
  };

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    ...(category ? [{ label: category.name, href: `/${slug}` }] : []),
    { label: stripHtml(post.title?.rendered || '') },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8">
          <article>
            <Breadcrumbs items={breadcrumbItems} />
            <PostMeta post={post} />
            <div className="mt-5 mb-6"><FeaturedImage post={post} priority /></div>
            <TableOfContents toc={toc} />
            <div className="prose prose-lg max-w-none prose-headings:font-heading prose-headings:text-text-primary prose-a:text-accent hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-sm prose-blockquote:border-l-4 prose-blockquote:border-accent" dangerouslySetInnerHTML={{ __html: beforeAd }} />
            <AdInArticle />
            {afterAd && <div className="prose prose-lg max-w-none prose-headings:font-heading prose-headings:text-text-primary prose-a:text-accent hover:prose-a:underline prose-img:rounded-lg prose-img:shadow-sm" dangerouslySetInnerHTML={{ __html: afterAd }} />}
            <div className="mt-8"><AdBanner position="after-content" /></div>
            <ShareButtons title={stripHtml(post.title?.rendered || '')} url={postUrl} />
            {relatedPosts.length > 0 && (
              <section className="mt-10">
                <h2 className="font-heading font-bold text-xl text-text-primary mb-5">Related Posts</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {relatedPosts.map((p) => <PostCard key={p.id} post={p} />)}
                </div>
              </section>
            )}
          </article>
          <Suspense fallback={<LoadingSpinner size="lg" className="py-10" />}><Sidebar /></Suspense>
        </div>
      </div>
    </>
  );
}
