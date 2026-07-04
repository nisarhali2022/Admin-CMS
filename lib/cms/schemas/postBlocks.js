export const POST_BLOCK_TYPES = [
  'paragraph',
  'heading',
  'image',
  'list',
  'quote',
  'link_button',
  'toc',
  'faq',
  'table',
  'callout',
]

export const DEFAULT_POST_BLOCKS = [
  {
    type: 'paragraph',
    text: '',
  },
]

export function getDefaultPostBlocks() {
  return DEFAULT_POST_BLOCKS.map((block) => ({ ...block }))
}
