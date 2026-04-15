import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/telegram
 * Telegram Bot webhook handler.
 * 1. Support reply: Evgeny replies to a support thread → message saved & pushed to user via Realtime
 * 2. /start TOKEN: links Telegram account to ArchFlow notifications
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

function getSupabaseAdmin() {
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function sendTelegramMessage(chatId: number | string, text: string) {
  await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}

/**
 * Handle support reply from Evgeny.
 * Returns true if the message was handled as a support reply.
 */
async function handleSupportReply(message: any): Promise<boolean> {
  const chatId = String(message.chat.id);

  // Only process messages from Evgeny's chat
  if (chatId !== TELEGRAM_CHAT_ID) return false;

  // Must be a reply to a bot message containing thread_id
  if (!message.reply_to_message?.text) return false;

  const match = message.reply_to_message.text.match(/thread_id: ([a-f0-9-]{36})/);
  if (!match) return false;

  const threadId = match[1];
  const replyText = message.text?.trim();
  if (!replyText) return false;

  const supabase = getSupabaseAdmin();

  // Verify thread exists
  const { data: thread } = await supabase
    .from('support_threads')
    .select('id, user_name')
    .eq('id', threadId)
    .single();

  if (!thread) {
    await sendTelegramMessage(chatId, '❌ Тред не найден');
    return true;
  }

  // Save support reply
  await supabase.from('support_messages').insert({
    thread_id: threadId,
    sender: 'support',
    body: replyText,
    telegram_msg_id: message.message_id,
  });

  // Mark thread as having unread reply
  await supabase
    .from('support_threads')
    .update({
      has_unread: true,
      last_message: replyText,
      last_message_at: new Date().toISOString(),
    })
    .eq('id', threadId);

  await sendTelegramMessage(chatId, `✓ Ответ отправлен → ${thread.user_name || 'пользователь'}`);
  return true;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = body.message;

    if (!message?.text) {
      return NextResponse.json({ ok: true });
    }

    // 1. Try support reply first
    const handled = await handleSupportReply(message);
    if (handled) return NextResponse.json({ ok: true });

    const chatId = message.chat.id;
    const text = message.text.trim();
    const userName = message.from?.first_name || 'пользователь';

    // 2. Handle /start TOKEN
    if (text.startsWith('/start ')) {
      const token = text.replace('/start ', '').trim();

      if (!token || token.length < 10) {
        await sendTelegramMessage(chatId, '❌ Некорректный токен. Попробуйте ещё раз из настроек ArchFlow.');
        return NextResponse.json({ ok: true });
      }

      const supabaseAdmin = getSupabaseAdmin();

      const { data: pref, error: findErr } = await supabaseAdmin
        .from('notification_preferences')
        .select('id, user_id, project_id')
        .eq('telegram_link_token', token)
        .maybeSingle();

      if (findErr || !pref) {
        await sendTelegramMessage(chatId, '❌ Токен не найден или уже использован. Сгенерируйте новую ссылку в настройках ArchFlow.');
        return NextResponse.json({ ok: true });
      }

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

    // 3. Handle /start without token
    if (text === '/start') {
      await sendTelegramMessage(
        chatId,
        `👋 Привет, ${userName}!\n\nЧтобы привязать Telegram к ArchFlow, зайдите в Настройки проекта → Уведомления и нажмите «Привязать Telegram».`
      );
      return NextResponse.json({ ok: true });
    }

    // 4. Any other message from Evgeny's chat — might be a support reply without quoting
    // (only if there's a recent unanswered thread)
    if (String(chatId) === TELEGRAM_CHAT_ID) {
      const supabase = getSupabaseAdmin();

      // Find most recent thread with an unanswered user message
      const { data: recentThread } = await supabase
        .from('support_threads')
        .select('id, user_name')
        .order('last_message_at', { ascending: false })
        .limit(1)
        .single();

      if (recentThread) {
        // Check if last message in thread was from user (unanswered)
        const { data: lastMsg } = await supabase
          .from('support_messages')
          .select('sender')
          .eq('thread_id', recentThread.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (lastMsg?.sender === 'user') {
          await supabase.from('support_messages').insert({
            thread_id: recentThread.id,
            sender: 'support',
            body: text,
            telegram_msg_id: message.message_id,
          });

          await supabase
            .from('support_threads')
            .update({
              has_unread: true,
              last_message: text,
              last_message_at: new Date().toISOString(),
            })
            .eq('id', recentThread.id);

          await sendTelegramMessage(chatId, `✓ Ответ отправлен → ${recentThread.user_name || 'пользователь'}`);
          return NextResponse.json({ ok: true });
        }
      }
    }

    // 5. Fallback for unknown messages
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
