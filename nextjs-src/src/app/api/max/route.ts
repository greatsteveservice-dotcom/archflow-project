import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/max
 * MAX Bot webhook handler.
 * Processes bot_started events for linking MAX to ArchFlow.
 *
 * Flow:
 * 1. User clicks "Привязать MAX" in settings → generates token
 * 2. User opens https://max.ru/archflow_bot?start=TOKEN
 * 3. MAX sends bot_started event with payload=TOKEN to this webhook
 * 4. We find the token in notification_preferences → save max_chat_id
 * 5. Reply to user confirming the link
 */

const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN || '';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const MAX_API = 'https://platform-api.max.ru';

async function sendMaxMessage(userId: number, text: string) {
  if (!MAX_BOT_TOKEN) return;
  await fetch(`${MAX_API}/messages?user_id=${userId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': MAX_BOT_TOKEN,
    },
    body: JSON.stringify({ text }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // MAX webhook sends updates with update_type field
    const updateType = body.update_type;

    // Handle bot_started — user clicked /start with payload
    if (updateType === 'bot_started') {
      const userId = body.user?.user_id;
      const payload = body.payload; // Our link token
      const chatId = body.chat_id;
      const userName = body.user?.name || 'пользователь';

      if (!userId) {
        return NextResponse.json({ ok: true });
      }

      // If no payload, user just started the bot without a token
      if (!payload || payload.length < 10) {
        await sendMaxMessage(userId,
          `👋 Привет, ${userName}!\n\nЧтобы привязать MAX к ArchFlow, зайдите в Настройки проекта → Уведомления и нажмите «Привязать».`
        );
        return NextResponse.json({ ok: true });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Find the row with this token
      const { data: pref, error: findErr } = await supabaseAdmin
        .from('notification_preferences')
        .select('id, user_id, project_id')
        .eq('max_link_token', payload)
        .maybeSingle();

      if (findErr || !pref) {
        await sendMaxMessage(userId,
          '❌ Токен не найден или уже использован. Сгенерируйте новую ссылку в настройках ArchFlow.'
        );
        return NextResponse.json({ ok: true });
      }

      // Update: save chat_id (use userId for sending messages), enable max, clear token
      const { error: updateErr } = await supabaseAdmin
        .from('notification_preferences')
        .update({
          max_chat_id: String(userId),
          max_enabled: true,
          max_link_token: null,
        })
        .eq('id', pref.id);

      if (updateErr) {
        console.error('[MAX Bot] Update error:', updateErr);
        await sendMaxMessage(userId, '❌ Ошибка привязки. Попробуйте позже.');
        return NextResponse.json({ ok: true });
      }

      await sendMaxMessage(userId,
        `✅ MAX привязан к ArchFlow!\n\n${userName}, теперь вы будете получать уведомления о проекте в этот чат.`
      );

      return NextResponse.json({ ok: true });
    }

    // Handle message_created — user sends a message to bot
    if (updateType === 'message_created') {
      const userId = body.message?.sender?.user_id;
      if (userId) {
        await sendMaxMessage(userId,
          'Я бот ArchFlow. Чтобы привязать MAX, зайдите в настройки проекта на archflow.ru.'
        );
      }
      return NextResponse.json({ ok: true });
    }

    // Unknown update type
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[MAX Bot] Error:', err);
    return NextResponse.json({ ok: true }); // Always 200 for webhooks
  }
}
