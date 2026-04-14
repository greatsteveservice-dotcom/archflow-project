import { NextRequest, NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// Resend Webhook Handler
// ============================================================
// Receives email delivery events from Resend via Svix.
// Logs to email_events, updates email_sends status.
// Uses service role to bypass RLS.
// ============================================================

const WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Status progression: only allow forward transitions
const STATUS_ORDER: Record<string, number> = {
  sending: 0,
  sent: 1,
  delivered: 2,
  opened: 3,
  bounced: 99, // terminal
  confirmed: 4,
  auto_accepted: 5,
};

// Map Resend event types to our status
const EVENT_TO_STATUS: Record<string, string> = {
  'email.sent': 'sent',
  'email.delivered': 'delivered',
  'email.bounced': 'bounced',
  'email.clicked': 'opened',
  'email.opened': 'opened',
};

export async function POST(request: NextRequest) {
  try {
    if (!WEBHOOK_SECRET) {
      console.error('[Webhook] RESEND_WEBHOOK_SECRET not configured');
      return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
    }

    // Get raw body for signature verification
    const body = await request.text();

    // Verify Svix signature
    const svixId = request.headers.get('svix-id') || '';
    const svixTimestamp = request.headers.get('svix-timestamp') || '';
    const svixSignature = request.headers.get('svix-signature') || '';

    const wh = new Webhook(WEBHOOK_SECRET);
    let payload: Record<string, unknown>;

    try {
      payload = wh.verify(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as Record<string, unknown>;
    } catch {
      console.error('[Webhook] Signature verification failed');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const eventType = (payload.type as string) || '';
    const data = payload.data as Record<string, unknown> | undefined;
    const resendEmailId = (data?.email_id as string) || '';

    if (!resendEmailId) {
      // Some events don't have email_id, just log and return
      return NextResponse.json({ ok: true, skipped: true });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find the email_send by resend_email_id
    const { data: emailSend } = await supabaseAdmin
      .from('email_sends')
      .select('id, status')
      .eq('resend_email_id', resendEmailId)
      .single();

    if (!emailSend) {
      // Not our email, ignore
      return NextResponse.json({ ok: true, skipped: true });
    }

    // Log event to audit trail
    await supabaseAdmin.from('email_events').insert({
      email_send_id: emailSend.id,
      resend_email_id: resendEmailId,
      event_type: eventType,
      raw_payload: payload,
    });

    // Update status with forward-only protection
    const newStatus = EVENT_TO_STATUS[eventType];
    if (newStatus) {
      const currentOrder = STATUS_ORDER[emailSend.status] ?? 0;
      const newOrder = STATUS_ORDER[newStatus] ?? 0;

      // Only progress forward (except bounced which is terminal)
      if (newOrder > currentOrder || newStatus === 'bounced') {
        const updates: Record<string, unknown> = { status: newStatus };

        // Set timestamp fields
        if (newStatus === 'sent') updates.sent_at = new Date().toISOString();
        if (newStatus === 'delivered') updates.delivered_at = new Date().toISOString();
        if (newStatus === 'opened') updates.opened_at = new Date().toISOString();

        await supabaseAdmin
          .from('email_sends')
          .update(updates)
          .eq('id', emailSend.id);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Webhook] Error:', err);
    return NextResponse.json({ ok: true }); // Don't leak errors to Resend
  }
}
