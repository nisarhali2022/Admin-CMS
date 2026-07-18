-- Give all existing CMS content the same explicit, indexable robots default as new content.
-- Existing intentional robots selections are preserved, and canonical_url is never changed.
begin;

update public.cms_posts
set robots_meta = 'index,follow'
where robots_meta is null or btrim(robots_meta) = '';

update public.cms_pages
set robots_meta = 'index,follow'
where (robots_meta is null or btrim(robots_meta) = '')
  -- Reserved legacy rows predate the route guard. Updating them would make
  -- PostgreSQL re-check the invalid route and fail this otherwise safe migration.
  -- They are unreachable because the frontend owns these paths.
  and path !~ '^/(api|admin|author|blog|search|tag)(/|$)';

update public.cms_template_content
set robots_meta = 'index,follow'
where robots_meta is null or btrim(robots_meta) = '';

commit;
