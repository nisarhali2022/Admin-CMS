-- Remove the retired CMS post excerpt field and rebuild public post RPCs first.
-- This migration is safe for both fresh and already-provisioned databases.

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
    'bodyHtml', p.body_html,
    'bodyBlocks', public.cms_resolve_media_references(p.body_blocks, p.website_id),
    'seo', jsonb_build_object(
      'focusKeyphrase', p.focus_keyphrase,
      'title', p.seo_title,
      'metaDescription', p.meta_description,
      'canonicalUrl', p.canonical_url,
      'robotsMeta', p.robots_meta,
      'ogImage', public.cms_public_image_object(coalesce(p.og_image_id, p.featured_image_id), p.website_id),
      'sitemapInclude', p.sitemap_include
    ),
    'updatedAt', p.updated_at
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
      and ($2 is null or c.slug = $2)
      and ($3 is null or p.title ilike '%' || $3 || '%')
    order by p.published_at desc nulls last, p.created_at desc
    limit safe_limit
    offset safe_offset
  ) rows;

  return result;
end;
$$;

alter table public.cms_posts
  drop column if exists excerpt;

revoke all on function public.get_public_post(text, text) from PUBLIC, anon, authenticated;
grant execute on function public.get_public_post(text, text) to anon;
revoke all on function public.list_public_posts(text, text, text, integer, integer) from PUBLIC, anon, authenticated;
grant execute on function public.list_public_posts(text, text, text, integer, integer) to anon;

notify pgrst, 'reload schema';
