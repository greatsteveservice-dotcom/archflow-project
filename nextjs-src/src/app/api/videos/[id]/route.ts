// DELETE /api/videos/[id]
// Удаляет видео из БД + объект из S3. Только автор.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { deleteObject } from "@/app/lib/s3";

export const runtime = "nodejs";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sb = getServiceClient();
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const { data: video, error: vErr } = await sb
      .from("design_file_videos")
      .select("id, s3_key, s3_bucket, created_by")
      .eq("id", params.id)
      .single();
    if (vErr || !video) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (video.created_by !== userData.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    try {
      await deleteObject(video.s3_key, video.s3_bucket || undefined);
    } catch (e: any) {
      console.warn("S3 delete failed (continuing):", e?.message);
    }

    await sb.from("design_file_videos").delete().eq("id", params.id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
