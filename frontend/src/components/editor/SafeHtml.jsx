/**
 * SafeHtml — renders admin-created HTML content with DOMPurify sanitization.
 *
 * Prevents XSS while preserving all formatting created by the rich-text editor.
 * Use this component everywhere learner-facing content is displayed.
 */
import DOMPurify from 'dompurify'

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'code', 'hr', 'a', 'table',
  'thead', 'tbody', 'tr', 'th', 'td', 'span', 'div', 'img',
]

const ALLOWED_ATTRS = {
  a: ['href', 'target', 'rel', 'class'],
  img: ['src', 'alt', 'width', 'height', 'class'],
  '*': ['class', 'style'],
}

export default function SafeHtml({ html, className = '' }) {
  if (!html) return null

  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: Object.values(ALLOWED_ATTRS).flat(),
    // Force all links to open in a new tab safely
    FORCE_BODY: true,
    ADD_ATTR: ['target'],
  })

  return (
    <div
      className={`prose prose-sm sm:prose max-w-none ${className}`}
      style={{
        // Ensure Tiptap-generated HTML renders with proper structure
        '--tw-prose-body': 'var(--foreground)',
        '--tw-prose-headings': 'var(--foreground)',
        '--tw-prose-links': 'var(--ring)',
        '--tw-prose-code': 'var(--foreground)',
        '--tw-prose-pre-bg': '#080B14',
      }}
      dangerouslySetInnerHTML={{ __html: clean }}
    />
  )
}
