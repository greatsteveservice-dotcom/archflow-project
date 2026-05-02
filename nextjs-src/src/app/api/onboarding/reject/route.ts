import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ONBOARDING_BUCKET } from '../../../lib/onboarding';

// ============================================================
// POST /api/onboarding/reject
// Body: { uploadId }
// Удаляет файл из Storage и помечает status='rejected'.
// ============================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('Authorization')?.replace(/^Bearer\s+/, '');
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { uploadId } = (await req.json()) as { uploadId: string };
    if (!uploadId) return NextResponse.json({ error: 'uploadId required' }, { status: 400 });

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(auth);
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: upload, error: uErr } = await adminClient
      .from('onboarding_uploads')
      .select('id, project_id, storage_path, status, created_design_file_id')
      .eq('id', uploadId)
      .single();
    if (uErr || !upload) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    // Access check
    const { data: project } = await adminClient
      .from('projects')
      .select('owner_id')
      .eq('id', upload.project_id)
      .single();
    const isOwner = (project as { owner_id?: string } | null)?.owner_id === user.id;
    if (!isOwner) {
      const { data: member } = await adminClient
        .from('project_members')
        .select('role')
        .eq('project_id', upload.project_id)
        .eq('user_id', user.id)
        .single();
      const role = (member as { role?: string } | null)?.role;
      if (role !== 'designer' && role !== 'assistant') {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
    }

    // Если файл уже разложен в design_files — НЕ удаляем сам файл, удаляем только row онбординга
    // (пользователь должен удалить из самой папки Дизайна)
    if (upload.created_design_file_id) {
      await adminClient
        .from('onboarding_uploads')
        .update({ status: 'rejected', decided_at: new Date().toISOString() })
        .eq('id', uploadId);
      return NextResponse.json({ ok: true, note: 'design_file_kept' });
    }

    // Удаляем из Storage
    if (upload.storage_path) {
      await adminClient.storage.from(ONBOARDING_BUCKET).remove([upload.storage_path]);
    }

    await adminClient
      .from('onboarding_uploads')
      .update({ status: 'rejected', decided_at: new Date().toISOString() })
      .eq('id', uploadId);

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal_error';
    console.error('[onboarding/reject] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
