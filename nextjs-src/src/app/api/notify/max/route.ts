import { NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/notify/max
 * Sends a message via MAX Bot API.
 * Called from client-side notifications.ts.
 */

const MAX_BOT_TOKEN = process.env.MAX_BOT_TOKEN || '';
const MAX_API = 'https://platform-api.max.ru';

export async function POST(req: NextRequest) {
  try {
    const { chatId, message } = await req.json();

    if (!chatId || !message) {
      return NextResponse.json({ error: 'chatId and message required' }, { status: 400 });
    }

    if (!MAX_BOT_TOKEN) {
      return NextResponse.json({ error: 'MAX_BOT_TOKEN not configured' }, { status: 500 });
    }

    const res = await fetch(`${MAX_API}/messages?user_id=${chatId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': MAX_BOT_TOKEN,
      },
      body: JSON.stringify({ text: message }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[notify/max] MAX API error:', errText);
      return NextResponse.json({ error: 'MAX API error' }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('[notify/max] Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
