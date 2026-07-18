-- Additive public contracts for the WordPress-to-Supabase frontend cutover.
-- Existing RPCs intentionally remain available for already integrated public sites.

create or replace function public.list_public_posts_page(
  domain text,
  category_slug text default null,
  author_slug text default null,
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
  total_count bigint := 0;
  items jsonb := '[]'::jsonb;
begin
  if v_website_id is null then
    return jsonb_build_object('items', '[]'::jsonb, 'total', 0, 'hasMore', false);
  end if;

  select count(*)
    into total_count
  from public.cms_posts p
  join public.cms_authors a
    on a.id = p.author_id
    and a.website_id = p.website_id
    and a.is_active = true
  left join public.cms_categories c
    on c.id = p.category_id
    and c.website_id = p.website_id
  where p.website_id = v_website_id
    and p.status = 'published'
    and p.deleted_at is null
    and (c.id is null or c.deleted_at is null)
    and a.deleted_at is null
    and ($2 is null or c.slug = $2)
    and ($3 is null or a.slug = $3)
    and (
      $4 is null
      or p.title ilike '%' || $4 || '%'
      or coalesce(p.body_html, '') ilike '%' || $4 || '%'
    );

  select coalesce(
    jsonb_agg(rows.post order by rows.published_at desc nulls last, rows.created_at desc),
    '[]'::jsonb
  )
  into items
  from (
    select
      p.published_at,
      p.created_at,
      jsonb_build_object(
        'id', p.id,
        'title', p.title,
        'slug', p.slug,
        'publishedAt', p.published_at,
        'updatedAt', p.updated_at,
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
          'ogImage', public.cms_public_image_object(coalesce(p.og_image_id, p.featured_image_id), p.website_id),
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
      and p.status = 'published'
      and p.deleted_at is null
      and (c.id is null or c.deleted_at is null)
      and a.deleted_at is null
      and ($2 is null or c.slug = $2)
      and ($3 is null or a.slug = $3)
      and (
        $4 is null
        or p.title ilike '%' || $4 || '%'
        or coalesce(p.body_html, '') ilike '%' || $4 || '%'
      )
    order by p.published_at desc nulls last, p.created_at desc
    limit safe_limit
    offset safe_offset
  ) rows;

  return jsonb_build_object(
    'items', items,
    'total', total_count,
    'hasMore', safe_offset + jsonb_array_length(items) < total_count
  );
end;
$$;

create or replace function public.get_public_author(domain text, author_slug text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'name', a.name,
    'slug', a.slug,
    'bio', a.bio,
    'avatar', public.cms_public_image_object(a.avatar_image_id, a.website_id)
  )
  from public.cms_authors a
  where a.website_id = public.cms_public_website_id($1)
    and a.slug = $2
    and a.is_active = true
    and a.deleted_at is null;
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
        'description', c.description,
        'postCount', (
          select count(*)
          from public.cms_posts p
          join public.cms_authors a
            on a.id = p.author_id
            and a.website_id = p.website_id
            and a.is_active = true
          where p.website_id = c.website_id
            and p.category_id = c.id
            and p.status = 'published'
            and p.deleted_at is null
            and a.deleted_at is null
        )
      )
      order by c.name
    ),
    '[]'::jsonb
  )
  from public.cms_categories c
  where c.website_id = public.cms_public_website_id($1)
    and c.deleted_at is null;
$$;

create or replace function public.list_public_content_index(domain text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_website_id uuid := public.cms_public_website_id($1);
begin
  if v_website_id is null then
    return jsonb_build_object(
      'templates', '[]'::jsonb,
      'pages', '[]'::jsonb,
      'posts', '[]'::jsonb,
      'categories', '[]'::jsonb,
      'authors', '[]'::jsonb
    );
  end if;

  return jsonb_build_object(
    'templates', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'path', t.path,
        'updatedAt', t.updated_at,
        'sitemapInclude', t.sitemap_include,
        'image', public.cms_public_image_object(t.og_image_id, t.website_id)
      ) order by t.path), '[]'::jsonb)
      from public.cms_template_content t
      where t.website_id = v_website_id
        and t.status = 'published'
        and t.deleted_at is null
    ),
    'pages', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'path', p.path,
        'updatedAt', p.updated_at,
        'sitemapInclude', p.sitemap_include,
        'image', public.cms_public_image_object(p.featured_image_id, p.website_id)
      ) order by p.path), '[]'::jsonb)
      from public.cms_pages p
      where p.website_id = v_website_id
        and p.status = 'published'
        and p.deleted_at is null
    ),
    'posts', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'slug', p.slug,
        'categorySlug', c.slug,
        'updatedAt', p.updated_at,
        'sitemapInclude', p.sitemap_include,
        'image', public.cms_public_image_object(p.featured_image_id, p.website_id)
      ) order by p.published_at desc nulls last, p.created_at desc), '[]'::jsonb)
      from public.cms_posts p
      join public.cms_authors a on a.id = p.author_id and a.website_id = p.website_id and a.is_active = true
      join public.cms_categories c on c.id = p.category_id and c.website_id = p.website_id and c.deleted_at is null
      where p.website_id = v_website_id
        and p.status = 'published'
        and p.deleted_at is null
        and a.deleted_at is null
    ),
    'categories', (
      select coalesce(jsonb_agg(jsonb_build_object('slug', c.slug, 'path', '/' || c.slug) order by c.slug), '[]'::jsonb)
      from public.cms_categories c
      where c.website_id = v_website_id and c.deleted_at is null
    ),
    'authors', (
      select coalesce(jsonb_agg(jsonb_build_object('slug', a.slug, 'path', '/author/' || a.slug) order by a.slug), '[]'::jsonb)
      from public.cms_authors a
      where a.website_id = v_website_id and a.is_active = true and a.deleted_at is null
    )
  );
end;
$$;

revoke all on function public.list_public_posts_page(text, text, text, text, integer, integer) from PUBLIC, anon, authenticated;
revoke all on function public.get_public_author(text, text) from PUBLIC, anon, authenticated;
revoke all on function public.list_public_content_index(text) from PUBLIC, anon, authenticated;
grant execute on function public.list_public_posts_page(text, text, text, text, integer, integer) to anon;
grant execute on function public.get_public_author(text, text) to anon;
grant execute on function public.list_public_content_index(text) to anon;
revoke all on function public.list_public_categories(text) from PUBLIC, anon, authenticated;
grant execute on function public.list_public_categories(text) to anon;

notify pgrst, 'reload schema';
