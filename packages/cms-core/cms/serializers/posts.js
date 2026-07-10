import { serializeAuthor } from './authors.js'
import { serializeCategory } from './categories.js'
import { serializeMedia } from './media.js'

export function serializePost(row) {
  if (!row) return null

  return {
    id: row.id,
    websiteId: row.websiteId || row.website_id,
    categoryId: row.categoryId ?? row.category_id ?? null,
    authorId: row.authorId || row.author_id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt || null,
    featuredImageId: row.featuredImageId ?? row.featured_image_id ?? null,
    bodyHtml: row.bodyHtml ?? row.body_html ?? null,
    bodyBlocks: row.bodyBlocks || row.body_blocks || [],
    focusKeyphrase: row.focusKeyphrase ?? row.focus_keyphrase ?? null,
    seoTitle: row.seoTitle ?? row.seo_title ?? null,
    metaDescription: row.metaDescription ?? row.meta_description ?? null,
    canonicalUrl: row.canonicalUrl ?? row.canonical_url ?? null,
    robotsMeta: row.robotsMeta ?? row.robots_meta ?? null,
    ogImageId: row.ogImageId ?? row.og_image_id ?? null,
    sitemapInclude: row.sitemapInclude ?? row.sitemap_include,
    publishedAt: row.publishedAt || row.published_at || null,
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at,
    author: serializeAuthor(row.author || row.cms_authors),
    category: serializeCategory(row.category || row.cms_categories),
    featuredImage: serializeMedia(row.featuredImage || row.featured_image),
    ogImage: serializeMedia(row.ogImage || row.og_image),
  }
}

export function serializePosts(rows) {
  return Array.isArray(rows) ? rows.map(serializePost) : []
}
