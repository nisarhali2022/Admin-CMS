const DATE_PATTERN = /\b\d{1,2}\s+(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+20\d{2}\b/i

function plainText(html) {
  return String(html || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim()
}

function getAttribute(attributes, name) {
  const match = String(attributes || '').match(
    new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i')
  )
  return match?.[2]?.trim() || ''
}

function getHeadingLevels(html) {
  return [...String(html || '').matchAll(/<h([1-6])\b[^>]*>/gi)].map((match) => Number(match[1]))
}

function hasMissingImageAlt(html) {
  return [...String(html || '').matchAll(/<img\b([^>]*)>/gi)].some(
    (match) => !getAttribute(match[1], 'alt')
  )
}

function hasInvalidLink(html) {
  return [...String(html || '').matchAll(/<a\b([^>]*)>/gi)].some((match) => {
    const href = getAttribute(match[1], 'href')
    return !href || /^javascript:/i.test(href)
  })
}

function hasLiteralDateInHomeHeading(html) {
  return [...String(html || '').matchAll(/<h[12]\b[^>]*>([\s\S]*?)<\/h[12]>/gi)].some(
    (match) => DATE_PATTERN.test(plainText(match[1])) && !match[1].includes('{date}')
  )
}

export function getContentQualityWarnings({
  entityType = 'page',
  contentHtml = '',
  seoTitle = '',
  metaDescription = '',
  focusKeyphrase = '',
  featuredImage = null,
} = {}) {
  const warnings = []
  const content = String(contentHtml || '')
  const text = plainText(content)
  const headings = getHeadingLevels(content)
  const h2Index = headings.indexOf(2)

  if (!text) {
    warnings.push({
      id: 'missing-content',
      message: 'Add page content before publishing.',
    })
  }

  if (!String(focusKeyphrase || '').trim()) {
    warnings.push({
      id: 'missing-focus-keyphrase',
      message: 'Add a focus keyphrase so the editorial team knows the page topic.',
    })
  }

  const seoLength = String(seoTitle || '').trim().length
  if (seoLength > 70) {
    warnings.push({
      id: 'long-seo-title',
      message: 'SEO title is longer than 70 characters and may be truncated in search results.',
    })
  } else if (seoLength > 0 && seoLength < 20) {
    warnings.push({
      id: 'short-seo-title',
      message: 'SEO title is very short; make it clearer for search visitors.',
    })
  }

  const descriptionLength = String(metaDescription || '').trim().length
  if (descriptionLength > 170) {
    warnings.push({
      id: 'long-meta-description',
      message: 'Meta description is longer than 170 characters and may be truncated in search results.',
    })
  } else if (descriptionLength > 0 && descriptionLength < 70) {
    warnings.push({
      id: 'short-meta-description',
      message: 'Meta description is short; add enough detail to explain the page.',
    })
  }

  if (!featuredImage) {
    warnings.push({
      id: 'missing-featured-image',
      message: 'Choose a featured image for social sharing and visual consistency.',
    })
  } else if (!String(featuredImage.altText || '').trim()) {
    warnings.push({
      id: 'missing-featured-image-alt',
      message: 'Add descriptive alt text to the selected featured image in Media.',
    })
  }

  if (hasMissingImageAlt(content)) {
    warnings.push({
      id: 'missing-inline-image-alt',
      message: 'Add descriptive alt text to every image in the editor content.',
    })
  }

  if (hasInvalidLink(content)) {
    warnings.push({
      id: 'invalid-link',
      message: 'Check editor links: every link needs a valid destination.',
    })
  }

  if (headings.includes(1)) {
    warnings.push({
      id: 'body-h1',
      message: 'Use H2 for body sections. The public page already provides the single H1 title.',
    })
  }

  if (text.length >= 250 && h2Index === -1) {
    warnings.push({
      id: 'missing-h2',
      message: 'Consider H2 headings to make longer content easier to scan.',
    })
  }

  if (headings.some((level, index) => index > 0 && level > headings[index - 1] + 1)) {
    warnings.push({
      id: 'heading-skip',
      message: 'Keep heading levels in order; do not jump from one level to a much lower level.',
    })
  }

  if (
    entityType === 'home' &&
    hasLiteralDateInHomeHeading(content)
  ) {
    warnings.push({
      id: 'home-literal-date',
      message: 'Use {date} in each dated Home heading so the Karachi date updates automatically every day.',
    })
  }

  return warnings
}
