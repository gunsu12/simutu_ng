import DOMPurify from 'dompurify'

/**
 * Sanitizes HTML content to prevent XSS attacks
 * @param dirty - The untrusted HTML string
 * @returns Sanitized HTML string safe for v-html
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '-'
  
  // Only allow safe HTML tags and attributes
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'pre', 'code', 'span', 'div'],
    ALLOWED_ATTR: ['class', 'style'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover', 'onfocus', 'onblur']
  })
}
