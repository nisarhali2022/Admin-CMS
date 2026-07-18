-- Promote imported legacy fixed pages to their matching template records.
-- This preserves the public URLs consumed by the reference frontend and hides
-- the superseded custom-page rows from public indexes.

with legacy_fixed_pages as (
  select
    p.*,
    case p.path
      when '/about-us' then 'about'
      when '/contact-us' then 'contact'
      when '/privacy-policy' then 'privacy'
    end as template_key
  from public.cms_pages p
  where p.deleted_at is null
    and p.path in ('/about-us', '/contact-us', '/privacy-policy')
),
inserted_templates as (
  insert into public.cms_template_content (
    website_id,
    template_key,
    path,
    title,
    content_data,
    focus_keyphrase,
    seo_title,
    meta_description,
    author_id,
    canonical_url,
    robots_meta,
    og_image_id,
    sitemap_include,
    status,
    published_at
  )
  select
    p.website_id,
    p.template_key,
    p.path,
    p.title,
    case p.template_key
      when 'about' then jsonb_build_object(
        'introTitle', p.title,
        'introText', '',
        'bodyText', p.body_text,
        'mainImage', jsonb_build_object('mediaId', p.featured_image_id)
      )
      when 'contact' then jsonb_build_object(
        'contactIntro', p.body_text,
        'phone', '',
        'email', '',
        'address', '',
        'mapUrl', ''
      )
      when 'privacy' then jsonb_build_object('bodyText', p.body_text)
    end,
    p.focus_keyphrase,
    p.seo_title,
    p.meta_description,
    p.author_id,
    p.canonical_url,
    p.robots_meta,
    p.featured_image_id,
    p.sitemap_include,
    p.status,
    p.published_at
  from legacy_fixed_pages p
  where not exists (
    select 1
    from public.cms_template_content t
    where t.website_id = p.website_id
      and t.template_key = p.template_key
  )
  returning website_id, template_key
)
update public.cms_pages p
set deleted_at = now()
from legacy_fixed_pages legacy
join inserted_templates inserted
  on inserted.website_id = legacy.website_id
 and inserted.template_key = legacy.template_key
where p.id = legacy.id;

notify pgrst, 'reload schema';
