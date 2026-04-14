// ============================================================
// Archflow: Email Evidence — Content hashing & Tracking tokens
// ============================================================
// Used by the report send API to create tamper-proof evidence.
// SHA-256 hashes prove report content at time of sending.
// HMAC tokens authenticate tracked link clicks.
// ============================================================

import { createHmac, createHash, timingSafeEqual } from 'crypto';

/**
 * HMAC secret for tracking tokens.
 * Falls back to RESEND_API_KEY if dedicated secret not set.
 */
function getHmacSecret(): string {
  const secret = process.env.EMAIL_TRACKING_HMAC_SECRET || process.env.RESEND_API_KEY;
  if (!secret) throw new Error('EMAIL_TRACKING_HMAC_SECRET or RESEND_API_KEY required');
  return secret;
}

// ======================== CONTENT HASHING ========================

interface ReportHashInput {
  visit_date: string;
  general_comment: string | null;
  remarks: Array<{
    number: number;
    text: string;
    status: string;
    deadline: string | null;
  }>;
}

/**
 * Compute SHA-256 hash of report content in canonical form.
 * Deterministic: same content always produces the same hash.
 */
export function computeReportHash(report: ReportHashInput): string {
  // Canonical form: sorted remarks, normalized whitespace
  const canonical = JSON.stringify({
    visit_date: report.visit_date,
    general_comment: (report.general_comment || '').trim(),
    remarks: [...report.remarks]
      .sort((a, b) => a.number - b.number)
      .map((r) => ({
        number: r.number,
        text: r.text.trim(),
        status: r.status,
        deadline: r.deadline || null,
      })),
  });

  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

// ======================== TRACKING TOKENS ========================

/**
 * Generate an HMAC-signed tracking token for a specific send.
 * Format: base64url(reportId:recipientEmail:timestamp:hmac)
 */
export function generateTrackingToken(
  reportId: string,
  recipientEmail: string,
): string {
  const timestamp = Date.now().toString(36);
  const payload = `${reportId}:${recipientEmail}:${timestamp}`;
  const hmac = createHmac('sha256', getHmacSecret())
    .update(payload)
    .digest('base64url');

  // Encode full token as base64url
  const token = Buffer.from(`${payload}:${hmac}`).toString('base64url');
  return token;
}

/**
 * Verify and decode a tracking token.
 * Returns null if invalid or tampered.
 */
export function verifyTrackingToken(
  token: string,
): { reportId: string; recipientEmail: string; timestamp: number } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const parts = decoded.split(':');
    if (parts.length < 4) return null;

    // Last part is the HMAC, everything before it is the payload
    const hmacReceived = parts[parts.length - 1];
    const payload = parts.slice(0, -1).join(':');

    // Recompute HMAC
    const hmacExpected = createHmac('sha256', getHmacSecret())
      .update(payload)
      .digest('base64url');

    // Constant-time comparison
    const a = Buffer.from(hmacReceived);
    const b = Buffer.from(hmacExpected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

    // Parse payload: reportId:recipientEmail:timestamp
    // Email may contain ':', so we split carefully
    const reportId = parts[0];
    const timestamp = parseInt(parts[parts.length - 2], 36);
    // Email is everything between reportId and timestamp
    const recipientEmail = parts.slice(1, -2).join(':');

    if (!reportId || !recipientEmail || isNaN(timestamp)) return null;

    return { reportId, recipientEmail, timestamp };
  } catch {
    return null;
  }
}
