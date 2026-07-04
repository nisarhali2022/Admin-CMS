import { serializePost, serializePosts } from '../serializers/posts.js'
import { supabaseAdminRequest } from '../../supabase/adminRest.js'

const POST_SELECT =
  'id,website_id,category_id,author_id,title,slug,excerpt,featured_image_id,body_blocks,seo_title,meta_description,canonical_url,robots_meta,og_image_id,sitemap_include,status,published_at,deleted_at,created_at,updated_at'

function toDatabasePayload(payload) {
  return {
    category_id: payload.categoryId,
    author_id: payload.authorId,
    title: payload.title,
    slug: payload.slug,
    excerpt: payload.excerpt,
    featured_image_id: payload.featuredImageId,
    body_blocks: payload.bodyBlocks,
    seo_title: payload.seoTitle,
    meta_description: payload.metaDescription,
    canonical_url: payload.canonicalUrl,
    robots_meta: payload.robotsMeta,
    og_image_id: payload.ogImageId,
    sitemap_include: payload.sitemapInclude,
    status: payload.status,
  }
}

export async function listPosts(websiteId, { includeTrashed = false } = {}) {
  const deletedFilter = includeTrashed ? '' : '&deleted_at=is.null'
  const rows = await supabaseAdminRequest(
    `cms_posts?select=${POST_SELECT}&website_id=eq.${encodeURIComponent(websiteId)}${deletedFilter}&order=created_at.desc`
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
    published_at: payload.status === 'published' ? new Date().toISOString() : null,
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

  if (payload.status === 'published') {
    body.published_at = new Date().toISOString()
  }

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

export async function setPostStatus(websiteId, postId, status) {
  const rows = await supabaseAdminRequest(
    `cms_posts?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(postId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: {
        status,
        published_at: status === 'published' ? new Date().toISOString() : null,
      },
    }
  )

  return serializePost(rows?.[0])
}

export async function trashPost(websiteId, postId) {
  const rows = await supabaseAdminRequest(
    `cms_posts?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(postId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: {
        deleted_at: new Date().toISOString(),
      },
    }
  )

  return serializePost(rows?.[0])
}

export async function restorePost(websiteId, postId) {
  const rows = await supabaseAdminRequest(
    `cms_posts?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(postId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body: {
        deleted_at: null,
      },
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
