import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { ONBOARDING_BUCKET, ONBOARDING_PREFIX, DESIGN_FOLDER_IDS } from '../../../lib/onboarding';
import type { DesignFolder } from '../../../lib/types';

// ============================================================
// POST /api/onboarding/confirm
// Body: { uploadId, finalCategory }  где finalCategory ∈ DESIGN_FOLDER_IDS
// 1. Auth
// 2. Загружает row из onboarding_uploads
// 3. Проверяет project access
// 4. Если файл ещё в _onboarding/ → переносит в нормальный путь
// 5. Создаёт design_files row
// 6. Обновляет onboarding_uploads → status='confirmed'
// ============================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('Authorization')?.replace(/^Bearer\s+/, '');
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { uploadId, finalCategory } = (await req.json()) as {
      uploadId: string;
      finalCategory: DesignFolder;
    };

    if (!uploadId || !finalCategory) {
      return NextResponse.json({ error: 'uploadId and finalCategory required' }, { status: 400 });
    }
    if (!DESIGN_FOLDER_IDS.includes(finalCategory)) {
      return NextResponse.json({ error: 'invalid_category' }, { status: 400 });
    }

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(auth);
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: upload, error: uErr } = await adminClient
      .from('onboarding_uploads')
      .select('*')
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

    // Если уже подтверждено — возвращаем существующий design_file
    if (upload.status === 'confirmed' || upload.status === 'auto_placed') {
      if (upload.created_design_file_id) {
        const { data: existing } = await adminClient
          .from('design_files')
          .select('*')
          .eq('id', upload.created_design_file_id)
          .single();
        return NextResponse.json({ designFile: existing });
      }
    }

    // Move file in storage if still in _onboarding/
    const currentPath: string = upload.storage_path;
    let finalPath = currentPath;
    if (currentPath.startsWith(`${ONBOARDING_PREFIX}/`)) {
      finalPath = `${upload.project_id}/${finalCategory}/${upload.id}_${upload.file_name}`;
      const { error: moveErr } = await adminClient.storage
        .from(ONBOARDING_BUCKET)
        .move(currentPath, finalPath);
      if (moveErr) {
        return NextResponse.json({ error: 'storage_move_failed: ' + moveErr.message }, { status: 500 });
      }
    }

    const { data: pub } = adminClient.storage.from(ONBOARDING_BUCKET).getPublicUrl(finalPath);

    const { data: df, error: dfErr } = await adminClient
      .from('design_files')
      .insert({
        project_id: upload.project_id,
        folder: finalCategory,
        subfolder: null,
        name: upload.file_name,
        file_path: finalPath,
        file_url: pub.publicUrl,
        file_size: upload.file_size,
        file_type: upload.file_type,
        uploaded_by: user.id,
      })
      .select()
      .single();

    if (dfErr || !df) {
      return NextResponse.json({ error: dfErr?.message || 'design_file_insert_failed' }, { status: 500 });
    }

    await adminClient
      .from('onboarding_uploads')
      .update({
        status: 'confirmed',
        final_category: finalCategory,
        created_design_file_id: df.id,
        storage_path: finalPath,
        decided_at: new Date().toISOString(),
      })
      .eq('id', uploadId);

    return NextResponse.json({ designFile: df });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal_error';
    console.error('[onboarding/confirm] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

