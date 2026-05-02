import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ============================================================
// POST /api/supervision/save
// Body: { projectId: string, config: SupervisionConfig }
// 1. Auth check (Bearer token)
// 2. Permission check: owner OR project_members.role IN (designer, assistant)
// 3. UPDATE projects.supervision_config via service role
//    (the only RLS policy on projects.UPDATE is "Owners can update", which
//    blocks invited designers/assistants — we bypass it through the service
//    role here after our own membership check.)
// ============================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('Authorization')?.replace(/^Bearer\s+/, '');
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { projectId, config } = body as { projectId?: string; config?: unknown };
    if (!projectId || !config || typeof config !== 'object') {
      return NextResponse.json({ error: 'projectId and config required' }, { status: 400 });
    }

    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(auth);
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Permission check
    const { data: project } = await adminClient
      .from('projects')
      .select('owner_id')
      .eq('id', projectId)
      .single();
    const isOwner = (project as { owner_id?: string } | null)?.owner_id === user.id;
    if (!isOwner) {
      const { data: member } = await adminClient
        .from('project_members')
        .select('role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single();
      const role = (member as { role?: string } | null)?.role;
      if (role !== 'designer' && role !== 'assistant') {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
    }

    const { error: upErr } = await adminClient
      .from('projects')
      .update({ supervision_config: config })
      .eq('id', projectId);
    if (upErr) {
      return NextResponse.json({ error: upErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal_error';
    console.error('[supervision/save] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
