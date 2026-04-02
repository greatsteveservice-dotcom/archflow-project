import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/telegram
 * Telegram Bot webhook handler.
 * Processes /start TOKEN commands for linking Telegram to ArchFlow.
 *
 * Flow:
 * 1. User clicks "Привязать Telegram" in settings → generates token
 * 2. User opens t.me/archflow_bot?start=TOKEN
 * 3. Telegram sends /start TOKEN to this webhook
 * 4. We find the token in notification_preferences → save chat_id
 * 5. Reply to user confirming the link
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function sendTelegramMessage(chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.message;

    if (!message?.text) {
      return NextResponse.json({ ok: true });
    }

    const chatId = message.chat.id;
    const text = message.text.trim();
    const userName = message.from?.first_name || 'пользователь';

    // Handle /start TOKEN
    if (text.startsWith('/start ')) {
      const token = text.replace('/start ', '').trim();

      if (!token || token.length < 10) {
        await sendTelegramMessage(chatId, '❌ Некорректный токен. Попробуйте ещё раз из настроек ArchFlow.');
        return NextResponse.json({ ok: true });
      }

      const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // Find the row with this token
      const { data: pref, error: findErr } = await supabaseAdmin
        .from('notification_preferences')
        .select('id, user_id, project_id')
        .eq('telegram_link_token', token)
        .maybeSingle();

      if (findErr || !pref) {
        await sendTelegramMessage(chatId, '❌ Токен не найден или уже использован. Сгенерируйте новую ссылку в настройках ArchFlow.');
        return NextResponse.json({ ok: true });
      }

      // Update: save chat_id, enable telegram, clear token
      const { error: updateErr } = await supabaseAdmin
        .from('notification_preferences')
        .update({
          telegram_chat_id: String(chatId),
          telegram_enabled: true,
          telegram_link_token: null,
        })
        .eq('id', pref.id);

      if (updateErr) {
        console.error('[Telegram Bot] Update error:', updateErr);
        await sendTelegramMessage(chatId, '❌ Ошибка привязки. Попробуйте позже.');
        return NextResponse.json({ ok: true });
      }

      await sendTelegramMessage(
        chatId,
        `✅ Telegram привязан к ArchFlow!\n\n${userName}, теперь вы будете получать уведомления о проекте в этот чат.`
      );

      return NextResponse.json({ ok: true });
    }

    // Handle /start without token
    if (text === '/start') {
      await sendTelegramMessage(
        chatId,
        `👋 Привет, ${userName}!\n\nЧтобы привязать Telegram к ArchFlow, зайдите в *Настройки проекта → Уведомления* и нажмите «Привязать Telegram».`
      );
      return NextResponse.json({ ok: true });
    }

    // Any other message
    await sendTelegramMessage(
      chatId,
      'Я бот ArchFlow. Чтобы привязать Telegram, зайдите в настройки проекта на archflow.ru.'
    );

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Telegram Bot] Error:', err);
    return NextResponse.json({ ok: true }); // Always 200 for Telegram
  }
}
