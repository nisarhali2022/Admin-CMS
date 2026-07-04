export const TEMPLATE_CONTENT_SCHEMAS = {
  home: {
    label: 'Home',
    defaultPath: '/',
    defaultTitle: 'Home',
    textFields: ['heroTitle', 'heroText', 'ctaLabel', 'ctaHref'],
    imageFields: ['heroImage'],
  },
  about: {
    label: 'About',
    defaultPath: '/about',
    defaultTitle: 'About Us',
    textFields: ['introTitle', 'introText', 'bodyText'],
    imageFields: ['mainImage'],
  },
  contact: {
    label: 'Contact',
    defaultPath: '/contact',
    defaultTitle: 'Contact',
    textFields: ['contactIntro', 'phone', 'email', 'address', 'mapUrl'],
    imageFields: [],
  },
  privacy: {
    label: 'Privacy',
    defaultPath: '/privacy',
    defaultTitle: 'Privacy Policy',
    textFields: ['bodyText'],
    imageFields: [],
  },
  terms: {
    label: 'Terms',
    defaultPath: '/terms',
    defaultTitle: 'Terms And Conditions',
    textFields: ['bodyText'],
    imageFields: [],
  },
  packages: {
    label: 'Packages',
    defaultPath: '/packages',
    defaultTitle: 'Packages',
    textFields: ['introTitle', 'introText'],
    imageFields: ['mainImage'],
  },
}

export const SUPPORTED_TEMPLATE_KEYS = Object.keys(TEMPLATE_CONTENT_SCHEMAS)

export function getDefaultTemplateContentData(templateKey) {
  const schema = TEMPLATE_CONTENT_SCHEMAS[templateKey]
  if (!schema) return {}

  const data = {}

  for (const field of schema.textFields) {
    data[field] = ''
  }

  for (const field of schema.imageFields) {
    data[field] = { mediaId: null }
  }

  return data
}
