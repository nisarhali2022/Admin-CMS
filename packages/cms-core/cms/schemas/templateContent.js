export const TEMPLATE_CONTENT_SCHEMAS = {
  home: {
    label: 'Home',
    defaultPath: '/',
    defaultTitle: 'Home',
    textFields: [
      'heroTitle',
      'heroText',
      'ctaLabel',
      'ctaHref',
      'introHtml',
      'latestNewsTitle',
      'quizHeadingTemplate',
      'conclusionHeading',
      'conclusionHtml',
      'stepsHeading',
      'faqHeading',
    ],
    imageFields: ['heroImage'],
    collectionFields: {
      quizInfoSections: [],
      steps: [],
      faqs: [],
    },
  },
  about: {
    label: 'About',
    defaultPath: '/about-us',
    defaultTitle: 'About Us',
    textFields: ['introTitle', 'introText', 'bodyText'],
    imageFields: ['mainImage'],
  },
  contact: {
    label: 'Contact',
    defaultPath: '/contact-us',
    defaultTitle: 'Contact',
    textFields: ['contactIntro', 'phone', 'email', 'address', 'mapUrl'],
    imageFields: [],
  },
  privacy: {
    label: 'Privacy',
    defaultPath: '/privacy-policy',
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

  for (const [field, defaultValue] of Object.entries(schema.collectionFields || {})) {
    data[field] = structuredClone(defaultValue)
  }

  return data
}
