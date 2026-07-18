-- Reserve frontend-owned first-level paths at the database boundary.
-- Cross-resource collisions are additionally checked by CMS services because they
-- span pages, templates, and categories.

-- `NOT VALID` preserves existing imported records for review while enforcing
-- the guard on every newly inserted or changed row.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'cms_pages_public_route_not_reserved'
  ) then
    alter table public.cms_pages
      add constraint cms_pages_public_route_not_reserved
      check (path !~ '^/(api|admin|author|blog|search|tag)(/|$)') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cms_template_content_public_route_not_reserved'
  ) then
    alter table public.cms_template_content
      add constraint cms_template_content_public_route_not_reserved
      check (path !~ '^/(api|admin|author|blog|search|tag)(/|$)') not valid;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'cms_categories_public_route_not_reserved'
  ) then
    alter table public.cms_categories
      add constraint cms_categories_public_route_not_reserved
      check (slug !~ '^(api|admin|author|blog|search|tag)$') not valid;
  end if;
end;
$$;
