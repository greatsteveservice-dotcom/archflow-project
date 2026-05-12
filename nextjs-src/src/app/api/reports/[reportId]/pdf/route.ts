import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { renderToStream } from '@react-pdf/renderer';
import { requireAuth } from '../../../../lib/api-auth';
import { ReportPdfDocument, type ImageBlob } from '../../../../lib/reportPdf';
import type { ReportAttachment, VisitRemark, RemarkComment, Profile } from '../../../../lib/types';

// ============================================================
// GET /api/reports/[reportId]/pdf
// Generates a PDF for a visit report (Авторский надзор).
// Inlines image attachments as separate pages.
// ============================================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cap downloaded images to keep PDF small and generation fast.
const MAX_IMAGES = 30;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8 MB per image

function isImageMime(name: string): boolean {
  return /\.(jpe?g|png|webp)$/i.test(name);
}

async function fetchAsDataUri(url: string, name: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_IMAGE_BYTES) return null;
    const lower = name.toLowerCase();
    let mime = 'image/jpeg';
    if (lower.endsWith('.png')) mime = 'image/png';
    else if (lower.endsWith('.webp')) mime = 'image/webp';
    return `data:${mime};base64,${buf.toString('base64')}`;
  } catch {
    return null;
  }
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream as AsyncIterable<Buffer | string>) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export async function GET(
  request: NextRequest,
  { params }: { params: { reportId: string } },
) {
  try {
    const auth = await requireAuth(request);
    if (auth.error) return auth.error;
    const userId = auth.user.id;

    const { reportId } = params;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Report
    const { data: report, error: reportErr } = await admin
      .from('visit_reports')
      .select('*')
      .eq('id', reportId)
      .single();
    if (reportErr || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // 2. Project (needed for owner check below)
    const { data: project, error: projectErr } = await admin
      .from('projects')
      .select('*')
      .eq('id', report.project_id)
      .single();
    if (projectErr || !project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // 3. Auth: caller must be the project owner OR an active project_member.
    if (project.owner_id !== userId) {
      const { data: membership } = await admin
        .from('project_members')
        .select('role')
        .eq('project_id', report.project_id)
        .eq('user_id', userId)
        .eq('status', 'active')
        .maybeSingle();
      if (!membership) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    // 4. Remarks (+ assignee names + comments)
    const { data: remarksRaw } = await admin
      .from('visit_remarks')
      .select('*')
      .eq('report_id', reportId)
      .order('number', { ascending: true });

    const assigneeIds = [...new Set((remarksRaw || []).map(r => r.assigned_to).filter(Boolean) as string[])];
    let assigneeMap = new Map<string, Profile>();
    if (assigneeIds.length > 0) {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, full_name, email, role, phone, avatar_url, onboarding_completed, created_at, updated_at')
        .in('id', assigneeIds);
      assigneeMap = new Map((profiles || []).map(p => [p.id, p as Profile]));
    }

    const remarks = (remarksRaw || []).map((r: VisitRemark) => ({
      ...r,
      assignee: r.assigned_to ? assigneeMap.get(r.assigned_to) : undefined,
      comments: [] as RemarkComment[], // not used in PDF, but type-required
    }));

    // 5. Image attachments → data URI
    const attachments: ReportAttachment[] = Array.isArray(report.attachments) ? report.attachments : [];
    const imageAttachments = attachments.filter((a) => isImageMime(a.name)).slice(0, MAX_IMAGES);
    const images: ImageBlob[] = await Promise.all(
      imageAttachments.map(async (a) => ({
        attachment: a,
        dataUri: await fetchAsDataUri(a.file_url, a.name),
      })),
    );

    // 5b. Cover image from supervision_config (optional)
    const cfg = (project as { supervision_config?: { reportCoverUrl?: string | null } | null }).supervision_config || null;
    const coverUrl = cfg?.reportCoverUrl || null;
    const coverDataUri = coverUrl ? await fetchAsDataUri(coverUrl, coverUrl) : null;

    // 6. Render PDF
    const stream = await renderToStream(
      ReportPdfDocument({ report, remarks, project, images, coverDataUri }),
    );
    const buffer = await streamToBuffer(stream as unknown as NodeJS.ReadableStream);

    const fname = `report-${report.visit_date}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fname}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (err) {
    console.error('[reports/pdf] generation failed', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Generation failed' },
      { status: 500 },
    );
  }
}
