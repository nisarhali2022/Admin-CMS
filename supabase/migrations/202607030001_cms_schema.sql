create extension if not exists pgcrypto;

create or replace function public.cms_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.cms_websites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null,
  primary_domain text not null,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cms_websites_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint cms_websites_primary_domain_format check (primary_domain = lower(primary_domain) and primary_domain !~ '^https?://')
);

create unique index cms_websites_slug_key on public.cms_websites (slug);
create unique index cms_websites_primary_domain_key on public.cms_websites (primary_domain);
create index cms_websites_is_active_idx on public.cms_websites (is_active);

create trigger cms_websites_set_updated_at
before update on public.cms_websites
for each row execute function public.cms_set_updated_at();

create table public.cms_website_domains (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.cms_websites (id) on delete restrict,
  domain text not null,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cms_website_domains_domain_format check (domain = lower(domain) and domain !~ '^https?://')
);

create unique index cms_website_domains_domain_key on public.cms_website_domains (domain);
create unique index cms_website_domains_one_primary_idx on public.cms_website_domains (website_id) where is_primary;
create index cms_website_domains_website_id_idx on public.cms_website_domains (website_id);

create trigger cms_website_domains_set_updated_at
before update on public.cms_website_domains
for each row execute function public.cms_set_updated_at();

create table public.cms_categories (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.cms_websites (id) on delete restrict,
  name text not null,
  slug text not null,
  description text,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cms_categories_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  unique (id, website_id)
);

create unique index cms_categories_website_slug_active_key on public.cms_categories (website_id, slug) where deleted_at is null;
create index cms_categories_website_id_idx on public.cms_categories (website_id);

create trigger cms_categories_set_updated_at
before update on public.cms_categories
for each row execute function public.cms_set_updated_at();

create table public.cms_media (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.cms_websites (id) on delete restrict,
  original_filename text not null,
  storage_path text not null,
  public_url text not null,
  alt_text text,
  caption text,
  width integer,
  height integer,
  mime_type text not null default 'image/webp',
  file_size bigint,
  source text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cms_media_storage_path_format check (storage_path ~ '^websites/[0-9a-f-]{36}/media/[0-9]{4}/[0-9]{2}/[0-9a-f-]{36}\.webp$'),
  constraint cms_media_source_check check (source in ('upload', 'wordpress_import')),
  constraint cms_media_dimensions_positive check ((width is null or width > 0) and (height is null or height > 0)),
  constraint cms_media_file_size_positive check (file_size is null or file_size > 0),
  unique (id, website_id)
);

create unique index cms_media_storage_path_key on public.cms_media (storage_path);
create index cms_media_website_deleted_idx on public.cms_media (website_id, deleted_at);
create index cms_media_website_source_idx on public.cms_media (website_id, source);

create trigger cms_media_set_updated_at
before update on public.cms_media
for each row execute function public.cms_set_updated_at();

create table public.cms_authors (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.cms_websites (id) on delete restrict,
  name text not null,
  slug text not null,
  bio text,
  avatar_image_id uuid,
  is_active boolean not null default true,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cms_authors_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  unique (id, website_id),
  constraint cms_authors_avatar_same_website_fk foreign key (avatar_image_id, website_id)
    references public.cms_media (id, website_id) on delete restrict
);

create unique index cms_authors_website_slug_active_key on public.cms_authors (website_id, slug) where deleted_at is null;
create index cms_authors_website_active_idx on public.cms_authors (website_id, is_active);
create index cms_authors_website_deleted_idx on public.cms_authors (website_id, deleted_at);

create trigger cms_authors_set_updated_at
before update on public.cms_authors
for each row execute function public.cms_set_updated_at();

create table public.cms_template_content (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.cms_websites (id) on delete restrict,
  template_key text not null,
  path text not null,
  title text not null,
  content_data jsonb not null default '{}'::jsonb,
  seo_title text,
  meta_description text,
  canonical_url text,
  robots_meta text,
  og_image_id uuid,
  sitemap_include boolean not null default true,
  status text not null default 'draft',
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cms_template_content_template_key_check check (template_key in ('home', 'about', 'contact', 'privacy', 'terms', 'packages')),
  constraint cms_template_content_path_format check (path ~ '^/'),
  constraint cms_template_content_status_check check (status in ('draft', 'published', 'unpublished')),
  constraint cms_template_content_og_image_same_website_fk foreign key (og_image_id, website_id)
    references public.cms_media (id, website_id) on delete restrict
);

create unique index cms_template_content_website_template_key on public.cms_template_content (website_id, template_key);
create unique index cms_template_content_website_path_active_key on public.cms_template_content (website_id, path) where deleted_at is null;
create index cms_template_content_website_status_idx on public.cms_template_content (website_id, status);
create index cms_template_content_website_deleted_idx on public.cms_template_content (website_id, deleted_at);

create trigger cms_template_content_set_updated_at
before update on public.cms_template_content
for each row execute function public.cms_set_updated_at();

create table public.cms_posts (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.cms_websites (id) on delete restrict,
  category_id uuid,
  author_id uuid not null,
  title text not null,
  slug text not null,
  excerpt text,
  featured_image_id uuid,
  body_blocks jsonb not null default '[]'::jsonb,
  seo_title text,
  meta_description text,
  canonical_url text,
  robots_meta text,
  og_image_id uuid,
  sitemap_include boolean not null default true,
  status text not null default 'draft',
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cms_posts_slug_format check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint cms_posts_status_check check (status in ('draft', 'published', 'unpublished')),
  constraint cms_posts_body_blocks_array check (jsonb_typeof(body_blocks) = 'array'),
  constraint cms_posts_category_same_website_fk foreign key (category_id, website_id)
    references public.cms_categories (id, website_id) on delete restrict,
  constraint cms_posts_author_same_website_fk foreign key (author_id, website_id)
    references public.cms_authors (id, website_id) on delete restrict,
  constraint cms_posts_featured_image_same_website_fk foreign key (featured_image_id, website_id)
    references public.cms_media (id, website_id) on delete restrict,
  constraint cms_posts_og_image_same_website_fk foreign key (og_image_id, website_id)
    references public.cms_media (id, website_id) on delete restrict
);

create unique index cms_posts_website_slug_active_key on public.cms_posts (website_id, slug) where deleted_at is null;
create index cms_posts_website_status_published_idx on public.cms_posts (website_id, status, published_at);
create index cms_posts_website_category_idx on public.cms_posts (website_id, category_id);
create index cms_posts_website_author_idx on public.cms_posts (website_id, author_id);
create index cms_posts_website_deleted_idx on public.cms_posts (website_id, deleted_at);

create trigger cms_posts_set_updated_at
before update on public.cms_posts
for each row execute function public.cms_set_updated_at();

create table public.cms_redirects (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.cms_websites (id) on delete restrict,
  from_path text not null,
  to_url text not null,
  redirect_type integer not null,
  is_active boolean not null default true,
  hit_count integer not null default 0,
  last_hit_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cms_redirects_from_path_format check (from_path ~ '^/'),
  constraint cms_redirects_redirect_type_check check (redirect_type in (301, 302)),
  constraint cms_redirects_hit_count_nonnegative check (hit_count >= 0)
);

create unique index cms_redirects_website_from_path_active_key on public.cms_redirects (website_id, from_path) where deleted_at is null;
create index cms_redirects_website_active_idx on public.cms_redirects (website_id, is_active);

create trigger cms_redirects_set_updated_at
before update on public.cms_redirects
for each row execute function public.cms_set_updated_at();

create table public.cms_import_jobs (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.cms_websites (id) on delete restrict,
  source_type text not null,
  source_url text not null,
  status text not null default 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  temporary_credentials_encrypted text,
  report jsonb not null default '{}'::jsonb,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cms_import_jobs_source_type_check check (source_type in ('wordpress')),
  constraint cms_import_jobs_status_check check (status in ('queued', 'running', 'succeeded', 'failed'))
);

create index cms_import_jobs_website_status_idx on public.cms_import_jobs (website_id, status);
create index cms_import_jobs_website_created_idx on public.cms_import_jobs (website_id, created_at);

create trigger cms_import_jobs_set_updated_at
before update on public.cms_import_jobs
for each row execute function public.cms_set_updated_at();

create table public.cms_site_settings (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.cms_websites (id) on delete restrict,
  robots_txt text,
  sitemap_settings jsonb not null default '{}'::jsonb,
  seo_defaults jsonb not null default '{}'::jsonb,
  site_config jsonb not null default '{}'::jsonb,
  adsense_settings jsonb not null default '{"enabled": false, "publisherId": null, "autoAdsEnabled": true, "adsTxt": null}'::jsonb,
  revalidation_url text,
  revalidation_secret_encrypted text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index cms_site_settings_website_key on public.cms_site_settings (website_id);

create trigger cms_site_settings_set_updated_at
before update on public.cms_site_settings
for each row execute function public.cms_set_updated_at();
