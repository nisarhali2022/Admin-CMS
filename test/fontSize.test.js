import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const css = readFileSync('styles/globals.css', 'utf8')

test('global default reading font size is 16px', () => {
  assert.match(css, /body\s*\{[\s\S]*font-size:\s*16px/)
  assert.match(css, /\.prose\s*\{[\s\S]*font-size:\s*16px/)
  assert.match(css, /\.article-content\s*\{[\s\S]*font-size:\s*16px/)
})

test('non-heading text elements are forced to 16px', () => {
  assert.match(css, /:where\([\s\S]*\bp,[\s\S]*\bli,[\s\S]*\bdiv,[\s\S]*\bspan,[\s\S]*\ba,[\s\S]*\btable,[\s\S]*\btd,[\s\S]*\bth,[\s\S]*\bbutton,[\s\S]*\binput,[\s\S]*\btextarea,[\s\S]*\bselect/)
  assert.match(css, /font-size:\s*16px/)
  assert.doesNotMatch(css, /font-size:\s*15px\s*!important/)
  assert.doesNotMatch(css, /font-size:\s*16px\s*!important/)
})

test('heading text and icons are excluded from the forced 16px rule', () => {
  for (const heading of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
    assert.match(css, new RegExp(`${heading},`))
    assert.match(css, new RegExp(`${heading} \\*`))
  }

  assert.match(css, /svg,\s*[\r\n\s]*svg \*/)
})
