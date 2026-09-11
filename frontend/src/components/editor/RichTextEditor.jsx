/**
 * RichTextEditor — Tiptap-based WYSIWYG editor for GeoPsy admin content.
 *
 * Supports: headings (H1–H3), bold, italic, underline, strikethrough,
 * ordered/unordered lists, blockquote, code block, links, text alignment,
 * horizontal rule, hard break.
 *
 * HTML is sanitized server-side via bleach (Python) before storage.
 * Client-side DOMPurify is used when rendering output in the learner view.
 */
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { useEffect, useCallback } from 'react'
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  List, ListOrdered, Quote, Code, Link as LinkIcon,
  AlignLeft, AlignCenter, AlignRight, Heading1, Heading2, Heading3,
  Minus, RotateCcw, RotateCw,
} from 'lucide-react'

export default function RichTextEditor({ value, onChange, placeholder = 'Start writing…', minHeight = 300 }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: { languageClassPrefix: 'language-' },
      }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: 'text-ring underline' } }),
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none outline-none p-4 min-h-[inherit] text-ink',
        style: `min-height: ${minHeight}px`,
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })

  // Sync external value changes (e.g. when editing an existing lesson)
  useEffect(() => {
    if (editor && value !== undefined && editor.getHTML() !== value) {
      editor.commands.setContent(value || '', false)
    }
  }, [value, editor])

  const setLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href
    const url = window.prompt('Enter URL', prev || 'https://')
    if (url === null) return
    if (url === '') { editor.chain().focus().extendMarkRange('link').unsetLink().run(); return }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  if (!editor) return null

  const ToolBtn = ({ onClick, active, title, disabled, children }) => (
    <button
      type="button"
      onMouseDown={e => { e.preventDefault(); onClick() }}
      disabled={disabled}
      title={title}
      className={`p-1.5 rounded text-xs transition-colors ${
        active ? 'bg-ring text-surface' : 'text-muted hover:bg-surface-raised hover:text-ink'
      } disabled:opacity-30 disabled:cursor-not-allowed`}
    >
      {children}
    </button>
  )

  const Divider = () => <span className="w-px h-5 bg-border mx-0.5 self-center flex-shrink-0" />

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-surface shadow-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-surface-raised">
        {/* Headings */}
        <ToolBtn title="Heading 1" active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>
          <Heading1 className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Heading 2" active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Heading 3" active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="w-3.5 h-3.5" />
        </ToolBtn>
        <Divider />

        {/* Inline marks */}
        <ToolBtn title="Bold (Ctrl+B)" active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Italic (Ctrl+I)" active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Underline (Ctrl+U)" active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <UnderlineIcon className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Strikethrough" active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="w-3.5 h-3.5" />
        </ToolBtn>
        <Divider />

        {/* Alignment */}
        <ToolBtn title="Align left" active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}>
          <AlignLeft className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Align center" active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}>
          <AlignCenter className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Align right" active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}>
          <AlignRight className="w-3.5 h-3.5" />
        </ToolBtn>
        <Divider />

        {/* Lists */}
        <ToolBtn title="Bullet list" active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Numbered list" active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-3.5 h-3.5" />
        </ToolBtn>
        <Divider />

        {/* Blocks */}
        <ToolBtn title="Blockquote" active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Code block" active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <Code className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Horizontal rule"
          onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Insert link" active={editor.isActive('link')} onClick={setLink}>
          <LinkIcon className="w-3.5 h-3.5" />
        </ToolBtn>
        <Divider />

        {/* History */}
        <ToolBtn title="Undo (Ctrl+Z)" disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}>
          <RotateCcw className="w-3.5 h-3.5" />
        </ToolBtn>
        <ToolBtn title="Redo (Ctrl+Shift+Z)" disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}>
          <RotateCw className="w-3.5 h-3.5" />
        </ToolBtn>
      </div>

      {/* Editor area */}
      <EditorContent
        editor={editor}
        className="bg-surface"
        onClick={() => editor.chain().focus().run()}
      />

      {/* Empty state placeholder */}
      {editor.isEmpty && (
        <div className="absolute top-20 left-4 text-placeholder text-sm pointer-events-none select-none" aria-hidden>
          {placeholder}
        </div>
      )}
    </div>
  )
}
