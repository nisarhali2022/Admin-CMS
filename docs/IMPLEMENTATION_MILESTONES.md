# CMS Implementation Milestones

Use this file as the execution tracker for implementation. Each milestone must be completed and tested before moving to the next one.

## Milestone 1: Foundation And Admin Session

Read first:

- `PROJECT_PLAN.md`
- `DECISIONS.md`
- `ARCHITECTURE.md`
- `SETUP.md`

Implement:

- Verify the existing `ADMIN_SECRET` login/session pattern.
- Add shared environment validation for required admin CMS variables.
- Establish the feature-separated folder structure from `IMPLEMENTATION_GUIDE.md`.
- Add basic admin shell routing without building CMS resources yet.

Do not include:

- Supabase schema work.
- Website CRUD.
- Media, import, or public website integration.

Exit tests:

- Admin login succeeds with valid `ADMIN_SECRET`.
- Invalid admin secret is rejected.
- App boots locally.
- `npm run lint` and `npm run build` pass if available.

## Milestone 2: Supabase Schema And Migration Order

Read first:

- `DATA_MODEL.md`
- `SETUP.md`
- `RLS_POLICIES.md`

Implement:

- Create migrations for all v1 CMS tables.
- Add indexes, unique constraints, status rules, trash fields, and timestamps.
- Ensure all normal CMS tables are scoped by `website_id`.
- Handle `cms_authors.avatar_image_id` safely by creating `cms_media` before adding the FK, or adding the FK after both tables exist.

Do not include:

- Admin UI.
- Public RPC response shaping.
- WordPress import logic.

Exit tests:

- Migrations apply cleanly to an empty database.
- Duplicate website domains are rejected.
- Per-website slugs can repeat across different websites but not within one website.
- `cms_posts.author_id` is required.
- `cms_import_jobs` exists and is website-scoped.

## Milestone 3: RLS And Public RPCs

Read first:

- `RLS_POLICIES.md`
- `API_CONTRACTS.md`
- `DATA_MODEL.md`

Implement:

- Enable RLS on all CMS tables.
- Grant public access only through safe RPCs/views.
- Implement public-safe read rules per resource type.
- Return resolved image objects for public template/post responses.
- Keep import jobs, secrets, drafts, inactive website data, and service-only fields private.

Do not include:

- Admin CRUD screens.
- Public website frontend changes.
- Redirect hit tracking writes from anon clients.

Exit tests:

- Anon can read published template/post content for the resolved website only.
- Anon can read active authors, active redirects, safe settings, and referenced media only.
- Anon cannot read drafts, unpublished content, trashed rows, import jobs, or revalidation secrets.
- Public image objects include `url`, `alt`, `caption`, `width`, and `height` when available.

## Milestone 4: Website Management And Selection

Read first:

- `PROJECT_PLAN.md`
- `API_CONTRACTS.md`
- `USER_FLOWS.md`
- `SETUP.md`

Implement:

- Build website list, create, edit, deactivate, and select flows.
- Store website data in `cms_websites`, `cms_website_domains`, `cms_site_settings`, and related website-scoped rows.
- Keep website creation database-driven; do not require admin CMS `.env` changes for each new website.
- Make selected website explicit through `websiteId` in the URL.
- Create default settings rows for new websites.

Do not include:

- Permanent website delete.
- Domain alias UI beyond the primary domain field.
- Website-specific R2 buckets.

Exit tests:

- Website creation requires name and primary domain.
- Duplicate domains are rejected.
- New websites start inactive.
- Website selection reloads website-scoped screens by `websiteId`.
- Deactivation hides public data but keeps associated resources.
- Adding a website requires no admin CMS `.env` change.

## Milestone 5: Media Library And R2

Read first:

- `ARCHITECTURE.md`
- `DATA_MODEL.md`
- `API_CONTRACTS.md`
- `SETUP.md`

Implement:

- Build upload through server route handlers.
- Convert/compress uploads to WebP.
- Store R2 objects under `websites/{website_id}/media/{yyyy}/{mm}/{uuid}.webp`.
- Upload public WebP images with `Cache-Control: public, max-age=31536000, immutable`.
- Treat R2 images as immutable; replacing image content creates a new UUID object key and updates CMS references.
- Save metadata, public URL, alt text, caption, dimensions, and R2 object key in `cms_media`.
- Build media picker filtered by selected website.
- Implement trash, restore, and permanent delete checks.

Do not include:

- Shared media library.
- Direct browser writes to R2.
- Public websites listing R2.

Exit tests:

- Uploaded files become WebP.
- R2 object keys include the correct `website_id`.
- Public WebP uploads include `Cache-Control: public, max-age=31536000, immutable`.
- Replacing an image creates a new object key instead of overwriting the old public URL.
- Media picker shows only selected website media.
- Cross-website media assignment is rejected.
- Referenced media cannot be permanently deleted.
- Unused permanent delete removes the R2 object first and then hard deletes metadata.

## Milestone 6: Categories And Authors

Read first:

- `DATA_MODEL.md`
- `API_CONTRACTS.md`
- `USER_FLOWS.md`
- `TESTING.md`

Implement:

- Build category CRUD for selected website.
- Build author CRUD for selected website.
- Support author avatar selection from same-website media.
- Block inactive or trashed authors from new post selection.
- Block permanent author delete while posts reference the author unless reassignment is implemented.

Do not include:

- Tags.
- Author login accounts.
- Multiple authors per post.

Exit tests:

- Categories and authors are filtered by selected `website_id`.
- Duplicate category/author slugs are rejected within one website.
- Same slugs can exist across different websites.
- Cross-website author avatar assignment is rejected.
- Trashed or inactive authors do not appear in the post author picker.

## Milestone 7: Template Content

Read first:

- `DATA_MODEL.md`
- `API_CONTRACTS.md`
- `USER_FLOWS.md`
- `ARCHITECTURE.md`

Implement:

- Build fixed template content editing for supported template keys.
- Validate `content_data` against code-defined template schemas.
- Support SEO fields, OG image, sitemap include flag, internal admin preview, status, trash, restore, and permanent delete.
- Store image references by `mediaId`.
- Trigger revalidation after public-facing changes.

Do not include:

- Generic arbitrary pages.
- Page builder or layout builder.
- Public draft preview tokens.
- Future scheduling.

Exit tests:

- Template content is unique by `(website_id, template_key)`.
- Public reads return only published, non-trashed template content.
- Public template responses return resolved image objects.
- Draft/unpublished template content stays private.
- Revalidation runs after publish, unpublish, trash, permanent delete, SEO, and media changes used by public content.

## Milestone 8: Blog Posts

Read first:

- `DATA_MODEL.md`
- `API_CONTRACTS.md`
- `USER_FLOWS.md`
- `TESTING.md`

Implement:

- Build post CRUD for selected website.
- Require one same-website author and one same-website category.
- Support featured image, SEO fields, OG image, sitemap include flag, status, trash, restore, and permanent delete.
- Build structured body blocks: paragraph, heading, image, list, quote, link/button, TOC placeholder, FAQ, table, and callout.
- Store body image references by `mediaId`.
- Trigger revalidation after public-facing post, author, SEO, and media changes.

Do not include:

- Tags.
- Multiple categories per post.
- Multiple authors per post.
- Freeform HTML as the required storage model.
- Future scheduling.

Exit tests:

- Posts cannot save without `author_id`.
- Author, category, featured image, OG image, and body image blocks must belong to the selected website.
- Public post/list responses include author display data and resolved image objects.
- FAQ blocks produce data suitable for FAQ schema.
- Author changes affecting public posts trigger revalidation.

## Milestone 9: Redirects, Settings, Robots, And Sitemap

Read first:

- `DATA_MODEL.md`
- `API_CONTRACTS.md`
- `RLS_POLICIES.md`
- `USER_FLOWS.md`

Implement:

- Build redirect manager with 301/302 support.
- Build site settings, robots.txt, sitemap settings, SEO defaults, and revalidation webhook settings.
- Encrypt revalidation secrets with `CMS_ENCRYPTION_KEY`.
- Expose only safe settings through public RPCs/views.

Do not include:

- Public writes.
- Anon redirect hit tracking updates.
- Manual schema builder.

Exit tests:

- Duplicate redirect source paths are rejected per website.
- Redirect loops are rejected.
- Public reads return only active, non-trashed redirects.
- Revalidation secrets never return to public clients.
- Sitemap excludes drafts, unpublished content, trashed content, and disabled rows.

## Milestone 10: WordPress Import

Read first:

- `ARCHITECTURE.md`
- `DATA_MODEL.md`
- `API_CONTRACTS.md`
- `USER_FLOWS.md`

Implement:

- Build inactive-website-only import.
- Track progress and reports in `cms_import_jobs`.
- Support public WordPress REST import without credentials.
- Support optional WordPress username and application password for protected or incomplete REST data.
- Encrypt temporary credentials with `CMS_ENCRYPTION_KEY` only if a background import must persist them.
- Delete temporary WordPress credentials after import success, failure, or reset.
- Import known pages into template content.
- Import posts, categories, authors, featured images, inline images, and SEO metadata where available.
- Create or reuse website-scoped authors in `cms_authors`.
- Use fallback author `Imported Author` when WordPress author data is unavailable.
- Rewrite old WordPress image URLs to R2 public URLs.
- Implement import reset for inactive websites only.

Do not include:

- Active website import.
- Import into another website's resources.
- Generic page creation for unmatched pages.

Exit tests:

- Active website import is blocked.
- Public WordPress REST import works without credentials when source data is available.
- Optional WordPress application-password import works for protected REST data.
- WordPress credentials are never stored in `.env`, reports, public responses, or logs.
- Temporary encrypted WordPress credentials are cleared after import success, failure, or reset.
- Import job records progress, counts, skipped items, unmatched pages, failed media, and errors.
- Imported posts never save without `author_id`.
- Fallback author is created or reused when needed.
- Imported images are copied to R2 under the selected website prefix.
- Reset clears only the inactive selected website's scoped rows and imported R2 objects.

## Milestone 11: Public Website Integration

Read first:

- `ARCHITECTURE.md`
- `RLS_POLICIES.md`
- `API_CONTRACTS.md`
- `SETUP.md`

Implement:

- Public websites resolve their `website_id` by domain through public RPCs/views.
- Public websites fetch public-safe CMS data only.
- Public websites render returned image URLs and author data without service-role credentials.
- Public websites expose server-only revalidation endpoints.
- Public websites cache reads where appropriate and refresh after revalidation.

Do not include:

- Public website access to admin APIs.
- Public website access to R2 write credentials.
- Public website direct listing of R2.

Exit tests:

- Public website renders template content and posts for its own domain only.
- Browser downloads images from the custom R2 media domain.
- Public website has anon key only, not service-role key.
- Revalidation webhook requires the configured secret.
- Webhook failure is visible to admin but does not roll back saved content.

## Milestone 12: Quiz Isolation

Read first:

- `PROJECT_PLAN.md`
- `DECISIONS.md`
- `USER_FLOWS.md`
- Separate live quiz copy as reference if needed.

Implement:

- Port or rebuild the global quiz behavior without making it website-scoped.
- Keep quiz outside selected website context.
- Apply quiz-specific Karachi date rollover rules.
- Keep quiz storage and logic separate from website-scoped CMS modules.

Do not include:

- Website-scoped quiz behavior.
- Generic CMS scheduling for template content or posts.
- Moving quiz to Supabase unless scope changes later.

Exit tests:

- Quiz does not require selected `websiteId`.
- One quiz update applies globally.
- Visible quiz/page title follows current Karachi date.
- SEO/meta/schema date can roll over 6 hours early.
- Website-scoped CMS changes do not affect quiz behavior.

## Milestone 13: Final Hardening

Read first:

- `TESTING.md`
- `RLS_POLICIES.md`
- `SETUP.md`
- `INDEX.md`

Implement:

- Run full automated checks.
- Run manual admin and public website regression flows.
- Verify security boundaries for Supabase, R2, revalidation, and website scoping.
- Update docs if implementation changes any contract.

Do not include:

- New product scope.
- Deferred v1 exclusions.
- Untracked decisions.

Exit tests:

- `npm test` passes if available.
- `npm run lint` passes if available.
- `npm run build` passes.
- Public anon checks pass for all public RPCs/views.
- Cross-website content, author, media, redirect, and settings access is blocked.
- WordPress import, media, revalidation, public rendering, and quiz regression flows pass.
