import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPodpislon, mapPodpislonStatus } from '../../../../lib/podpislon';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let _admin: ReturnType<typeof createClient> | null = null;
function getAdmin() {
  if (!_admin) _admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  return _admin;
}

export async function GET(req: Request, { params }: { params: { fileId: string } }) {
  try {
    const auth = req.headers.get('authorization') || '';
    const accessToken = auth.replace(/^Bearer\s+/i, '').trim();
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = getAdmin();
    const { data: sigs } = await (admin.from('document_signatures') as any)
      .select('id, podpislon_doc_id, project_id, file_id, status')
      .eq('file_id', params.fileId);
    if (!sigs || sigs.length === 0) return NextResponse.json({ signatures: [] });

    // Access check: owner OR project member (any role — checking status is read-only)
    const projectId = (sigs[0] as any).project_id;
    const { data: project } = await (admin.from('projects') as any)
      .select('owner_id')
      .eq('id', projectId)
      .maybeSingle();
    const isOwner = !!project && (project as any).owner_id === user.id;
    if (!isOwner) {
      const { data: membership } = await (admin.from('project_members') as any)
        .select('user_id')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (!membership) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sdk = getPodpislon();
    const uniqueDocIds = Array.from(new Set((sigs as any[]).map(s => s.podpislon_doc_id)));

    // Poll each unique Podpislon doc
    const statusByDocId: Record<string, any> = {};
    for (const id of uniqueDocIds) {
      try {
        const doc = await sdk.getDocument(Number(id));
        if (doc) statusByDocId[id] = doc;
      } catch (_) { /* continue */ }
    }

    let overallFileStatus: 'none' | 'sent' | 'viewed' | 'signed' | 'cancelled' = 'sent';

    // Update each signature row based on Podpislon doc status
    for (const sig of sigs as any[]) {
      const doc = statusByDocId[sig.podpislon_doc_id];
      if (!doc) continue;
      const newStatus = mapPodpislonStatus(doc.status);
      const updates: any = { status: newStatus, last_checked_at: new Date().toISOString() };
      if (newStatus === 'signed' && doc.sign_at) updates.signed_at = new Date(doc.sign_at * 1000).toISOString();
      if (newStatus === 'viewed' && doc.opened_at) updates.viewed_at = new Date(doc.opened_at * 1000).toISOString();
      if (newStatus !== sig.status) {
        await (admin.from('document_signatures') as any).update(updates).eq('id', sig.id);
      }
      // Overall: signed if ALL signed, else lowest-progress state
      if (newStatus === 'cancelled') overallFileStatus = 'cancelled';
      else if (newStatus === 'signed' && overallFileStatus !== 'cancelled') {
        overallFileStatus = overallFileStatus === 'sent' || overallFileStatus === 'viewed' ? 'sent' : 'signed';
      } else if (newStatus === 'viewed' && overallFileStatus === 'sent') {
        overallFileStatus = 'viewed';
      }
    }
    // Recompute: file is "signed" only when ALL signatures are signed
    const allSigs = sigs as any[];
    const refreshed = await (admin.from('document_signatures') as any)
      .select('status')
      .eq('file_id', params.fileId);
    const allSigned = refreshed.data && refreshed.data.length > 0 && (refreshed.data as any[]).every(r => r.status === 'signed');
    if (allSigned) overallFileStatus = 'signed';

    await (admin.from('design_files') as any)
      .update({ signature_status: overallFileStatus })
      .eq('id', params.fileId);

    // Return fresh state
    const { data: fresh } = await (admin.from('document_signatures') as any)
      .select('id, signer_name, signer_last_name, signer_phone, status, signed_at, viewed_at, sent_at')
      .eq('file_id', params.fileId);

    return NextResponse.json({ fileStatus: overallFileStatus, signatures: fresh || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
