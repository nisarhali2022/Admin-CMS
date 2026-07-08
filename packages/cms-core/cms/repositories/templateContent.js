import {
  serializeTemplateContent,
  serializeTemplateContentList,
} from '../serializers/templateContent.js'
import { supabaseAdminRequest } from '../../supabase/adminRest.js'

const TEMPLATE_SELECT =
  'id,website_id,template_key,path,title,content_data,focus_keyphrase,seo_title,meta_description,author_id,canonical_url,robots_meta,og_image_id,sitemap_include,published_at,created_at,updated_at'

function toDatabasePayload(payload) {
  const row = {}

  if (Object.hasOwn(payload, 'templateKey')) row.template_key = payload.templateKey
  if (Object.hasOwn(payload, 'path')) row.path = payload.path
  if (Object.hasOwn(payload, 'title')) row.title = payload.title
  if (Object.hasOwn(payload, 'contentData')) row.content_data = payload.contentData
  if (Object.hasOwn(payload, 'focusKeyphrase')) {
    row.focus_keyphrase = payload.focusKeyphrase
  }
  if (Object.hasOwn(payload, 'seoTitle')) row.seo_title = payload.seoTitle
  if (Object.hasOwn(payload, 'metaDescription')) {
    row.meta_description = payload.metaDescription
  }
  if (Object.hasOwn(payload, 'authorId')) row.author_id = payload.authorId
  if (Object.hasOwn(payload, 'canonicalUrl')) row.canonical_url = payload.canonicalUrl
  if (Object.hasOwn(payload, 'robotsMeta')) row.robots_meta = payload.robotsMeta
  if (Object.hasOwn(payload, 'ogImageId')) row.og_image_id = payload.ogImageId
  if (Object.hasOwn(payload, 'sitemapInclude')) {
    row.sitemap_include = payload.sitemapInclude
  }
  return row
}

export async function listTemplateContent(websiteId) {
  const rows = await supabaseAdminRequest(
    `cms_template_content?select=${TEMPLATE_SELECT}&website_id=eq.${encodeURIComponent(websiteId)}&order=template_key.asc`
  )

  return serializeTemplateContentList(rows)
}

export async function getTemplateContent(websiteId, templateContentId) {
  const rows = await supabaseAdminRequest(
    `cms_template_content?select=${TEMPLATE_SELECT}&website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(templateContentId)}&limit=1`
  )

  return serializeTemplateContent(rows?.[0])
}

export async function createTemplateContent(websiteId, payload) {
  const rows = await supabaseAdminRequest('cms_template_content', {
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

  return serializeTemplateContent(rows?.[0])
}

export async function updateTemplateContent(websiteId, templateContentId, payload) {
  const body = toDatabasePayload(payload)
  body.published_at = new Date().toISOString()

  const rows = await supabaseAdminRequest(
    `cms_template_content?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(templateContentId)}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
      body,
    }
  )

  return serializeTemplateContent(rows?.[0])
}

export async function hardDeleteTemplateContent(websiteId, templateContentId) {
  await supabaseAdminRequest(
    `cms_template_content?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(templateContentId)}`,
    {
      method: 'DELETE',
      headers: {
        Prefer: 'return=minimal',
      },
    }
  )
}
