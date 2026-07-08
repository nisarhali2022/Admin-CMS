import { serializeAuthor } from './authors.js'
import { serializeMedia } from './media.js'

export function serializePage(row) {
  if (!row) return null

  return {
    id: row.id,
    websiteId: row.websiteId || row.website_id,
    title: row.title,
    path: row.path,
    bodyText: row.bodyText ?? row.body_text ?? '',
    focusKeyphrase: row.focusKeyphrase ?? row.focus_keyphrase ?? null,
    seoTitle: row.seoTitle ?? row.seo_title ?? null,
    metaDescription: row.metaDescription ?? row.meta_description ?? null,
    authorId: row.authorId ?? row.author_id ?? null,
    canonicalUrl: row.canonicalUrl ?? row.canonical_url ?? null,
    robotsMeta: row.robotsMeta ?? row.robots_meta ?? null,
    featuredImageId: row.featuredImageId ?? row.featured_image_id ?? null,
    sitemapInclude: row.sitemapInclude ?? row.sitemap_include,
    publishedAt: row.publishedAt || row.published_at || null,
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at,
    author: serializeAuthor(row.author || row.cms_authors),
    featuredImage: serializeMedia(row.featuredImage || row.featured_image),
  }
}

export function serializePages(rows) {
  return Array.isArray(rows) ? rows.map(serializePage) : []
}
