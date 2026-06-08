import { notFound } from 'next/navigation';
import { getPageBySlug } from '@/lib/wordpress';
import { SITE_CONFIG } from '@/lib/constants';
import { stripHtml, truncateText } from '@/lib/utils';
import Breadcrumbs from '@/components/navigation/Breadcrumbs';

export const revalidate = 3600;

export async function generateMetadata() {
  const page = await getPageBySlug('about');
  const title = page?.title?.rendered
    ? `${stripHtml(page.title.rendered)} | ${SITE_CONFIG.siteName}`
    : `About | ${SITE_CONFIG.siteName}`;
  const description = page?.excerpt?.rendered
    ? truncateText(stripHtml(page.excerpt.rendered), 160)
    : `Learn more about ${SITE_CONFIG.siteName}`;

  return {
    title,
    description,
    alternates: { canonical: `${SITE_CONFIG.siteUrl}/about` },
    openGraph: {
      title,
      description,
      url: `${SITE_CONFIG.siteUrl}/about`,
      type: 'website',
    },
  };
}

export default async function AboutPage() {
  const page = await getPageBySlug('about');
  if (!page) notFound();

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'About' },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Breadcrumbs items={breadcrumbItems} />

      <article>
        <h1
          className="font-merriweather font-bold text-3xl sm:text-4xl text-text-primary mt-2 mb-8"
          dangerouslySetInnerHTML={{ __html: page.title?.rendered }}
        />

        <div
          className="prose prose-lg max-w-none
            prose-headings:font-merriweather prose-headings:text-text-primary
            prose-a:text-accent hover:prose-a:underline
            prose-img:rounded-lg prose-img:shadow-sm
            prose-blockquote:border-l-4 prose-blockquote:border-accent
            prose-blockquote:text-text-secondary"
          dangerouslySetInnerHTML={{ __html: page.content?.rendered }}
        />
      </article>
    </div>
  );
}