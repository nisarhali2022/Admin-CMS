function assertPublicConfig(config = {}) {
  if (!config.supabaseUrl || !config.supabaseAnonKey) {
    throw new Error('Public CMS client requires supabaseUrl and supabaseAnonKey.')
  }
}

function normalizeDomain(domain) {
  return String(domain || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .split('/')[0]
}

export function createPublicCmsClient(config) {
  assertPublicConfig(config)
  const supabaseUrl = config.supabaseUrl.replace(/\/$/, '')
  const headers = {
    apikey: config.supabaseAnonKey,
    Authorization: `Bearer ${config.supabaseAnonKey}`,
    'Content-Type': 'application/json',
  }

  async function rpc(functionName, body) {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${functionName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error(`Public CMS RPC ${functionName} failed with ${response.status}.`)
    }

    return response.json()
  }

  return {
    getSiteByDomain(domain) {
      return rpc('get_public_site_by_domain', { domain: normalizeDomain(domain) })
    },
    getTemplateContent(domain, templateKey) {
      return rpc('get_public_template_content', {
        domain: normalizeDomain(domain),
        template_key: templateKey,
      })
    },
    getPage(domain, path) {
      return rpc('get_public_page', {
        domain: normalizeDomain(domain),
        page_path: path,
      })
    },
    getPost(domain, slug) {
      return rpc('get_public_post', {
        domain: normalizeDomain(domain),
        slug,
      })
    },
    listPosts(domain, { categorySlug = null, search = null, limit = 20, offset = 0 } = {}) {
      return rpc('list_public_posts', {
        domain: normalizeDomain(domain),
        category_slug: categorySlug,
        search,
        limit_count: limit,
        offset_count: offset,
      })
    },
    listCategories(domain) {
      return rpc('list_public_categories', { domain: normalizeDomain(domain) })
    },
    listAuthors(domain) {
      return rpc('list_public_authors', { domain: normalizeDomain(domain) })
    },
    getSiteSettings(domain) {
      return rpc('get_public_site_settings', { domain: normalizeDomain(domain) })
    },
    listRedirects(domain) {
      return rpc('list_public_redirects', { domain: normalizeDomain(domain) })
    },
    getCurrentQuiz() {
      return rpc('cms_public_get_current_quiz', {})
    },
  }
}
