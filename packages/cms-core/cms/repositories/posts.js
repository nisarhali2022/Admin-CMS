import { serializePost, serializePosts } from '../serializers/posts.js'
import { supabaseAdminRequest } from '../../supabase/adminRest.js'

const POST_SELECT =
  'id,website_id,category_id,author_id,title,slug,featured_image_id,body_html,body_blocks,focus_keyphrase,seo_title,meta_description,canonical_url,robots_meta,og_image_id,sitemap_include,published_at,created_at,updated_at'

function toDatabasePayload(payload) {
  return {
    category_id: payload.categoryId,
    author_id: payload.authorId,
    title: payload.title,
    slug: payload.slug,
    featured_image_id: payload.featuredImageId,
    body_html: payload.bodyHtml,
    body_blocks: payload.bodyBlocks,
    focus_keyphrase: payload.focusKeyphrase,
    seo_title: payload.seoTitle,
    meta_description: payload.metaDescription,
    canonical_url: payload.canonicalUrl,
    robots_meta: payload.robotsMeta,
    og_image_id: payload.ogImageId,
    sitemap_include: payload.sitemapInclude,
  }
}

export async function listPosts(websiteId) {
  const rows = await supabaseAdminRequest(
    `cms_posts?select=${POST_SELECT}&website_id=eq.${encodeURIComponent(websiteId)}&order=created_at.desc`
  )

  return serializePosts(rows)
}

export async function getPost(websiteId, postId) {
  const rows = await supabaseAdminRequest(
    `cms_posts?select=${POST_SELECT}&website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(postId)}&limit=1`
  )

  return serializePost(rows?.[0])
}

export async function createPost(websiteId, payload) {
  const body = {
    website_id: websiteId,
    ...toDatabasePayload(payload),
    published_at: new Date().toISOString(),
  }

  const rows = await supabaseAdminRequest('cms_posts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body,
  })

  return serializePost(rows?.[0])
}

export async function updatePost(websiteId, postId, payload) {
  const body = toDatabasePayload(payload)
  body.published_at = new Date().toISOString()

  const rows = await supabaseAdminRequest(
    `cms_posts?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(postId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body,
    }
  )

  return serializePost(rows?.[0])
}

export async function hardDeletePost(websiteId, postId) {
  await supabaseAdminRequest(
    `cms_posts?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(postId)}`,
    {
      method: 'DELETE',
      headers: {
        Prefer: 'return=minimal',
      },
    }
  )
}
