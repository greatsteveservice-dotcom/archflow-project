// POST /api/videos/upload-url
// Тело: { fileId: string, mimeType?: string }
// Возвращает: { uploadUrl, videoId, s3Key }
//
// Создаёт запись в design_file_videos (status pending), генерирует presigned PUT URL.
// Клиент загружает blob прямо в бакет, потом вызывает /api/videos/:id/finalize
// для подтверждения и запуска транскрипции.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getUploadUrl, MEDIA_BUCKET } from "@/app/lib/s3";

export const runtime = "nodejs";

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getServiceClient();
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const fileId = body.fileId as string;
    const mimeType = (body.mimeType as string) || "video/webm";
    if (!fileId) {
      return NextResponse.json({ error: "fileId required" }, { status: 400 });
    }

    // Получаем file → проверяем что user — designer/assistant в проекте
    const { data: file, error: fileErr } = await sb
      .from("design_files")
      .select("id, project_id")
      .eq("id", fileId)
      .single();
    if (fileErr || !file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const { data: project } = await sb
      .from("projects")
      .select("owner_id")
      .eq("id", file.project_id)
      .single();
    const isOwner = project?.owner_id === userId;

    if (!isOwner) {
      const { data: membership } = await sb
        .from("project_members")
        .select("role")
        .eq("project_id", file.project_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!membership || !["designer", "assistant"].includes(membership.role)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // Создаём запись в БД (status: pending — до подтверждения upload'а)
    const videoId = crypto.randomUUID();
    const ext = mimeType.includes("mp4") ? "mp4" : "webm";
    const s3Key = `projects/${file.project_id}/videos/${videoId}.${ext}`;

    const { error: insErr } = await sb.from("design_file_videos").insert({
      id: videoId,
      file_id: fileId,
      project_id: file.project_id,
      s3_key: s3Key,
      s3_bucket: MEDIA_BUCKET,
      mime_type: mimeType,
      transcript_status: "pending",
      created_by: userId,
    });
    if (insErr) {
      return NextResponse.json({ error: insErr.message }, { status: 500 });
    }

    const uploadUrl = await getUploadUrl(s3Key, mimeType);

    return NextResponse.json({ uploadUrl, videoId, s3Key });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
