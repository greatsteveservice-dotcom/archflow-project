// GET /api/videos/[id]/url
// Возвращает presigned read URL (TTL 15 мин) для проигрывания видео.
// Доступ — любой участник проекта.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getReadUrl } from "@/app/lib/s3";

export const runtime = "nodejs";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sb = getServiceClient();
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    const userId = userData.user.id;

    const { data: video, error: vErr } = await sb
      .from("design_file_videos")
      .select("id, project_id, s3_key, s3_bucket")
      .eq("id", params.id)
      .single();
    if (vErr || !video) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Доступ — участник проекта
    const { data: project } = await sb
      .from("projects")
      .select("owner_id")
      .eq("id", video.project_id)
      .single();
    const isOwner = project?.owner_id === userId;
    if (!isOwner) {
      const { data: m } = await sb
        .from("project_members")
        .select("user_id")
        .eq("project_id", video.project_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!m) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = await getReadUrl(video.s3_key, video.s3_bucket || undefined);
    return NextResponse.json({ url });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
