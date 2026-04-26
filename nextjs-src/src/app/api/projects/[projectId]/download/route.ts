import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import archiver from 'archiver';
import { Readable } from 'node:stream';

// Node runtime — archiver uses Node streams, not Edge.
export const runtime = 'nodejs';
// Long downloads need extended timeout.
export const maxDuration = 600;
export const dynamic = 'force-dynamic';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// ── Folder labels (RU) ────────────────────────────
const FOLDER_LABELS: Record<string, string> = {
  design_project: '01-Дизайн-проект',
  visuals: '02-Визуализация',
  drawings: '03-Чертежи',
  furniture: '04-Мебель',
  engineering: '05-Инженерия',
  documents: '06-Документы',
};

// ── Auth: accept Bearer header OR ?token= query (for direct <a> downloads) ──
async function authenticate(req: NextRequest, admin: SupabaseClient) {
  const headerToken = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const queryToken = req.nextUrl.searchParams.get('token') || '';
  const token = headerToken || queryToken;
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
}

// ── Sanitize filenames for ZIP (cross-platform safe) ──
function safeName(s: string, fallback = 'file'): string {
  const cleaned = (s || '').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim();
  return cleaned || fallback;
}

// Extract storage path from a public/sign Supabase URL.
// e.g. https://db.archflow.ru/storage/v1/object/public/photos/abc/visit/file.jpg → "abc/visit/file.jpg"
function pathFromUrl(url: string, bucket: string): string | null {
  if (!url) return null;
  const m = url.match(new RegExp(`/storage/v1/object/(?:public|sign)/${bucket}/([^?]+)`));
  return m ? decodeURIComponent(m[1]) : null;
}

// ── Handler ───────────────────────────────────────
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string } },
) {
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const user = await authenticate(req, admin);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { projectId } = params;

  // Authorize: must be project owner OR designer/assistant member
  const { data: project } = await admin
    .from('projects')
    .select('id, title, owner_id')
    .eq('id', projectId)
    .single();

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  let allowed = project.owner_id === user.id;
  if (!allowed) {
    const { data: m } = await admin
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .maybeSingle();
    allowed = !!m && (m.role === 'designer' || m.role === 'assistant');
  }

  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ── Collect files ──────────────────────────────
  // 1. Design files
  const { data: designFiles } = await admin
    .from('design_files')
    .select('name, file_path, folder, subfolder')
    .eq('project_id', projectId);

  // 2. Visits with photo records
  const { data: visits } = await admin
    .from('visits')
    .select('id, visit_date')
    .eq('project_id', projectId)
    .order('visit_date', { ascending: true });
  const visitIds = (visits || []).map((v) => v.id);

  const { data: photos } = visitIds.length
    ? await admin
        .from('photo_records')
        .select('photo_url, comment, zone, visit_id')
        .in('visit_id', visitIds)
    : { data: [] as { photo_url: string | null; comment: string | null; zone: string | null; visit_id: string }[] };

  // 3. Documents
  const { data: documents } = await admin
    .from('documents')
    .select('title, file_url, format, version')
    .eq('project_id', projectId);

  // ── Build archive (streaming) ───────────────────
  const archive = archiver('zip', { zlib: { level: 1 } }); // low compression — files mostly already compressed

  // Pipe archive output into a Web ReadableStream for the Response.
  const nodeStream = archive as unknown as Readable;
  const webStream = Readable.toWeb(nodeStream) as unknown as ReadableStream<Uint8Array>;

  archive.on('warning', (err) => console.warn('[download] archiver warning:', err));
  archive.on('error', (err) => console.error('[download] archiver error:', err));

  // Append files asynchronously while the stream is being consumed.
  (async () => {
    try {
      // ── Design files ────────────────────────────
      for (const f of designFiles || []) {
        if (!f.file_path) continue;
        const { data: blob, error } = await admin.storage.from('design-files').download(f.file_path);
        if (error || !blob) {
          console.warn(`[download] skip design file ${f.file_path}:`, error?.message);
          continue;
        }
        const folder = FOLDER_LABELS[f.folder] || f.folder || 'design';
        const sub = f.subfolder ? safeName(f.subfolder) + '/' : '';
        const name = `Дизайн/${folder}/${sub}${safeName(f.name)}`;
        archive.append(Buffer.from(await blob.arrayBuffer()), { name });
      }

      // ── Photos by visit ─────────────────────────
      const visitMap = new Map((visits || []).map((v) => [v.id, v.visit_date]));
      const photosByVisit = new Map<string, typeof photos>();
      for (const p of photos || []) {
        const arr = photosByVisit.get(p.visit_id) || [];
        arr.push(p);
        photosByVisit.set(p.visit_id, arr);
      }

      for (const [visitId, list] of photosByVisit.entries()) {
        const dateStr = visitMap.get(visitId) || 'unknown';
        let idx = 1;
        for (const p of list || []) {
          if (!p.photo_url) continue;
          const path = pathFromUrl(p.photo_url, 'photos');
          if (!path) continue;
          const { data: blob, error } = await admin.storage.from('photos').download(path);
          if (error || !blob) {
            console.warn(`[download] skip photo ${path}:`, error?.message);
            continue;
          }
          const ext = path.split('.').pop() || 'jpg';
          const zone = p.zone ? safeName(p.zone) + '_' : '';
          const fileName = `${String(idx).padStart(3, '0')}_${zone}${safeName(p.comment || '')}`.slice(0, 80) || `photo_${idx}`;
          archive.append(Buffer.from(await blob.arrayBuffer()), {
            name: `Фото/${dateStr}/${fileName}.${ext}`,
          });
          idx++;
        }
      }

      // ── Documents ───────────────────────────────
      for (const d of documents || []) {
        if (!d.file_url) continue;
        const path = pathFromUrl(d.file_url, 'documents');
        if (!path) continue;
        const { data: blob, error } = await admin.storage.from('documents').download(path);
        if (error || !blob) {
          console.warn(`[download] skip document ${path}:`, error?.message);
          continue;
        }
        const ext = path.split('.').pop() || (d.format || 'pdf').toLowerCase();
        const ver = d.version ? `_${safeName(d.version)}` : '';
        archive.append(Buffer.from(await blob.arrayBuffer()), {
          name: `Документы/${safeName(d.title)}${ver}.${ext}`,
        });
      }

      await archive.finalize();
    } catch (e) {
      console.error('[download] build error:', e);
      archive.abort();
    }
  })();

  const filename = encodeURIComponent(`${safeName(project.title || 'project')}.zip`);
  return new NextResponse(webStream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      'Cache-Control': 'no-store',
    },
  });
}
