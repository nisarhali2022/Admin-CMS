export function getPublicContentUrls({
  domain,
  templates = [],
  pages = [],
  posts = [],
  trailingSlash = false,
}) {
  const base = `https://${String(domain || '').replace(/^https?:\/\//, '').replace(/\/$/, '')}`
  const suffix = trailingSlash ? '/' : ''
  const urls = []

  for (const template of templates || []) {
    if (template?.sitemapInclude === false) continue
    const path = template?.path || '/'
    urls.push(`${base}${path === '/' ? '' : path}${path === '/' && trailingSlash ? '/' : ''}`)
  }

  for (const page of pages || []) {
    if (page?.sitemapInclude === false) continue
    const path = page?.path
    if (path) urls.push(`${base}${path}${suffix}`)
  }

  for (const post of posts || []) {
    if (post?.sitemapInclude === false) continue
    const slug = post?.slug
    if (slug) urls.push(`${base}/blog/${slug}${suffix}`)
  }

  return [...new Set(urls)]
}
