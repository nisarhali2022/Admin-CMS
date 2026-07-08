export function serializeTemplateContent(row) {
  if (!row) return null

  return {
    id: row.id,
    websiteId: row.websiteId || row.website_id,
    templateKey: row.templateKey || row.template_key,
    path: row.path,
    title: row.title,
    contentData: row.contentData || row.content_data || {},
    focusKeyphrase: row.focusKeyphrase ?? row.focus_keyphrase ?? null,
    seoTitle: row.seoTitle ?? row.seo_title ?? null,
    metaDescription: row.metaDescription ?? row.meta_description ?? null,
    authorId: row.authorId ?? row.author_id ?? null,
    canonicalUrl: row.canonicalUrl ?? row.canonical_url ?? null,
    robotsMeta: row.robotsMeta ?? row.robots_meta ?? null,
    ogImageId: row.ogImageId ?? row.og_image_id ?? null,
    sitemapInclude: row.sitemapInclude ?? row.sitemap_include,
    publishedAt: row.publishedAt || row.published_at || null,
    createdAt: row.createdAt || row.created_at,
    updatedAt: row.updatedAt || row.updated_at,
  }
}

export function serializeTemplateContentList(rows) {
  return Array.isArray(rows) ? rows.map(serializeTemplateContent) : []
}
