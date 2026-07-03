# RLS And Access Policies

This document defines Supabase access expectations for the CMS.

## Supabase Project Settings

Use these settings:

- Enable Data API: yes
- Automatically expose new tables: no
- Enable automatic RLS: yes

Automatic RLS only applies to tables created after the trigger/setting is active. Existing tables still need RLS enabled manually.

## Access Model

Admin CMS:

- Browser authenticates with existing `ADMIN_SECRET` session.
- Browser never receives Supabase service-role key.
- Admin route handlers use service role after session validation.
- Admin mutations validate selected `website_id` and ownership.

Public websites:

- Use Supabase anon key.
- Call public read-only RPCs/views.
- Never call admin route handlers.
- Never write CMS data.
- Never upload, delete, or list Supabase Storage objects.

## Table RLS Baseline

Enable RLS on all CMS tables:

- `cms_websites`
- `cms_website_domains`
- `cms_template_content`
- `cms_categories`
- `cms_authors`
- `cms_posts`
- `cms_media`
- `cms_redirects`
- `cms_import_jobs`
- `cms_site_settings`

Default posture:

- no direct public writes
- no broad direct public table reads unless explicitly needed
- service role bypasses RLS only from trusted server route handlers
- public access should happen through read-only RPCs/views

## Grants

Recommended grants:

- Grant `execute` on public read functions to `anon`.
- Grant `select` on safe public views to `anon` only if views are used instead of functions.
- Do not grant `insert`, `update`, or `delete` on CMS tables to `anon`.
- Do not grant direct admin-style table access to public roles.

## Public Read Rules

Every public read must enforce:

- website domain resolves to an active website
- returned rows match the resolved `website_id`
- inactive websites return no content

Resource-specific public visibility:

- Template content and posts require `status = 'published'` and `deleted_at is null`.
- Authors require `is_active = true` and `deleted_at is null`.
- Categories require `deleted_at is null`.
- Redirects require `is_active = true` and `deleted_at is null`.
- Site settings expose only safe public fields, including public AdSense fields.
- Media rows are returned only when referenced by public-safe content, authors, or settings for the same website.
- Import jobs are admin-only and never public.

Safe public AdSense fields are:

- `enabled`
- `publisherId`
- `autoAdsEnabled`
- `adsTxt`

Public settings functions must return AdSense as inactive when the saved publisher ID is missing or invalid. They must never expose revalidation secrets or service-only settings.

Recommended visibility condition for template content and post rows:

```sql
status = 'published'
and deleted_at is null
```

Recommended visibility condition for author rows:

```sql
is_active = true
and deleted_at is null
```

Recommended visibility condition for redirect rows:

```sql
is_active = true
and deleted_at is null
```

For websites:

```sql
cms_websites.is_active = true
```

## Public RPC/View Contracts

Public reads should be exposed through:

- `get_public_site_by_domain(domain text)`
- `get_public_template_content(domain text, template_key text)`
- `get_public_post(domain text, slug text)`
- `list_public_posts(domain text, category_slug text default null, search text default null, limit_count int default 20, offset_count int default 0)`
- `list_public_categories(domain text)`
- `list_public_authors(domain text)`
- `get_public_site_settings(domain text)`
- `list_public_redirects(domain text)`

Functions should be `security definer` only when needed and must set a safe `search_path`. They must not expose drafts, inactive websites, trashed rows, service-only fields, or revalidation secrets.

## Admin Server Access

Admin route handlers may use service role only after:

- `ADMIN_SECRET` session is valid
- website-scoped routes have a selected `website_id`
- requested resource belongs to selected `website_id`
- payload passes validators

Admin route handlers must reject:

- missing website context on website-scoped resources
- cross-website reads/writes/deletes
- assigning media from another website
- assigning authors from another website
- duplicate slugs within a website
- duplicate redirect paths within a website
- redirect loops
- invalid template content schema
- invalid post block schema
- attempts to update redirect hit tracking from public anon context

## RLS Testing Requirements

Test that anon reads cannot access:

- inactive websites
- draft template content
- draft posts
- unpublished content
- trashed content
- another website's content
- admin-only settings
- revalidation secrets

Test that anon cannot:

- insert CMS rows
- update CMS rows
- delete CMS rows
- list raw private data that should only be returned through safe RPCs/views

## Notes

RLS is not a replacement for route-handler validation. Use both:

- app validation for clear admin errors and ownership checks
- RLS/RPCs as database-level defense
