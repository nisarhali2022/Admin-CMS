alter table public.cms_media
  drop constraint if exists cms_media_storage_path_format;

alter table public.cms_media
  add constraint cms_media_storage_path_format
  check (
    storage_path ~ '^websites/[0-9a-f-]{36}/media/[0-9]{4}/[0-9]{2}/[A-Za-z0-9][A-Za-z0-9_-]*\.webp$'
  );

notify pgrst, 'reload schema';
