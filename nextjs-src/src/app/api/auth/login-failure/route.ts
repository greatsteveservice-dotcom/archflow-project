// Beacon-эндпоинт: клиент шлёт сюда POST когда signIn() упал с network error
// уже после автоматического retry. Сервер агрегирует и шлёт в Telegram, чтобы
// репортить новые волны RU-мобайл-блокировок ДО того как юзеры начнут жаловаться.
//
// Принципиальные ограничения:
// - Никаких паролей не принимаем, никогда. Только email + тип ошибки + UA.
// - Сам эндпоинт всегда возвращает 200, чтобы не плодить вторичные ошибки.
// - Rate-limit на отправку в Telegram: не чаще 1 алерта в 5 минут на инстанс
//   (модульная переменная — для одного Next-инстанса достаточно).

import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

const ALERT_THROTTLE_MS = 5 * 60 * 1000;
let _lastAlertAt = 0;
let _failuresSinceLastAlert = 0;
const _recentEmails = new Set<string>();

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      email?: unknown;
      errorMessage?: unknown;
      errorName?: unknown;
      stage?: unknown; // "primary" | "retry"
      userAgent?: unknown;
      url?: unknown;
    };

    // Sanitize — ничего длиннее 200 символов и никаких объектов
    const sanitize = (v: unknown, max = 200) =>
      typeof v === "string" ? v.slice(0, max).replace(/[<>]/g, "") : "";

    const email = sanitize(body.email, 120);
    const errorMessage = sanitize(body.errorMessage, 200);
    const errorName = sanitize(body.errorName, 60);
    const stage = sanitize(body.stage, 20) || "primary";
    const userAgent = sanitize(body.userAgent, 200) || sanitize(req.headers.get("user-agent") || "", 200);
    const url = sanitize(body.url, 200);
    const ip =
      req.headers.get("cf-connecting-ip") ||
      (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() ||
      "—";

    _failuresSinceLastAlert += 1;
    if (email) _recentEmails.add(email);

    const now = Date.now();
    if (now - _lastAlertAt < ALERT_THROTTLE_MS) {
      // Аггрегируем без отправки
      return NextResponse.json({ ok: true, throttled: true });
    }

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn("[login-failure]", { email, errorMessage, errorName, stage, userAgent, url, ip });
      return NextResponse.json({ ok: true, delivery: "logged" });
    }

    const aggregated = _failuresSinceLastAlert;
    const emails = Array.from(_recentEmails).slice(0, 5).join(", ") || "—";
    _failuresSinceLastAlert = 0;
    _recentEmails.clear();
    _lastAlertAt = now;

    const lines = [
      "ARCHFLOW LOGIN-FAIL",
      `Failures за окно: ${aggregated}`,
      `Stage: ${stage} (после авто-retry уже)`,
      `Error: ${errorName}: ${errorMessage}`,
      `UA: ${userAgent}`,
      `URL: ${url}`,
      `IP: ${ip}`,
      `Last emails: ${emails}`,
      `Time: ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}`,
    ];

    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: lines.join("\n") }),
    }).catch((e) => {
      console.error("[login-failure] telegram error", e);
    });

    return NextResponse.json({ ok: true, delivery: "telegram" });
  } catch (err) {
    console.error("[login-failure] handler error", err);
    // Никогда не возвращаем 500 чтобы не каскадировать ошибки в клиента
    return NextResponse.json({ ok: true, delivery: "error" });
  }
}
