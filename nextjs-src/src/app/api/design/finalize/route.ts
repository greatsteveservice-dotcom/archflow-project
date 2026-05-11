// POST /api/design/finalize
// Body: { projectId, folder, subfolder?, name, key, size, mime }
// Creates a design_files row with storage_provider='yc' after a successful
// presigned PUT, then kicks off thumbnail generation (fire-and-forget).
//
// Why a separate finalize step (and not just create in /upload-url before PUT)?
// — If the PUT fails or is abandoned we'd be left with a phantom DB row.
//   Finalize-after-upload keeps the table consistent with what's actually in
//   the bucket.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { designPublicUrl, DESIGN_BUCKET } from "@/app/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    // skip HEIC for now — needs separate codec
    if (/heic|heif/i.test(mime)) return false;
    return true;
  }
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sb = getServiceClient();
    const { data: userData } = await sb.auth.getUser(token);
    if (!userData.user) return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    const userId = userData.user.id;

    const body = await req.json();
    const projectId = String(body.projectId || "");
    const folder = String(body.folder || "");
    const subfolder = body.subfolder ? String(body.subfolder) : null;
    const name = String(body.name || "");
    const key = String(body.key || "");
    const size = Number(body.size || 0);
    const mime = String(body.mime || "application/octet-stream");

    if (!projectId || !folder || !name || !key) {
      return NextResponse.json({ error: "projectId, folder, name, key required" }, { status: 400 });
    }
    if (!key.startsWith(`design/${projectId}/`)) {
      return NextResponse.json({ error: "key path mismatch" }, { status: 400 });
    }

    // Permission re-check (same as upload-url)
    const { data: project } = await sb
      .from("projects")
      .select("owner_id")
      .eq("id", projectId)
      .maybeSingle();
    let allowed = project?.owner_id === userId;
    if (!allowed) {
      const { data: m } = await sb
        .from("project_members")
        .select("role")
        .eq("project_id", projectId)
        .eq("user_id", userId)
        .maybeSingle();
      allowed = !!m && ["designer", "assistant"].includes((m as { role: string }).role);
    }
    if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
        file_size: size,
        file_type: mime,
        storage_provider: "yc",
        thumb_status: thumbStatus,
      })
      .select("id")
      .single();
    if (insertErr) {
      console.error("[design/finalize] insert failed:", insertErr);
      return NextResponse.json({ error: insertErr.message }, { status: 500 });
    }

    // Kick off thumbnail generation in the background. We don't await — the
    // client gets a response immediately and the thumb appears asynchronously
    // (UI polls / realtime-subscribes via design_files realtime channel).
    if (thumbStatus === "pending") {
      const origin = req.nextUrl.origin;
      fetch(`${origin}/api/design/generate-thumb`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": process.env.INTERNAL_API_SECRET || process.env.CRON_SECRET || "",
        },
        body: JSON.stringify({ fileId: row.id }),
      }).catch((e) => console.error("[design/finalize] thumb kick failed:", e));
    }

    return NextResponse.json({ ok: true, id: row.id, file_url: publicUrl, bucket: DESIGN_BUCKET });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[design/finalize]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
