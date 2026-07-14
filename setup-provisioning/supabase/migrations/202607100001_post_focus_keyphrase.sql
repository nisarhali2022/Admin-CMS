alter table public.cms_posts
  add column if not exists focus_keyphrase text;

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

revoke all on function public.get_public_post(text, text) from PUBLIC, anon, authenticated;
grant execute on function public.get_public_post(text, text) to anon;

notify pgrst, 'reload schema';
