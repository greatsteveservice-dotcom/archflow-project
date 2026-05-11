// POST /api/design/upload-url
// Body: { projectId, folder, subfolder?, name, mime, size }
// Returns: { uploadUrl, key, publicUrl, expiresAt }
//
// Issues a presigned PUT URL into the public YC design bucket
// (`archflow-design-prod`, behind Yandex CDN). Client PUTs the file directly,
// then calls /api/design/finalize to register the row in design_files and
// trigger thumbnail generation.
//
// This replaces the legacy supabase.storage.upload() flow that proxied bytes
// through nginx → Kong → storage container on the Yandex VM. New path is
// browser → YC Object Storage edge (MSK/SPB/KRD) with no app-server hop.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getS3, DESIGN_BUCKET, designPublicUrl } from "@/app/lib/s3";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB hard cap

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "").trim();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sb = getServiceClient();
    const { data: userData, error: userErr } = await sb.auth.getUser(token);
    if (userErr || !userData.user) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const userId = userData.user.id;

    const body = await req.json();
    const projectId = String(body.projectId || "").trim();
    const folder = String(body.folder || "").trim();
    const subfolder = body.subfolder ? String(body.subfolder).trim() : null;
    const name = String(body.name || "").trim();
    const mime = String(body.mime || "application/octet-stream").trim();
    const size = Number(body.size || 0);

    if (!projectId || !folder || !name) {
      return NextResponse.json({ error: "projectId, folder, name required" }, { status: 400 });
    }
    if (size > 0 && size > MAX_SIZE) {
      return NextResponse.json({ error: `Файл больше ${MAX_SIZE / 1024 / 1024 / 1024} GB` }, { status: 413 });
    }

    // Permission: owner OR designer/assistant member of the project
    const { data: project } = await sb
      .from("projects")
      .select("owner_id")
      .eq("id", projectId)
      .maybeSingle();
    const isOwner = project?.owner_id === userId;
    let allowed = isOwner;
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

    // Key scheme matches the legacy Supabase storage path so migration is a
    // straight copy: design/<projectId>/<folder>[/<subfolder>]/<timestamp>_<safe>
    const ts = Date.now() + Math.floor(Math.random() * 1000);
    const safe = name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const sub = subfolder ? subfolder.replace(/[^a-zA-Z0-9._-]/g, "_") + "/" : "";
    const key = `design/${projectId}/${folder}/${sub}${ts}_${safe}`;

    // Presigned PUT — TTL 15 min, enough to upload large PDFs on slow networks.
    // ACL public-read so CDN can serve the object without signing.
    const cmd = new PutObjectCommand({
      Bucket: DESIGN_BUCKET,
      Key: key,
      ContentType: mime,
      ACL: "public-read",
    });
    const uploadUrl = await getSignedUrl(getS3(), cmd, { expiresIn: 900 });
    const publicUrl = designPublicUrl(key);

    return NextResponse.json({
      uploadUrl,
      key,
      publicUrl,
      bucket: DESIGN_BUCKET,
      expiresAt: new Date(Date.now() + 900 * 1000).toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal error";
    console.error("[design/upload-url]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
