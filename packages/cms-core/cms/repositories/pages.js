import { serializePage, serializePages } from '../serializers/pages.js'
import { supabaseAdminRequest } from '../../supabase/adminRest.js'

const PAGE_SELECT =
  'id,website_id,title,path,body_text,focus_keyphrase,seo_title,meta_description,author_id,canonical_url,robots_meta,featured_image_id,sitemap_include,published_at,created_at,updated_at'

function toDatabasePayload(payload) {
  return {
    title: payload.title,
    path: payload.path,
    body_text: payload.bodyText,
    focus_keyphrase: payload.focusKeyphrase,
    seo_title: payload.seoTitle,
    meta_description: payload.metaDescription,
    author_id: payload.authorId,
    canonical_url: payload.canonicalUrl,
    robots_meta: payload.robotsMeta,
    featured_image_id: payload.featuredImageId,
    sitemap_include: payload.sitemapInclude,
  }
}

export async function listPages(websiteId) {
  const rows = await supabaseAdminRequest(
    `cms_pages?select=${PAGE_SELECT}&website_id=eq.${encodeURIComponent(websiteId)}&order=created_at.desc`
  )

  return serializePages(rows)
}

export async function getPage(websiteId, pageId) {
  const rows = await supabaseAdminRequest(
    `cms_pages?select=${PAGE_SELECT}&website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(pageId)}&limit=1`
  )

  return serializePage(rows?.[0])
}

export async function createPage(websiteId, payload) {
  const rows = await supabaseAdminRequest('cms_pages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: {
      website_id: websiteId,
      ...toDatabasePayload(payload),
      published_at: new Date().toISOString(),
    },
  })

  return serializePage(rows?.[0])
}

export async function updatePage(websiteId, pageId, payload) {
  const body = toDatabasePayload(payload)
  body.published_at = new Date().toISOString()

  const rows = await supabaseAdminRequest(
    `cms_pages?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(pageId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body,
    }
  )

  return serializePage(rows?.[0])
}

export async function hardDeletePage(websiteId, pageId) {
  await supabaseAdminRequest(
    `cms_pages?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(pageId)}`,
    {
      method: 'DELETE',
      headers: {
        Prefer: 'return=minimal',
      },
    }
  )
}
