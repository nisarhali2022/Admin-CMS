create or replace function public.cms_slugify(input_value text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select coalesce(
    nullif(
      trim(
        both '-'
        from regexp_replace(
          regexp_replace(lower(trim(coalesce(input_value, ''))), '[^a-z0-9]+', '-', 'g'),
          '-+',
          '-',
          'g'
        )
      ),
      ''
    ),
    'website'
  );
$$;

create or replace function public.cms_validate_domain(input_domain text)
returns text
language plpgsql
immutable
set search_path = public, pg_temp
as $$
declare
  normalized_domain text := public.cms_normalize_public_domain(input_domain);
begin
  if normalized_domain is null
    or normalized_domain !~ '^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$'
  then
    raise exception 'Invalid website domain.' using errcode = '22023';
  end if;

  return normalized_domain;
end;
$$;

create or replace function public.cms_admin_website_json(website_row public.cms_websites)
returns jsonb
language sql
stable
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'id', website_row.id,
    'name', website_row.name,
    'slug', website_row.slug,
    'primaryDomain', website_row.primary_domain,
    'isActive', website_row.is_active,
    'createdAt', website_row.created_at,
    'updatedAt', website_row.updated_at
  );
$$;

create or replace function public.cms_admin_create_website(
  input_name text,
  input_primary_domain text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  website_name text := nullif(trim(coalesce(input_name, '')), '');
  normalized_domain text := public.cms_validate_domain(input_primary_domain);
  base_slug text;
  candidate_slug text;
  suffix integer := 1;
  created_website public.cms_websites;
begin
  if website_name is null then
    raise exception 'Website name is required.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.cms_websites w
    where w.primary_domain = normalized_domain
  ) or exists (
    select 1
    from public.cms_website_domains d
    where d.domain = normalized_domain
  ) then
    raise exception 'Website domain already exists.' using errcode = '23505';
  end if;

  base_slug := public.cms_slugify(website_name);
  candidate_slug := base_slug;

  while exists (
    select 1
    from public.cms_websites w
    where w.slug = candidate_slug
  ) loop
    suffix := suffix + 1;
    candidate_slug := base_slug || '-' || suffix::text;
  end loop;

  insert into public.cms_websites (
    name,
    slug,
    primary_domain,
    is_active
  )
  values (
    website_name,
    candidate_slug,
    normalized_domain,
    false
  )
  returning * into created_website;

  insert into public.cms_website_domains (
    website_id,
    domain,
    is_primary
  )
  values (
    created_website.id,
    normalized_domain,
    true
  );

  insert into public.cms_site_settings (website_id)
  values (created_website.id)
  on conflict (website_id) do nothing;

  return public.cms_admin_website_json(created_website);
end;
$$;

create or replace function public.cms_admin_update_website(
  input_website_id uuid,
  input_name text,
  input_primary_domain text,
  input_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  current_website public.cms_websites;
  next_name text;
  next_domain text;
  next_active boolean;
  updated_website public.cms_websites;
begin
  select *
  into current_website
  from public.cms_websites w
  where w.id = input_website_id;

  if current_website.id is null then
    raise exception 'Website not found.' using errcode = 'P0002';
  end if;

  next_name := coalesce(nullif(trim(coalesce(input_name, '')), ''), current_website.name);
  next_domain := case
    when input_primary_domain is null then current_website.primary_domain
    else public.cms_validate_domain(input_primary_domain)
  end;
  next_active := coalesce(input_is_active, current_website.is_active);

  if next_domain <> current_website.primary_domain and (
    exists (
      select 1
      from public.cms_websites w
      where w.primary_domain = next_domain
        and w.id <> current_website.id
    ) or exists (
      select 1
      from public.cms_website_domains d
      where d.domain = next_domain
        and d.website_id <> current_website.id
    )
  ) then
    raise exception 'Website domain already exists.' using errcode = '23505';
  end if;

  update public.cms_websites
  set
    name = next_name,
    primary_domain = next_domain,
    is_active = next_active
  where id = current_website.id
  returning * into updated_website;

  update public.cms_website_domains
  set is_primary = false
  where website_id = updated_website.id;

  insert into public.cms_website_domains (
    website_id,
    domain,
    is_primary
  )
  values (
    updated_website.id,
    next_domain,
    true
  )
  on conflict (domain) do update set
    is_primary = true,
    updated_at = now();

  insert into public.cms_site_settings (website_id)
  values (updated_website.id)
  on conflict (website_id) do nothing;

  return public.cms_admin_website_json(updated_website);
end;
$$;

create or replace function public.cms_admin_deactivate_website(input_website_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_website public.cms_websites;
begin
  update public.cms_websites
  set is_active = false
  where id = input_website_id
  returning * into updated_website;

  if updated_website.id is null then
    raise exception 'Website not found.' using errcode = 'P0002';
  end if;

  return public.cms_admin_website_json(updated_website);
end;
$$;

revoke all on function public.cms_slugify(text) from PUBLIC, anon, authenticated;
revoke all on function public.cms_validate_domain(text) from PUBLIC, anon, authenticated;
revoke all on function public.cms_admin_website_json(public.cms_websites) from PUBLIC, anon, authenticated;
revoke all on function public.cms_admin_create_website(text, text) from PUBLIC, anon, authenticated;
revoke all on function public.cms_admin_update_website(uuid, text, text, boolean) from PUBLIC, anon, authenticated;
revoke all on function public.cms_admin_deactivate_website(uuid) from PUBLIC, anon, authenticated;

grant execute on function public.cms_admin_create_website(text, text) to service_role;
grant execute on function public.cms_admin_update_website(uuid, text, text, boolean) to service_role;
grant execute on function public.cms_admin_deactivate_website(uuid) to service_role;
