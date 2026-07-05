import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { test } from 'node:test'

const adminSectionPages = [
  'app/(admin)/admin/add-website/page.jsx',
  'app/(admin)/admin/media/page.jsx',
  'app/(admin)/admin/content/page.jsx',
  'app/(admin)/admin/posts/page.jsx',
  'app/(admin)/admin/categories/page.jsx',
  'app/(admin)/admin/authors/page.jsx',
  'app/(admin)/admin/redirects/page.jsx',
  'app/(admin)/admin/settings/page.jsx',
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
  assert.match(workspace, /ImportManager/)
})

test('admin navigation links to separated sections and keeps quiz global', async () => {
  const shell = await readFile('features/admin-shell/AdminShell.jsx', 'utf8')

  for (const href of [
    '/admin',
    '/admin/media',
    '/admin/content',
    '/admin/posts',
    '/admin/categories',
    '/admin/authors',
    '/admin/redirects',
    '/admin/settings',
  ]) {
    assert.match(shell, new RegExp(href))
  }

  assert.match(shell, /label: 'Dashboard'/)
  assert.doesNotMatch(shell, /label: 'Websites'/)
  assert.doesNotMatch(shell, /label: 'Import'/)
  assert.doesNotMatch(shell, /\/admin\/import/)
  assert.doesNotMatch(shell, /\{ href: '\/admin\/quiz'/)
  assert.doesNotMatch(shell, /\{ href: '\/admin\/add-website'/)
  assert.match(shell, /const isQuizRoute = pathname === '\/admin\/quiz'/)
  assert.match(shell, /const isAddWebsiteRoute = pathname === '\/admin\/add-website'/)
  assert.match(shell, /const hideSidebar = isQuizRoute \|\| isAddWebsiteRoute/)
  assert.match(shell, /\? 'Quiz Update'/)
  assert.match(shell, /\? 'Add Website'/)
  assert.match(shell, /selectedWebsite\.name/)
  assert.doesNotMatch(shell, /secondaryTitle/)
  assert.match(shell, /<Link href="\/admin\/quiz">/)
  assert.match(shell, /<Link href="\/admin\/add-website">/)
  assert.doesNotMatch(shell, /Website selected/)
  assert.doesNotMatch(shell, /\(selected\)/)
  assert.doesNotMatch(shell, />\s*Admin\s*<\/Link>/)
  assert.match(shell, /!hideSidebar \? \(/)
  assert.match(shell, /className=\{hideSidebar \? '' : 'lg:pl-56'\}/)
})

test('admin dashboard is empty and add website owns website management', async () => {
  const dashboard = await readFile('features/dashboard/DashboardWorkspace.jsx', 'utf8')
  const websites = await readFile('features/websites/WebsitesWorkspace.jsx', 'utf8')
  const shell = await readFile('features/admin-shell/AdminShell.jsx', 'utf8')

  assert.match(dashboard, /title="Dashboard"/)
  assert.doesNotMatch(dashboard, /selectedWebsite/)
  assert.doesNotMatch(dashboard, /primaryDomain/)
  assert.match(websites, /sectionTitle="Website workspace"/)
  assert.match(websites, /sectionPath="\/admin\/add-website"/)
  assert.match(websites, /afterCreatePath="\/admin\/add-website"/)
  assert.match(websites, /<ImportManager website=\{selectedWebsite\} \/>/)
  assert.match(shell, /children \|\| <DashboardWorkspace \/>/)
  assert.doesNotMatch(shell, /children \|\| <WebsitesWorkspace \/>/)
})

test('website-scoped menu pages use context shell without website management panels', async () => {
  const scopedPages = [
    'features/media/MediaWorkspace.jsx',
    'features/template-content/TemplateContentWorkspace.jsx',
    'features/posts/PostsWorkspace.jsx',
    'features/categories/CategoriesWorkspace.jsx',
    'features/authors/AuthorsWorkspace.jsx',
    'features/redirects/RedirectsWorkspace.jsx',
    'features/settings/SettingsWorkspace.jsx',
  ]

  for (const filePath of scopedPages) {
    const source = await readFile(filePath, 'utf8')

    assert.match(source, /WebsiteContextShell/)
    assert.doesNotMatch(source, /WebsiteSectionShell/)
    assert.doesNotMatch(source, /sectionTitle=/)
    assert.doesNotMatch(source, /sectionLabel=/)
  }

  const contextShell = await readFile('features/websites/WebsiteContextShell.jsx', 'utf8')
  assert.match(contextShell, /Choose a website from the header dropdown/)
  assert.doesNotMatch(contextShell, /Add website/)
  assert.doesNotMatch(contextShell, /Selected website/)
  assert.doesNotMatch(contextShell, /Website-scoped CMS resources load only/)
})
