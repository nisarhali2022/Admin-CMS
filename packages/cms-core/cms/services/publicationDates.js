import { supabaseAdminRequest } from '../../supabase/adminRest.js'
import { triggerRevalidation } from './revalidation.js'
import {
  fetchWordPressCollection,
  normalizeWordPressItem,
} from './wordpress.js'

function buildCategoryPaths(updates, categoryById) {
  return [...new Set([
    '/',
    '/blog',
    ...updates
      .map((update) => categoryById.get(update.categoryId))
      .filter(Boolean)
      .map((slug) => `/${slug}`),
  ])]
}

export function collectPublicationDateUpdates({ wordpressPosts, cmsPosts, categories }) {
  const sourceBySlug = new Map()
  const skippedSourcePosts = []

  for (const rawPost of wordpressPosts || []) {
    const post = normalizeWordPressItem(rawPost)
    if (post.status !== 'publish' || !post.slug) continue

    if (!post.date) {
      skippedSourcePosts.push({ slug: post.slug, reason: 'Missing or invalid WordPress publication date.' })
      continue
    }

    sourceBySlug.set(post.slug, post.date)
  }

  const categoryById = new Map(
    (categories || []).map((category) => [String(category.id), category.slug])
  )
  const updates = []
  const unchanged = []
  const unmatchedCmsPosts = []

  for (const post of cmsPosts || []) {
    const publishedAt = sourceBySlug.get(post.slug)
    if (!publishedAt) {
      unmatchedCmsPosts.push(post.slug)
      continue
    }

    if (Date.parse(post.published_at || '') === Date.parse(publishedAt)) {
      unchanged.push(post.slug)
      continue
    }

    updates.push({
      id: post.id,
      slug: post.slug,
      categoryId: post.category_id,
      publishedAt,
    })
  }

  return {
    updates,
    unchanged,
    unmatchedCmsPosts,
    skippedSourcePosts,
    paths: buildCategoryPaths(updates, categoryById),
  }
}

export async function repairWordPressPostPublicationDates({
  websiteId,
  wordpressBaseUrl,
  apply = false,
}) {
  const [wordpressPosts, cmsPosts, categories] = await Promise.all([
    fetchWordPressCollection(wordpressBaseUrl, 'posts', null),
    supabaseAdminRequest(
      `cms_posts?select=id,slug,category_id,published_at&website_id=eq.${encodeURIComponent(websiteId)}&deleted_at=is.null`
    ),
    supabaseAdminRequest(
      `cms_categories?select=id,slug&website_id=eq.${encodeURIComponent(websiteId)}&deleted_at=is.null`
    ),
  ])
  const collected = collectPublicationDateUpdates({ wordpressPosts, cmsPosts, categories })
  const report = {
    websiteId,
    wordpressBaseUrl,
    apply,
    sourcePosts: wordpressPosts.length,
    cmsPosts: cmsPosts.length,
    matched: collected.updates.length + collected.unchanged.length,
    wouldUpdate: collected.updates.length,
    updated: 0,
    unchanged: collected.unchanged.length,
    unmatchedCmsPosts: collected.unmatchedCmsPosts,
    skippedSourcePosts: collected.skippedSourcePosts,
    paths: collected.paths,
    revalidation: null,
  }

  if (!apply) return report

  for (const update of collected.updates) {
    await supabaseAdminRequest(
      `cms_posts?website_id=eq.${encodeURIComponent(websiteId)}&id=eq.${encodeURIComponent(update.id)}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: { published_at: update.publishedAt },
      }
    )
    report.updated += 1
  }

  if (report.updated > 0) {
    report.revalidation = await triggerRevalidation({
      websiteId,
      event: 'posts.publication-dates-repaired',
      resourceType: 'post',
      paths: report.paths,
    })
  }

  return report
}
