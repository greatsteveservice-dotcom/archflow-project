import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Server-side endpoint that uses the service role key
// to bypass RLS (the design_files table has no UPDATE policy).
//
// Body: { fileId: string, name?: string, subfolder?: string|null, accessToken: string }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileId, name, subfolder, accessToken } = body;

    // At least one of name or subfolder must be provided
    if (!fileId || (name === undefined && subfolder === undefined)) {
      return NextResponse.json({ error: 'fileId and name or subfolder required' }, { status: 400 });
    }

    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let cleanName: string | undefined;
    if (name !== undefined) {
      cleanName = name
        .replace(/<[^>]*>/g, '')
        .replace(/javascript:/gi, '')
        .replace(/on\w+\s*=/gi, '')
        .trim();

      if (!cleanName || cleanName.length > 200) {
        return NextResponse.json({ error: 'Invalid name' }, { status: 400 });
      }
    }

    // Verify the user is authenticated
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(accessToken);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use service role to bypass RLS for the update
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Verify the file exists and user has access (is project owner or designer/assistant)
    const { data: file, error: fileErr } = await adminClient
      .from('design_files')
      .select('id, project_id')
      .eq('id', fileId)
      .single();

    if (fileErr || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Check permission: user must be project owner or designer/assistant member
    const { data: project } = await adminClient
      .from('projects')
      .select('owner_id')
      .eq('id', file.project_id)
      .single();

    const isOwner = project?.owner_id === user.id;

    if (!isOwner) {
      const { data: member } = await adminClient
        .from('project_members')
        .select('role, access_level')
        .eq('project_id', file.project_id)
        .eq('user_id', user.id)
        .single();

      const mem = member as { role?: string; access_level?: string } | null;
      const ok = !!mem && (
        ['designer', 'assistant'].includes(mem.role || '') ||
        mem.access_level === 'full'
      );
      if (!ok) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
    }

    // Build update payload
    const updates: Record<string, unknown> = {};
    if (cleanName !== undefined) updates.name = cleanName;
    if (subfolder !== undefined) updates.subfolder = subfolder; // null = move to root

    // Perform the update with service role (bypasses RLS)
    const { error: updateErr } = await adminClient
      .from('design_files')
      .update(updates)
      .eq('id', fileId);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, ...updates });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Server error' }, { status: 500 });
  }
}
