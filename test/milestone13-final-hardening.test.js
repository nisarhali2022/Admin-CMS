import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { test } from 'node:test'

const adminSectionPages = [
  'app/(admin)/admin/media/page.jsx',
  'app/(admin)/admin/content/page.jsx',
  'app/(admin)/admin/posts/page.jsx',
  'app/(admin)/admin/categories/page.jsx',
  'app/(admin)/admin/authors/page.jsx',
  'app/(admin)/admin/redirects/page.jsx',
  'app/(admin)/admin/settings/page.jsx',
  'app/(admin)/admin/import/page.jsx',
  'app/(admin)/admin/quiz/page.jsx',
]

test('admin CMS resources have separate admin pages', async () => {
  await Promise.all(adminSectionPages.map((filePath) => access(filePath)))
})

test('website workspace no longer mounts every resource manager on one page', async () => {
  const workspace = await readFile('features/websites/WebsitesWorkspace.jsx', 'utf8')

  assert.doesNotMatch(workspace, /MediaLibrary/)
  assert.doesNotMatch(workspace, /TemplateContentManager/)
  assert.doesNotMatch(workspace, /PostsManager/)
  assert.doesNotMatch(workspace, /CategoriesManager/)
  assert.doesNotMatch(workspace, /AuthorsManager/)
  assert.doesNotMatch(workspace, /RedirectsManager/)
  assert.doesNotMatch(workspace, /SettingsManager/)
  assert.doesNotMatch(workspace, /ImportManager/)
})

test('admin navigation links to separated sections and keeps quiz global', async () => {
  const shell = await readFile('features/admin-shell/AdminShell.jsx', 'utf8')

  for (const href of [
    '/admin/media',
    '/admin/content',
    '/admin/posts',
    '/admin/categories',
    '/admin/authors',
    '/admin/redirects',
    '/admin/settings',
    '/admin/import',
  ]) {
    assert.match(shell, new RegExp(href))
  }

  assert.doesNotMatch(shell, /\{ href: '\/admin\/quiz'/)
  assert.match(shell, /const isQuizRoute = pathname === '\/admin\/quiz'/)
  assert.match(shell, /<Link href="\/admin\/quiz">/)
  assert.match(shell, /!isQuizRoute \? \(/)
  assert.match(shell, /className=\{isQuizRoute \? '' : 'lg:pl-56'\}/)
})
