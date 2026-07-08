alter table public.cms_template_content
  add column if not exists focus_keyphrase text,
  add column if not exists author_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'cms_template_content_author_same_website_fk'
      and conrelid = 'public.cms_template_content'::regclass
  ) then
    alter table public.cms_template_content
      add constraint cms_template_content_author_same_website_fk
      foreign key (author_id, website_id)
      references public.cms_authors (id, website_id)
      on delete restrict;
  end if;
end $$;

create index if not exists cms_template_content_website_author_idx
  on public.cms_template_content (website_id, author_id);

create or replace function public.get_public_template_content(
  domain text,
  template_key text
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'templateKey', t.template_key,
    'path', t.path,
    'title', t.title,
    'contentData', public.cms_resolve_media_references(t.content_data, t.website_id),
    'author', case
      when a.id is null then null
      else jsonb_build_object(
        'name', a.name,
        'slug', a.slug,
        'bio', a.bio,
        'avatar', public.cms_public_image_object(a.avatar_image_id, t.website_id)
      )
    end,
    'seo', jsonb_build_object(
      'focusKeyphrase', t.focus_keyphrase,
      'title', t.seo_title,
      'metaDescription', t.meta_description,
      'canonicalUrl', t.canonical_url,
      'robotsMeta', t.robots_meta,
      'ogImage', public.cms_public_image_object(t.og_image_id, t.website_id),
      'sitemapInclude', t.sitemap_include
    ),
    'publishedAt', t.published_at
  )
  from public.cms_template_content t
  left join public.cms_authors a
    on a.id = t.author_id
    and a.website_id = t.website_id
    and a.is_active = true
    and a.deleted_at is null
  where t.website_id = public.cms_public_website_id($1)
    and t.template_key = $2
    and t.status = 'published'
    and t.deleted_at is null;
$$;

grant execute on function public.get_public_template_content(text, text) to anon;
