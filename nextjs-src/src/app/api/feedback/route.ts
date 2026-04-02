import { NextRequest, NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

export async function POST(req: NextRequest) {
  try {
    const { text, userEmail, userName, userRole, projectName, imageUrl } = await req.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Текст обязателен" }, { status: 400 });
    }

    if (text.trim().length > 2000) {
      return NextResponse.json({ error: "Слишком длинное сообщение" }, { status: 400 });
    }

    // Role labels for readable output
    const ROLE_LABELS: Record<string, string> = {
      designer: 'Дизайнер',
      client: 'Заказчик',
      contractor: 'Подрядчик',
      supplier: 'Комплектатор',
      assistant: 'Ассистент',
    };

    // Build Telegram message
    const lines = [
      "📩 *Новый фидбек — ArchFlow*",
      "",
      `От: ${userName || "Аноним"} (${userEmail || "нет email"})`,
      `Роль: ${userRole ? (ROLE_LABELS[userRole] || userRole) : "—"}`,
      `Проект: ${projectName || "—"}`,
      "———",
      text.trim(),
      "",
      `🕐 ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })}`,
    ];
    if (imageUrl) {
      lines.push(`📎 ${imageUrl}`);
    }
    const message = lines.join("\n");

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      // Fallback: log to server console if Telegram not configured
      console.log("[Feedback]", message);
      return NextResponse.json({ ok: true, delivery: "logged" });
    }

    // Send to Telegram
    const tgRes = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

    if (!tgRes.ok) {
      const err = await tgRes.text();
      console.error("[Feedback] Telegram error:", err);
      return NextResponse.json({ ok: true, delivery: "telegram_error" });
    }

    return NextResponse.json({ ok: true, delivery: "telegram" });
  } catch (err) {
    console.error("[Feedback] Error:", err);
    return NextResponse.json({ error: "Ошибка сервера" }, { status: 500 });
  }
}
