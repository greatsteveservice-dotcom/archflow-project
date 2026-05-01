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

/**
 * Fetch per-user time in service from our own user_sessions table via Postgres RPC.
 * Each session = pings within a 3-minute window; duration = last_ping_at - started_at.
 * Returns map: userId → seconds spent.
 */
async function fetchPerUserDuration(fromIso: string, toIso: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_user_durations`, {
    method: "POST",
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_from: fromIso, p_to: toIso }),
  });
  const map = new Map<string, { visits: number; duration: number }>();
  if (!res.ok) return map;
  const data: { user_id: string; seconds: number; sessions_count: number }[] = await res.json();
  for (const row of data || []) {
    map.set(row.user_id, { visits: row.sessions_count, duration: row.seconds });
  }
  return map;
}

async function fetchBounceByPage(date1: string, date2: string) {
  const url = `${METRIKA_API}?id=${COUNTER_ID}&metrics=ym:s:bounceRate,ym:s:visits&dimensions=ym:s:startURL&sort=-ym:s:bounceRate&limit=10&date1=${date1}&date2=${date2}`;
  const res = await fetch(url, {
    headers: { Authorization: `OAuth ${METRIKA_TOKEN}` },
  });

  if (!res.ok) return [];

  const data = await res.json();
  return (data.data || [])
    .map((row: { dimensions: { name: string }[]; metrics: number[] }) => ({
      url: row.dimensions?.[0]?.name || "—",
      bounceRate: Math.round(row.metrics?.[0] || 0),
      visits: Math.round(row.metrics?.[1] || 0),
    }))
    .filter((p: { visits: number }) => p.visits >= 3); // only pages with enough visits
}

function humanPageName(rawUrl: string): string {
  let path = rawUrl;
  try {
    path = new URL(rawUrl).pathname;
  } catch { /* use as is */ }

  if (path === "/" || path === "") return "Главная (логин)";
  if (path === "/projects") return "Список проектов";

  // /projects/<uuid> or /projects/<uuid>/section
  const m = path.match(/^\/projects\/[a-f0-9-]+(?:\/(.+))?$/);
  if (m) {
    const section = m[1];
    if (!section) return "Проект (обзор)";
    const map: Record<string, string> = {
      design: "Дизайн",
      supply: "Комплектация",
      journal: "Авторский надзор",
      settings: "Настройки проекта",
    };
    return map[section] || `Проект/${section}`;
  }

  if (path.length > 35) return path.slice(0, 32) + "...";
  return path;
}

// ── Supabase (designers stats) ────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface DesignerStats {
  id: string;
  full_name: string;
  email: string;
  projects: number;
  clients: number;
  registered_at: string;
  last_sign_in_at: string | null;
  days_active: number;
  period_duration_seconds: number;
  total_duration_seconds: number;
}

// Accounts excluded from the report (owner + demo)
const EXCLUDED_EMAILS = new Set<string>([
  "kolunov87@bk.ru",
  "demo@archflow.ru",
]);

async function sbFetch(path: string, extraHeaders: Record<string, string> = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      ...extraHeaders,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Supabase ${path}: ${res.status} ${err}`);
  }
  return res;
}

/**
 * Latest user_sessions.last_ping_at per user. The heartbeat (1/min while a tab
 * is active) is the most accurate signal of "когда заходил" — auth.users.
 * last_sign_in_at only updates on explicit password/OAuth sign-in, so a user
 * with a long-lived Supabase session who reopens the PWA never bumps it.
 */
async function fetchLastPingMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/user_sessions?select=user_id,last_ping_at&order=last_ping_at.desc&limit=10000`,
    {
      headers: {
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
    },
  );
  if (!res.ok) return map;
  const rows: { user_id: string; last_ping_at: string }[] = await res.json();
  for (const r of rows) {
    if (!map.has(r.user_id)) map.set(r.user_id, r.last_ping_at);
  }
  return map;
}

async function fetchDesignersStats(
  periodDuration: Map<string, { visits: number; duration: number }>,
  totalDuration: Map<string, { visits: number; duration: number }>,
): Promise<DesignerStats[]> {
  // 1. Get all designers from profiles
  const profilesRes = await sbFetch(
    `/rest/v1/profiles?role=eq.designer&select=id,full_name,email,created_at`
  );
  const profilesRaw: { id: string; full_name: string | null; email: string | null; created_at: string }[] =
    await profilesRes.json();

  // Exclude owner + demo accounts
  const profiles = profilesRaw.filter(
    (p) => !p.email || !EXCLUDED_EMAILS.has(p.email.toLowerCase())
  );

  // 2. Resolve "Был" timestamp.  Prefer user_sessions.last_ping_at (heartbeat,
  // updated each minute the user has a tab open); fall back to
  // auth.users.last_sign_in_at when there are no pings yet.
  const lastPingMap = await fetchLastPingMap();
  const authUsersMap = new Map<string, string | null>();
  try {
    const authRes = await sbFetch(`/auth/v1/admin/users?per_page=200`);
    const authData = await authRes.json();
    const users = authData.users || authData || [];
    for (const u of users) {
      const ping = lastPingMap.get(u.id) || null;
      authUsersMap.set(u.id, ping || u.last_sign_in_at || null);
    }
  } catch (e) {
    console.error("[analytics] auth.users fetch failed:", e);
  }

  // 3. For each designer, count projects and invited members
  const now = Date.now();
  const result: DesignerStats[] = [];

  for (const d of profiles) {
    // Projects owned by designer
    const projectsRes = await sbFetch(
      `/rest/v1/projects?owner_id=eq.${d.id}&select=id`,
      { Prefer: "count=exact" }
    );
    const projects: { id: string }[] = await projectsRes.json();
    const projectsCount = projects.length;

    // Clients invited to designer's projects (role='client', unique users)
    let clients = 0;
    if (projectsCount > 0) {
      const projectIds = projects.map((p) => p.id).join(",");
      const membersRes = await sbFetch(
        `/rest/v1/project_members?project_id=in.(${projectIds})&role=eq.client&user_id=neq.${d.id}&select=user_id`
      );
      const members: { user_id: string }[] = await membersRes.json();
      clients = new Set(members.map((m) => m.user_id)).size;
    }

    const daysActive = Math.max(
      0,
      Math.floor((now - new Date(d.created_at).getTime()) / (1000 * 60 * 60 * 24))
    );

    result.push({
      id: d.id,
      full_name: d.full_name || "—",
      email: d.email || "—",
      projects: projectsCount,
      clients,
      registered_at: d.created_at,
      last_sign_in_at: authUsersMap.get(d.id) || null,
      days_active: daysActive,
      period_duration_seconds: periodDuration.get(d.id)?.duration || 0,
      total_duration_seconds: totalDuration.get(d.id)?.duration || 0,
    });
  }

  // Sort: most projects first
  result.sort((a, b) => b.projects - a.projects);
  return result;
}

function fmtShortDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const absDate = d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Moscow",
  });
  if (diffDays === 0) return `сегодня (${absDate})`;
  if (diffDays === 1) return `вчера (${absDate})`;
  if (diffDays < 7) return `${diffDays} дн назад (${absDate})`;
  return absDate;
}

function fmtHoursMinutes(seconds: number): string {
  if (seconds <= 0) return "—";
  const totalMin = Math.round(seconds / 60);
  if (totalMin < 60) return `${totalMin} мин`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
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
  bouncePages: { url: string; bounceRate: number; visits: number }[],
  designers: DesignerStats[],
  date1: Date,
  date2: Date,
) {
  const d1 = fmtDate(date1);
  const d2 = fmtDate(date2);

  const lines: string[] = [
    `📊 ArchFlow — Аналитика за 2 дня`,
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
      lines.push(`${i + 1}. ${humanPageName(p.url)} — ${p.views}`);
    });
  }

  // Bounce rate by page
  if (bouncePages.length > 0) {
    lines.push(`─────────────────`);
    lines.push(`📉 Отказы по страницам:`);
    bouncePages.slice(0, 5).forEach((p) => {
      lines.push(`• ${humanPageName(p.url)} — ${p.bounceRate}% (${p.visits} визитов)`);
    });
  }

  // Designers section
  if (designers.length > 0) {
    const totalProjects = designers.reduce((s, d) => s + d.projects, 0);
    const totalClients = designers.reduce((s, d) => s + d.clients, 0);

    lines.push(`─────────────────`);
    lines.push(`👤 Дизайнеры: ${designers.length} (проектов: ${totalProjects}, заказчиков: ${totalClients})`);

    designers.forEach((d, i) => {
      const name = d.full_name.length > 22 ? d.full_name.slice(0, 20) + "…" : d.full_name;
      const lastSeen = fmtShortDate(d.last_sign_in_at);
      const periodTime = fmtHoursMinutes(d.period_duration_seconds);
      const totalTime = fmtHoursMinutes(d.total_duration_seconds);
      lines.push(``);
      lines.push(`${i + 1}. ${name}`);
      lines.push(`   ✉ ${d.email}`);
      lines.push(`   📁 Проектов: ${d.projects} · 👥 Заказчиков: ${d.clients}`);
      lines.push(`   📅 Регистрация: ${d.days_active} дн назад · Был: ${lastSeen}`);
      lines.push(`   ⏱ За период: ${periodTime} · Всего: ${totalTime}`);
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
    // Date ranges (2-day window)
    const now = new Date();
    const date2 = new Date(now);
    date2.setDate(date2.getDate() - 1); // yesterday (today's data incomplete)
    const date1 = new Date(date2);
    date1.setDate(date1.getDate() - 1); // 2-day window

    const prevDate2 = new Date(date1);
    prevDate2.setDate(prevDate2.getDate() - 1);
    const prevDate1 = new Date(prevDate2);
    prevDate1.setDate(prevDate1.getDate() - 1);

    // Fetch all data in parallel
    const [stats, prev, goals] = await Promise.all([
      fetchStats(fmt(date1), fmt(date2)),
      fetchStats(fmt(prevDate1), fmt(prevDate2)),
      fetchGoals(),
    ]);

    // Fetch goal reaches (needs goal IDs from above) + per-user durations
    const goalIds = goals.map((g) => g.id);
    // Period for per-user duration: start of date1 → end of date2 (inclusive)
    const periodFrom = new Date(date1); periodFrom.setHours(0, 0, 0, 0);
    const periodTo = new Date(date2); periodTo.setDate(periodTo.getDate() + 1); periodTo.setHours(0, 0, 0, 0);
    // "Total ever" — from Archflow launch (2026-01-01) to end of date2
    const totalFrom = new Date('2026-01-01T00:00:00Z');
    const [goalReaches, topPages, bouncePages, periodDuration, totalDuration] = await Promise.all([
      fetchGoalReaches(fmt(date1), fmt(date2), goalIds),
      fetchTopPages(fmt(date1), fmt(date2)),
      fetchBounceByPage(fmt(date1), fmt(date2)),
      fetchPerUserDuration(periodFrom.toISOString(), periodTo.toISOString()),
      fetchPerUserDuration(totalFrom.toISOString(), periodTo.toISOString()),
    ]);
    const designers = await fetchDesignersStats(periodDuration, totalDuration).catch((e) => {
      console.error("[analytics] designers fetch failed:", e);
      return [] as DesignerStats[];
    });

    // Build and send report
    const report = buildReport(stats, prev, goals, goalReaches, topPages, bouncePages, designers, date1, date2);
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
