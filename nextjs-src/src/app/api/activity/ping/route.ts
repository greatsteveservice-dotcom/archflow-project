import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_GAP_MIN = 3;

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

export async function POST(req: NextRequest) {
  const accessToken = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!accessToken) return NextResponse.json({ ok: false }, { status: 401 });

  const anon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${accessToken}` } } },
  );
  const { data: { user } } = await anon.auth.getUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });

  const admin = getAdmin();
  const now = new Date();
  const cutoff = new Date(now.getTime() - SESSION_GAP_MIN * 60 * 1000);

  const { data: current } = await (admin.from("user_sessions") as any)
    .select("id")
    .eq("user_id", user.id)
    .gte("last_ping_at", cutoff.toISOString())
    .order("last_ping_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (current) {
    await (admin.from("user_sessions") as any)
      .update({ last_ping_at: now.toISOString() })
      .eq("id", (current as any).id);
  } else {
    await (admin.from("user_sessions") as any).insert({
      user_id: user.id,
      started_at: now.toISOString(),
      last_ping_at: now.toISOString(),
    });
  }

  return NextResponse.json({ ok: true });
}
