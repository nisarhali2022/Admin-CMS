alter table public.cms_websites enable row level security;
alter table public.cms_website_domains enable row level security;
alter table public.cms_template_content enable row level security;
alter table public.cms_categories enable row level security;
alter table public.cms_authors enable row level security;
alter table public.cms_posts enable row level security;
alter table public.cms_media enable row level security;
alter table public.cms_redirects enable row level security;
alter table public.cms_import_jobs enable row level security;
alter table public.cms_site_settings enable row level security;

revoke all privileges on table
  public.cms_websites,
  public.cms_website_domains,
  public.cms_template_content,
  public.cms_categories,
  public.cms_authors,
  public.cms_posts,
  public.cms_media,
  public.cms_redirects,
  public.cms_import_jobs,
  public.cms_site_settings
from anon, authenticated;

grant usage on schema public to anon;

create or replace function public.cms_normalize_public_domain(input_domain text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select nullif(
    split_part(
      regexp_replace(lower(trim(coalesce(input_domain, ''))), '^https?://', ''),
      '/',
      1
    ),
    ''
  );
$$;

create or replace function public.cms_public_website_id(input_domain text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with normalized as (
    select public.cms_normalize_public_domain(input_domain) as domain
  )
  select w.id
  from public.cms_websites w
  cross join normalized n
  where w.is_active = true
    and n.domain is not null
    and (
      w.primary_domain = n.domain
      or exists (
        select 1
        from public.cms_website_domains d
        where d.website_id = w.id
          and d.domain = n.domain
      )
    )
  limit 1;
$$;

create or replace function public.cms_try_uuid(input_value text)
returns uuid
language plpgsql
immutable
set search_path = public, pg_temp
as $$
begin
  return input_value::uuid;
exception
  when invalid_text_representation then
    return null;
end;
$$;

create or replace function public.cms_public_image_object(
  media_id uuid,
  website_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'url', m.public_url,
    'alt', coalesce(m.alt_text, ''),
    'caption', m.caption,
    'width', m.width,
    'height', m.height
  )
  from public.cms_media m
  where m.id = media_id
    and m.website_id = website_id
    and m.deleted_at is null;
$$;

create or replace function public.cms_resolve_media_references(
  input_value jsonb,
  website_id uuid
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  result jsonb;
  item record;
  resolved_image jsonb;
  resolved_media_id uuid;
begin
  if input_value is null then
    return null;
  end if;

  if jsonb_typeof(input_value) = 'object' then
    result := '{}'::jsonb;

    for item in
      select key, value
      from jsonb_each(input_value)
    loop
      if item.key <> 'mediaId' then
        result := result || jsonb_build_object(
          item.key,
          public.cms_resolve_media_references(item.value, website_id)
        );
      end if;
    end loop;

    if input_value ? 'mediaId' then
      resolved_media_id := public.cms_try_uuid(input_value ->> 'mediaId');
      resolved_image := public.cms_public_image_object(resolved_media_id, website_id);

      if resolved_image is not null then
        result := result || jsonb_build_object('image', resolved_image);
      end if;
    end if;

    return result;
  end if;

  if jsonb_typeof(input_value) = 'array' then
    select coalesce(jsonb_agg(resolved.value order by resolved.ordinality), '[]'::jsonb)
    into result
    from (
      select
        elements.ordinality,
        public.cms_resolve_media_references(elements.value, website_id) as value
      from jsonb_array_elements(input_value) with ordinality as elements(value, ordinality)
    ) resolved;

    return result;
  end if;

  return input_value;
end;
$$;

create or replace function public.cms_public_adsense_settings(settings jsonb)
returns jsonb
language plpgsql
stable
set search_path = public, pg_temp
as $$
declare
  is_enabled boolean := false;
  auto_ads_enabled boolean := true;
  publisher_id text := nullif(settings ->> 'publisherId', '');
  ads_txt text := nullif(settings ->> 'adsTxt', '');
begin
  if jsonb_typeof(settings -> 'enabled') = 'boolean' then
    is_enabled := (settings ->> 'enabled')::boolean;
  end if;

  if jsonb_typeof(settings -> 'autoAdsEnabled') = 'boolean' then
    auto_ads_enabled := (settings ->> 'autoAdsEnabled')::boolean;
  end if;

  if is_enabled and publisher_id ~ '^ca-pub-[0-9]+$' then
    return jsonb_build_object(
      'enabled', true,
      'publisherId', publisher_id,
      'autoAdsEnabled', auto_ads_enabled,
      'adsTxt', ads_txt
    );
  end if;

  return jsonb_build_object(
    'enabled', false,
    'publisherId', null,
    'autoAdsEnabled', auto_ads_enabled,
    'adsTxt', null
  );
end;
$$;

create or replace function public.get_public_site_by_domain(domain text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'websiteId', w.id,
    'name', w.name,
    'slug', w.slug,
    'primaryDomain', w.primary_domain
  )
  from public.cms_websites w
  where w.id = public.cms_public_website_id($1);
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
    'seo', jsonb_build_object(
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
  where t.website_id = public.cms_public_website_id($1)
    and t.template_key = $2
    and t.status = 'published'
    and t.deleted_at is null;
$$;

create or replace function public.get_public_post(
  domain text,
  slug text
)
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
    and a.deleted_at is null
  left join public.cms_categories c
    on c.id = p.category_id
    and c.website_id = p.website_id
    and c.deleted_at is null
  where p.website_id = public.cms_public_website_id($1)
    and p.slug = $2
    and p.status = 'published'
    and p.deleted_at is null;
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
      and a.deleted_at is null
    left join public.cms_categories c
      on c.id = p.category_id
      and c.website_id = p.website_id
      and c.deleted_at is null
    where p.website_id = v_website_id
      and p.status = 'published'
      and p.deleted_at is null
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
  where c.website_id = public.cms_public_website_id($1)
    and c.deleted_at is null;
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
    and a.is_active = true
    and a.deleted_at is null;
$$;

create or replace function public.get_public_site_settings(domain text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'robotsTxt', s.robots_txt,
    'sitemapSettings', coalesce(s.sitemap_settings, '{}'::jsonb),
    'seoDefaults', coalesce(s.seo_defaults, '{}'::jsonb),
    'siteConfig', coalesce(s.site_config, '{}'::jsonb),
    'adsense', public.cms_public_adsense_settings(coalesce(s.adsense_settings, '{}'::jsonb))
  )
  from public.cms_site_settings s
  where s.website_id = public.cms_public_website_id($1);
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
    and r.is_active = true
    and r.deleted_at is null;
$$;

revoke all on function public.cms_normalize_public_domain(text) from PUBLIC, anon, authenticated;
revoke all on function public.cms_public_website_id(text) from PUBLIC, anon, authenticated;
revoke all on function public.cms_try_uuid(text) from PUBLIC, anon, authenticated;
revoke all on function public.cms_public_image_object(uuid, uuid) from PUBLIC, anon, authenticated;
revoke all on function public.cms_resolve_media_references(jsonb, uuid) from PUBLIC, anon, authenticated;
revoke all on function public.cms_public_adsense_settings(jsonb) from PUBLIC, anon, authenticated;

revoke all on function public.get_public_site_by_domain(text) from PUBLIC, anon, authenticated;
revoke all on function public.get_public_template_content(text, text) from PUBLIC, anon, authenticated;
revoke all on function public.get_public_post(text, text) from PUBLIC, anon, authenticated;
revoke all on function public.list_public_posts(text, text, text, integer, integer) from PUBLIC, anon, authenticated;
revoke all on function public.list_public_categories(text) from PUBLIC, anon, authenticated;
revoke all on function public.list_public_authors(text) from PUBLIC, anon, authenticated;
revoke all on function public.get_public_site_settings(text) from PUBLIC, anon, authenticated;
revoke all on function public.list_public_redirects(text) from PUBLIC, anon, authenticated;

grant execute on function public.get_public_site_by_domain(text) to anon;
grant execute on function public.get_public_template_content(text, text) to anon;
grant execute on function public.get_public_post(text, text) to anon;
grant execute on function public.list_public_posts(text, text, text, integer, integer) to anon;
grant execute on function public.list_public_categories(text) to anon;
grant execute on function public.list_public_authors(text) to anon;
grant execute on function public.get_public_site_settings(text) to anon;
grant execute on function public.list_public_redirects(text) to anon;
