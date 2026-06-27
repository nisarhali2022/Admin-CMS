import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

function read(path) {
  return readFileSync(path, 'utf8')
}

test('homepage metadata and headings prioritize today telenor answer intent', () => {
  const page = read('app/page.jsx')

  assert.match(page, /Today Telenor Answer \$\{seoDateLabel\} - My Telenor Quiz Answers/)
  assert.match(page, /Today Telenor Answer \$\{todayLabel\} - My Telenor Quiz Answers/)
  assert.match(page, /Today Telenor 5 Question Answer \$\{todayLabel\}/)
  assert.match(page, /Quick Answer - Today Telenor Answer/)
  assert.match(page, /Get all 5 correct Telenor quiz answers today/)
})

test('homepage info sections include concise AEO answer targets', () => {
  const sections = read('components/home/QuizInfoSections.jsx')

  assert.match(sections, /What is Today Telenor Answer\?/)
  assert.match(sections, /Where to Enter My Telenor App Answer Today\?/)
  assert.match(sections, /What is Today Telenor 5 Question Answer\?/)
  assert.match(sections, /What is Test Your Skills Today\?/)
})

test('fallback FAQs target high-intent Search Console queries', () => {
  const faq = read('components/home/FaqSection.jsx')

  assert.match(faq, /What is today Telenor answer\?/)
  assert.match(faq, /Where can I find My Telenor app answer today\?/)
  assert.match(faq, /What is today Telenor 5 question answer\?/)
  assert.match(faq, /How do I play Telenor Play and Win today\?/)
  assert.match(faq, /What is Test Your Skills today in My Telenor app\?/)
  assert.match(faq, /How many MBs can I win from Telenor quiz today\?/)
})
