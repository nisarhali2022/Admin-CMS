import { CmsValidationError } from '../http/errors.js'
import {
  createCategory,
  hardDeleteCategory,
  updateCategory,
} from '../repositories/categories.js'
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

export async function createCategoryForWebsite(websiteId, payload) {
  try {
    return await createCategory(websiteId, payload)
  } catch (error) {
    normalizeDuplicateError(error)
  }
}

export async function updateCategoryForWebsite(websiteId, categoryId, payload) {
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
