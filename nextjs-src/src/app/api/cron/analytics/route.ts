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
  invited: number;
  registered_at: string;
  last_sign_in_at: string | null;
  days_active: number;
}

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

async function fetchDesignersStats(): Promise<DesignerStats[]> {
  // 1. Get all designers from profiles
  const profilesRes = await sbFetch(
    `/rest/v1/profiles?role=eq.designer&select=id,full_name,email,created_at`
  );
  const profiles: { id: string; full_name: string | null; email: string | null; created_at: string }[] =
    await profilesRes.json();

  // 2. Get last_sign_in_at from auth.users via admin API
  const authUsersMap = new Map<string, string | null>();
  try {
    const authRes = await sbFetch(`/auth/v1/admin/users?per_page=200`);
    const authData = await authRes.json();
    const users = authData.users || authData || [];
    for (const u of users) {
      authUsersMap.set(u.id, u.last_sign_in_at || null);
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

    // Members invited to designer's projects (excluding designer themselves)
    let invited = 0;
    if (projectsCount > 0) {
      const projectIds = projects.map((p) => p.id).join(",");
      const membersRes = await sbFetch(
        `/rest/v1/project_members?project_id=in.(${projectIds})&user_id=neq.${d.id}&select=user_id`,
        { Prefer: "count=exact" }
      );
      const members: { user_id: string }[] = await membersRes.json();
      // Unique users only
      invited = new Set(members.map((m) => m.user_id)).size;
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
      invited,
      registered_at: d.created_at,
      last_sign_in_at: authUsersMap.get(d.id) || null,
      days_active: daysActive,
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
  if (diffDays === 0) return "сегодня";
  if (diffDays === 1) return "вчера";
  if (diffDays < 7) return `${diffDays} дн назад`;
  return d.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Europe/Moscow",
  });
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
    const totalInvited = designers.reduce((s, d) => s + d.invited, 0);

    lines.push(`─────────────────`);
    lines.push(`👤 Дизайнеры: ${designers.length} (проектов: ${totalProjects}, приглашено: ${totalInvited})`);

    designers.forEach((d, i) => {
      const name = d.full_name.length > 22 ? d.full_name.slice(0, 20) + "…" : d.full_name;
      const lastSeen = fmtShortDate(d.last_sign_in_at);
      lines.push(``);
      lines.push(`${i + 1}. ${name}`);
      lines.push(`   ✉ ${d.email}`);
      lines.push(`   📁 Проектов: ${d.projects} · 👥 Приглашено: ${d.invited}`);
      lines.push(`   📅 Регистрация: ${d.days_active} дн назад · Был: ${lastSeen}`);
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

    // Fetch goal reaches (needs goal IDs from above)
    const goalIds = goals.map((g) => g.id);
    const [goalReaches, topPages, bouncePages, designers] = await Promise.all([
      fetchGoalReaches(fmt(date1), fmt(date2), goalIds),
      fetchTopPages(fmt(date1), fmt(date2)),
      fetchBounceByPage(fmt(date1), fmt(date2)),
      fetchDesignersStats().catch((e) => {
        console.error("[analytics] designers fetch failed:", e);
        return [] as DesignerStats[];
      }),
    ]);

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
