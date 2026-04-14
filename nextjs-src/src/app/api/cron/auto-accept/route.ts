import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force dynamic rendering (uses searchParams)
export const dynamic = 'force-dynamic';

// ============================================================
// GET /api/cron/auto-accept?secret=...
// ============================================================
// Cron job: auto-accept delivered/opened reports after 3
// business days without explicit client confirmation.
// Runs daily at 9:00 MSK from VPS cron.
// ============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const CRON_SECRET = process.env.CRON_SECRET || '';

/**
 * Count business days back from now.
 * Returns a Date that is N business days ago.
 */
function subtractBusinessDays(days: number): Date {
  const date = new Date();
  let remaining = days;
  while (remaining > 0) {
    date.setDate(date.getDate() - 1);
    const dow = date.getDay();
    if (dow !== 0 && dow !== 6) remaining--;
  }
  return date;
}

export async function GET(request: NextRequest) {
  try {
    // Simple secret-based auth for cron
    const secret = request.nextUrl.searchParams.get('secret');
    if (!CRON_SECRET || secret !== CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Auto-accept sends that are delivered/opened and older than 3 business days
    const cutoff = subtractBusinessDays(3).toISOString();

    const { data: pendingSends } = await supabaseAdmin
      .from('email_sends')
      .select('id, status')
      .in('status', ['delivered', 'opened'])
      .lt('sent_at', cutoff);

    if (!pendingSends || pendingSends.length === 0) {
      return NextResponse.json({ ok: true, autoAccepted: 0 });
    }

    let count = 0;
    for (const send of pendingSends) {
      const { error } = await supabaseAdmin
        .from('email_sends')
        .update({
          status: 'auto_accepted',
          auto_accepted_at: new Date().toISOString(),
        })
        .eq('id', send.id);

      if (!error) {
        // Log event
        await supabaseAdmin.from('email_events').insert({
          email_send_id: send.id,
          event_type: 'system.auto_accepted',
          raw_payload: { cutoff, previousStatus: send.status },
        });
        count++;
      }
    }

    return NextResponse.json({ ok: true, autoAccepted: count });
  } catch (err) {
    console.error('[AutoAccept] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
