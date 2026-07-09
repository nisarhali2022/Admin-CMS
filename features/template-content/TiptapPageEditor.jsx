'use client'

import RichTextEditor from '@/components/admin/RichTextEditor'

export default function TiptapPageEditor(props) {
  return (
    <RichTextEditor
      {...props}
      placeholder="Start writing page content..."
      codeLabel="HTML page content"
    />
  )
}
