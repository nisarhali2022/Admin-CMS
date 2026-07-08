-- Publish-only cleanup:
-- - delete legacy non-published/hidden rows
-- - remove trash/status columns from active CMS resources
-- - replace partial unique indexes with full website-scoped unique indexes
-- - update public/admin functions so they no longer depend on removed columns

delete from public.cms_template_content
where status <> 'published' or deleted_at is not null;

delete from public.cms_pages
where status <> 'published' or deleted_at is not null;

delete from public.cms_posts
where status <> 'published' or deleted_at is not null;

delete from public.cms_posts p
where exists (
  select 1 from public.cms_authors a
  where a.id = p.author_id and a.deleted_at is not null
);

update public.cms_posts p
set category_id = null
where exists (
  select 1 from public.cms_categories c
  where c.id = p.category_id and c.deleted_at is not null
);

update public.cms_template_content t
set author_id = null
where exists (
  select 1 from public.cms_authors a
  where a.id = t.author_id and a.deleted_at is not null
);

update public.cms_pages p
set author_id = null
where exists (
  select 1 from public.cms_authors a
  where a.id = p.author_id and a.deleted_at is not null
);

update public.cms_authors a
set avatar_image_id = null
where exists (
  select 1 from public.cms_media m
  where m.id = a.avatar_image_id and m.deleted_at is not null
);

update public.cms_template_content t
set og_image_id = null
where exists (
  select 1 from public.cms_media m
  where m.id = t.og_image_id and m.deleted_at is not null
);

update public.cms_pages p
set featured_image_id = null
where exists (
  select 1 from public.cms_media m
  where m.id = p.featured_image_id and m.deleted_at is not null
);

update public.cms_posts p
set
  featured_image_id = case
    when exists (
      select 1 from public.cms_media m
      where m.id = p.featured_image_id and m.deleted_at is not null
    ) then null
    else featured_image_id
  end,
  og_image_id = case
    when exists (
      select 1 from public.cms_media m
      where m.id = p.og_image_id and m.deleted_at is not null
    ) then null
    else og_image_id
  end;

delete from storage.objects
where bucket_id = 'cms-media'
  and name in (
    select storage_path
    from public.cms_media
    where deleted_at is not null
  );

delete from public.cms_redirects where deleted_at is not null;
delete from public.cms_categories where deleted_at is not null;
delete from public.cms_authors where deleted_at is not null;
delete from public.cms_media where deleted_at is not null;

drop index if exists public.cms_categories_website_slug_active_key;
drop index if exists public.cms_authors_website_slug_active_key;
drop index if exists public.cms_template_content_website_path_active_key;
drop index if exists public.cms_template_content_website_status_idx;
drop index if exists public.cms_template_content_website_deleted_idx;
drop index if exists public.cms_posts_website_slug_active_key;
drop index if exists public.cms_posts_website_status_published_idx;
drop index if exists public.cms_posts_website_deleted_idx;
drop index if exists public.cms_redirects_website_from_path_active_key;
drop index if exists public.cms_media_website_deleted_idx;
drop index if exists public.cms_authors_website_deleted_idx;
drop index if exists public.cms_pages_website_path_active_key;
drop index if exists public.cms_pages_website_status_idx;
drop index if exists public.cms_pages_website_deleted_idx;

alter table public.cms_template_content
  drop constraint if exists cms_template_content_status_check;

alter table public.cms_posts
  drop constraint if exists cms_posts_status_check;

alter table public.cms_pages
  drop constraint if exists cms_pages_status_check;

create or replace function public.cms_public_image_object(media_id uuid, website_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'mediaId', m.id,
    'url', m.public_url,
    'alt', coalesce(nullif(m.alt_text, ''), m.original_filename),
    'caption', m.caption,
    'width', m.width,
    'height', m.height
  )
  from public.cms_media m
  where m.id = media_id
    and m.website_id = website_id;
$$;

create or replace function public.get_public_template_content(
  domain text,
  template_key text
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'templateKey', t.template_key,
    'path', t.path,
    'title', t.title,
    'contentData', public.cms_resolve_media_references(t.content_data, t.website_id),
    'author', case
      when a.id is null then null
      else jsonb_build_object(
        'name', a.name,
        'slug', a.slug,
        'bio', a.bio,
        'avatar', public.cms_public_image_object(a.avatar_image_id, t.website_id)
      )
    end,
    'seo', jsonb_build_object(
      'focusKeyphrase', t.focus_keyphrase,
      'title', t.seo_title,
      'metaDescription', t.meta_description,
      'canonicalUrl', t.canonical_url,
      'robotsMeta', t.robots_meta,
      'ogImage', public.cms_public_image_object(t.og_image_id, t.website_id),
      'sitemapInclude', t.sitemap_include
    ),
    'publishedAt', t.published_at
  )
  from public.cms_template_content t
  left join public.cms_authors a
    on a.id = t.author_id
    and a.website_id = t.website_id
    and a.is_active = true
  where t.website_id = public.cms_public_website_id($1)
    and t.template_key = $2;
$$;

create or replace function public.get_public_post(domain text, slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'title', p.title,
    'slug', p.slug,
    'excerpt', p.excerpt,
    'publishedAt', p.published_at,
    'author', jsonb_build_object(
      'name', a.name,
      'slug', a.slug,
      'bio', a.bio,
      'avatar', public.cms_public_image_object(a.avatar_image_id, p.website_id)
    ),
    'category', case
      when c.id is null then null
      else jsonb_build_object(
        'name', c.name,
        'slug', c.slug,
        'description', c.description
      )
    end,
    'featuredImage', public.cms_public_image_object(p.featured_image_id, p.website_id),
    'bodyBlocks', public.cms_resolve_media_references(p.body_blocks, p.website_id),
    'seo', jsonb_build_object(
      'title', p.seo_title,
      'metaDescription', p.meta_description,
      'canonicalUrl', p.canonical_url,
      'robotsMeta', p.robots_meta,
      'ogImage', public.cms_public_image_object(p.og_image_id, p.website_id),
      'sitemapInclude', p.sitemap_include
    )
  )
  from public.cms_posts p
  join public.cms_authors a
    on a.id = p.author_id
    and a.website_id = p.website_id
    and a.is_active = true
  left join public.cms_categories c
    on c.id = p.category_id
    and c.website_id = p.website_id
  where p.website_id = public.cms_public_website_id($1)
    and p.slug = $2;
$$;

create or replace function public.list_public_posts(
  domain text,
  category_slug text default null,
  search text default null,
  limit_count integer default 20,
  offset_count integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_website_id uuid := public.cms_public_website_id($1);
  safe_limit integer := least(greatest(coalesce(limit_count, 20), 1), 50);
  safe_offset integer := greatest(coalesce(offset_count, 0), 0);
  result jsonb;
begin
  if v_website_id is null then
    return '[]'::jsonb;
  end if;

  select coalesce(jsonb_agg(rows.post order by rows.published_at desc nulls last, rows.created_at desc), '[]'::jsonb)
  into result
  from (
    select
      p.published_at,
      p.created_at,
      jsonb_build_object(
        'title', p.title,
        'slug', p.slug,
        'excerpt', p.excerpt,
        'publishedAt', p.published_at,
        'author', jsonb_build_object(
          'name', a.name,
          'slug', a.slug,
          'bio', a.bio,
          'avatar', public.cms_public_image_object(a.avatar_image_id, p.website_id)
        ),
        'category', case
          when c.id is null then null
          else jsonb_build_object(
            'name', c.name,
            'slug', c.slug,
            'description', c.description
          )
        end,
        'featuredImage', public.cms_public_image_object(p.featured_image_id, p.website_id),
        'seo', jsonb_build_object(
          'title', p.seo_title,
          'metaDescription', p.meta_description,
          'canonicalUrl', p.canonical_url,
          'robotsMeta', p.robots_meta,
          'ogImage', public.cms_public_image_object(p.og_image_id, p.website_id),
          'sitemapInclude', p.sitemap_include
        )
      ) as post
    from public.cms_posts p
    join public.cms_authors a
      on a.id = p.author_id
      and a.website_id = p.website_id
      and a.is_active = true
    left join public.cms_categories c
      on c.id = p.category_id
      and c.website_id = p.website_id
    where p.website_id = v_website_id
      and (
        $2 is null
        or c.slug = $2
      )
      and (
        $3 is null
        or p.title ilike '%' || $3 || '%'
        or coalesce(p.excerpt, '') ilike '%' || $3 || '%'
      )
    order by p.published_at desc nulls last, p.created_at desc
    limit safe_limit
    offset safe_offset
  ) rows;

  return result;
end;
$$;

create or replace function public.list_public_categories(domain text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', c.name,
        'slug', c.slug,
        'description', c.description
      )
      order by c.name
    ),
    '[]'::jsonb
  )
  from public.cms_categories c
  where c.website_id = public.cms_public_website_id($1);
$$;

create or replace function public.list_public_authors(domain text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'name', a.name,
        'slug', a.slug,
        'bio', a.bio,
        'avatar', public.cms_public_image_object(a.avatar_image_id, a.website_id)
      )
      order by a.name
    ),
    '[]'::jsonb
  )
  from public.cms_authors a
  where a.website_id = public.cms_public_website_id($1)
    and a.is_active = true;
$$;

create or replace function public.list_public_redirects(domain text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'fromPath', r.from_path,
        'toUrl', r.to_url,
        'redirectType', r.redirect_type
      )
      order by r.from_path
    ),
    '[]'::jsonb
  )
  from public.cms_redirects r
  where r.website_id = public.cms_public_website_id($1)
    and r.is_active = true;
$$;

create or replace function public.get_public_page(domain text, page_path text)
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
  where p.website_id = public.cms_public_website_id($1)
    and p.path = case
      when left($2, 1) = '/' then $2
      else '/' || $2
    end;
$$;

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
    select 'author'::text as resource_type, a.id as resource_id, a.name as resource_label, 'avatarImageId'::text as field_name
    from public.cms_authors a
    where a.website_id = input_website_id
      and a.avatar_image_id = input_media_id

    union all
    select 'templateContent'::text, t.id, t.title, 'ogImageId'::text
    from public.cms_template_content t
    where t.website_id = input_website_id
      and t.og_image_id = input_media_id

    union all
    select 'templateContent'::text, t.id, t.title, 'contentData'::text
    from public.cms_template_content t
    where t.website_id = input_website_id
      and t.content_data::text like '%' || input_media_id::text || '%'

    union all
    select 'page'::text, p.id, p.title, 'featuredImageId'::text
    from public.cms_pages p
    where p.website_id = input_website_id
      and p.featured_image_id = input_media_id

    union all
    select 'post'::text, p.id, p.title, 'featuredImageId'::text
    from public.cms_posts p
    where p.website_id = input_website_id
      and p.featured_image_id = input_media_id

    union all
    select 'post'::text, p.id, p.title, 'ogImageId'::text
    from public.cms_posts p
    where p.website_id = input_website_id
      and p.og_image_id = input_media_id

    union all
    select 'post'::text, p.id, p.title, 'bodyBlocks'::text
    from public.cms_posts p
    where p.website_id = input_website_id
      and p.body_blocks::text like '%' || input_media_id::text || '%'
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

alter table public.cms_categories
  drop column if exists deleted_at;

alter table public.cms_media
  drop column if exists deleted_at;

alter table public.cms_authors
  drop column if exists deleted_at;

alter table public.cms_template_content
  drop column if exists status,
  drop column if exists deleted_at;

alter table public.cms_posts
  drop column if exists status,
  drop column if exists deleted_at;

alter table public.cms_redirects
  drop column if exists deleted_at;

alter table public.cms_pages
  drop column if exists status,
  drop column if exists deleted_at;

create unique index if not exists cms_categories_website_slug_key
  on public.cms_categories (website_id, slug);

create unique index if not exists cms_authors_website_slug_key
  on public.cms_authors (website_id, slug);

create unique index if not exists cms_template_content_website_path_key
  on public.cms_template_content (website_id, path);

create index if not exists cms_template_content_website_published_idx
  on public.cms_template_content (website_id, published_at);

create unique index if not exists cms_posts_website_slug_key
  on public.cms_posts (website_id, slug);

create index if not exists cms_posts_website_published_idx
  on public.cms_posts (website_id, published_at);

create unique index if not exists cms_redirects_website_from_path_key
  on public.cms_redirects (website_id, from_path);

create unique index if not exists cms_pages_website_path_key
  on public.cms_pages (website_id, path);

create index if not exists cms_pages_website_published_idx
  on public.cms_pages (website_id, published_at);

grant execute on function public.get_public_template_content(text, text) to anon;
grant execute on function public.get_public_post(text, text) to anon;
grant execute on function public.list_public_posts(text, text, text, integer, integer) to anon;
grant execute on function public.list_public_categories(text) to anon;
grant execute on function public.list_public_authors(text) to anon;
grant execute on function public.list_public_redirects(text) to anon;
grant execute on function public.get_public_page(text, text) to anon;
grant execute on function public.cms_admin_media_usage(uuid, uuid) to service_role;
