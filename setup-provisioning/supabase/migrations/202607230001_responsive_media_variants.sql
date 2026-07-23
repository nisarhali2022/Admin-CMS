-- Keep an image's original WebP canonical while allowing public frontends to
-- select smaller immutable derivatives for card, thumbnail, and mobile use.
alter table public.cms_media
  add column if not exists variants jsonb not null default '{}'::jsonb;

alter table public.cms_media
  drop constraint if exists cms_media_variants_object;

alter table public.cms_media
  add constraint cms_media_variants_object
  check (jsonb_typeof(variants) = 'object');

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
    'height', m.height,
    'variants', coalesce(m.variants, '{}'::jsonb)
  )
  from public.cms_media m
  where m.id = media_id
    and m.website_id = website_id
    and m.deleted_at is null;
$$;

revoke all on function public.cms_public_image_object(uuid, uuid)
from public, anon, authenticated;
