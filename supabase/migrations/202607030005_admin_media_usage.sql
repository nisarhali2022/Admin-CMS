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
