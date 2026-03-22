// ============================================================
// Archflow: Input sanitization utilities
// ============================================================

/**
 * Sanitize text input: strip HTML tags, trim whitespace,
 * prevent script injection in user-submitted content.
 */
export function sanitize(input: string): string {
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove script-related patterns
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    // Trim
    .trim();
}

/**
 * Sanitize URL: only allow http/https protocols.
 * Returns empty string if URL is malicious.
 */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';

  // Allow only http and https
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return trimmed;
    }
    return '';
  } catch {
    // If URL doesn't parse, check if it starts with a valid protocol
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }
    // Prepend https:// for bare domains
    if (/^[a-zA-Z0-9]/.test(trimmed) && !trimmed.includes(' ')) {
      return `https://${trimmed}`;
    }
    return '';
  }
}

/**
 * Sanitize filename: remove path traversal and special characters.
 */
export function sanitizeFilename(name: string): string {
  return name
    .replace(/\.\./g, '')
    .replace(/[/\\:*?"<>|]/g, '')
    .trim();
}

/**
 * Validate and limit string length.
 */
export function limitLength(input: string, maxLength: number): string {
  return input.slice(0, maxLength);
}
