alter table public.cms_posts
  add column if not exists body_html text;

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
    'bodyHtml', p.body_html,
    'bodyBlocks', public.cms_resolve_media_references(p.body_blocks, p.website_id),
    'seo', jsonb_build_object(
      'title', p.seo_title,
      'metaDescription', p.meta_description,
      'canonicalUrl', p.canonical_url,
      'robotsMeta', p.robots_meta,
      'ogImage', public.cms_public_image_object(coalesce(p.og_image_id, p.featured_image_id), p.website_id),
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
    select 'post'::text, p.id, p.title, 'bodyHtml'::text
    from public.cms_posts p
    where p.website_id = input_website_id
      and coalesce(p.body_html, '') like '%' || input_media_id::text || '%'

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
      ) filter (where resource_id is not null),
      '[]'::jsonb
    )
  )
  from usage_rows;
$$;

revoke all on function public.get_public_post(text, text) from PUBLIC, anon, authenticated;
revoke all on function public.cms_admin_media_usage(uuid, uuid) from PUBLIC, anon, authenticated;
grant execute on function public.get_public_post(text, text) to anon;
grant execute on function public.cms_admin_media_usage(uuid, uuid) to service_role;
