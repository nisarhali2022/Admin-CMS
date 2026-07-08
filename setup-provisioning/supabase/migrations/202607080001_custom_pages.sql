create table if not exists public.cms_pages (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.cms_websites (id) on delete restrict,
  title text not null,
  path text not null,
  body_text text not null default '',
  focus_keyphrase text,
  seo_title text,
  meta_description text,
  author_id uuid,
  canonical_url text,
  robots_meta text,
  featured_image_id uuid,
  sitemap_include boolean not null default true,
  status text not null default 'published',
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cms_pages_path_format check (path ~ '^/'),
  constraint cms_pages_home_reserved check (path <> '/'),
  constraint cms_pages_status_check check (status in ('draft', 'published', 'unpublished')),
  constraint cms_pages_author_same_website_fk foreign key (author_id, website_id)
    references public.cms_authors (id, website_id) on delete restrict,
  constraint cms_pages_featured_image_same_website_fk foreign key (featured_image_id, website_id)
    references public.cms_media (id, website_id) on delete restrict
);

create unique index if not exists cms_pages_website_path_active_key
  on public.cms_pages (website_id, path)
  where deleted_at is null;

create index if not exists cms_pages_website_status_idx
  on public.cms_pages (website_id, status);

create index if not exists cms_pages_website_author_idx
  on public.cms_pages (website_id, author_id);

create index if not exists cms_pages_website_deleted_idx
  on public.cms_pages (website_id, deleted_at);

drop trigger if exists cms_pages_set_updated_at on public.cms_pages;
create trigger cms_pages_set_updated_at
before update on public.cms_pages
for each row execute function public.cms_set_updated_at();

alter table public.cms_pages enable row level security;
revoke all privileges on table public.cms_pages from anon, authenticated;
grant select, insert, update, delete on table public.cms_pages to service_role;

create or replace function public.get_public_page(
  domain text,
  page_path text
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', p.id,
    'path', p.path,
    'title', p.title,
    'bodyText', p.body_text,
    'author', case
      when a.id is null then null
      else jsonb_build_object(
        'name', a.name,
        'slug', a.slug,
        'bio', a.bio,
        'avatar', public.cms_public_image_object(a.avatar_image_id, p.website_id)
      )
    end,
    'featuredImage', public.cms_public_image_object(p.featured_image_id, p.website_id),
    'seo', jsonb_build_object(
      'focusKeyphrase', p.focus_keyphrase,
      'title', p.seo_title,
      'metaDescription', p.meta_description,
      'canonicalUrl', p.canonical_url,
      'robotsMeta', p.robots_meta,
      'sitemapInclude', p.sitemap_include
    ),
    'publishedAt', p.published_at
  )
  from public.cms_pages p
  left join public.cms_authors a
    on a.id = p.author_id
    and a.website_id = p.website_id
    and a.is_active = true
    and a.deleted_at is null
  where p.website_id = public.cms_public_website_id($1)
    and p.path = case
      when left($2, 1) = '/' then $2
      else '/' || $2
    end
    and p.status = 'published'
    and p.deleted_at is null;
$$;

revoke all on function public.get_public_page(text, text) from PUBLIC, anon, authenticated;
grant execute on function public.get_public_page(text, text) to anon;

create or replace function public.cms_admin_media_usage(
  input_website_id uuid,
  input_media_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with usage_rows as (
    select
      'author'::text as resource_type,
      a.id as resource_id,
      a.name as resource_label,
      'avatarImageId'::text as field_name
    from public.cms_authors a
    where a.website_id = input_website_id
      and a.avatar_image_id = input_media_id
      and a.deleted_at is null

    union all

    select
      'templateContent'::text as resource_type,
      t.id as resource_id,
      t.title as resource_label,
      'ogImageId'::text as field_name
    from public.cms_template_content t
    where t.website_id = input_website_id
      and t.og_image_id = input_media_id
      and t.deleted_at is null

    union all

    select
      'templateContent'::text as resource_type,
      t.id as resource_id,
      t.title as resource_label,
      'contentData'::text as field_name
    from public.cms_template_content t
    where t.website_id = input_website_id
      and t.content_data::text like '%' || input_media_id::text || '%'
      and t.deleted_at is null

    union all

    select
      'page'::text as resource_type,
      p.id as resource_id,
      p.title as resource_label,
      'featuredImageId'::text as field_name
    from public.cms_pages p
    where p.website_id = input_website_id
      and p.featured_image_id = input_media_id
      and p.deleted_at is null

    union all

    select
      'post'::text as resource_type,
      p.id as resource_id,
      p.title as resource_label,
      'featuredImageId'::text as field_name
    from public.cms_posts p
    where p.website_id = input_website_id
      and p.featured_image_id = input_media_id
      and p.deleted_at is null

    union all

    select
      'post'::text as resource_type,
      p.id as resource_id,
      p.title as resource_label,
      'ogImageId'::text as field_name
    from public.cms_posts p
    where p.website_id = input_website_id
      and p.og_image_id = input_media_id
      and p.deleted_at is null

    union all

    select
      'post'::text as resource_type,
      p.id as resource_id,
      p.title as resource_label,
      'bodyBlocks'::text as field_name
    from public.cms_posts p
    where p.website_id = input_website_id
      and p.body_blocks::text like '%' || input_media_id::text || '%'
      and p.deleted_at is null
  )
  select jsonb_build_object(
    'mediaId', input_media_id,
    'referenced', exists (select 1 from usage_rows),
    'locations', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'resourceType', resource_type,
          'resourceId', resource_id,
          'resourceLabel', resource_label,
          'field', field_name
        )
        order by resource_type, resource_label, field_name
      ),
      '[]'::jsonb
    )
  )
  from usage_rows;
$$;

revoke all on function public.cms_admin_media_usage(uuid, uuid) from PUBLIC, anon, authenticated;
grant execute on function public.cms_admin_media_usage(uuid, uuid) to service_role;
