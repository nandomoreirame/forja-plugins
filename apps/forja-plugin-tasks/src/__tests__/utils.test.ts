import { describe, it, expect } from 'vitest'
import { escapeHtml, renderInlineMarkdown } from '../utils'

describe('escapeHtml', () => {
  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('')
  })

  it('does not modify safe strings without special characters', () => {
    expect(escapeHtml('Hello world')).toBe('Hello world')
  })

  it('escapes < character', () => {
    expect(escapeHtml('<tag>')).toContain('&lt;')
  })

  it('escapes > character', () => {
    expect(escapeHtml('<tag>')).toContain('&gt;')
  })

  it('escapes & character', () => {
    expect(escapeHtml('a & b')).toContain('&amp;')
  })

  it('escapes " character', () => {
    const result = escapeHtml('"quoted"')
    expect(result).toContain('&quot;')
  })

  it('escapes all special chars in one string', () => {
    const result = escapeHtml('<script>alert("xss & evil")</script>')
    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;')
    expect(result).toContain('&gt;')
    expect(result).toContain('&amp;')
    expect(result).toContain('&quot;')
  })
})

describe('renderInlineMarkdown', () => {
  it('converts **bold** to <strong>bold</strong>', () => {
    const result = renderInlineMarkdown('**bold text**')
    expect(result).toContain('<strong>bold text</strong>')
  })

  it('converts *italic* to <em>italic</em>', () => {
    const result = renderInlineMarkdown('*italic text*')
    expect(result).toContain('<em>italic text</em>')
  })

  it('converts `code` to <code>code</code>', () => {
    const result = renderInlineMarkdown('`some code`')
    expect(result).toContain('<code>some code</code>')
  })

  it('converts [text](url) to <a> link with target="_blank"', () => {
    const result = renderInlineMarkdown('[Click here](https://example.com)')
    expect(result).toContain('<a href="https://example.com"')
    expect(result).toContain('target="_blank"')
    expect(result).toContain('>Click here</a>')
  })

  it('includes rel="noopener noreferrer" on links for security', () => {
    const result = renderInlineMarkdown('[Link](https://example.com)')
    expect(result).toContain('rel="noopener noreferrer"')
  })

  it('handles plain text without any formatting', () => {
    const result = renderInlineMarkdown('plain text')
    expect(result).toBe('plain text')
  })

  it('handles multiple formatting types in one string', () => {
    const result = renderInlineMarkdown('**bold** and *italic* and `code`')
    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('<em>italic</em>')
    expect(result).toContain('<code>code</code>')
  })

  it('escapes HTML special chars before applying markdown formatting', () => {
    const result = renderInlineMarkdown('<script>**bold**</script>')
    expect(result).not.toContain('<script>')
    expect(result).toContain('&lt;script&gt;')
    // bold still rendered after escaping
    expect(result).toContain('<strong>bold</strong>')
  })

  it('handles empty string', () => {
    expect(renderInlineMarkdown('')).toBe('')
  })
})
