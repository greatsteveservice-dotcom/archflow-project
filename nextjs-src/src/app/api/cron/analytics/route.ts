import { NextRequest, NextResponse } from "next/server";

const METRIKA_API = "https://api-metrika.yandex.net/stat/v1/data";
const METRIKA_GOALS_API = "https://api-metrika.yandex.net/management/v1/counter";
const COUNTER_ID = process.env.NEXT_PUBLIC_METRIKA_ID || "108427895";
const METRIKA_TOKEN = process.env.METRIKA_OAUTH_TOKEN;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const CRON_SECRET = process.env.CRON_SECRET;

// ── Helpers ───────────────────────────────────────

function fmt(d: Date): string {
  return d.toISOString().split("T")[0];
}

function pct(cur: number, prev: number): string {
  if (prev === 0) return cur > 0 ? "+100%" : "=";
  const delta = ((cur - prev) / prev) * 100;
  if (Math.abs(delta) < 1) return "=";
  return delta > 0 ? `+${Math.round(delta)}%` : `${Math.round(delta)}%`;
}

function arrow(cur: number, prev: number): string {
  if (prev === 0) return cur > 0 ? "↑" : "—";
  const delta = ((cur - prev) / prev) * 100;
  if (Math.abs(delta) < 1) return "—";
  return delta > 0 ? "↑" : "↓";
}

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Moscow",
  });
}

// ── Metrika API ───────────────────────────────────

async function fetchStats(date1: string, date2: string) {
  const metrics = [
    "ym:s:visits",
    "ym:s:users",
    "ym:s:pageviews",
    "ym:s:avgVisitDurationSeconds",
    "ym:s:bounceRate",
  ].join(",");

  const url = `${METRIKA_API}?id=${COUNTER_ID}&metrics=${metrics}&date1=${date1}&date2=${date2}`;
  const res = await fetch(url, {
    headers: { Authorization: `OAuth ${METRIKA_TOKEN}` },
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Metrika stats error: ${res.status} ${err}`);
  }

  const data = await res.json();
  const row = data.totals || [];
  return {
    visits: Math.round(row[0] || 0),
    users: Math.round(row[1] || 0),
    pageviews: Math.round(row[2] || 0),
    avgDuration: row[3] || 0,
    bounceRate: row[4] || 0,
  };
}

async function fetchGoals(): Promise<{ id: number; name: string }[]> {
  const url = `${METRIKA_GOALS_API}/${COUNTER_ID}/goals`;
  const res = await fetch(url, {
    headers: { Authorization: `OAuth ${METRIKA_TOKEN}` },
  });

  if (!res.ok) return [];

  const data = await res.json();
  return (data.goals || []).map((g: { id: number; name: string }) => ({
    id: g.id,
    name: g.name,
  }));
}

async function fetchGoalReaches(date1: string, date2: string, goalIds: number[]) {
  if (goalIds.length === 0) return {};

  const metrics = goalIds.map((id) => `ym:s:goal${id}reaches`).join(",");
  const url = `${METRIKA_API}?id=${COUNTER_ID}&metrics=${metrics}&date1=${date1}&date2=${date2}`;
  const res = await fetch(url, {
    headers: { Authorization: `OAuth ${METRIKA_TOKEN}` },
  });

  if (!res.ok) return {};

  const data = await res.json();
  const totals = data.totals || [];
  const result: Record<number, number> = {};
  goalIds.forEach((id, i) => {
    result[id] = Math.round(totals[i] || 0);
  });
  return result;
}

async function fetchTopPages(date1: string, date2: string) {
  const url = `${METRIKA_API}?id=${COUNTER_ID}&metrics=ym:s:pageviews&dimensions=ym:s:startURL&sort=-ym:s:pageviews&limit=5&date1=${date1}&date2=${date2}`;
  const res = await fetch(url, {
    headers: { Authorization: `OAuth ${METRIKA_TOKEN}` },
  });

  if (!res.ok) return [];

  const data = await res.json();
  return (data.data || []).map((row: { dimensions: { name: string }[]; metrics: number[] }) => ({
    url: row.dimensions?.[0]?.name || "—",
    views: Math.round(row.metrics?.[0] || 0),
  }));
}

// ── Telegram ──────────────────────────────────────

async function sendTelegram(text: string) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.log("[analytics] Telegram not configured, logging:", text);
    return;
  }

  const res = await fetch(
    `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error("[analytics] Telegram error:", err);
  }
}

// ── Report Builder ────────────────────────────────

function buildReport(
  stats: Awaited<ReturnType<typeof fetchStats>>,
  prev: Awaited<ReturnType<typeof fetchStats>>,
  goals: { id: number; name: string }[],
  goalReaches: Record<number, number>,
  topPages: { url: string; views: number }[],
  date1: Date,
  date2: Date,
) {
  const d1 = fmtDate(date1);
  const d2 = fmtDate(date2);

  const lines: string[] = [
    `📊 ArchFlow — Аналитика за неделю`,
    `${d1} – ${d2}`,
    `─────────────────`,
    `👥 Пользователи: ${stats.users} (${arrow(stats.users, prev.users)} ${pct(stats.users, prev.users)})`,
    `👁 Визиты: ${stats.visits} (${arrow(stats.visits, prev.visits)} ${pct(stats.visits, prev.visits)})`,
    `📄 Просмотры: ${stats.pageviews} (${arrow(stats.pageviews, prev.pageviews)} ${pct(stats.pageviews, prev.pageviews)})`,
    `⏱ Ср. время: ${fmtDuration(stats.avgDuration)} (${arrow(stats.avgDuration, prev.avgDuration)} ${pct(stats.avgDuration, prev.avgDuration)})`,
    `📉 Отказы: ${Math.round(stats.bounceRate)}% (${arrow(prev.bounceRate, stats.bounceRate)} ${pct(prev.bounceRate, stats.bounceRate)})`,
  ];

  // Goals section
  if (goals.length > 0) {
    lines.push(`─────────────────`);
    lines.push(`🎯 Цели:`);
    for (const g of goals) {
      const reaches = goalReaches[g.id] || 0;
      if (reaches > 0 || goals.length <= 10) {
        lines.push(`• ${g.name}: ${reaches}`);
      }
    }
  }

  // Top pages
  if (topPages.length > 0) {
    lines.push(`─────────────────`);
    lines.push(`📍 Топ страницы:`);
    topPages.forEach((p, i) => {
      // Shorten URL for readability
      let path = p.url;
      try {
        path = new URL(p.url).pathname;
      } catch { /* use as is */ }
      if (path.length > 40) path = path.slice(0, 37) + "...";
      lines.push(`${i + 1}. ${path} — ${p.views}`);
    });
  }

  return lines.join("\n");
}

// ── Handler ───────────────────────────────────────

export async function GET(req: NextRequest) {
  // Auth check
  const secret = req.nextUrl.searchParams.get("secret");
  if (CRON_SECRET && secret !== CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!METRIKA_TOKEN) {
    return NextResponse.json({ error: "METRIKA_OAUTH_TOKEN not set" }, { status: 500 });
  }

  try {
    // Date ranges
    const now = new Date();
    const date2 = new Date(now);
    date2.setDate(date2.getDate() - 1); // yesterday (today's data incomplete)
    const date1 = new Date(date2);
    date1.setDate(date1.getDate() - 6); // 7-day window

    const prevDate2 = new Date(date1);
    prevDate2.setDate(prevDate2.getDate() - 1);
    const prevDate1 = new Date(prevDate2);
    prevDate1.setDate(prevDate1.getDate() - 6);

    // Fetch all data in parallel
    const [stats, prev, goals] = await Promise.all([
      fetchStats(fmt(date1), fmt(date2)),
      fetchStats(fmt(prevDate1), fmt(prevDate2)),
      fetchGoals(),
    ]);

    // Fetch goal reaches (needs goal IDs from above)
    const goalIds = goals.map((g) => g.id);
    const [goalReaches, topPages] = await Promise.all([
      fetchGoalReaches(fmt(date1), fmt(date2), goalIds),
      fetchTopPages(fmt(date1), fmt(date2)),
    ]);

    // Build and send report
    const report = buildReport(stats, prev, goals, goalReaches, topPages, date1, date2);
    await sendTelegram(report);

    return NextResponse.json({
      ok: true,
      period: `${fmt(date1)} — ${fmt(date2)}`,
      stats,
      goalCount: goals.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[analytics] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
