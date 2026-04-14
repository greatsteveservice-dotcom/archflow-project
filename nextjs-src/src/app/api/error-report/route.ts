import { NextRequest, NextResponse } from 'next/server';

// Client-side error reporter → Telegram
// Receives JS errors, unhandled rejections, and React error boundaries.
// Rate-limited: max 10 reports per IP per minute (in-memory).

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Simple in-memory rate limiter (per IP, resets every 60s)
const rateMap = new Map<string, { count: number; resetAt: number }>();
const MAX_PER_MINUTE = 10;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count++;
  return entry.count > MAX_PER_MINUTE;
}

// Cleanup stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of rateMap) {
    if (now > entry.resetAt) rateMap.delete(ip);
  }
}, 300_000);

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    if (isRateLimited(ip)) {
      return NextResponse.json({ ok: true, throttled: true });
    }

    const body = await request.json();
    const { message, stack, url, userAgent, userId, extra } = body;

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    const timestamp = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });

    const lines = [
      '\u{1F6A8} JS Error \u2014 ArchFlow',
      '',
      `Error: ${message.slice(0, 500)}`,
      stack ? `Stack: ${stack.slice(0, 800)}` : '',
      '',
      `URL: ${url || '\u2014'}`,
      `User: ${userId || 'anon'}`,
      `UA: ${(userAgent || '').slice(0, 100)}`,
      extra ? `Extra: ${JSON.stringify(extra).slice(0, 200)}` : '',
      '',
      `\u{1F552} ${timestamp}`,
    ].filter(Boolean);

    const text = lines.join('\n');

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.error('[ErrorReport]', text);
      return NextResponse.json({ ok: true, delivery: 'logged' });
    }

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text,
      }),
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}
