# User Flows

## Login

1. Admin opens the admin CMS.
2. Admin enters `ADMIN_SECRET`.
3. App creates the existing admin session cookie.
4. Admin is redirected to website selection.

Failure states:

- invalid secret
- expired session

## Website Selection

1. Admin sees all configured websites.
2. Admin selects a website.
3. Admin is taken to the selected website dashboard.
4. Website-scoped routes include `websiteId` in the URL.

Expected behavior:

- selected website is visible in the admin shell
- switching website reloads website-scoped screens
- quiz remains available without selected website context

## Website Management

Create website:

1. Admin opens Website Management.
2. Admin enters name and primary domain.
3. CMS generates a unique slug.
4. CMS creates inactive website and primary domain row.
5. CMS creates or initializes default site settings.
6. Admin CMS `.env` does not change for the new website.

Deactivate website:

1. Admin confirms deactivation.
2. CMS sets `is_active = false`.
3. Public reads return no content for that website.
4. Associated resources remain stored.

Blocked states:

- duplicate domain
- invalid domain

Rules:

- website data is stored in `cms_websites`, `cms_website_domains`, `cms_site_settings`, and related website-scoped tables
- media for the website uses the shared R2 bucket under `websites/{website_id}/media/...`
- permanent website delete in v1

## WordPress Import

1. Admin selects an inactive website.
2. Admin enters WordPress base URL.
3. Admin optionally enters WordPress username and application password if public REST access is blocked or incomplete.
4. CMS tests WordPress REST API access.
5. CMS fetches WordPress REST API data.
6. CMS imports known pages into template content.
7. CMS imports posts into structured body blocks.
8. CMS imports categories and authors where available.
9. CMS copies images to R2.
10. CMS rewrites inline image URLs.
11. CMS tracks progress in an import job.
12. CMS deletes any temporary WordPress credentials after success or failure.
13. CMS shows import report.

Blocked states:

- website is active
- WordPress API unavailable
- invalid base URL
- invalid optional WordPress username/application password

Failure behavior:

- failed reset is allowed only for inactive websites
- reset clears that website's imported rows and R2 objects
- website row and domain setup remain
- WordPress credentials are never shown in reports or errors

## Template Content Editing

1. Admin selects website.
2. Admin opens Template Content.
3. Admin chooses a template: home, about, contact, privacy, terms, or packages.
4. Admin edits code-defined fields, links, image references, and SEO fields.
5. Admin saves draft, publishes, unpublishes, trashes, restores, or permanently deletes.

Expected behavior:

- no drag/drop layout editing
- no arbitrary page creation
- content schema validates before save
- image picker shows selected website media only
- future scheduling is not available for template content in v1
- publish triggers public revalidation

## Author Management

1. Admin selects website.
2. Admin opens Authors.
3. Admin creates, edits, trashes, restores, or permanently deletes author profiles.
4. Admin can add name, slug, bio, active state, and avatar image.

Expected behavior:

- authors are not login users
- author avatar image must belong to selected website
- author slug is unique within selected website
- same author slug can exist on different websites
- inactive or trashed authors are not selectable for new posts
- permanent delete is blocked while posts reference the author, unless posts are reassigned first

## Blog Post Editing

1. Admin selects website.
2. Admin opens Posts.
3. Admin creates or edits a post.
4. Admin selects one author.
5. Admin selects one category.
6. Admin selects featured image if needed.
7. Admin edits article body blocks.
8. Admin edits SEO fields.
9. Admin saves draft, publishes, unpublishes, trashes, restores, or permanently deletes.

Supported body blocks:

- paragraph
- heading
- image
- list
- quote
- link/button
- TOC placeholder
- FAQ
- table
- callout

Expected behavior:

- post page layout remains fixed on public website
- TOC is generated from heading blocks
- FAQ block can generate FAQ schema
- author picker shows selected website authors only
- same slug can exist on different websites
- duplicate slug is blocked within same website
- future scheduling is not available for posts in v1

## Media Library

1. Admin selects website.
2. Admin opens Media.
3. Admin uploads image.
4. Server validates file.
5. Server converts/compresses image to WebP.
6. Server uploads to R2 under `websites/{website_id}/media/...`.
7. CMS saves metadata row.
8. Admin can edit alt text/caption.
9. Admin can select image from template/post editors.

Delete behavior:

- trash hides media from public reads
- trash does not delete R2 object
- permanent delete checks usage first
- referenced media cannot be permanently deleted
- unused media deletes R2 object before hard deleting metadata row
- if R2 deletion fails, media remains trashed and admin sees an error

## Categories

1. Admin selects website.
2. Admin creates, edits, trashes, restores, or permanently deletes categories.
3. Posts can select one category.

Blocked states:

- duplicate slug within website
- deleting category used by posts without reassignment or explicit handling

## Redirects

1. Admin selects website.
2. Admin creates redirect with source path, destination, and type.
3. CMS validates 301 or 302.
4. CMS blocks duplicate source path within website.
5. CMS blocks redirect loops.
6. Public site applies active redirects.

V1 public websites do not update redirect hit tracking with anon credentials.

## SEO And Settings

Admin can edit:

- SEO title and meta description per template/post
- canonical override
- robots meta
- OG image
- sitemap include flag
- robots.txt per website
- sitemap settings
- SEO defaults

System handles:

- default canonical generation
- sitemap generation from published content
- Article schema for posts
- WebPage schema for template content
- FAQ schema from FAQ blocks

## Trash And Restore

1. Admin trashes a resource.
2. Resource disappears from public reads.
3. Admin can restore it.
4. Admin can permanently delete if rules allow it.

Website deactivation is separate from trash.

## Global Quiz

1. Admin opens `/admin/quiz`.
2. Website selection is not required.
3. Admin updates quiz.
4. One quiz update applies globally.

Expected behavior:

- quiz code stays isolated from CMS website-scoped logic
- website selection never filters quiz targets
- visible quiz/page title uses the current Karachi date
- SEO/meta/schema date can roll over 6 hours early
- quiz date rollover is not generic CMS page/post scheduling

## Public Website Read Flow

1. Public website loads page.
2. It calls Supabase public RPC/view with its domain.
3. Supabase resolves active website.
4. Supabase returns only published data for that website.
5. Public website renders with its own layout/theme.
6. Public website uses media URLs returned from CMS records.

Hidden from public:

- inactive websites
- draft content
- unpublished content
- trashed content
- another website's resources
