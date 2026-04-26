// POST /api/videos/[id]/finalize
// Подтверждает что upload в S3 завершён, читает размер из S3 HEAD,
// запускает транскрипцию через OpenAI Whisper.
//
// Тело: { duration_sec?: number }

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { HeadObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getS3, MEDIA_BUCKET } from "@/app/lib/s3";

export const runtime = "nodejs";
export const maxDuration = 60; // транскрипция 1-3 мин видео занимает ~10-30с

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

async function transcribeViaWhisper(s3Key: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  // Скачиваем файл из S3
  const obj = await getS3().send(new GetObjectCommand({ Bucket: MEDIA_BUCKET, Key: s3Key }));
  const bytes = await obj.Body!.transformToByteArray();
  // Копируем в чистый ArrayBuffer чтобы TypeScript не ругался на SharedArrayBuffer
  const ab = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(ab).set(bytes);

  // Формируем multipart запрос к OpenAI
  const blob = new Blob([ab], { type: "audio/webm" });
  const form = new FormData();
  form.append("file", blob, "video.webm");
  form.append("model", "whisper-1");
  form.append("language", "ru");

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  if (!res.ok) {
    console.error("Whisper API error:", res.status, await res.text().catch(() => ""));
    return null;
  }
  const data = await res.json();
  return data.text || null;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sb = getServiceClient();
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const duration = typeof body.duration_sec === "number" ? Math.round(body.duration_sec) : null;

    const { data: video, error: vErr } = await sb
      .from("design_file_videos")
      .select("id, s3_key, s3_bucket, created_by")
      .eq("id", params.id)
      .single();
    if (vErr || !video) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (video.created_by !== userData.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // HEAD object — узнаём фактический размер загруженного файла
    let size = 0;
    try {
      const head = await getS3().send(
        new HeadObjectCommand({ Bucket: video.s3_bucket || MEDIA_BUCKET, Key: video.s3_key })
      );
      size = head.ContentLength || 0;
    } catch {
      return NextResponse.json({ error: "Upload not found in storage" }, { status: 400 });
    }

    // Update meta
    await sb
      .from("design_file_videos")
      .update({
        size_bytes: size,
        duration_sec: duration,
        transcript_status: "processing",
      })
      .eq("id", params.id);

    // Транскрипция (синхронно — Vercel-style fire-and-forget here не сработает,
    // т.к. fire-and-forget на serverless обрезается рантаймом). Делаем await.
    let transcript: string | null = null;
    let status: "done" | "failed" = "done";
    try {
      transcript = await transcribeViaWhisper(video.s3_key);
      if (!transcript) status = "failed";
    } catch (e: any) {
      console.error("Transcription failed:", e?.message);
      status = "failed";
    }

    await sb
      .from("design_file_videos")
      .update({
        transcript,
        transcript_status: status,
      })
      .eq("id", params.id);

    return NextResponse.json({ ok: true, size_bytes: size, transcript_status: status });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
