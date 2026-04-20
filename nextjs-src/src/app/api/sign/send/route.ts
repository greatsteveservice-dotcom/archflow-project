import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getPodpislon, normalizePhone } from '../../../lib/podpislon';

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

interface Signer {
  name: string;
  last_name: string;
  second_name?: string;
  phone: string;
}

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const accessToken = auth.replace(/^Bearer\s+/i, '').trim();
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify user via anon client with the bearer token
    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { fileId, signers } = body as { fileId: string; signers: Signer[] };
    if (!fileId || !Array.isArray(signers) || signers.length === 0) {
      return NextResponse.json({ error: 'fileId and signers required' }, { status: 400 });
    }

    // Validate each signer
    const normalized = signers.map(s => ({
      name: (s.name || '').trim(),
      last_name: (s.last_name || '').trim(),
      second_name: (s.second_name || '').trim() || undefined,
      phone: normalizePhone(s.phone || ''),
    }));
    for (const s of normalized) {
      if (!s.name || !s.last_name || !s.phone) {
        return NextResponse.json({ error: 'Каждый подписант должен иметь имя, фамилию и телефон' }, { status: 400 });
      }
      if (s.phone.length !== 11 || !s.phone.startsWith('7')) {
        return NextResponse.json({ error: `Некорректный телефон: ${s.phone}` }, { status: 400 });
      }
    }

    const admin = getAdmin();

    // Fetch design_file
    const { data: file, error: fileErr } = await (admin.from('design_files') as any)
      .select('id, project_id, name, file_path, file_type, folder')
      .eq('id', fileId)
      .single();
    if (fileErr || !file) return NextResponse.json({ error: 'Файл не найден' }, { status: 404 });
    if (file.folder !== 'documents') {
      return NextResponse.json({ error: 'Подписание доступно только для файлов в папке Документы' }, { status: 400 });
    }

    // Permission: owner of project OR member with designer/assistant role
    const { data: project } = await (admin.from('projects') as any)
      .select('owner_id')
      .eq('id', file.project_id)
      .maybeSingle();
    const isOwner = !!project && (project as any).owner_id === user.id;
    let isTeamMember = false;
    if (!isOwner) {
      const { data: membership } = await (admin.from('project_members') as any)
        .select('role')
        .eq('project_id', file.project_id)
        .eq('user_id', user.id)
        .maybeSingle();
      isTeamMember = !!membership && ['designer', 'assistant'].includes((membership as any).role);
    }
    if (!isOwner && !isTeamMember) {
      return NextResponse.json({ error: 'Нет прав для отправки на подпись' }, { status: 403 });
    }

    // Download file from Storage
    const { data: blobData, error: dlErr } = await admin.storage.from('design-files').download(file.file_path);
    if (dlErr || !blobData) return NextResponse.json({ error: 'Не удалось получить файл из хранилища' }, { status: 500 });

    // Convert to Blob with correct MIME for Podpislon
    const arrayBuffer = await (blobData as Blob).arrayBuffer();
    const mime = file.file_type || 'application/pdf';
    const fileName = file.name.endsWith('.pdf') ? file.name : `${file.name}.pdf`;
    const fileBlob = new Blob([arrayBuffer], { type: mime });
    // Podpislon SDK accepts Blob with name when using FormData — we attach name via a wrapper File-like object
    (fileBlob as any).name = fileName;

    // Send to Podpislon
    const sdk = getPodpislon();
    const payload: any = {
      file: fileBlob,
      agreement: true,
    };
    if (normalized.length === 1) {
      payload.name = normalized[0].name;
      payload.last_name = normalized[0].last_name;
      if (normalized[0].second_name) payload.second_name = normalized[0].second_name;
      payload.phone = normalized[0].phone;
    } else {
      payload.contacts = normalized;
      payload.stroke_doc = 0; // parallel signing by default
    }

    const resp = await sdk.createDocument(payload);
    if (!resp?.status) {
      const msg = resp?.message || resp?.sessError || 'Ошибка Подпислона';
      return NextResponse.json({ error: msg }, { status: 500 });
    }

    // Extract doc id (API returns either single id or array or object with files[])
    let docIds: number[] = [];
    if (typeof resp.result === 'number') docIds = [resp.result];
    else if (Array.isArray(resp.result)) docIds = resp.result;
    else if (resp.result && Array.isArray(resp.result.files)) docIds = resp.result.files;
    if (docIds.length === 0) return NextResponse.json({ error: 'Подпислон не вернул ID документа' }, { status: 500 });
    const primaryDocId = String(docIds[0]);

    // Save DB record (one row per signer so we can track individual progress later)
    const rows = normalized.map(s => ({
      file_id: file.id,
      project_id: file.project_id,
      user_id: user.id,
      podpislon_doc_id: primaryDocId,
      signer_name: s.name,
      signer_last_name: s.last_name,
      signer_phone: s.phone,
      status: 'sent',
    }));
    await (admin.from('document_signatures') as any).insert(rows);

    // Update file signature_status
    await (admin.from('design_files') as any).update({ signature_status: 'sent' }).eq('id', file.id);

    return NextResponse.json({ ok: true, podpislonDocId: primaryDocId, docIds });
  } catch (err: any) {
    const msg = err?.response?.message || err?.message || 'Внутренняя ошибка';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
