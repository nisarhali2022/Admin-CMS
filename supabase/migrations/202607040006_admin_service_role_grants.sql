grant usage on schema public to service_role;

grant select, insert, update, delete on table
  public.cms_websites,
  public.cms_website_domains,
  public.cms_template_content,
  public.cms_categories,
  public.cms_authors,
  public.cms_posts,
  public.cms_media,
  public.cms_redirects,
  public.cms_import_jobs,
  public.cms_site_settings
to service_role;
