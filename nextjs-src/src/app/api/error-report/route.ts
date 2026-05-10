import { NextRequest, NextResponse } from 'next/server';

// Client-side error reporter → Telegram
// Receives JS errors, unhandled rejections, and React error boundaries.
// Rate-limited: max 10 reports per IP per minute (in-memory).
//
// Сервер форматирует понятное русское сообщение для бота: распознаёт
// типичные категории ошибок и пишет, что произошло и как реагировать.
// Сырые message/stack идут в конце как тех-детали для отладки.

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

// Категории ошибок с человеческим описанием. Порядок важен — берём первую,
// у которой совпал паттерн.
type Category = {
  match: RegExp;
  emoji: string;
  title: string;       // Что произошло (одна короткая фраза)
  hint: string;        // Что это значит / что делать
  severity: 'low' | 'medium' | 'high';
};

const CATEGORIES: Category[] = [
  {
    match: /Failed to fetch|NetworkError|net::ERR_/i,
    emoji: '\u{1F310}', // 🌐
    title: 'Сетевой запрос не дошёл',
    hint: 'У пользователя пропал интернет или CORS/нгинкс отвалился. Проверять надо только если повторяется массово.',
    severity: 'low',
  },
  {
    match: /supabase|getSession|getUser|postgres|JWT|Row Level Security/i,
    emoji: '\u{1F5C4}\uFE0F', // 🗄️
    title: 'Ошибка обращения к Supabase',
    hint: 'Запрос к базе или auth провалился. Проверь /home/archflow/healthcheck.sh, RLS-политику и логи Postgres.',
    severity: 'high',
  },
  {
    match: /TypeError.*undefined|Cannot read propert(?:y|ies) of (undefined|null)/i,
    emoji: '\u26A0\uFE0F', // ⚠️
    title: 'Доступ к undefined/null',
    hint: 'Где-то .x по необъявленному объекту. Скорее всего пропустили опциональный chaining (?.) или гонка состояния.',
    severity: 'high',
  },
  {
    match: /Hydration failed|Text content does not match|server-rendered HTML/i,
    emoji: '\u{1F501}', // 🔁
    title: 'Hydration mismatch',
    hint: 'SSR-рендер не совпал с клиентским. Чаще всего: Date.now/Math.random в JSX, локаль, незаявленный useEffect.',
    severity: 'medium',
  },
  {
    match: /Maximum (call stack|update depth)|infinite (loop|render)/i,
    emoji: '\u{1F300}', // 🌀
    title: 'Бесконечный цикл / рекурсия',
    hint: 'useEffect без правильных deps или setState в render. Нужно открыть указанный файл в стек-трейсе.',
    severity: 'high',
  },
  {
    match: /Quota|QuotaExceeded|exceeded the quota/i,
    emoji: '\u{1F4E6}', // 📦
    title: 'Закончилось место в localStorage / IndexedDB',
    hint: 'У пользователя забит браузерный storage. Если массово — нужно подумать о cleanup или sw cache cleanup.',
    severity: 'low',
  },
  {
    match: /storage.*payload too large|413|exceeds maximum|file too large|content-length/i,
    emoji: '\u{1F4E4}', // 📤
    title: 'Файл слишком большой',
    hint: 'Превышен лимит загрузки. Проверь nginx client_max_body_size и Storage FILE_SIZE_LIMIT.',
    severity: 'low',
  },
  {
    match: /permission denied|forbidden|403|RLS/i,
    emoji: '\u{1F512}', // 🔒
    title: 'Доступ запрещён',
    hint: 'У пользователя нет прав на действие. Если это designer/owner — проверить RLS политику.',
    severity: 'medium',
  },
];

function categorize(message: string, stack?: string): Category {
  const haystack = `${message}\n${stack || ''}`;
  for (const cat of CATEGORIES) {
    if (cat.match.test(haystack)) return cat;
  }
  return {
    match: /./,
    emoji: '\u{1F41B}', // 🐛
    title: 'Не классифицированная ошибка',
    hint: 'Паттерн пока не описан в error-report/route.ts — посмотри stack и реши, добавлять ли категорию.',
    severity: 'medium',
  };
}

function shortBrowser(ua: string): string {
  if (!ua) return '\u2014';
  const m = ua;
  // Самые ходовые: iOS, Android, Chrome, Safari, Firefox, Edge
  if (/iPhone|iPad/.test(m)) {
    const v = m.match(/iPhone OS ([\d_]+)|iPad.*OS ([\d_]+)/);
    return `iOS ${(v?.[1] || v?.[2] || '?').replace(/_/g, '.')} · Safari`;
  }
  if (/Android/.test(m)) {
    const a = m.match(/Android ([\d.]+)/);
    const c = m.match(/Chrome\/([\d.]+)/);
    return `Android ${a?.[1] || '?'} · Chrome ${c?.[1]?.split('.')[0] || '?'}`;
  }
  if (/Edg\//.test(m)) {
    const v = m.match(/Edg\/([\d.]+)/);
    return `Edge ${v?.[1]?.split('.')[0] || '?'}`;
  }
  if (/Firefox\//.test(m)) {
    const v = m.match(/Firefox\/([\d.]+)/);
    return `Firefox ${v?.[1]?.split('.')[0] || '?'}`;
  }
  if (/Chrome\//.test(m)) {
    const v = m.match(/Chrome\/([\d.]+)/);
    return `Chrome ${v?.[1]?.split('.')[0] || '?'}`;
  }
  if (/Safari\//.test(m)) {
    const v = m.match(/Version\/([\d.]+)/);
    return `Safari ${v?.[1] || '?'}`;
  }
  return m.slice(0, 60);
}

function shortRoute(url: string): string {
  if (!url) return '\u2014';
  try {
    const u = new URL(url);
    let path = u.pathname;
    // Маскируем UUID/числовые ID, чтобы группировать ошибки по «маршруту»
    path = path.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ':id');
    path = path.replace(/\/\d{2,}/g, '/:n');
    return path || '/';
  } catch {
    return url.slice(0, 80);
  }
}

const SEVERITY_LABEL: Record<Category['severity'], string> = {
  low: 'фон',
  medium: 'обратить внимание',
  high: 'разобраться',
};

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

    const cat = categorize(message, stack);
    const timestamp = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });

    const lines = [
      `${cat.emoji} ${cat.title} \u2014 ArchFlow`,
      `\u{1F6A6} ${SEVERITY_LABEL[cat.severity]}`,
      '',
      cat.hint,
      '',
      `\u{1F4CD} Маршрут: ${shortRoute(url || '')}`,
      `\u{1F464} Пользователь: ${userId || 'не вошёл'}`,
      `\u{1F4F1} Браузер: ${shortBrowser(userAgent || '')}`,
      extra && Object.keys(extra).length > 0 ? `\u2139\uFE0F Контекст: ${JSON.stringify(extra).slice(0, 200)}` : '',
      '',
      '\u2500\u2500\u2500 техдетали \u2500\u2500\u2500',
      `${message.slice(0, 400)}`,
      stack ? stack.slice(0, 600) : '',
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
