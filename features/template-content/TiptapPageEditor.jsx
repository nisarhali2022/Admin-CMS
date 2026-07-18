'use client'

import RichTextEditor from '@/components/admin/RichTextEditor'

export default function TiptapPageEditor(props) {
  const {
    placeholder = 'Start writing page content...',
    codeLabel = 'HTML page content',
    ...editorProps
  } = props

  return (
    <RichTextEditor
      {...editorProps}
      placeholder={placeholder}
      codeLabel={codeLabel}
    />
  )
}
