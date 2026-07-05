# CMS Documentation Index

This folder is the source of truth for the single-admin multi-website CMS.

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
14. `SETUP.md`
15. `TESTING.md`

## Document Ownership

`PROJECT_PLAN.md` owns product scope, feature decisions, and v1 boundaries.

`DECISIONS.md` owns locked decisions and rejected ideas. If a future change reverses a decision, update this file and the affected contract docs.

`ARCHITECTURE.md` owns system boundaries, data flow, app/module separation, and how the admin CMS, public websites, Supabase, Supabase Storage, WordPress import, revalidation, and quiz fit together.

`DATA_MODEL.md` owns Supabase table contracts, fields, relationships, indexes, constraints, status rules, trash behavior, and Supabase Storage metadata.

`RLS_POLICIES.md` owns Supabase access rules, Data API settings, RLS expectations, public read safety, and service-role boundaries.

`API_CONTRACTS.md` owns admin route contracts, public RPC/view contracts, media contracts, import contracts, and revalidation webhook contracts.

`USER_FLOWS.md` owns the admin and public behavior flows from a user perspective.

`IMPLEMENTATION_GUIDE.md` owns build order, engineering rules, and how to keep context while implementing.

`IMPLEMENTATION_CONTEXT.md` owns implementation patterns, naming conventions, route/service/repository responsibilities, Supabase Storage helper contracts, environment validation expectations, and revalidation patterns.

`IMPLEMENTATION_MILESTONES.md` owns the milestone-by-milestone execution plan, including docs to read, implementation scope, out-of-scope warnings, and exit tests.

`MILESTONE_REVIEWS.md` owns completed milestone reviews, implementation history, caveats, follow-up items, and next-milestone handoff notes.

`IMPLEMENTATION_DETAILS.md` owns the current implemented file/module map, runtime flow, admin routes, storage behavior, caveats, and manual QA handoff after Milestones 1-13.

`public-site-integration/README.md` owns the helper contracts and wiring notes for later public website repository integration.

`SETUP.md` owns required project setup for Supabase, Supabase Storage, Vercel, environment variables, and local development.

`TESTING.md` owns acceptance tests, regression checks, and manual verification.

## Non-Negotiable Context

- One admin user only in v1.
- Admin login uses the existing `ADMIN_SECRET` session pattern.
- Website selection after login controls website-scoped CMS resources.
- `website_id` scopes template content, posts, authors, media, categories, redirects, SEO, sitemap, robots, AdSense, and settings.
- Authors are website-scoped blog profile records, not login users.
- Template content and blog posts do not support future scheduling in v1.
- Quiz remains global and separate from selected website context.
- Quiz storage contains only current quiz questions, publish state, and update timestamp.
- Quiz SEO/page metadata belongs to website template/settings data, not the quiz table.
- Public websites are separate apps and keep their own layouts/themes.
- Public websites read public-safe CMS data from Supabase through public read-only RPCs/views.
- Admin writes happen through server route handlers only.
- Supabase service-role key must never reach public websites or browser code.
- Media uses one Supabase Storage bucket with `websites/{website_id}/...` storage path prefixes.
- Tags, audit events, shared media, generic pages, page builder, public draft preview tokens, and revisions are not included in v1.

## Update Rule

When implementation changes a contract, update the smallest owning doc first. If the change alters product scope or a locked decision, also update `PROJECT_PLAN.md` and `DECISIONS.md`.

After each milestone is completed, update `MILESTONE_REVIEWS.md` before reporting the milestone as done. Before starting the next milestone, read the latest completed milestone review entry.
