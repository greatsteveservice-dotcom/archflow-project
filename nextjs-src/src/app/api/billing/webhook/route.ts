import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Official YooKassa webhook source IPs
// https://yookassa.ru/developers/using-api/webhooks#ip
const YOOKASSA_IP_RANGES: string[] = [
  "185.71.76.0/27",
  "185.71.77.0/27",
  "77.75.153.0/25",
  "77.75.156.11",
  "77.75.156.35",
];

const PLAN_DAYS: Record<string, number> = {
  month: 30,
  halfyear: 180,
  year: 365,
};

let _admin: ReturnType<typeof createClient> | null = null;
function getAdmin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
  }
  return _admin;
}

// ── IP matching ───────────────────────────────────────────

function ipToInt(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let n = 0;
  for (const p of parts) {
    const v = parseInt(p, 10);
    if (isNaN(v) || v < 0 || v > 255) return null;
    n = (n << 8) | v;
  }
  return n >>> 0;
}

function ipInCidr(ip: string, cidr: string): boolean {
  // exact match if no slash
  if (!cidr.includes("/")) return ip === cidr;
  const [netStr, bitsStr] = cidr.split("/");
  const bits = parseInt(bitsStr, 10);
  const ipN = ipToInt(ip);
  const netN = ipToInt(netStr);
  if (ipN === null || netN === null || isNaN(bits)) return false;
  if (bits === 0) return true;
  const mask = (0xFFFFFFFF << (32 - bits)) >>> 0;
  return (ipN & mask) === (netN & mask);
}

function isYookassaIp(ip: string): boolean {
  return YOOKASSA_IP_RANGES.some((r) => ipInCidr(ip, r));
}

function extractClientIp(req: NextRequest): string | null {
  // Cloudflare always sets this; most trustworthy
  const cf = req.headers.get("cf-connecting-ip");
  if (cf) return cf.trim();
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim();
  return null;
}

// ── Handler ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = extractClientIp(req);
  if (!ip || !isYookassaIp(ip)) {
    console.warn("[billing-webhook] rejected IP:", ip);
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body || body.event !== "payment.succeeded") {
    // Ack other events so YuKassa doesn't retry
    return NextResponse.json({ ok: true });
  }

  const payment = body.object || {};
  const meta = payment.metadata || {};
  const userId: string | undefined = meta.userId;
  const plan: string | undefined = meta.plan;
  const paymentId: string | undefined = payment.id;

  if (!userId || !plan || !PLAN_DAYS[plan]) {
    console.warn("[billing-webhook] bad metadata:", { userId, plan, paymentId });
    return NextResponse.json({ ok: true });
  }

  // Extend from current expires_at if still active, else from now
  const admin = getAdmin();
  const { data: existing } = await (admin.from("subscriptions") as any)
    .select("expires_at,status")
    .eq("user_id", userId)
    .maybeSingle();

  const now = new Date();
  const base = existing && new Date((existing as any).expires_at) > now
    ? new Date((existing as any).expires_at)
    : now;
  const expiresAt = new Date(base.getTime() + PLAN_DAYS[plan] * 24 * 60 * 60 * 1000);

  const upsertRes = await (admin.from("subscriptions") as any).upsert(
    {
      user_id: userId,
      plan,
      status: "active",
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      yookassa_payment_id: paymentId,
      updated_at: now.toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (upsertRes.error) {
    console.error("[billing-webhook] upsert error:", upsertRes.error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
