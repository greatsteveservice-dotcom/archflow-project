import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../../lib/api-auth';

// ============================================================
// POST /api/reports/[reportId]/acknowledge
// ============================================================
// Client confirms they've reviewed the report.
// Updates email_sends status → confirmed.
// ============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(
  request: NextRequest,
  { params }: { params: { reportId: string } },
) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const userId = auth.user.id;

    const { reportId } = params;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify user is a client member of this project
    const { data: emailSend } = await supabaseAdmin
      .from('email_sends')
      .select('id, status, project_id')
      .eq('report_id', reportId)
      .eq('recipient_user_id', userId)
      .single();

    if (!emailSend) {
      return NextResponse.json({ error: 'No email send found for this user/report' }, { status: 404 });
    }

    // Only allow confirming if status is delivered or opened
    const confirmableStatuses = ['sent', 'delivered', 'opened'];
    if (!confirmableStatuses.includes(emailSend.status)) {
      return NextResponse.json({ error: 'Cannot confirm in current status', status: emailSend.status }, { status: 400 });
    }

    // Update status
    await supabaseAdmin
      .from('email_sends')
      .update({
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_by: userId,
      })
      .eq('id', emailSend.id);

    // Log event
    await supabaseAdmin.from('email_events').insert({
      email_send_id: emailSend.id,
      event_type: 'client.confirmed',
      raw_payload: { userId, reportId },
      ip_address: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || '',
      user_agent: (request.headers.get('user-agent') || '').slice(0, 200),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Acknowledge] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
