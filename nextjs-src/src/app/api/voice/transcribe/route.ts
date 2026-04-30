/**
 * POST /api/voice/transcribe
 * Replaces the legacy Supabase Edge Function `process-voice` (which lived
 * on the old Supabase project and could not validate JWTs from the new
 * Yandex-hosted Supabase post-migration).
 *
 * Flow:
 *   1. Auth: verify Bearer JWT via Supabase, ensure caller is the user_id
 *      claimed in form data.
 *   2. Whisper: transcribe audio (OpenAI whisper-1, ru).
 *   3. GPT-4o-mini: cleanup punctuation/filler. Falls back to raw transcript.
 *   4. Update chat_messages row (by message_id) with cleaned text +
 *      voice_original (raw transcript) + voice_duration.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const maxDuration = 60;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

function mimeToExt(mimeType: string, originalName?: string): string {
  const map: Record<string, string> = {
    'audio/mp4': 'mp4',
    'audio/mpeg': 'mp3',
    'audio/mp3': 'mp3',
    'audio/wav': 'wav',
    'audio/wave': 'wav',
    'audio/x-wav': 'wav',
    'audio/webm': 'webm',
    'audio/m4a': 'm4a',
    'audio/x-m4a': 'm4a',
    'audio/aac': 'm4a',
    'audio/ogg': 'ogg',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'audio/webm;codecs=opus': 'webm',
  };
  const lower = (mimeType || '').toLowerCase().trim();
  if (map[lower]) return map[lower];
  const base = lower.split(';')[0].trim();
  if (map[base]) return map[base];
  if (originalName) {
    const m = originalName.match(/\.(\w+)$/);
    if (m) return m[1].toLowerCase();
  }
  return 'mp4';
}

export async function POST(req: NextRequest) {
  try {
    // Auth check
    const authHeader = req.headers.get('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }
    const token = authHeader.slice(7);

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    const projectId = formData.get('project_id') as string | null;
    const userId = formData.get('user_id') as string | null;
    const chatType = (formData.get('chat_type') as string | null) || 'team';
    const duration = parseInt((formData.get('duration') as string | null) || '0', 10);
    const messageId = formData.get('message_id') as string | null;

    if (!audioFile || !projectId || !userId) {
      return NextResponse.json(
        { error: 'audio, project_id, and user_id are required' },
        { status: 400 },
      );
    }
    if (userId !== user.id) {
      return NextResponse.json({ error: 'user_id mismatch' }, { status: 403 });
    }

    const fileMime = audioFile.type || 'audio/mp4';
    const fileExt = mimeToExt(fileMime, audioFile.name);
    const fileName = `voice.${fileExt}`;

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Whisper
    const whisperForm = new FormData();
    const audioBlob = new Blob([await audioFile.arrayBuffer()], { type: fileMime });
    whisperForm.append('file', audioBlob, fileName);
    whisperForm.append('model', 'whisper-1');
    whisperForm.append('language', 'ru');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: whisperForm,
    });

    if (!whisperRes.ok) {
      const errText = await whisperRes.text().catch(() => '');
      console.error('[voice/transcribe] Whisper error', whisperRes.status, errText);
      if (messageId) {
        await admin.from('chat_messages').update({
          text: '⚠️ Ошибка распознавания речи',
        }).eq('id', messageId);
      }
      return NextResponse.json(
        { error: `Whisper error: ${whisperRes.status}` },
        { status: 502 },
      );
    }

    const whisperData = await whisperRes.json() as { text?: string };
    const rawTranscript = (whisperData.text || '').trim();

    if (!rawTranscript) {
      if (messageId) {
        await admin.from('chat_messages').update({
          text: '🎤 Не удалось распознать речь',
        }).eq('id', messageId);
      }
      return NextResponse.json(
        { error: 'empty_transcript' },
        { status: 422 },
      );
    }

    // 2. GPT-4o-mini cleanup (best-effort)
    let cleanedText = rawTranscript;
    try {
      const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          max_tokens: 1024,
          messages: [
            {
              role: 'system',
              content:
                'Ты редактор расшифровок голосовых сообщений. Убери слова-паразиты, расставь знаки препинания, сохрани живой разговорный тон. ВАЖНО: верни ТОЛЬКО отредактированный текст самого сообщения, без префиксов, заголовков, вводных фраз вроде «вот ваш текст», «голосовое сообщение», без указания автора и адресата.',
            },
            {
              role: 'user',
              content: rawTranscript,
            },
          ],
        }),
      });
      if (gptRes.ok) {
        const gptData = await gptRes.json() as { choices?: Array<{ message?: { content?: string } }> };
        const out = gptData.choices?.[0]?.message?.content;
        if (out && out.trim()) cleanedText = out.trim();
      } else {
        console.warn('[voice/transcribe] GPT cleanup failed, using raw transcript');
      }
    } catch (e) {
      console.warn('[voice/transcribe] GPT cleanup threw, using raw transcript', e);
    }

    // 3. Persist
    if (messageId) {
      const { data: message, error: updateError } = await admin
        .from('chat_messages')
        .update({
          text: cleanedText,
          voice_original: rawTranscript,
          voice_duration: duration,
        })
        .eq('id', messageId)
        .select()
        .single();
      if (updateError) {
        console.error('[voice/transcribe] DB update error', updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
      return NextResponse.json({ ok: true, message }, { status: 200 });
    }

    // Backward-compat insert path (no message_id provided)
    const { data: message, error: insertError } = await admin
      .from('chat_messages')
      .insert({
        project_id: projectId,
        user_id: userId,
        text: cleanedText,
        chat_type: chatType,
        message_type: 'voice',
        voice_duration: duration,
        voice_original: rawTranscript,
      })
      .select()
      .single();
    if (insertError) {
      console.error('[voice/transcribe] DB insert error', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, message }, { status: 200 });
  } catch (err: any) {
    console.error('[voice/transcribe] FATAL', err);
    return NextResponse.json(
      { error: err?.message || 'Internal error' },
      { status: 500 },
    );
  }
}
