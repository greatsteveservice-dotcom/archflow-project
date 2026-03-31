import { NextRequest, NextResponse } from 'next/server';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../../../lib/api-auth';

/**
 * POST /api/push/send
 * Sends push notifications to all subscribed members of a project
 * (except the sender).
 *
 * SECURITY: Requires a valid Supabase JWT in Authorization header.
 * The senderUserId from the body MUST match the authenticated user.
 *
 * Body: { projectId, senderUserId, senderName, text }
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY!;

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:hello@archflow.ru', VAPID_PUBLIC, VAPID_PRIVATE);
}

export async function POST(req: NextRequest) {
  try {
    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return NextResponse.json({ error: 'VAPID keys not configured' }, { status: 500 });
    }

    // ── Auth check ──────────────────────────────────────
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    const { projectId, senderUserId, senderName, text } = await req.json();

    if (!projectId || !senderUserId || !text) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the claimed senderUserId matches the JWT
    if (senderUserId !== auth.user.id) {
      return NextResponse.json(
        { error: 'senderUserId does not match authenticated user' },
        { status: 403 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Get project title
    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('title')
      .eq('id', projectId)
      .single();

    // 2. Get all project members (excluding sender and contractors)
    const { data: members } = await supabaseAdmin
      .from('project_members')
      .select('user_id')
      .eq('project_id', projectId)
      .neq('user_id', senderUserId)
      .not('role', 'eq', 'contractor');

    if (!members || members.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    const recipientIds = members.map((m) => m.user_id);

    // 3. Get push subscriptions for these users
    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .in('user_id', recipientIds);

    if (!subs || subs.length === 0) {
      return NextResponse.json({ sent: 0 });
    }

    // 4. Build notification payload
    const projectTitle = project?.title || 'Проект';
    const displayName = senderName || 'Участник';
    const shortText = text.length > 100 ? text.slice(0, 97) + '...' : text;

    const payload = JSON.stringify({
      title: projectTitle,
      body: `${displayName}: ${shortText}`,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      data: { projectId },
    });

    // 5. Send to all subscriptions in parallel
    const results = await Promise.allSettled(
      subs.map(async (sub) => {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth_key },
        };
        try {
          await webpush.sendNotification(pushSub, payload);
          return { success: true, userId: sub.user_id };
        } catch (err: any) {
          // 410 Gone or 404 = subscription expired, clean up
          if (err.statusCode === 410 || err.statusCode === 404) {
            await supabaseAdmin
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
          }
          return { success: false, userId: sub.user_id, error: err.message };
        }
      })
    );

    const sent = results.filter(
      (r) => r.status === 'fulfilled' && (r.value as any).success
    ).length;

    return NextResponse.json({ sent, total: subs.length });
  } catch (err: any) {
    console.error('Push send error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
