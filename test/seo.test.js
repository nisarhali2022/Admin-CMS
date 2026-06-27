import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildMetadata,
  canonicalPath,
  getPageMetadataOverride,
  isInvalidArchivePage,
  parsePageNumber,
} from '../lib/seo.js'

test('canonicalPath preserves query values and pagination', () => {
  assert.equal(canonicalPath('/blog', 1), '/blog')
  assert.equal(canonicalPath('/blog', 2), '/blog?page=2')
  assert.equal(
    canonicalPath('/search', 3, { q: 'daily quiz' }),
    '/search?q=daily+quiz&page=3'
  )
})

test('parsePageNumber accepts only positive safe integers', () => {
  assert.equal(parsePageNumber(undefined), 1)
  assert.equal(parsePageNumber('2'), 2)
  assert.equal(parsePageNumber('0'), null)
  assert.equal(parsePageNumber('-1'), null)
  assert.equal(parsePageNumber('1.5'), null)
})

test('archive validation rejects invalid and out-of-range pages', () => {
  assert.equal(isInvalidArchivePage({ totalPages: 2 }, 2), false)
  assert.equal(isInvalidArchivePage({ totalPages: 2 }, 3), true)
  assert.equal(isInvalidArchivePage({ invalidPage: true }, 2), true)
})

test('trust page metadata overrides provide clean titles and descriptions', () => {
  const terms = getPageMetadataOverride('terms-of-service')
  const disclaimer = getPageMetadataOverride('disclaimer')

  assert.equal(terms.title, 'Terms of Service')
  assert.match(terms.description, /acceptable use/i)
  assert.equal(terms.type, 'website')

  assert.equal(disclaimer.title, 'Disclaimer')
  assert.match(disclaimer.description, /no affiliation with Telenor Pakistan/i)
  assert.equal(disclaimer.type, 'website')
})

test('buildMetadata applies corrected titles and descriptions to Open Graph', () => {
  const override = getPageMetadataOverride('disclaimer')
  const metadata = buildMetadata({
    ...override,
    path: '/disclaimer',
  })

  assert.equal(metadata.title, 'Disclaimer')
  assert.equal(metadata.description, override.description)
  assert.equal(metadata.openGraph.title, 'Disclaimer')
  assert.equal(metadata.openGraph.description, override.description)
  assert.equal(
    metadata.openGraph.url,
    'https://telenorquiztoday.com.pk/disclaimer'
  )
  assert.equal(metadata.twitter.title, 'Disclaimer')
  assert.equal(metadata.twitter.description, override.description)
})
