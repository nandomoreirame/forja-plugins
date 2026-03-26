/**
 * Escapes HTML special characters in a string to prevent XSS.
 * Uses explicit replacement to ensure all characters are escaped,
 * including quotes (which innerHTML does not escape in text nodes).
 */
export function escapeHtml(text: string): string {
  if (!text) return ''
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Renders a subset of Markdown inline formatting to HTML.
 * Order matters: links must be processed before bold/italic to avoid
 * partial replacement of bracket contents.
 */
export function renderInlineMarkdown(text: string): string {
  let html = escapeHtml(text)

  // Links: [text](url) — processed first to avoid conflict with *italic*
  html = html.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>',
  )

  // Bold: **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

  // Italic: *text* (single asterisk, after bold is consumed)
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Inline code: `text`
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  return html
}
