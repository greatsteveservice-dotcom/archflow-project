import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN!;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID!;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    // Extract auth token from request
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verify user from JWT
    const token = authHeader.replace('Bearer ', '');
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(token);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { body, context, attachment_url } = await req.json();
    if (!body || typeof body !== 'string' || body.trim().length === 0) {
      return NextResponse.json({ error: 'Body is required' }, { status: 400 });
    }

    // Get or create thread for this user
    let { data: thread } = await supabase
      .from('support_threads')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!thread) {
      // Get user profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user.id)
        .single();

      const { data: newThread } = await supabase
        .from('support_threads')
        .insert({
          user_id: user.id,
          user_email: profile?.email || user.email,
          user_name: profile?.full_name || user.email,
          telegram_chat_id: parseInt(TELEGRAM_CHAT_ID),
          last_message: body.trim(),
          last_message_at: new Date().toISOString(),
        })
        .select('id')
        .single();
      thread = newThread;
    } else {
      await supabase
        .from('support_threads')
        .update({
          last_message: body.trim(),
          last_message_at: new Date().toISOString(),
        })
        .eq('id', thread!.id);
    }

    if (!thread) {
      return NextResponse.json({ error: 'Failed to create thread' }, { status: 500 });
    }

    // Save message — attachment URL is appended to body so it's visible in chat history.
    const fullBody = attachment_url
      ? `${body.trim()}\n\n📎 ${attachment_url}`
      : body.trim();
    await supabase.from('support_messages').insert({
      thread_id: thread.id,
      user_id: user.id,
      sender: 'user',
      body: fullBody,
    });

    // Get user name for Telegram notification
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();
    const userName = profile?.full_name || user.email || 'Пользователь';

    // Send to Telegram
    const lines = [
      `💬 Сообщение от ${userName}`,
      context?.project_name ? `📁 ${context.project_name}` : '',
      context?.page ? `📍 ${context.page}` : '',
      '',
      body.trim(),
      '',
      `thread_id: ${thread.id}`,
    ].filter(Boolean).join('\n');

    if (attachment_url) {
      // Send as photo with caption (Telegram captions limited to 1024 chars; truncate)
      const caption = lines.length > 1000 ? lines.slice(0, 1000) + '…' : lines;
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          photo: attachment_url,
          caption: lines,
        }),
      });
      void caption;
    } else {
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: lines,
        }),
      });
    }

    return NextResponse.json({ ok: true, thread_id: thread.id });
  } catch (err) {
    console.error('[Support] Error:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
