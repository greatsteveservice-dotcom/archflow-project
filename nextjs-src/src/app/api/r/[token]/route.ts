import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyTrackingToken } from '../../../lib/evidence';

// ============================================================
// Click Tracking Redirect — GET /api/r/[token]
// ============================================================
// Verifies HMAC token, logs click event, updates email_sends
// status to 'opened', then redirects to report in the SPA.
// ============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://archflow.ru';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } },
) {
  const { token } = params;

  // 1. Verify token
  const decoded = verifyTrackingToken(token);
  if (!decoded) {
    // Invalid token → redirect to home
    return NextResponse.redirect(`${BASE_URL}/`);
  }

  const { reportId, recipientEmail } = decoded;

  try {
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 2. Find the email_send
    const { data: emailSend } = await supabaseAdmin
      .from('email_sends')
      .select('id, status, project_id')
      .eq('tracking_token', token)
      .single();

    if (emailSend) {
      const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '';
      const userAgent = request.headers.get('user-agent') || '';

      // 3. Log click event
      await supabaseAdmin.from('email_events').insert({
        email_send_id: emailSend.id,
        event_type: 'link.clicked',
        raw_payload: { recipientEmail, reportId, source: 'tracked_link' },
        ip_address: ip,
        user_agent: userAgent.slice(0, 200),
      });

      // 4. Update status to opened (forward-only)
      const STATUS_ORDER: Record<string, number> = {
        sending: 0, sent: 1, delivered: 2, opened: 3,
        bounced: 99, confirmed: 4, auto_accepted: 5,
      };
      const currentOrder = STATUS_ORDER[emailSend.status] ?? 0;
      if (currentOrder < STATUS_ORDER.opened) {
        await supabaseAdmin
          .from('email_sends')
          .update({ status: 'opened', opened_at: new Date().toISOString() })
          .eq('id', emailSend.id);
      }

      // 5. Redirect to report in the SPA
      const projectId = emailSend.project_id;
      return NextResponse.redirect(
        `${BASE_URL}/projects/${projectId}/journal?report=${reportId}`,
      );
    }
  } catch (err) {
    console.error('[ClickTrack] Error:', err);
  }

  // Fallback: redirect to home
  return NextResponse.redirect(`${BASE_URL}/`);
}
