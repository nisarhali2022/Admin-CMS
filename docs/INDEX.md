# CMS Documentation Index

This folder is the source of truth for the single-admin multi-website CMS.

The 2026-07-16 local SEO/content-quality follow-up and six-hour SEO/midnight visible Home-date behavior are documented in the API contracts, data model, RLS, testing plan, implementation details, public-integration guide, change log, and milestone reviews.

## Production cutover

- `FRONTEND_WORDPRESS_TO_SUPABASE_MIGRATION.md` owns the Supabase-only public
  deployment handoff and canonical-origin rules.
- `public-site-integration/README.md` owns the global Quiz webhook contract.
- `TESTING.md` owns the global Quiz freshness verification.

Read the docs in this order:

1. `PROJECT_PLAN.md`
2. `DECISIONS.md`
3. `ARCHITECTURE.md`
4. `DATA_MODEL.md`
5. `RLS_POLICIES.md`
6. `API_CONTRACTS.md`
7. `USER_FLOWS.md`
8. `IMPLEMENTATION_GUIDE.md`
9. `IMPLEMENTATION_CONTEXT.md`
10. `IMPLEMENTATION_MILESTONES.md`
11. `MILESTONE_REVIEWS.md`
12. `IMPLEMENTATION_DETAILS.md`
13. `public-site-integration/README.md`
14. `FRONTEND_WORDPRESS_TO_SUPABASE_MIGRATION.md`
15. `SETUP.md`
16. `TESTING.md`
17. `migration-baseline.md`

## Document Ownership

`PROJECT_PLAN.md` owns product scope, feature decisions, and v1 boundaries.

`DECISIONS.md` owns locked decisions and rejected ideas. If a future change reverses a decision, update this file and the affected contract docs.

`ARCHITECTURE.md` owns system boundaries, data flow, app/module separation, and how the admin CMS, public websites, Supabase, Supabase Storage, WordPress import, revalidation, and quiz fit together.

`DATA_MODEL.md` owns Supabase table contracts, fields, relationships, indexes, constraints, publish-only content rules, permanent-delete behavior, and Supabase Storage metadata.

`RLS_POLICIES.md` owns Supabase access rules, Data API settings, RLS expectations, public read safety, and service-role boundaries.

`API_CONTRACTS.md` owns admin route contracts, public RPC/view contracts, media contracts, import contracts, and revalidation webhook contracts.

`USER_FLOWS.md` owns the admin and public behavior flows from a user perspective.

`IMPLEMENTATION_GUIDE.md` owns build order, engineering rules, and how to keep context while implementing.

`IMPLEMENTATION_CONTEXT.md` owns implementation patterns, naming conventions, route/service/repository responsibilities, Supabase Storage helper contracts, environment validation expectations, and revalidation patterns.

`IMPLEMENTATION_MILESTONES.md` owns the milestone-by-milestone execution plan, including docs to read, implementation scope, out-of-scope warnings, and exit tests.

`MILESTONE_REVIEWS.md` owns completed milestone reviews, implementation history, caveats, follow-up items, and next-milestone handoff notes.

`IMPLEMENTATION_DETAILS.md` owns the current implemented file/module map, runtime flow, admin routes, storage behavior, caveats, and manual QA handoff after Milestones 1-13.

`public-site-integration/README.md` owns the helper contracts and wiring notes for later public website repository integration.

`FRONTEND_WORDPRESS_TO_SUPABASE_MIGRATION.md` owns the reusable direct-cutover process for replacing WordPress REST reads in a public Next.js website with Supabase public RPC reads.

Homepage and sidebar post-display behavior is documented in the frontend migration guide, public integration README, implementation details, and testing checklist. It uses a newest-30 candidate pool, two fixed newest Latest News cards plus four rotating cards, five newest Recent Posts, and five non-overlapping rotating Popular Posts.

Original WordPress publication-date preservation and the repair utility are documented in the same public-integration, migration, implementation, and testing documents. `published_at` is the source publication date used by every newest-first public list.

Public post-list cards receive a derived `readingTimeMinutes` value instead of full article HTML. This keeps archive, Home, search, and sidebar payloads small while preserving accurate per-post reading-time labels.

Contact, legal-page, canonical URL, and robots-default behavior is documented in `IMPLEMENTATION_DETAILS.md`, `TESTING.md`, the public-site integration README, and the migration guide. Canonical overrides are optional; `index,follow` is the saved default for Posts, custom Pages, and fixed Templates.

Custom CMS Pages use the Privacy-style legal-page layout rather than the blog-post layout, without a last-updated date. The frontend creates the full canonical URL from its configured public origin unless an explicit override is entered; the CMS editor keeps the override input uncluttered.

`SETUP.md` owns required project setup for Supabase, Supabase Storage, Vercel, environment variables, and local development.

`TESTING.md` owns acceptance tests, regression checks, and manual verification.

`migration-baseline.md` owns the route, count, media, redirect, and rollback inventory used to approve the public cutover.

## Non-Negotiable Context

- One admin user only in v1.
- Admin login uses the existing `ADMIN_SECRET` session pattern.
- Website selection after login controls website-scoped CMS resources.
- `website_id` scopes template content, posts, authors, media, categories, redirects, SEO, sitemap, robots, AdSense, and settings.
- Authors are website-scoped blog profile records, not login users.
- Template content and blog posts do not support future scheduling in v1.
- Quiz remains global and separate from selected website context.
- Quiz storage contains only current quiz questions, publish state, and update timestamp.
- Quiz accepts 5 to 10 ordered questions; public website quiz components render the complete returned array.
- Quiz SEO/page metadata belongs to website template/settings data, not the quiz table.
- Public websites are separate apps and keep their own layouts/themes.
- Public websites read public-safe CMS data from Supabase through public read-only RPCs/views.
- Admin writes happen through server route handlers only.
- Supabase service-role key must never reach public websites or browser code.
- Media uses one Supabase Storage bucket with `websites/{website_id}/...` storage path prefixes.
- Dashboard shared storage usage lists `cms-media` only through an authenticated server route and uses `SUPABASE_STORAGE_QUOTA_BYTES` as an estimate.
- Tags, audit events, shared media, page builder, public draft preview tokens, draft/unpublish/trash/restore workflows, and revisions are not included in v1.

## Update Rule

The reference frontend uses `https://telenorquiztoday.com.pk` as its single crawler-facing origin. `CMS_SITE_DOMAIN` remains a local CMS content-selection setting only; it must not appear in public canonicals, JSON-LD, robots, or sitemaps. See the migration guide and public-site integration README for caching, headers, CSP report-only, redirect exclusions, and image-dimension audit details.

When implementation changes a contract, update the smallest owning doc first. If the change alters product scope or a locked decision, also update `PROJECT_PLAN.md` and `DECISIONS.md`.

After each milestone is completed, update `MILESTONE_REVIEWS.md` before reporting the milestone as done. Before starting the next milestone, read the latest completed milestone review entry.
