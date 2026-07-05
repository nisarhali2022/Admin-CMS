# CMS Rebuild Change Log

This file records the major product, architecture, schema, UI, and documentation changes made during the CMS rebuild planning and implementation. It is intended as a readable handoff summary, not a runtime audit log.

## Current Direction

- The project is a single-admin, multi-website CMS.
- One admin user signs in with the configured admin secret.
- After login, normal CMS resources are managed per selected website.
- Website-scoped resources use `website_id` as the foreign key.
- Quiz remains global and is not scoped by website.
- Public websites are separate apps and read public-safe data from Supabase.
- Supabase is used for database, auth/session support, and media storage.
- Supabase Storage replaced Cloudflare R2 for v1 media.

## Website And Resource Scoping

- Added website/account management as a core CMS concept.
- Admin can add websites.
- Admin can select a website after login.
- Website selection controls website-scoped resources only.
- Website-scoped resources include:
  - media
  - template content/pages
  - blog posts
  - categories
  - authors
  - redirects
  - settings
  - SEO
  - AdSense
  - WordPress import jobs
- Quiz is intentionally excluded from website scoping.
- The selected website is preserved across website-scoped admin pages through `websiteId`.

## Quiz Changes

- Quiz is global.
- Quiz has no `website_id`.
- Quiz does not depend on selected website.
- One quiz update applies to all public websites.
- Quiz is stored in Supabase in `cms_global_quiz`.
- Quiz table was simplified to current-only data:
  - `quiz_id`
  - `questions`
  - `is_published`
  - `updated_at`
- Removed quiz table fields:
  - `title`
  - `slug`
  - `description`
  - `visible_date`
  - `seo_date`
  - `created_at`
- Homepage/page SEO is managed by website template/settings data, not by the quiz table.
- Added compatibility for older Supabase tables that still use `id` before the corrective `quiz_id` migration is applied.
- Added `cms_public_get_current_quiz()` for public quiz reads.
- Added service-role execute permission for `cms_global_quiz_questions_valid(jsonb)`.
- Added corrective migration:
  - `supabase/migrations/202607050009_fix_quiz_function_permissions.sql`
- Quiz UI now follows the old quiz admin reference style more closely:
  - 5 question cards
  - question text field
  - 4 options
  - A/B/C/D answer selectors
  - green selected answer state
  - answer preview
  - save button
  - clear all button
- Typing option text no longer auto-selects an answer.
- User selects the correct answer by clicking the option selector button.
- If a selected option text is edited, the answer remains linked to that selected option.

## Admin UI And Navigation

- Login page no longer shows the admin header/sidebar.
- After login, the admin lands on `/admin/quiz`.
- Admin UI was redesigned toward a WordPress-inspired layout.
- Website-scoped CMS pages have a dark left sidebar.
- Sidebar remains visible on website-scoped admin pages.
- Sidebar is hidden only on `/admin/quiz`.
- Quiz link was removed from the left sidebar.
- Quiz is now linked from the top header.
- Top header includes:
  - current section title
  - Quiz link
  - website dropdown
  - Add Website button
  - Sign out button
- Website dropdown routes to `/admin?websiteId=<id>`.
- Add Website routes to `/admin#add-website`.

## Supabase Storage Changes

- Cloudflare R2 was removed from the v1 plan.
- Supabase Storage is now the only v1 media backend.
- Recommended bucket name is `cms-media`.
- Media files are stored under website-scoped paths:
  - `websites/{website_id}/media/{yyyy}/{mm}/{uuid}.webp`
- Public images are stored as WebP.
- `cms_media` stores:
  - `storage_path`
  - `public_url`
  - alt text
  - caption
  - dimensions
  - MIME type
  - file size
  - source
- Public APIs resolve `mediaId` values into image objects with URL and metadata.
- Public websites never upload, delete, or list storage objects directly.
- Upload/delete operations happen through trusted server/admin code.

## Blog And Content Changes

- Blog posts are website-scoped.
- Blog posts require an author.
- Authors are website-scoped profile records, not login users.
- Admin can create, edit, and delete authors.
- Categories are supported.
- Tags were removed from v1.
- Blog layouts are fixed.
- Blog body content uses structured blocks.
- Supported body blocks include FAQ blocks.
- Images can be placed inside blog body blocks, such as after paragraph 1 or 2.
- Template/page content uses fixed code-defined templates.
- No generic page builder is included in v1.
- No revisions are included in v1.
- No public draft preview tokens are included in v1.
- Internal admin preview is included for template content.

## SEO And Settings

- SEO fields remain per template/page content and per blog post.
- Supported SEO fields include:
  - SEO title
  - meta description
  - canonical URL
  - robots meta
  - Open Graph image
- Website-level settings include:
  - robots.txt
  - sitemap settings
  - SEO defaults
  - site config
  - revalidation settings
  - AdSense settings
- Website-level AdSense control was added.
- AdSense is configured in `cms_site_settings`, not `.env`.
- New websites default AdSense to inactive.
- Enabling AdSense requires a valid `ca-pub-...` publisher ID.
- Public websites render AdSense only when enabled and configured.
- `/ads.txt` is exposed only when AdSense is enabled and configured.

## Redirects

- Redirects are website-scoped.
- Supports 301 and 302 redirects.
- Duplicate redirect rules are prevented.
- Redirects have active/inactive behavior.
- Public redirect reads expose only active, non-deleted redirects.
- Redirect hit tracking fields may exist, but public anon clients do not update them in v1.

## WordPress Import

- WordPress import is website-scoped.
- Import is allowed only for inactive websites.
- WordPress posts, categories, authors, pages, and images are imported where possible.
- WordPress authors are imported into `cms_authors`.
- If WordPress author data is unavailable, a website-scoped fallback author named `Imported Author` is used.
- Posts are never imported without `author_id`.
- Imported images are copied into Supabase Storage.
- Old WordPress image URLs are rewritten to Supabase Storage public URLs.
- Failed import reset clears only the inactive website's scoped rows and imported Supabase Storage objects.

## Security And Access

- One admin user in v1.
- Admin writes happen through server route handlers.
- Supabase service-role key remains server-only.
- Public websites use Supabase anon credentials only for public-safe RPCs.
- Direct anon table access is closed with RLS.
- Public RPCs expose only active/published/safe data.
- Import jobs are admin-only.
- Revalidation secrets are encrypted with server-only `CMS_ENCRYPTION_KEY`.

## Documentation Flow

- Added and maintained detailed docs under `docs/`.
- Added milestone implementation plan.
- Added implementation context and implementation details docs.
- Added milestone review flow.
- `docs/MILESTONE_REVIEWS.md` must be updated after each completed milestone.
- Future milestones should read the latest milestone review before starting.
- This `docs/CHANGE_LOG.md` records major decisions and corrections across the rebuild.

## Validation Completed

Recent checks have passed after the quiz/navigation/permission changes:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
git diff --check -- features app docs test supabase
```

## Supabase Migrations To Remember

For quiz fixes, the important migrations are:

- `202607050007_global_quiz.sql`
- `202607050008_simplify_global_quiz.sql`
- `202607050009_fix_quiz_function_permissions.sql`

If `202607050007_global_quiz.sql` was already run before the permission fix, run:

```text
supabase/migrations/202607050009_fix_quiz_function_permissions.sql
```
