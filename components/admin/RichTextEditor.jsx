'use client'

import { useEffect, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TiptapImage from '@tiptap/extension-image'
import TiptapLink from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import { Table } from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import Placeholder from '@tiptap/extension-placeholder'
import Youtube from '@tiptap/extension-youtube'
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  ImagePlus,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Table2,
  Undo2,
  Video,
} from 'lucide-react'

const toolbarButtonClass =
  'inline-flex h-8 w-8 items-center justify-center rounded-[3px] text-[#3c434a] hover:bg-[#f0f0f1] disabled:cursor-not-allowed disabled:text-[#a7aaad]'

const CmsImage = TiptapImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      mediaId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-media-id'),
        renderHTML: (attributes) =>
          attributes.mediaId ? { 'data-media-id': attributes.mediaId } : {},
      },
    }
  },
})

function getMediaLabel(item) {
  return item.altText || item.originalFilename || 'Image'
}

export default function RichTextEditor({
  value,
  onChange,
  media,
  editorMode,
  setEditorMode,
  setMessage,
  sanitizeHtml,
  sanitizeUrl,
  wordCount,
  placeholder = 'Start writing content...',
  codeLabel = 'HTML content',
}) {
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3, 4] },
      }),
      CmsImage.configure({
        allowBase64: false,
        inline: false,
      }),
      TiptapLink.configure({
        autolink: true,
        linkOnPaste: true,
        openOnClick: false,
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Placeholder.configure({
        placeholder,
      }),
      Youtube.configure({
        controls: true,
        nocookie: true,
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class:
          'min-h-[20rem] w-full bg-white px-4 py-4 text-[15px] leading-7 text-[#1f2330] outline-none prose-content',
        'aria-label': 'Visual page content editor',
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(sanitizeHtml(currentEditor.getHTML()))
    },
  })

  useEffect(() => {
    if (!editor) return

    const nextHtml = value || ''
    if (editor.getHTML() !== nextHtml) {
      editor.commands.setContent(nextHtml, false)
    }
  }, [editor, value])

  function runCommand(callback) {
    if (!editor) return
    callback(editor.chain().focus()).run()
  }

  function changeBlock(value) {
    if (!editor) return
    if (value === 'paragraph') {
      editor.chain().focus().setParagraph().run()
      return
    }

    editor
      .chain()
      .focus()
      .toggleHeading({ level: Number(value.replace('h', '')) })
      .run()
  }

  function addLink() {
    if (!editor) return

    const currentHref = editor.getAttributes('link').href || ''
    const url = window.prompt('Enter link URL', currentHref)
    if (url === null) return

    const safeUrl = sanitizeUrl(url)
    if (!safeUrl) {
      setMessage('Enter a valid link URL.')
      return
    }

    editor
      .chain()
      .focus()
      .extendMarkRange('link')
      .setLink({ href: safeUrl, target: '_blank', rel: 'noreferrer' })
      .run()
  }

  function addVideo() {
    if (!editor) return

    const url = window.prompt('Enter YouTube video URL')
    const safeUrl = sanitizeUrl(url)
    if (!safeUrl) {
      setMessage('Enter a valid YouTube URL.')
      return
    }

    editor
      .chain()
      .focus()
      .setYoutubeVideo({ src: safeUrl, width: 640, height: 360 })
      .run()
  }

  function addMediaToContent() {
    if (media.length === 0) {
      setMessage('Upload media first, then use Add Media.')
      return
    }
    setIsMediaPickerOpen((current) => !current)
  }

  function insertMediaIntoContent(item) {
    if (!editor) return

    editor
      .chain()
      .focus()
      .setImage({
        src: item.publicUrl,
        alt: getMediaLabel(item),
        mediaId: item.id,
      })
      .run()
    setIsMediaPickerOpen(false)
  }

  return (
    <div className="border border-[#c3c4c7] bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#c3c4c7] bg-[#f6f7f7] px-2 py-2">
        <button
          type="button"
          onClick={addMediaToContent}
          className="inline-flex items-center gap-1 rounded-[3px] border border-[#3858e9] bg-white px-3 py-1.5 text-[13px] text-[#3858e9]"
        >
          <ImagePlus className="h-4 w-4" />
          Add Media
        </button>
        <div className="flex overflow-hidden rounded-t-[3px] border border-[#c3c4c7] bg-white">
          <button
            type="button"
            onClick={() => setEditorMode('visual')}
            className={`px-3 py-1.5 text-[13px] ${
              editorMode === 'visual'
                ? 'bg-white text-[#1f2330]'
                : 'bg-[#f6f7f7] text-[#50575e]'
            }`}
          >
            Visual
          </button>
          <button
            type="button"
            onClick={() => setEditorMode('code')}
            className={`border-l border-[#c3c4c7] px-3 py-1.5 text-[13px] ${
              editorMode === 'code'
                ? 'bg-white text-[#1f2330]'
                : 'bg-[#f6f7f7] text-[#50575e]'
            }`}
          >
            Code
          </button>
        </div>
      </div>

      {editorMode === 'visual' ? (
        <>
          <div className="flex flex-wrap items-center gap-1 border-b border-[#dcdcde] bg-white px-2 py-2">
            <select
              className="h-8 rounded-[3px] border border-[#c3c4c7] bg-white px-2 text-[13px]"
              defaultValue="paragraph"
              onChange={(event) => changeBlock(event.target.value)}
            >
              <option value="paragraph">Paragraph</option>
              <option value="h2">Heading 2</option>
              <option value="h3">Heading 3</option>
              <option value="h4">Heading 4</option>
            </select>
            <button
              type="button"
              onClick={() => runCommand((chain) => chain.toggleBold())}
              className={toolbarButtonClass}
              aria-label="Bold"
              title="Bold"
              disabled={!editor}
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand((chain) => chain.toggleItalic())}
              className={toolbarButtonClass}
              aria-label="Italic"
              title="Italic"
              disabled={!editor}
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand((chain) => chain.toggleBulletList())}
              className={toolbarButtonClass}
              aria-label="Bullet list"
              title="Bullet list"
              disabled={!editor}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand((chain) => chain.toggleOrderedList())}
              className={toolbarButtonClass}
              aria-label="Numbered list"
              title="Numbered list"
              disabled={!editor}
            >
              <ListOrdered className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand((chain) => chain.toggleBlockquote())}
              className={toolbarButtonClass}
              aria-label="Quote"
              title="Quote"
              disabled={!editor}
            >
              <Quote className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={addLink}
              className={toolbarButtonClass}
              aria-label="Add link"
              title="Add link"
              disabled={!editor}
            >
              <LinkIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={addMediaToContent}
              className={toolbarButtonClass}
              aria-label="Add image"
              title="Add image"
              disabled={!editor}
            >
              <ImagePlus className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={addVideo}
              className={toolbarButtonClass}
              aria-label="Add video"
              title="Add video"
              disabled={!editor}
            >
              <Video className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                runCommand((chain) =>
                  chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                )
              }
              className={toolbarButtonClass}
              aria-label="Insert table"
              title="Insert table"
              disabled={!editor}
            >
              <Table2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand((chain) => chain.setTextAlign('left'))}
              className={toolbarButtonClass}
              aria-label="Align left"
              title="Align left"
              disabled={!editor}
            >
              <AlignLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand((chain) => chain.setTextAlign('center'))}
              className={toolbarButtonClass}
              aria-label="Align center"
              title="Align center"
              disabled={!editor}
            >
              <AlignCenter className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand((chain) => chain.setTextAlign('right'))}
              className={toolbarButtonClass}
              aria-label="Align right"
              title="Align right"
              disabled={!editor}
            >
              <AlignRight className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand((chain) => chain.undo())}
              className={toolbarButtonClass}
              aria-label="Undo"
              title="Undo"
              disabled={!editor}
            >
              <Undo2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => runCommand((chain) => chain.redo())}
              className={toolbarButtonClass}
              aria-label="Redo"
              title="Redo"
              disabled={!editor}
            >
              <Redo2 className="h-4 w-4" />
            </button>
          </div>

          {isMediaPickerOpen ? (
            <div className="border-b border-[#dcdcde] bg-[#f6f7f7] p-3">
              <div className="grid max-h-64 gap-3 overflow-y-auto sm:grid-cols-2 lg:grid-cols-4">
                {media.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => insertMediaIntoContent(item)}
                    className="flex items-center gap-3 rounded-[3px] border border-[#dcdcde] bg-white p-2 text-left hover:border-[#3858e9]"
                  >
                    <img
                      src={item.publicUrl}
                      alt={getMediaLabel(item)}
                      className="h-14 w-14 rounded-[3px] object-cover"
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-medium text-[#1f2330]">
                        {getMediaLabel(item)}
                      </span>
                      <span className="block text-[12px] font-normal text-[#3858e9]">
                        Insert image
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <EditorContent editor={editor} />
        </>
      ) : (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={16}
          className="min-h-[20rem] w-full resize-y border-0 bg-white px-3 py-3 font-mono text-[14px] leading-6 text-[#1f2330] outline-none"
          aria-label={codeLabel}
        />
      )}

      <div className="border-t border-[#dcdcde] bg-[#f6f7f7] px-3 py-2 text-[13px] text-[#50575e]">
        Word count: {wordCount}
      </div>
    </div>
  )
}
