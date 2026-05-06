import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { execFile } from 'node:child_process';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';

// Конвертирует DOCX/DOC/ODT в PDF через LibreOffice headless,
// загружает результат в supabase storage `design-files` и
// создаёт новую запись в `design_files`. Используется на карточке
// файла для последующей электронной подписи (Подпислон поддерживает только PDF).
//
// Body: { fileId: string, accessToken: string }
// Returns: { ok: true, fileId, name }

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SOFFICE_BIN = process.env.SOFFICE_BIN || 'soffice';
// Конвертация Office-документов небыстрая, особенно при первом холодном запуске.
const CONVERT_TIMEOUT_MS = 90_000;

const execFileAsync = promisify(execFile);

// Принимаем основные офисные форматы, которые LibreOffice уверенно держит.
const CONVERTIBLE_MIME = new Set([
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'application/vnd.oasis.opendocument.text', // .odt
  'application/rtf',
  'text/rtf',
]);
const CONVERTIBLE_EXT = /\.(docx|doc|odt|rtf)$/i;

function isConvertible(file: { file_type: string | null; name: string }): boolean {
  const t = (file.file_type || '').toLowerCase();
  if (CONVERTIBLE_MIME.has(t)) return true;
  return CONVERTIBLE_EXT.test(file.name);
}

function pdfNameFor(srcName: string): string {
  const base = srcName.replace(/\.(docx|doc|odt|rtf)$/i, '');
  return `${base}.pdf`;
}

export async function POST(request: NextRequest) {
  let workDir: string | null = null;

  try {
    const body = await request.json().catch(() => ({}));
    const { fileId, accessToken } = body as { fileId?: string; accessToken?: string };

    if (!fileId) {
      return NextResponse.json({ error: 'fileId required' }, { status: 400 });
    }
    if (!accessToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 1. Auth — verify the caller's JWT
    const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(accessToken);
    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Service-role клиент для всех server-side операций (storage, design_files insert)
    const admin = createClient(supabaseUrl, serviceRoleKey);

    // 3. Получаем исходный файл
    const { data: file, error: fileErr } = await admin
      .from('design_files')
      .select('id, project_id, folder, subfolder, name, file_path, file_type, file_size')
      .eq('id', fileId)
      .single();

    if (fileErr || !file) {
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    if (file.folder !== 'documents') {
      return NextResponse.json({ error: 'Only files in Documents folder can be converted' }, { status: 400 });
    }

    if (!isConvertible({ file_type: file.file_type, name: file.name })) {
      return NextResponse.json({ error: 'Файл не подлежит конвертации (поддерживаются .docx, .doc, .odt, .rtf)' }, { status: 400 });
    }

    // 4. Permission — owner or designer/assistant
    const { data: project } = await admin
      .from('projects')
      .select('owner_id')
      .eq('id', file.project_id)
      .single();
    const isOwner = project?.owner_id === user.id;
    if (!isOwner) {
      const { data: member } = await admin
        .from('project_members')
        .select('role')
        .eq('project_id', file.project_id)
        .eq('user_id', user.id)
        .single();
      if (!member || !['designer', 'assistant'].includes(member.role)) {
        return NextResponse.json({ error: 'Permission denied' }, { status: 403 });
      }
    }

    // 5. Скачиваем исходник из supabase storage
    const { data: blob, error: dlErr } = await admin.storage
      .from('design-files')
      .download(file.file_path);
    if (dlErr || !blob) {
      return NextResponse.json({ error: `Не удалось скачать файл: ${dlErr?.message || 'unknown'}` }, { status: 500 });
    }
    const srcBytes = Buffer.from(await blob.arrayBuffer());

    // 6. Готовим изолированную рабочую папку. Изолированный UserInstallation
    // нужен чтобы параллельные запросы не дрались за один профиль soffice.
    workDir = await mkdtemp(path.join(tmpdir(), 'aflo-convert-'));
    const safeBase = (file.name.split('.').slice(0, -1).join('.') || 'document').replace(/[^a-zA-Z0-9._-]/g, '_');
    const ext = (file.name.match(/\.([a-z0-9]+)$/i)?.[1] || 'docx').toLowerCase();
    const srcPath = path.join(workDir, `${safeBase}.${ext}`);
    const userProfile = path.join(workDir, 'lo-profile');
    await writeFile(srcPath, srcBytes);

    // 7. Конвертация LibreOffice headless
    try {
      await execFileAsync(SOFFICE_BIN, [
        '--headless',
        `-env:UserInstallation=file://${userProfile}`,
        '--convert-to', 'pdf',
        '--outdir', workDir,
        srcPath,
      ], { timeout: CONVERT_TIMEOUT_MS, maxBuffer: 32 * 1024 * 1024 });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `LibreOffice конвертация не удалась: ${msg}` }, { status: 500 });
    }

    // soffice кладёт результат рядом, имя = baseName + .pdf
    const pdfPath = path.join(workDir, `${safeBase}.pdf`);
    let pdfBytes: Buffer;
    try {
      pdfBytes = await readFile(pdfPath);
    } catch {
      return NextResponse.json({ error: 'PDF не сгенерирован — LibreOffice не вернул файл' }, { status: 500 });
    }

    // 8. Загружаем PDF обратно в supabase storage
    const timestamp = Date.now() + Math.floor(Math.random() * 1000);
    const safeNameForStorage = pdfNameFor(file.name).replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `design/${file.project_id}/documents/${timestamp}_${safeNameForStorage}`;

    const { error: upErr } = await admin.storage
      .from('design-files')
      .upload(storagePath, pdfBytes, {
        contentType: 'application/pdf',
        upsert: false,
      });
    if (upErr) {
      return NextResponse.json({ error: `Storage upload failed: ${upErr.message}` }, { status: 500 });
    }

    const { data: urlData } = admin.storage.from('design-files').getPublicUrl(storagePath);

    // 9. Создаём запись о новом PDF
    const { data: created, error: insertErr } = await admin
      .from('design_files')
      .insert({
        project_id: file.project_id,
        folder: 'documents',
        subfolder: file.subfolder,
        name: pdfNameFor(file.name),
        file_path: storagePath,
        file_url: urlData.publicUrl,
        file_size: pdfBytes.length,
        file_type: 'application/pdf',
        uploaded_by: user.id,
      })
      .select('id, name')
      .single();

    if (insertErr || !created) {
      // Если БД упала — подчищаем загруженный объект, чтобы не висел сирота.
      await admin.storage.from('design-files').remove([storagePath]).catch(() => {});
      return NextResponse.json({ error: `DB insert failed: ${insertErr?.message || 'unknown'}` }, { status: 500 });
    }

    return NextResponse.json({ ok: true, fileId: created.id, name: created.name });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  } finally {
    if (workDir) {
      // Не блокируем ответ — асинхронно удаляем темп.
      rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

// Конвертация может идти десятки секунд — Next должен это переносить.
export const maxDuration = 120;
// Принудительно node-runtime: child_process нет в edge.
export const runtime = 'nodejs';
