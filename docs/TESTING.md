# CMS Testing Plan

Testing should prove website scoping, public read safety, media isolation, import behavior, and quiz isolation.

## Required Commands

Run before merging implementation changes:

```powershell
npm test
npm run lint
npm run build
```

If a command is not available yet, add it or document the gap in the implementation task.

## Admin Auth

Test:

- valid `ADMIN_SECRET` creates admin session
- invalid secret is rejected
- protected admin pages require session
- admin API routes require session
- service-role operations are only called from server route handlers

## Setup Project Website Management

Test:

- website creation in `setup-provisioning/` requires name and primary domain
- website slug is generated automatically
- duplicate domain is rejected
- new websites start inactive
- website creation creates default site settings
- adding a website requires no admin CMS `.env` change
- website deactivation hides public content
- deactivation keeps associated resources
- permanent website delete is not available in v1

Main CMS test:

- website listing/detail endpoints are read-only
- website dropdown loads existing setup-created websites
- main CMS does not expose add/edit/deactivate website UI or API routes

## Website Scoping

Test:

- selected website appears in URL as `websiteId`
- template content list filters by `website_id`
- posts list filters by `website_id`
- media list filters by `website_id`
- categories list filters by `website_id`
- authors list filters by `website_id`
- redirects list filters by `website_id`
- settings load by `website_id`
- edit/delete rejects cross-website resource IDs
- same post slug can exist on different websites
- duplicate post slug is rejected within the same website
- duplicate template key is rejected within the same website

## Template Content

Test:

- supported template keys are accepted
- unsupported template keys are rejected
- `content_data` schema is validated
- image references must belong to the selected website
- saved template content appears in public reads for active websites
- scheduled status/payloads are rejected for template content in v1
- sitemap include flag is respected

## Blog Posts

Test:

- one category is required per post for category-based public URLs
- one author per post
- multiple category payloads are rejected if attempted
- post author must belong to selected website
- inactive authors are not selectable for new posts
- post `body_html` is sanitized and validated for safe editor output
- legacy post `body_blocks` schema is still validated for fallback/import content
- public reads expose `bodyHtml` and fallback `bodyBlocks`
- TOC placeholder generates entries from heading blocks
- FAQ block can be used for FAQ schema
- featured image must belong to selected website
- OG image must belong to selected website
- scheduled status/payloads are rejected for posts in v1
- saved posts appear in public reads for active websites

## Authors

Test:

- author can be created, edited, and permanently deleted
- author slug is unique within website
- same author slug can exist on different websites
- avatar image must belong to selected website
- author picker only shows active authors for selected website
- cross-website author assignment is rejected
- referenced author permanent delete is blocked unless posts are reassigned first
- authors are not login users

## Media And Supabase Storage

Test:

- image upload validates type and size
- upload converts/compresses to WebP
- Supabase Storage path uses `websites/{website_id}/media/{yyyy}/{mm}/{uuid}.webp`
- public WebP uploads include Supabase Storage `cacheControl: '31536000'`
- image replacement creates a new UUID storage path instead of overwriting an existing public URL
- Supabase Storage public URLs stay cacheable for immutable public assets
- media metadata row stores website ID, storage path, public URL, alt text, dimensions, MIME type, file size, and source
- media picker only shows selected website media
- cross-website media assignment is rejected
- media delete checks usage
- referenced media cannot be deleted
- unused media delete removes Supabase Storage object before metadata
- Supabase Storage deletion failure keeps the media row and returns an error
- Media Library search filters automatically from input changes without a manual submit button
- Media Library row checkboxes and select-all checkbox select currently visible media rows
- Media Library bulk `Delete selected` calls the existing media delete endpoint for each selected row
- Media Library bulk delete clears selection, reloads media, and reports success/failure counts
- Media Library keeps the `Usage` action visible and usage results render in the Actions cell
- public websites receive media URLs from Supabase data and never upload, delete, or list Supabase Storage objects
- public template/post reads return resolved image objects, not unresolved `mediaId` values
- public image objects include URL, alt text, caption, width, and height when available

## Categories

Test:

- category slug is unique within website
- same category slug can exist on different websites
- category delete behavior is safe when posts reference it
- referenced categories cannot be deleted unless reassignment or explicit handling is implemented

## Redirects

Test:

- 301 redirect can be created
- 302 redirect can be created
- duplicate source path is rejected within website
- same source path can exist on different websites
- redirect loops are rejected
- inactive redirects are hidden from public redirect reads
- public anon clients cannot update redirect hit tracking fields

## SEO, Robots, Sitemap

Test:

- SEO title and meta description save for templates and posts
- canonical override saves and returns publicly
- default canonical is generated from domain and path/slug
- robots meta saves
- OG image belongs to selected website
- sitemap includes rows with include flag enabled
- sitemap excludes inactive websites and disabled include flag rows
- robots.txt is loaded per website

## AdSense Settings

Test:

- new website creates inactive AdSense settings by default
- admin can save AdSense publisher ID, auto-ads preference, and optional `ads.txt`
- admin cannot enable AdSense without a valid `ca-pub-...` publisher ID
- disabling AdSense preserves saved values
- public settings return inactive AdSense behavior when disabled
- public website does not render AdSense script when inactive
- public website renders AdSense script when active and configured
- `/ads.txt` returns configured text only when AdSense is active and configured
- AdSense setting changes trigger revalidation

## Public Reads And RLS

Test with anon credentials:

- public domain lookup returns active website only
- inactive website returns no public content
- public template read returns only matching website content
- public post read returns only matching website content
- public post list filters by website
- public categories filter by website
- public authors filter by website
- public settings expose only safe fields
- public settings expose only safe AdSense fields
- another website's content is inaccessible
- anon cannot insert/update/delete CMS rows
- revalidation secrets are never returned

## Setup Project WordPress Import

Test:

- import in `setup-provisioning/` is blocked for active websites
- import is allowed for inactive websites
- import creates/updates an import job row
- import works without WordPress credentials when public REST data is available
- optional WordPress username/application password works when REST data is protected
- WordPress import credentials are never stored in `.env`
- temporary encrypted WordPress credentials are cleared after success, failure, or reset
- import reports, errors, public responses, and logs never include WordPress credentials
- known fixed pages map to template keys
- unmatched WordPress pages import into `cms_pages` or are reported with a skipped reason
- posts import into `cms_posts`
- WordPress content converts to `body_html` where practical, with compatible `body_blocks` fallback when needed
- categories import per website
- authors import or fallback author records are created per website when available/needed
- import creates or selects website-scoped authors for posts
- missing WordPress author data uses fallback author `Imported Author`
- missing WordPress category data uses fallback category `Uncategorized`
- imported posts are rejected or skipped if no `author_id` can be assigned
- import job rows are admin-only and not exposed to public reads
- featured images copy to Supabase Storage
- inline images copy to Supabase Storage
- old inline image URLs rewrite to Supabase Storage public URLs
- Yoast/RankMath SEO imports when available
- fallback SEO uses WordPress title/excerpt/featured image
- import report includes imported, skipped, unmatched, failed media, and errors
- failed import reset clears only inactive website scoped rows
- failed import reset deletes only that inactive website's Supabase Storage objects
- main CMS does not expose WordPress import UI or API routes

## Revalidation

Test:

- save triggers public website revalidation
- permanent delete triggers revalidation
- redirect changes trigger revalidation
- SEO/settings changes trigger revalidation
- AdSense changes trigger revalidation
- media changes affecting public rendering trigger revalidation
- author changes affecting public posts trigger revalidation
- webhook secret is required
- webhook failure is surfaced but does not roll back saved content

## Quiz

Test:

- `/admin/quiz` does not require selected website
- `/admin/quiz` hides the left sidebar
- Quiz appears in the top header, not the left sidebar
- website selection does not filter quiz targets
- typing option text does not auto-select the answer
- clicking an option selector chooses the answer
- one quiz update applies globally
- quiz code stays isolated from CMS website-scoped modules
- quiz storage contains only current quiz questions, publish state, and update timestamp
- quiz table does not store title, slug, description, visible date, SEO date, or page metadata
- homepage/page SEO remains in website template/settings data

## Manual Regression Checklist

Before considering v1 ready:

- create two websites in `setup-provisioning/`
- import content in `setup-provisioning/` or create content in the main CMS
- verify Website A never sees Website B content/media
- verify Website A never sees Website B authors
- publish posts and templates
- verify public reads show only public-safe CMS data
- upload media to both websites
- verify Supabase Storage paths use different website ID prefixes
- attempt cross-website media assignment and confirm rejection
- attempt cross-website author assignment and confirm rejection
- deactivate one website and confirm public reads hide it
- update global quiz and confirm it is not website-scoped
