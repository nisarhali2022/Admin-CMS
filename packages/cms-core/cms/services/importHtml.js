import sanitizeHtml from 'sanitize-html'

const ALLOWED_TAGS = [
  'a',
  'b',
  'blockquote',
  'br',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'h4',
  'i',
  'iframe',
  'img',
  'li',
  'ol',
  'p',
  's',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
]

const ALLOWED_ATTRIBUTES = {
  a: ['href', 'target', 'rel'],
  blockquote: ['style'],
  div: ['style'],
  h1: ['style'],
  h2: ['style'],
  h3: ['style'],
  h4: ['style'],
  iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'loading', 'title'],
  img: ['src', 'alt', 'width', 'data-media-id'],
  p: ['style'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
}

function addHost(hosts, value) {
  if (!value) return

  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`)
    const hostname = url.hostname.toLowerCase()
    hosts.add(hostname)
    if (hostname.startsWith('www.')) hosts.add(hostname.slice(4))
    else hosts.add(`www.${hostname}`)
  } catch {
    // Invalid configured domains are ignored; they cannot be safely rewritten.
  }
}

function isSafeHttpUrl(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

function rewriteLinkHref(value, internalHosts) {
  const href = String(value || '').trim()
  if (!href) return null
  if (href.startsWith('/') || href.startsWith('#') || /^mailto:/i.test(href)) return href
  if (!isSafeHttpUrl(href)) return null

  const url = new URL(href)
  if (internalHosts.has(url.hostname.toLowerCase())) {
    return `${url.pathname || '/'}${url.search}${url.hash}`
  }

  return url.toString()
}

function normalizedMediaUrl(value) {
  try {
    const url = new URL(value)
    url.search = ''
    url.hash = ''
    return url.toString()
  } catch {
    return String(value || '').trim()
  }
}

function findImportedMedia(value, mediaByUrl) {
  return mediaByUrl.get(value) || mediaByUrl.get(normalizedMediaUrl(value)) || null
}

function sanitizeImageWidth(value) {
  const width = Number.parseInt(value, 10)
  if (!Number.isFinite(width) || width <= 0) return null
  return String(Math.min(width, 1200))
}

export function sanitizeImportedContentHtml({
  html,
  wordpressBaseUrl,
  primaryDomain,
  mediaByUrl = new Map(),
}) {
  const internalHosts = new Set()
  addHost(internalHosts, wordpressBaseUrl)
  addHost(internalHosts, primaryDomain)

  return sanitizeHtml(String(html || ''), {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ['http', 'https', 'mailto'],
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto'],
      img: ['http', 'https'],
      iframe: ['https'],
    },
    allowedIframeHostnames: [
      'youtube.com',
      'www.youtube.com',
      'youtube-nocookie.com',
      'www.youtube-nocookie.com',
    ],
    allowedStyles: {
      '*': {
        'text-align': [/^(left|center|right)$/],
      },
    },
    transformTags: {
      a: (tagName, attribs) => {
        const href = rewriteLinkHref(attribs.href, internalHosts)
        const next = href ? { href } : {}
        if (attribs.target === '_blank') {
          next.target = '_blank'
          next.rel = 'noreferrer'
        }
        return { tagName, attribs: next }
      },
      img: (tagName, attribs) => {
        const media = findImportedMedia(attribs.src, mediaByUrl)
        const src = media?.publicUrl || (isSafeHttpUrl(attribs.src) ? attribs.src : null)
        const next = src ? { src, alt: attribs.alt || '' } : {}
        const width = sanitizeImageWidth(attribs.width)
        if (width) next.width = width
        if (media?.id) next['data-media-id'] = media.id
        return { tagName, attribs: next }
      },
    },
  }).trim()
}

export function normalizeImportedMediaUrl(value) {
  return normalizedMediaUrl(value)
}
