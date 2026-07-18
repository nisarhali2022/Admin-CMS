-- Publish records that were created by a completed WordPress import.
-- Import jobs require an inactive website, so this only corrects content that
-- the importer itself created while a migration was in progress.

with wordpress_import_windows as (
  select website_id, started_at, finished_at
  from public.cms_import_jobs
  where source_type = 'wordpress'
    and status = 'succeeded'
    and started_at is not null
    and finished_at is not null
),
published_posts as (
  update public.cms_posts p
  set
    status = 'published',
    published_at = coalesce(p.published_at, p.created_at, now())
  from wordpress_import_windows w
  where p.website_id = w.website_id
    and p.status = 'draft'
    and p.deleted_at is null
    and p.created_at >= w.started_at
    and p.created_at <= w.finished_at
  returning p.id
),
published_pages as (
  update public.cms_pages p
  set
    status = 'published',
    published_at = coalesce(p.published_at, p.created_at, now())
  from wordpress_import_windows w
  where p.website_id = w.website_id
    and p.status = 'draft'
    and p.deleted_at is null
    and p.created_at >= w.started_at
    and p.created_at <= w.finished_at
  returning p.id
),
published_templates as (
  update public.cms_template_content t
  set
    status = 'published',
    published_at = coalesce(t.published_at, t.created_at, now())
  from wordpress_import_windows w
  where t.website_id = w.website_id
    and t.status = 'draft'
    and t.deleted_at is null
    and t.created_at >= w.started_at
    and t.created_at <= w.finished_at
  returning t.id
)
select
  (select count(*) from published_posts) as posts_published,
  (select count(*) from published_pages) as pages_published,
  (select count(*) from published_templates) as templates_published;

notify pgrst, 'reload schema';
