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
  'app/(admin)/admin/quiz/page.jsx',
]

test('admin CMS resources have separate admin pages', async () => {
  await Promise.all(adminSectionPages.map((filePath) => access(filePath)))
})

test('setup project owns website workspace and import onboarding', async () => {
  await access('setup-provisioning/app/(admin)/admin/add-website/page.jsx')
  await access('setup-provisioning/supabase/migrations/202607030001_cms_schema.sql')

  const workspace = await readFile(
    'setup-provisioning/features/websites/WebsitesWorkspace.jsx',
    'utf8'
  )

  assert.doesNotMatch(workspace, /MediaLibrary/)
  assert.doesNotMatch(workspace, /TemplateContentManager/)
  assert.doesNotMatch(workspace, /PostsManager/)
  assert.doesNotMatch(workspace, /CategoriesManager/)
  assert.doesNotMatch(workspace, /AuthorsManager/)
  assert.doesNotMatch(workspace, /RedirectsManager/)
  assert.doesNotMatch(workspace, /SettingsManager/)
  assert.match(workspace, /ImportManager/)
})

test('media upload resets a stable form reference after async upload', async () => {
  const mediaLibrary = await readFile('features/media/MediaLibrary.jsx', 'utf8')

  assert.match(mediaLibrary, /const form = event\.currentTarget/)
  assert.match(mediaLibrary, /form\.reset\(\)/)
  assert.doesNotMatch(mediaLibrary, /event\.currentTarget\.reset\(\)/)
})

test('media library uses WordPress-style table layout', async () => {
  const mediaLibrary = await readFile('features/media/MediaLibrary.jsx', 'utf8')

  assert.match(mediaLibrary, /All media items/)
  assert.doesNotMatch(mediaLibrary, /Trash/)
  assert.doesNotMatch(mediaLibrary, /Live media/)
  assert.doesNotMatch(mediaLibrary, /const \[mediaStatus, setMediaStatus\]/)
  assert.doesNotMatch(mediaLibrary, /value=\{mediaStatus\}/)
  assert.doesNotMatch(mediaLibrary, /All dates/)
  assert.match(mediaLibrary, /Filter/)
  assert.match(mediaLibrary, /Search Media/)
  assert.doesNotMatch(mediaLibrary, /Bulk actions/)
  assert.doesNotMatch(mediaLibrary, /Trash selected/)
  assert.doesNotMatch(mediaLibrary, /Restore selected/)
  assert.match(mediaLibrary, /File/)
  assert.match(mediaLibrary, /Alt text/)
  assert.match(mediaLibrary, /File size/)
  assert.match(mediaLibrary, /Dimensions/)
  assert.match(mediaLibrary, /Date/)
  assert.match(mediaLibrary, /Actions/)
  assert.match(mediaLibrary, /formatFileSize/)
  assert.match(mediaLibrary, /formatDimensions/)
  assert.match(mediaLibrary, / by \$\{height\} pixels/)
  assert.match(mediaLibrary, /getStoredFilename/)
  assert.match(mediaLibrary, /getAltTextDisplay/)
  assert.match(mediaLibrary, /getReadableFilename/)
  assert.match(mediaLibrary, /Stored:/)
  assert.match(mediaLibrary, /Type:/)
  assert.match(mediaLibrary, /Uploaded as:/)
  assert.doesNotMatch(mediaLibrary, /Original:/)
  assert.match(mediaLibrary, /Image uploaded, compressed, and converted to WebP\./)
  assert.match(mediaLibrary, /Alternative Text/)
  assert.match(mediaLibrary, /Caption/)
  assert.match(mediaLibrary, /Copy URL/)
  assert.match(mediaLibrary, /Download file/)
  assert.match(mediaLibrary, /async function downloadMedia/)
  assert.match(mediaLibrary, /URL\.createObjectURL/)
  assert.match(mediaLibrary, /link\.download = getStoredFilename\(item\)/)
  assert.doesNotMatch(mediaLibrary, /download\s*\n\s*className/)
  assert.match(mediaLibrary, /No references found\./)
  assert.match(mediaLibrary, /reference\(s\) found\./)
  assert.match(mediaLibrary, />\s*Delete\s*</)
  assert.doesNotMatch(mediaLibrary, /Delete Permanently/)
  assert.doesNotMatch(mediaLibrary, /Trashed media/)
  assert.doesNotMatch(mediaLibrary, /selectedIds/)
  assert.match(mediaLibrary, /PAGE_SIZE/)
  assert.match(mediaLibrary, /mediaMatchesSearch/)
  assert.doesNotMatch(mediaLibrary, /Attachment details/)
  assert.doesNotMatch(mediaLibrary, /aspect-square/)
  assert.doesNotMatch(mediaLibrary, /selectedMediaId/)
  assert.doesNotMatch(mediaLibrary, /Uploaded to/)
  assert.doesNotMatch(mediaLibrary, /Unattached/)
  assert.doesNotMatch(mediaLibrary, /Author/)
  assert.doesNotMatch(mediaLibrary, />Admin</)
  assert.match(mediaLibrary, /<th className="w-36 px-3 py-2 font-medium">Date<\/th>[\s\S]*<th className="w-52 px-3 py-2 font-medium">Actions<\/th>/)
  assert.match(mediaLibrary, /<th className="px-3 py-2 font-medium">File<\/th>[\s\S]*<th className="w-56 px-3 py-2 font-medium">Alt text<\/th>/)
  assert.match(mediaLibrary, /<th className="w-32 px-3 py-2 font-medium">File size<\/th>[\s\S]*<th className="w-48 px-3 py-2 font-medium">Dimensions<\/th>/)
  assert.match(mediaLibrary, /<td className="px-3 py-3 text-\[#50575e\]">[\s\S]*getAltTextDisplay\(item\)/)
  assert.match(mediaLibrary, /<td colSpan=\{6\}/)
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
  assert.doesNotMatch(shell, /isAddWebsiteRoute/)
  assert.match(shell, /const hideSidebar = isQuizRoute/)
  assert.match(shell, /\? 'Quiz Update'/)
  assert.match(shell, /selectedWebsite\.name/)
  assert.doesNotMatch(shell, /secondaryTitle/)
  assert.match(shell, /<Link href="\/admin\/quiz">/)
  assert.doesNotMatch(shell, /<Link href="\/admin\/add-website">/)
  assert.doesNotMatch(shell, /Add Website/)
  assert.doesNotMatch(shell, /Website selected/)
  assert.doesNotMatch(shell, /\(selected\)/)
  assert.doesNotMatch(shell, />\s*Admin\s*<\/Link>/)
  assert.match(shell, /!hideSidebar \? \(/)
  assert.match(shell, /className=\{hideSidebar \? '' : 'lg:pl-60'\}/)
})

test('admin dashboard is empty and setup project owns website management', async () => {
  const dashboard = await readFile('features/dashboard/DashboardWorkspace.jsx', 'utf8')
  const websites = await readFile(
    'setup-provisioning/features/websites/WebsitesWorkspace.jsx',
    'utf8'
  )
  const websiteShell = await readFile(
    'setup-provisioning/features/websites/WebsiteSectionShell.jsx',
    'utf8'
  )
  const shell = await readFile('features/admin-shell/AdminShell.jsx', 'utf8')

  assert.match(dashboard, /title="Dashboard"/)
  assert.doesNotMatch(dashboard, /selectedWebsite/)
  assert.doesNotMatch(dashboard, /primaryDomain/)
  assert.match(websites, /sectionTitle="Website workspace"/)
  assert.match(websites, /sectionPath="\/admin\/add-website"/)
  assert.match(websites, /afterCreatePath="\/admin\/add-website"/)
  assert.match(websites, /<ImportManager website=\{selectedWebsite\} \/>/)
  assert.match(websiteShell, /cms:websites-updated/)
  assert.match(websiteShell, /function selectWebsite\(websiteId\)/)
  assert.match(websiteShell, /router\.push\(`\$\{sectionPath\}\?websiteId=\$\{websiteId\}`\)/)
  assert.match(websiteShell, /function selectWebsite\(websiteId\) \{[\s\S]*notifyWebsitesUpdated\(\)/)
  assert.match(shell, /cms:websites-updated/)
  assert.match(shell, /loadHeaderWebsites/)
  assert.match(shell, /children \|\| <DashboardWorkspace \/>/)
  assert.doesNotMatch(shell, /children \|\| <WebsitesWorkspace \/>/)
  await assert.rejects(access('features/websites/WebsitesWorkspace.jsx'))
  await assert.rejects(access('features/websites/WebsiteSectionShell.jsx'))
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

test('template content manager uses WordPress-style pages table and editor', async () => {
  const templateContent = await readFile(
    'features/template-content/TemplateContentManager.jsx',
    'utf8'
  )

  assert.match(templateContent, /Pages/)
  assert.match(templateContent, /Add Page/)
  assert.match(templateContent, /Search Pages/)
  assert.match(templateContent, /Author/)
  assert.match(templateContent, /Date/)
  assert.match(templateContent, /Actions/)
  assert.doesNotMatch(templateContent, /pageAction/)
  assert.doesNotMatch(templateContent, /Publish/)
  assert.match(templateContent, /Delete/)
  assert.doesNotMatch(templateContent, /status: 'published'/)
  assert.match(templateContent, /method: selectedId \? 'PATCH' : 'POST'/)
  assert.match(templateContent, /template-content\/\$\{page\.id\}/)
  assert.match(templateContent, /\/api\/cms\/pages/)
  assert.match(templateContent, /selectedKind/)
  assert.match(templateContent, /kind: 'custom'/)
  assert.match(templateContent, /getEmptyCustomPageForm/)
  assert.match(templateContent, /buildCustomPagePayload/)
  assert.match(templateContent, /'DELETE'/)
  assert.match(templateContent, /Delete this page permanently\? This cannot be undone\./)
  assert.doesNotMatch(templateContent, /includeTrashed=true/)
  assert.doesNotMatch(templateContent, /deletedAt/)
  assert.match(templateContent, /That slug is already used by another page on this website\./)
  assert.match(templateContent, /DUPLICATE_TEMPLATE_CONTENT/)
  assert.match(templateContent, /This page already exists for this website\. Refresh the page list and select it to edit\./)
  assert.doesNotMatch(templateContent, /Draft/)
  assert.doesNotMatch(templateContent, />\s*Trash\s*</)
  assert.doesNotMatch(templateContent, /Restore/)
  assert.doesNotMatch(templateContent, /View/)
  assert.doesNotMatch(templateContent, /Move to Trash/)
  assert.doesNotMatch(templateContent, /Unpublish/)
  assert.doesNotMatch(templateContent, /value=\{form\.status\}/)
  assert.doesNotMatch(templateContent, /bulkAction/)
  assert.doesNotMatch(templateContent, /pageFilter/)
  assert.doesNotMatch(templateContent, /selectedKeys/)
  assert.match(templateContent, /Edit Page/)
  assert.match(templateContent, /Add Page/)
  assert.match(templateContent, /Permalink:/)
  assert.match(templateContent, /Add Media/)
  assert.match(templateContent, /addMediaToContent/)
  assert.match(templateContent, /Visual/)
  assert.match(templateContent, /Code/)
  assert.match(templateContent, /editorMode/)
  assert.match(templateContent, /insertIntoContent/)
  assert.match(templateContent, /contentTextareaRef/)
  assert.match(templateContent, /Focus keyphrase/)
  assert.match(templateContent, /SEO title/)
  assert.match(templateContent, /Meta description/)
  assert.match(templateContent, /Slug/)
  assert.match(templateContent, /Feature Image/)
  assert.match(templateContent, /featuredImageId/)
  assert.match(templateContent, /isFeatureImagePickerOpen/)
  assert.match(templateContent, /Set feature image/)
  assert.match(templateContent, /Change feature image/)
  assert.match(templateContent, /Remove feature image/)
  assert.match(templateContent, /setSelectedId\(null\)/)
  assert.equal((templateContent.match(/onClick=\{addPage\}/g) || []).length, 1)
  assert.doesNotMatch(templateContent, /getEmptyAddForm/)
  assert.doesNotMatch(templateContent, /All fixed pages already exist/)
  assert.match(templateContent, /loadAuthors/)
  assert.match(templateContent, /authorId/)
  assert.doesNotMatch(templateContent, /Open Graph image/)
  assert.doesNotMatch(templateContent, /pageRows\[0\]/)
  assert.doesNotMatch(templateContent, /value=\{form\.featuredImageId\}[\s\S]{0,120}onChange=\{\(event\) => updateFeaturedImage\(event\.target\.value\)\}/)
  assert.doesNotMatch(templateContent, /Admin preview/)
  assert.doesNotMatch(templateContent, /contentDataText/)
})

test('category manager uses WordPress-style taxonomy layout', async () => {
  const categories = await readFile('features/categories/CategoriesManager.jsx', 'utf8')
  const styles = await readFile('styles/globals.css', 'utf8')

  assert.match(categories, /Add Category/)
  assert.match(categories, /grid gap-4 md:grid-cols-2/)
  assert.match(categories, /Search Categories/)
  assert.doesNotMatch(categories, /Bulk action/)
  assert.doesNotMatch(categories, /Trash selected/)
  assert.doesNotMatch(categories, /Restore selected/)
  assert.doesNotMatch(categories, /Delete Permanently/)
  assert.match(categories, />\s*Delete\s*</)
  assert.match(categories, /Count/)
  assert.match(categories, /Actions/)
  assert.match(categories, /categoryMatchesSearch/)
  assert.match(categories, /buildPostCounts/)
  assert.match(categories, /colSpan=\{5\}/)
  assert.match(categories, /font-normal text-\[#1f2330\]/)
  assert.doesNotMatch(categories, /<tfoot>/)
  assert.doesNotMatch(categories, /Parent Category/)
  assert.doesNotMatch(categories, /xl:grid-cols-\[minmax\(18rem,24rem\)_minmax\(0,1fr\)\]/)
  assert.equal([...categories.matchAll(/aria-label="Bulk action"/g)].length, 0)
  assert.match(styles, /font-size: 13px;/)
  assert.match(styles, /\.wp-admin-interface button/)
})

test('author manager uses WordPress-style taxonomy layout', async () => {
  const authors = await readFile('features/authors/AuthorsManager.jsx', 'utf8')

  assert.match(authors, /Add Author/)
  assert.match(authors, /grid gap-4 md:grid-cols-2/)
  assert.match(authors, /Search Authors/)
  assert.doesNotMatch(authors, /Bulk action/)
  assert.doesNotMatch(authors, /Trash selected/)
  assert.doesNotMatch(authors, /Restore selected/)
  assert.doesNotMatch(authors, /Delete Permanently/)
  assert.match(authors, />\s*Delete\s*</)
  assert.match(authors, /Avatar/)
  assert.match(authors, /Author Image/)
  assert.match(authors, /AuthorAvatarPreview/)
  assert.match(authors, /UserRound/)
  assert.match(authors, /Selected author image preview/)
  assert.match(authors, /Select an uploaded Media Library image/)
  assert.match(authors, /Status/)
  assert.match(authors, /Count/)
  assert.match(authors, /Actions/)
  assert.match(authors, /authorMatchesSearch/)
  assert.match(authors, /buildPostCounts/)
  assert.match(authors, /colSpan=\{6\}/)
  assert.match(authors, /font-normal text-\[#1f2330\]/)
  assert.doesNotMatch(authors, /<tfoot>/)
  assert.doesNotMatch(authors, /xl:grid-cols-\[minmax\(18rem,24rem\)_minmax\(0,1fr\)\]/)
  assert.equal([...authors.matchAll(/grid gap-4 md:grid-cols-2/g)].length, 2)
  assert.equal([...authors.matchAll(/aria-label="Bulk action"/g)].length, 0)
})

test('redirect manager uses WordPress-style taxonomy layout', async () => {
  const redirects = await readFile('features/redirects/RedirectsManager.jsx', 'utf8')

  assert.match(redirects, /Add Redirect/)
  assert.match(redirects, /Search Redirects/)
  assert.doesNotMatch(redirects, /Bulk action/)
  assert.doesNotMatch(redirects, /Trash selected/)
  assert.doesNotMatch(redirects, /Restore selected/)
  assert.doesNotMatch(redirects, /Delete Permanently/)
  assert.match(redirects, />\s*Delete\s*</)
  assert.match(redirects, /Source/)
  assert.match(redirects, /Destination/)
  assert.match(redirects, /Type/)
  assert.match(redirects, /Status/)
  assert.match(redirects, /Actions/)
  assert.match(redirects, /redirectMatchesSearch/)
  assert.match(redirects, /space-y-6/)
  assert.match(redirects, /font-normal text-\[#1f2330\]/)
  assert.doesNotMatch(redirects, /<tfoot>/)
  assert.doesNotMatch(redirects, /xl:grid-cols-\[minmax\(18rem,24rem\)_minmax\(0,1fr\)\]/)
  assert.equal([...redirects.matchAll(/aria-label="Bulk action"/g)].length, 0)
})

test('settings manager uses full-width organized sections', async () => {
  const settings = await readFile('features/settings/SettingsManager.jsx', 'utf8')

  assert.match(settings, /SEO and site config/)
  assert.match(settings, /Robots and sitemap/)
  assert.match(settings, /AdSense/)
  assert.match(settings, /Revalidation webhook/)
  assert.match(settings, /max-w-6xl/)
  assert.doesNotMatch(settings, /TabsContent/)
  assert.doesNotMatch(settings, /TabsList/)
  assert.doesNotMatch(settings, /TabsTrigger/)
})
