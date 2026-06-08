import { getAllPostSlugs, getAllCategorySlugs } from '@/lib/wordpress';
import { SITE_CONFIG } from '@/lib/constants';

export default async function sitemap() {
  const base = SITE_CONFIG.siteUrl;

  // Posts
  const postSlugs = await getAllPostSlugs();
  const postUrls = postSlugs.map((item) => ({
    url: `${base}/${item.slug}`,
    lastModified: item.modified ? new Date(item.modified) : new Date(),
    changeFrequency: 'daily',
    priority: 0.9,
  }));

  // Categories
  const categorySlugs = await getAllCategorySlugs();
  const categoryUrls = categorySlugs.map((slug) => ({
    url: `${base}/category/${slug}`,
    changeFrequency: 'weekly',
    priority: 0.8,
  }));

  // Static pages
  const staticPages = ['/about', '/contact', '/privacy-policy'].map((path) => ({
    url: `${base}${path}`,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [
    {
      url: base,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    ...postUrls,
    ...categoryUrls,
    ...staticPages,
  ];
}