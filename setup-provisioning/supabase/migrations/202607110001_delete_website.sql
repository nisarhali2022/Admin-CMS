create or replace function public.cms_admin_delete_website(input_website_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_website public.cms_websites;
begin
  select *
  into target_website
  from public.cms_websites
  where id = input_website_id
  for update;

  if target_website.id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Website not found.';
  end if;

  if target_website.is_active then
    raise exception using
      errcode = 'P0001',
      message = 'Only inactive websites can be permanently deleted.';
  end if;

  delete from public.cms_posts where website_id = input_website_id;
  delete from public.cms_pages where website_id = input_website_id;
  delete from public.cms_template_content where website_id = input_website_id;
  delete from public.cms_authors where website_id = input_website_id;
  delete from public.cms_categories where website_id = input_website_id;
  delete from public.cms_media where website_id = input_website_id;
  delete from public.cms_redirects where website_id = input_website_id;
  delete from public.cms_import_jobs where website_id = input_website_id;
  delete from public.cms_site_settings where website_id = input_website_id;
  delete from public.cms_website_domains where website_id = input_website_id;
  delete from public.cms_websites where id = input_website_id;

  return jsonb_build_object(
    'deleted', true,
    'websiteId', input_website_id
  );
end;
$$;

revoke all on function public.cms_admin_delete_website(uuid) from public, anon, authenticated;
grant execute on function public.cms_admin_delete_website(uuid) to service_role;
