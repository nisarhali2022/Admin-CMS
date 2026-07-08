import {
  normalizeOptionalText,
  normalizeRequiredText,
  normalizeSlug,
} from './taxonomy.js'

export function validateCategoryPayload(payload) {
  const name = normalizeRequiredText(payload?.name, 'name')

  return {
    name,
    slug: normalizeSlug(payload?.slug, name),
    description: normalizeOptionalText(payload?.description, 'description', 1000),
  }
}

export function validateCategoryPatchPayload(payload) {
  const result = {}

  if (Object.hasOwn(payload || {}, 'name')) {
    result.name = normalizeRequiredText(payload.name, 'name')
  }

  if (Object.hasOwn(payload || {}, 'slug')) {
    result.slug = normalizeSlug(payload.slug, payload.name)
  }

  if (Object.hasOwn(payload || {}, 'description')) {
    result.description = normalizeOptionalText(
      payload.description,
      'description',
      1000
    )
  }

  return result
}
