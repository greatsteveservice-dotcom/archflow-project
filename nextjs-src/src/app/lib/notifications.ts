// ============================================================
// Archflow: Notification sending utility
// ============================================================
//
// Usage:
//   import { sendNotification } from './notifications';
//   await sendNotification({ user_id, project_id, message, urgent: false });
//
// Channels: Email (Resend), Telegram (Bot API), Web Push.
// Schedule is respected unless urgent=true.
// ============================================================

import { supabase } from './supabase';
import type { NotificationPreferences } from './types';

interface SendNotificationParams {
  user_id: string;
  project_id: string;
  message: string;
  urgent?: boolean;
  subject?: string;  // Email subject (defaults to "ArchFlow")
}

interface NotificationResult {
  email: boolean;
  telegram: boolean;
  max: boolean;
  push: boolean;
  skipped_schedule: boolean;
}

/**
 * Check if current time is within the user's notification schedule.
 * Returns true if notifications should be sent now.
 */
function isWithinSchedule(prefs: NotificationPreferences): boolean {
  const now = new Date();
  const moscowOffset = 3; // UTC+3
  const utcHour = now.getUTCHours();
  const moscowHour = (utcHour + moscowOffset) % 24;
  const moscowMinutes = now.getUTCMinutes();
  const currentTime = moscowHour * 60 + moscowMinutes;
  const dayOfWeek = now.getUTCDay(); // 0=Sun, 6=Sat

  switch (prefs.schedule_type) {
    case 'any':
      return true;

    case 'work_hours_weekend': {
      // Mon-Sat 09:00-20:00
      if (dayOfWeek === 0) return false; // Sunday off
      const from = 9 * 60;  // 09:00
      const to = 20 * 60;   // 20:00
      return currentTime >= from && currentTime < to;
    }

    case 'work_hours': {
      // Mon-Fri 09:00-18:00
      if (dayOfWeek === 0 || dayOfWeek === 6) return false;
      const from = 9 * 60;
      const to = 18 * 60;
      return currentTime >= from && currentTime < to;
    }

    case 'custom': {
      const [fromH, fromM] = (prefs.schedule_from || '09:00').split(':').map(Number);
      const [toH, toM] = (prefs.schedule_to || '20:00').split(':').map(Number);
      const from = fromH * 60 + fromM;
      const to = toH * 60 + toM;
      // If weekends disabled and it's weekend
      if (!prefs.schedule_weekends && (dayOfWeek === 0 || dayOfWeek === 6)) return false;
      return currentTime >= from && currentTime < to;
    }

    default:
      return true;
  }
}

/**
 * Send notification via Email using Resend (through our API route).
 */
async function sendEmail(email: string, subject: string, message: string): Promise<boolean> {
  try {
    // Use server-side API route for email sending
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return false;

    const res = await fetch('/api/notify/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email, subject, message }),
    });
    return res.ok;
  } catch {
    console.error('[Notifications] Email send failed');
    return false;
  }
}

/**
 * Send notification via Telegram Bot API.
 */
async function sendTelegram(chatId: string, message: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return false;

    const res = await fetch('/api/notify/telegram', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ chatId, message }),
    });
    return res.ok;
  } catch {
    console.error('[Notifications] Telegram send failed');
    return false;
  }
}

/**
 * Send notification via MAX Bot API.
 */
async function sendMax(chatId: string, message: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return false;

    const res = await fetch('/api/notify/max', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ chatId, message }),
    });
    return res.ok;
  } catch {
    console.error('[Notifications] MAX send failed');
    return false;
  }
}

/**
 * Send push notification via Web Push.
 */
async function sendPush(userId: string, projectId: string, message: string): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return false;

    const res = await fetch('/api/push/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        projectId,
        senderUserId: userId,
        senderName: 'ArchFlow',
        text: message,
      }),
    });
    return res.ok;
  } catch {
    console.error('[Notifications] Push send failed');
    return false;
  }
}

/**
 * Main notification sender.
 *
 * 1. Loads notification_preferences for user+project
 * 2. Checks schedule (unless urgent)
 * 3. Sends via enabled channels
 * 4. Returns results
 */
export async function sendNotification(params: SendNotificationParams): Promise<NotificationResult> {
  const { user_id, project_id, message, urgent = false, subject = 'ArchFlow' } = params;

  const result: NotificationResult = {
    email: false,
    telegram: false,
    max: false,
    push: false,
    skipped_schedule: false,
  };

  // 1. Load preferences
  const { data: prefs, error } = await supabase
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user_id)
    .eq('project_id', project_id)
    .maybeSingle();

  if (error || !prefs) {
    console.warn('[Notifications] No preferences found for user', user_id);
    return result;
  }

  // 2. Check schedule
  if (!urgent && !isWithinSchedule(prefs)) {
    console.log('[Notifications] Outside schedule, skipping non-urgent notification');
    result.skipped_schedule = true;
    return result;
  }

  // 3. Load user profile for email
  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user_id)
    .single();

  // 4. Send via enabled channels (parallel)
  const promises: Promise<void>[] = [];

  if (prefs.email_enabled && profile?.email) {
    promises.push(
      sendEmail(profile.email, subject, message).then(ok => { result.email = ok; })
    );
  }

  if (prefs.telegram_enabled && prefs.telegram_chat_id) {
    promises.push(
      sendTelegram(prefs.telegram_chat_id, message).then(ok => { result.telegram = ok; })
    );
  }

  if (prefs.max_enabled && prefs.max_chat_id) {
    promises.push(
      sendMax(prefs.max_chat_id, message).then(ok => { result.max = ok; })
    );
  }

  if (prefs.push_enabled) {
    promises.push(
      sendPush(user_id, project_id, message).then(ok => { result.push = ok; })
    );
  }

  await Promise.allSettled(promises);

  console.log('[Notifications] Sent:', result);
  return result;
}
