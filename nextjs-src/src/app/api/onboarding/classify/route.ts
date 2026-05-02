import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import {
  buildClassifyPrompt,
  parseAiResponse,
  decideStatus,
  isExcelMime,
  isImageMime,
  ONBOARDING_BUCKET,
  ONBOARDING_PREFIX,
  type OnboardingFileBrief,
} from '../../../lib/onboarding';

// ============================================================
// POST /api/onboarding/classify
// Body: { projectId, files: [{ storagePath, name, size, mime }] }
// 1. Auth + project access (designer/assistant or owner)
// 2. Insert pending rows
// 3. Collect features (xlsx headers, signed URLs for images)
// 4. Single batch GPT-4o-mini call
// 5. Apply results: auto_placed → create design_files + move file
// 6. Return updated rows
// ============================================================

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

interface InputFile {
  storagePath: string; // путь внутри bucket: _onboarding/{projectId}/{uuid}_{name}
  name: string;
  size: number;
  mime: string;
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('Authorization')?.replace(/^Bearer\s+/, '');
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { projectId, files } = body as { projectId: string; files: InputFile[] };

    if (!projectId || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json({ error: 'projectId and files required' }, { status: 400 });
    }
    if (files.length > 100) {
      return NextResponse.json({ error: 'too_many_files (max 100)' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'AI not configured' }, { status: 500 });
    }

    // ── Auth + access check ──
    const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON);
    const { data: { user }, error: authErr } = await anonClient.auth.getUser(auth);
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Access check
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

    // ── Insert pending rows ──
    const { data: inserted, error: insertErr } = await adminClient
      .from('onboarding_uploads')
      .insert(
        files.map((f) => ({
          project_id: projectId,
          uploaded_by: user.id,
          storage_path: f.storagePath,
          file_name: f.name,
          file_size: f.size,
          file_type: f.mime,
          status: 'pending',
        })),
      )
      .select();
    if (insertErr || !inserted) {
      return NextResponse.json({ error: insertErr?.message || 'insert_failed' }, { status: 500 });
    }

    // ── Collect briefs (excel headers, image signed URLs) ──
    const briefs: OnboardingFileBrief[] = [];
    const llmContent: Array<{ type: 'text' | 'image_url'; text?: string; image_url?: { url: string; detail: 'low' } }> = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      const brief: OnboardingFileBrief = { index: i, name: f.name, size: f.size, mime: f.mime };

      // Excel — read first row as headers
      if (isExcelMime(f.mime, f.name)) {
        try {
          const { data: blob } = await adminClient.storage.from(ONBOARDING_BUCKET).download(f.storagePath);
          if (blob) {
            const buf = Buffer.from(await blob.arrayBuffer());
            const wb = XLSX.read(buf, { type: 'buffer' });
            const sheet = wb.Sheets[wb.SheetNames[0]];
            const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0 });
            const firstNonEmpty = rows.find((r) => Array.isArray(r) && r.some((v) => v != null && String(v).trim()));
            if (firstNonEmpty) {
              brief.excelHeaders = (firstNonEmpty as unknown[]).map((v) => String(v ?? '').trim()).filter(Boolean);
            }
          }
        } catch (e) {
          console.warn('[onboarding/classify] excel read failed', f.name, e);
        }
      }

      // Image — signed URL for vision
      if (isImageMime(f.mime)) {
        const { data: signed } = await adminClient.storage
          .from(ONBOARDING_BUCKET)
          .createSignedUrl(f.storagePath, 600);
        if (signed?.signedUrl) {
          brief.imageDataUrl = signed.signedUrl;
          llmContent.push({
            type: 'image_url',
            image_url: { url: signed.signedUrl, detail: 'low' },
          });
        }
      }

      briefs.push(brief);
    }

    // ── Build prompt + call OpenAI ──
    const prompt = buildClassifyPrompt(briefs);
    llmContent.unshift({ type: 'text', text: prompt });

    const oaRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: llmContent }],
        max_tokens: 100 * files.length + 200,
        temperature: 0,
        response_format: { type: 'json_object' },
      }),
    });

    if (!oaRes.ok) {
      const errText = await oaRes.text();
      console.error('[onboarding/classify] OpenAI error:', errText);
      // Mark rows as needs_review on failure — не теряем файлы
      await adminClient
        .from('onboarding_uploads')
        .update({ status: 'needs_review', ai_reasoning: 'Не удалось классифицировать автоматически' })
        .in('id', inserted.map((r) => r.id));
      const { data: fallback } = await adminClient
        .from('onboarding_uploads')
        .select('*')
        .in('id', inserted.map((r) => r.id));
      return NextResponse.json({ items: fallback || [] });
    }

    const oaData = await oaRes.json();
    const content = oaData?.choices?.[0]?.message?.content || '';
    const classifications = parseAiResponse(content, files.length);

    // ── Apply results ──
    const updates: Array<{ id: string; row: Record<string, unknown> }> = [];

    for (let i = 0; i < files.length; i++) {
      const row = inserted[i];
      const cls = classifications.find((c) => c.index === i);

      if (!cls) {
        updates.push({
          id: row.id,
          row: {
            status: 'needs_review',
            ai_reasoning: 'ИИ не вернул классификацию',
            decided_at: new Date().toISOString(),
          },
        });
        continue;
      }

      const decision = decideStatus(cls);

      // Auto-place: создаём design_files + переносим файл
      if (decision.status === 'auto_placed' && decision.finalCategory) {
        const newPath = `${projectId}/${decision.finalCategory}/${row.id}_${files[i].name}`;
        const { error: moveErr } = await adminClient.storage
          .from(ONBOARDING_BUCKET)
          .move(files[i].storagePath, newPath);

        if (moveErr) {
          console.warn('[onboarding/classify] move failed, fallback to needs_review', moveErr);
          updates.push({
            id: row.id,
            row: {
              status: 'needs_review',
              ai_category: cls.category,
              ai_confidence: cls.confidence,
              ai_reasoning: cls.reason + ' (storage move failed)',
              decided_at: new Date().toISOString(),
            },
          });
          continue;
        }

        const { data: pub } = adminClient.storage.from(ONBOARDING_BUCKET).getPublicUrl(newPath);

        const { data: df, error: dfErr } = await adminClient
          .from('design_files')
          .insert({
            project_id: projectId,
            folder: decision.finalCategory,
            subfolder: null,
            name: files[i].name,
            file_path: newPath,
            file_url: pub.publicUrl,
            file_size: files[i].size,
            file_type: files[i].mime,
            uploaded_by: user.id,
          })
          .select()
          .single();

        if (dfErr || !df) {
          console.error('[onboarding/classify] design_files insert failed', dfErr);
          updates.push({
            id: row.id,
            row: {
              status: 'needs_review',
              ai_category: cls.category,
              ai_confidence: cls.confidence,
              ai_reasoning: cls.reason + ' (db insert failed)',
              decided_at: new Date().toISOString(),
            },
          });
          continue;
        }

        updates.push({
          id: row.id,
          row: {
            status: 'auto_placed',
            ai_category: cls.category,
            ai_confidence: cls.confidence,
            ai_reasoning: cls.reason,
            final_category: decision.finalCategory,
            created_design_file_id: df.id,
            storage_path: newPath,
            decided_at: new Date().toISOString(),
          },
        });
      } else {
        // needs_review or supply_suggested — оставляем файл в _onboarding/, ждём решения
        updates.push({
          id: row.id,
          row: {
            status: decision.status,
            ai_category: cls.category,
            ai_confidence: cls.confidence,
            ai_reasoning: cls.reason,
          },
        });
      }
    }

    // Apply updates one-by-one (different payloads)
    for (const u of updates) {
      await adminClient.from('onboarding_uploads').update(u.row).eq('id', u.id);
    }

    const { data: finalRows } = await adminClient
      .from('onboarding_uploads')
      .select('*')
      .in('id', inserted.map((r) => r.id));

    // Approximate cost (GPT-4o-mini input ~$0.15/1M tok, output ~$0.60/1M tok)
    const usage = oaData?.usage;
    const costUsd = usage
      ? (usage.prompt_tokens * 0.15 + usage.completion_tokens * 0.60) / 1_000_000
      : undefined;

    return NextResponse.json({ items: finalRows || [], cost_usd: costUsd });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'internal_error';
    console.error('[onboarding/classify] error:', err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

