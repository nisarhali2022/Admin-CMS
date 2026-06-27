import test from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeWordPressContentLinks,
  optimizeContentImages,
  isWordPressMediaUrl,
  removeContentH1Blocks,
} from '../lib/utils.js'

test('body images preserve supplied responsive markup', () => {
  const html =
    '<img src="https://example.com/photo.jpg" width="900" height="600" ' +
    'srcset="photo-450.jpg 450w, photo-900.jpg 900w" sizes="50vw">'
  const result = optimizeContentImages(html)

  assert.match(result, /loading="lazy"/)
  assert.match(result, /decoding="async"/)
  assert.match(result, /width="900"/)
  assert.match(result, /height="600"/)
  assert.equal((result.match(/\bsrcset=/g) || []).length, 1)
  assert.equal((result.match(/\bsizes=/g) || []).length, 1)
})

test('body images infer dimensions from WordPress filenames', () => {
  const result = optimizeContentImages(
    '<img src="https://example.com/photo-683x1024.webp">'
  )

  assert.match(result, /width="683"/)
  assert.match(result, /height="1024"/)
  assert.match(result, /sizes="\(max-width: 768px\) 100vw, 768px"/)
  assert.doesNotMatch(result, /\/_next\/image\?url=/)
  assert.match(result, /src="https:\/\/example\.com\/photo-683x1024\.webp"/)
})

test('body images receive fallback dimensions without optimizer sources', () => {
  const result = optimizeContentImages(
    '<img src="https://example.com/photo.webp" alt="Example">'
  )

  assert.match(result, /width="800"/)
  assert.match(result, /height="450"/)
  assert.doesNotMatch(result, /\/_next\/image\?url=/)
  assert.match(result, /src="https:\/\/example\.com\/photo\.webp"/)
})

test('wordpress media URLs are detected for optimizer bypass', () => {
  assert.equal(
    isWordPressMediaUrl(
      'https://wp.telenorquiztoday.com.pk/wp-content/uploads/2026/03/example.webp'
    ),
    true
  )
  assert.equal(isWordPressMediaUrl('/assets/local-logo.webp'), false)
})

test('content h1 blocks are removed while lower headings remain', () => {
  const result = removeContentH1Blocks(
    '<h1 class="wp-block-heading">Post Title</h1><p>Intro</p><h2>Section</h2>'
  )

  assert.doesNotMatch(result, /<h1\b/i)
  assert.match(result, /<p>Intro<\/p>/)
  assert.match(result, /<h2>Section<\/h2>/)
})

test('gutenberg h1 heading comments are removed with the heading', () => {
  const result = removeContentH1Blocks(
    '<!-- wp:heading {"level":1} --><h1>Manual Title</h1><!-- /wp:heading --><p>Body</p>'
  )

  assert.doesNotMatch(result, /wp:heading/i)
  assert.doesNotMatch(result, /<h1\b/i)
  assert.match(result, /<p>Body<\/p>/)
})

test('wordpress backend content links are rewritten to the public site', () => {
  process.env.WORDPRESS_API_URL =
    'https://wp.telenorquiztoday.com.pk/wp-json/wp/v2'

  const result = normalizeWordPressContentLinks(
    '<p>Also Read: <a href="https://wp.telenorquiztoday.com.pk/telecom/example-post/">Example</a></p>'
  )

  assert.match(
    result,
    /href="https:\/\/telenorquiztoday\.com\.pk\/telecom\/example-post\/"/
  )
})

test('wordpress system links are not rewritten', () => {
  process.env.WORDPRESS_API_URL =
    'https://wp.telenorquiztoday.com.pk/wp-json/wp/v2'

  const result = normalizeWordPressContentLinks(
    '<a href="https://wp.telenorquiztoday.com.pk/wp-content/uploads/file.webp">File</a>'
  )

  assert.match(result, /href="https:\/\/wp\.telenorquiztoday\.com\.pk\/wp-content\/uploads\/file\.webp"/)
})

test('visible wordpress backend contact text is rewritten', () => {
  process.env.WORDPRESS_API_URL =
    'https://wp.telenorquiztoday.com.pk/wp-json/wp/v2'

  const result = normalizeWordPressContentLinks(
    '<p>Email: info@wp.telenorquiztoday.com.pk</p><p>Contact Page: https://wp.telenorquiztoday.com.pk/contact</p>'
  )

  assert.match(result, /info@telenorquiztoday\.com\.pk/)
  assert.match(result, /https:\/\/telenorquiztoday\.com\.pk\/contact/)
  assert.doesNotMatch(result, /wp\.telenorquiztoday\.com\.pk/)
})
