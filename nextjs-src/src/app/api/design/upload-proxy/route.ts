// POST /api/design/upload-proxy
// Multipart fallback used when direct presigned PUT to YC Storage is unreachable
// from the client (some Russian ISPs throttle storage.yandexcloud.net or RST
// the connection on big PUTs). Bytes flow: client → our nginx → Next.js →
// YC Object Storage (server-to-server). Then we register the design_files row.
//
// Body (multipart/form-data):
//   file       — File
//   projectId  — string (UUID)
//   folder     — string ('visuals' | 'drawings' | ...)
//   subfolder? — string
//
// Practical size cap is whatever nginx allows (currently 60M on app VPS).
// For larger files clients should keep using the presigned PUT path.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getS3, DESIGN_BUCKET, designPublicUrl } from "@/app/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Allow long uploads on slow networks.
export const maxDuration = 300;

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function isThumbable(mime: string): boolean {
  if (!mime) return false;
  if (mime === "application/pdf") return true;
  if (mime.startsWith("image/")) {
    if (/heic|heif/i.test(mime)) return false;
    return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      console.warn("[design/upload-proxy] no token");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const sb = getServiceClient();
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData.user) {
      console.warn("[design/upload-proxy] invalid token", userErr?.message);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const userId = userData.user.id;

    const form = await req.formData();
    const file = form.get("file");
    const projectId = String(form.get("projectId") || "").trim();
    const folder = String(form.get("folder") || "").trim();
    const subfolder = form.get("subfolder") ? String(form.get("subfolder")).trim() : null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required (multipart)" }, { status: 400 });
    }
    if (!projectId || !folder) {
      return NextResponse.json({ error: "projectId, folder required" }, { status: 400 });
    }

    // Permission re-check (owner OR designer/assistant)
    const { data: project } = await sb
      .from("projects")
      .select("owner_id")
      .eq("id", projectId)
      .maybeSingle();
    let allowed = project?.owner_id === userId;
    let memberRole: string | null = null;
    if (!allowed) {
      const { data: m } = await sb
        .from("project_members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .maybeSingle();
      memberRole = (m as { role?: string } | null)?.role ?? null;
      allowed = !!memberRole && ["designer", "assistant"].includes(memberRole);
    }
    if (!allowed) {
      console.warn("[design/upload-proxy] forbidden", { userId, projectId, ownerId: project?.owner_id, memberRole });
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Same key scheme as /upload-url so storage layout stays consistent.
    const name = file.name || "file";
    const mime = file.type || "application/octet-stream";
    const ts = Date.now() + Math.floor(Math.random() * 1000);
    const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const sub = subfolder ? subfolder.replace(/[^a-zA-Z0-9._-]/g, "_") + "/" : "";
    const key = `design/${projectId}/${folder}/${sub}${ts}_${safe}`;

    // Server-side PUT to YC.
    const buf = Buffer.from(await file.arrayBuffer());
    try {
      await getS3().send(new PutObjectCommand({
        Bucket: DESIGN_BUCKET,
        Key: key,
        Body: buf,
        ContentType: mime,
        ACL: "public-read",
      }));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "storage error";
      console.error("[design/upload-proxy] YC PUT failed", { key, size: buf.length, msg });
      return NextResponse.json({ error: `storage: ${msg}` }, { status: 502 });
    }

    const publicUrl = designPublicUrl(key);
    const thumbStatus = isThumbable(mime) ? "pending" : "unsupported";

    const { data: row, error: insertErr } = await sb
      .from("design_files")
      .insert({
        project_id: projectId,
        folder,
        subfolder,
        name,
        file_path: key,
        file_url: publicUrl,
        file_size: file.size,
        file_type: mime,
        storage_provider: "yc",
        thumb_status: thumbStatus,
        uploaded_by: userId,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("[design/upload-proxy] insert failed:", insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Thumb generation in background (same as finalize).
    if (thumbStatus === "pending") {
      const origin = req.nextUrl.origin;
      fetch(`${origin}/api/design/generate-thumb`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET || "",
        },
        body: JSON.stringify({ fileId: row.id }),
      }).catch((e) => console.error("[design/upload-proxy] thumb kick failed:", e));
    }

    return NextResponse.json({ ok: true, id: row.id, file_url: publicUrl, bucket: DESIGN_BUCKET });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[design/upload-proxy]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
