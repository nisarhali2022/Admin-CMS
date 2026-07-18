import assert from 'node:assert/strict'
import { access, readFile } from 'node:fs/promises'
import { test } from 'node:test'

test('implementation milestone plan exists and starts at foundation', async () => {
  await access('docs/IMPLEMENTATION_MILESTONES.md')
  const milestones = await readFile('docs/IMPLEMENTATION_MILESTONES.md', 'utf8')

  assert.match(milestones, /Milestone 1: Foundation And Admin Session/)
  assert.match(milestones, /Milestone 13: Final Hardening/)
})

test('documentation index points implementers to milestones', async () => {
  const index = await readFile('docs/INDEX.md', 'utf8')

  assert.match(index, /IMPLEMENTATION_MILESTONES\.md/)
})

test('implementation context is part of the documentation flow', async () => {
  await access('docs/IMPLEMENTATION_CONTEXT.md')
  const index = await readFile('docs/INDEX.md', 'utf8')

  assert.match(index, /IMPLEMENTATION_CONTEXT\.md/)
})

test('milestone reviews are part of the documentation flow', async () => {
  await access('docs/MILESTONE_REVIEWS.md')
  const index = await readFile('docs/INDEX.md', 'utf8')
  const milestones = await readFile('docs/IMPLEMENTATION_MILESTONES.md', 'utf8')
  const reviews = await readFile('docs/MILESTONE_REVIEWS.md', 'utf8')

  assert.match(index, /MILESTONE_REVIEWS\.md/)
  assert.match(milestones, /Completion gate for every milestone/)
  assert.match(milestones, /Do not report the milestone as complete/)
  assert.match(reviews, /Milestone 1: Foundation And Admin Session/)
})

test('frontend migration guide is part of the public integration documentation flow', async () => {
  await access('docs/FRONTEND_WORDPRESS_TO_SUPABASE_MIGRATION.md')
  const index = await readFile('docs/INDEX.md', 'utf8')
  const publicIntegration = await readFile('docs/public-site-integration/README.md', 'utf8')

  assert.match(index, /FRONTEND_WORDPRESS_TO_SUPABASE_MIGRATION\.md/)
  assert.match(publicIntegration, /Frontend WordPress-to-Supabase Migration/)
})

test('public integration documentation uses portable local-helper guidance', async () => {
  const migration = await readFile('docs/FRONTEND_WORDPRESS_TO_SUPABASE_MIGRATION.md', 'utf8')
  const publicIntegration = await readFile('docs/public-site-integration/README.md', 'utf8')

  assert.doesNotMatch(migration, /D:\/telenor\//i)
  assert.doesNotMatch(publicIntegration, /import\s+.*from\s+['"]cms-core\/public-cms['"]/)
  assert.match(publicIntegration, /local server-side helper module/)
  assert.match(migration, /local `lib\/cms\/` helpers/)
})

test('local SEO, redirect lookup, and Home date documentation stays linked to the public integration guide', async () => {
  const [apiContracts, migration, publicIntegration, testing, implementation] = await Promise.all([
    readFile('docs/API_CONTRACTS.md', 'utf8'),
    readFile('docs/FRONTEND_WORDPRESS_TO_SUPABASE_MIGRATION.md', 'utf8'),
    readFile('docs/public-site-integration/README.md', 'utf8'),
    readFile('docs/TESTING.md', 'utf8'),
    readFile('docs/IMPLEMENTATION_DETAILS.md', 'utf8'),
  ])

  assert.match(apiContracts, /get_public_redirect/)
  assert.match(migration, /get_public_redirect/)
  assert.match(publicIntegration, /get_public_redirect/)
  assert.match(testing, /202607160001_local_seo_quality_and_redirect_lookup\.sql/)
  assert.match(migration, /202607160002_home_visible_date_tokens\.sql/)
  assert.match(publicIntegration, /six hours ahead/)
  assert.match(testing, /daily quiz H2/)
  assert.match(implementation, /six hours ahead/)
})

test('homepage and sidebar post-display behavior remains documented', async () => {
  const [migration, publicIntegration, testing, implementation, index] = await Promise.all([
    readFile('docs/FRONTEND_WORDPRESS_TO_SUPABASE_MIGRATION.md', 'utf8'),
    readFile('docs/public-site-integration/README.md', 'utf8'),
    readFile('docs/TESTING.md', 'utf8'),
    readFile('docs/IMPLEMENTATION_DETAILS.md', 'utf8'),
    readFile('docs/INDEX.md', 'utf8'),
  ])

  assert.match(migration, /30 newest published posts/)
  assert.match(publicIntegration, /30-post candidate pool/)
  assert.match(testing, /Popular Posts/)
  assert.match(implementation, /LatestNewsGrid/)
  assert.match(index, /newest-30 candidate pool/)
  assert.match(migration, /two newest posts in cards 1 and 2/)
  assert.match(publicIntegration, /selects four unique cards from the remaining pool/)
  assert.match(testing, /Cards 1 and 2 are the two newest posts/)
})

test('original WordPress publication-date ordering remains documented', async () => {
  const [migration, publicIntegration, testing, implementation, changeLog] = await Promise.all([
    readFile('docs/FRONTEND_WORDPRESS_TO_SUPABASE_MIGRATION.md', 'utf8'),
    readFile('docs/public-site-integration/README.md', 'utf8'),
    readFile('docs/TESTING.md', 'utf8'),
    readFile('docs/IMPLEMENTATION_DETAILS.md', 'utf8'),
    readFile('docs/CHANGE_LOG.md', 'utf8'),
  ])

  assert.match(migration, /repair-wordpress-post-dates\.mjs/)
  assert.match(publicIntegration, /original publication date/)
  assert.match(testing, /Original WordPress post-date regression/)
  assert.match(implementation, /WordPress publication-date preservation/)
  assert.match(changeLog, /True WordPress Publication-Date Ordering/)
})

test('public post-card reading time remains documented without exposing article bodies', async () => {
  const [apiContracts, migration, publicIntegration, implementation, testing] = await Promise.all([
    readFile('docs/API_CONTRACTS.md', 'utf8'),
    readFile('docs/FRONTEND_WORDPRESS_TO_SUPABASE_MIGRATION.md', 'utf8'),
    readFile('docs/public-site-integration/README.md', 'utf8'),
    readFile('docs/IMPLEMENTATION_DETAILS.md', 'utf8'),
    readFile('docs/TESTING.md', 'utf8'),
  ])

  assert.match(apiContracts, /readingTimeMinutes/)
  assert.match(migration, /Reading-time labels on cards/)
  assert.match(publicIntegration, /Post-card Reading Time/)
  assert.match(implementation, /Public post-card reading-time/)
  assert.match(testing, /202607170001_public_post_reading_time\.sql/)
})

test('custom Page layout and canonical override behavior remain documented', async () => {
  const [migration, publicIntegration, testing, implementation, changeLog, index] = await Promise.all([
    readFile('docs/FRONTEND_WORDPRESS_TO_SUPABASE_MIGRATION.md', 'utf8'),
    readFile('docs/public-site-integration/README.md', 'utf8'),
    readFile('docs/TESTING.md', 'utf8'),
    readFile('docs/IMPLEMENTATION_DETAILS.md', 'utf8'),
    readFile('docs/CHANGE_LOG.md', 'utf8'),
    readFile('docs/INDEX.md', 'utf8'),
  ])

  assert.match(migration, /Custom CMS Pages and optional canonical overrides/)
  assert.match(publicIntegration, /editor does not show a generated-canonical preview/)
  assert.match(testing, /Custom CMS Page layout and canonical-override regression/)
  assert.match(implementation, /Custom CMS Page presentation and canonical-override/)
  assert.match(changeLog, /Custom Page UI simplification/)
  assert.match(index, /Custom CMS Pages use the Privacy-style legal-page layout/)
})

test('header current-menu behavior remains documented', async () => {
  const [implementation, testing, changeLog] = await Promise.all([
    readFile('docs/IMPLEMENTATION_DETAILS.md', 'utf8'),
    readFile('docs/TESTING.md', 'utf8'),
    readFile('docs/CHANGE_LOG.md', 'utf8'),
  ])

  assert.match(implementation, /Header current-menu state/)
  assert.match(testing, /filled selected-button style/)
  assert.match(changeLog, /Header Current-Menu Button/)
})

test('SEO, performance, and technical hardening remain documented', async () => {
  const [migration, publicIntegration, implementation, testing, changeLog, reviews, index] = await Promise.all([
    readFile('docs/FRONTEND_WORDPRESS_TO_SUPABASE_MIGRATION.md', 'utf8'),
    readFile('docs/public-site-integration/README.md', 'utf8'),
    readFile('docs/IMPLEMENTATION_DETAILS.md', 'utf8'),
    readFile('docs/TESTING.md', 'utf8'),
    readFile('docs/CHANGE_LOG.md', 'utf8'),
    readFile('docs/MILESTONE_REVIEWS.md', 'utf8'),
    readFile('docs/INDEX.md', 'utf8'),
  ])

  assert.match(migration, /Production public origin and technical hardening/)
  assert.match(publicIntegration, /Production origin, schema, and performance hardening/)
  assert.match(implementation, /SEO, performance, and technical hardening follow-up/)
  assert.match(testing, /SEO, performance, and technical hardening regression/)
  assert.match(changeLog, /SEO, Performance, and Technical Hardening/)
  assert.match(reviews, /Milestone 18: SEO, performance, and technical hardening/)
  assert.match(index, /single crawler-facing origin/)
})

test('production cutover and global quiz freshness remain documented', async () => {
  const [migration, integration, testing] = await Promise.all([
    readFile('docs/FRONTEND_WORDPRESS_TO_SUPABASE_MIGRATION.md', 'utf8'),
    readFile('docs/public-site-integration/README.md', 'utf8'),
    readFile('docs/TESTING.md', 'utf8'),
  ])

  assert.match(migration, /CMS_REVALIDATION_SECRET/)
  assert.match(migration, /telenorquiztoday\.com\.pk/)
  assert.match(integration, /global_quiz\.updated/)
  assert.match(testing, /Global quiz revalidation/)
})
