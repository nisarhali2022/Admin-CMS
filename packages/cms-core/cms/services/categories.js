import { CmsValidationError } from '../http/errors.js'
import {
  createCategory,
  hardDeleteCategory,
  listCategories,
  updateCategory,
} from '../repositories/categories.js'
import { listPages } from '../repositories/pages.js'
import { listTemplateContent } from '../repositories/templateContent.js'
import { supabaseAdminRequest } from '../../supabase/adminRest.js'

async function categoryHasPosts(websiteId, categoryId) {
  const rows = await supabaseAdminRequest(
    `cms_posts?select=id&website_id=eq.${encodeURIComponent(websiteId)}&category_id=eq.${encodeURIComponent(categoryId)}&limit=1`
  )

  return Array.isArray(rows) && rows.length > 0
}

function normalizeDuplicateError(error) {
  if (error?.code === '23505') {
    throw new CmsValidationError('Category slug already exists for this website.', {
      code: 'DUPLICATE_CATEGORY_SLUG',
    })
  }

  throw error
}

const RESERVED_PUBLIC_ROUTE_SEGMENTS = new Set([
  'api',
  'admin',
  'author',
  'blog',
  'search',
  'tag',
])

async function assertCategoryRouteAvailable(websiteId, slug, currentCategoryId = null) {
  const [pages, templates, categories] = await Promise.all([
    listPages(websiteId),
    listTemplateContent(websiteId),
    listCategories(websiteId),
  ])
  const path = `/${slug}`
  if (RESERVED_PUBLIC_ROUTE_SEGMENTS.has(slug)) {
    throw new CmsValidationError('This category slug is reserved by the public frontend.', {
      code: 'RESERVED_PUBLIC_ROUTE',
      details: { path },
    })
  }
  if (pages.some((page) => page.path === path) || templates.some((template) => template.path === path)) {
    throw new CmsValidationError('A CMS page already uses this public path.', {
      code: 'DUPLICATE_PUBLIC_ROUTE',
      details: { path },
    })
  }
  if (categories.some((category) => category.id !== currentCategoryId && category.slug === slug)) {
    throw new CmsValidationError('A category already uses this public path.', {
      code: 'DUPLICATE_PUBLIC_ROUTE',
      details: { path },
    })
  }
}

export async function createCategoryForWebsite(websiteId, payload) {
  await assertCategoryRouteAvailable(websiteId, payload.slug)
  try {
    return await createCategory(websiteId, payload)
  } catch (error) {
    normalizeDuplicateError(error)
  }
}

export async function updateCategoryForWebsite(websiteId, categoryId, payload) {
  await assertCategoryRouteAvailable(websiteId, payload.slug, categoryId)
  try {
    return await updateCategory(websiteId, categoryId, payload)
  } catch (error) {
    normalizeDuplicateError(error)
  }
}

export async function permanentlyDeleteCategory({ websiteId, categoryId }) {
  if (await categoryHasPosts(websiteId, categoryId)) {
    throw new CmsValidationError(
      'Category is used by posts and cannot be permanently deleted.',
      {
        code: 'CATEGORY_IN_USE',
      }
    )
  }

  await hardDeleteCategory(websiteId, categoryId)
  return { deleted: true, categoryId }
}
