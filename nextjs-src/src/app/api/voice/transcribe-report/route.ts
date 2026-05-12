/**
 * POST /api/voice/transcribe-report
 *
 * Designer наговаривает голосом на объекте — мы расшифровываем (Whisper),
 * затем GPT-4o-mini структурирует результат:
 *   - generalComment: связный общий комментарий (с пунктуацией, без воды)
 *   - remarks: массив отдельных замечаний (по одному на строку), извлечённых
 *     из реплики ("по коридору замечание 1, по кухне замечание 2, ...")
 *
 * Возвращает JSON `{ generalComment, remarks }`. Ничего не пишет в БД —
 * клиент сам решает, какие пункты применить (вставить в общий комментарий,
 * создать как visit_remarks).
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '../../../lib/api-auth';

export const runtime = 'nodejs';
export const maxDuration = 60;

const OPENAI_API_KEY = process.env.OPENAI_API_KEY!;

const STRUCTURE_PROMPT = `Ты помощник дизайнера интерьеров. На входе — расшифровка голосовой заметки, надиктованной во время визита на объект (авторский надзор).

Твоя задача — преобразовать поток речи в структурированный отчёт. Верни СТРОГО JSON:
{
  "generalComment": "Связный общий комментарий (1-3 предложения), описывающий состояние объекта или вводную фразу. Если в речи нет общей оценки — верни пустую строку.",
  "remarks": [
    "Конкретное замечание 1 — одно короткое предложение в повелительной форме, без префикса 'замечание'.",
    "Конкретное замечание 2 — ..."
  ]
}

Правила:
- Не добавляй пункты, которых не было в речи.
- Каждое замечание = одно действие (поправить, переделать, проверить, заменить и т.п.).
- Обязательно сохраняй упоминание помещения, если оно было («В коридоре: …»).
- Никаких маркдаун-обёрток вокруг JSON, никаких комментариев — только сам JSON.
- Если речь пустая или непонятная — верни {"generalComment":"","remarks":[]}.`;

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth(req);
    if (auth.error) return auth.error;

    if (!OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OPENAI_API_KEY не настроен' }, { status: 500 });
    }

    const formData = await req.formData();
    const audioFile = formData.get('audio') as File | null;
    if (!audioFile) {
      return NextResponse.json({ error: 'audio обязателен' }, { status: 400 });
    }

    // 1. Whisper
    const ext = (audioFile.type || '').includes('webm') ? 'webm' : (audioFile.type || '').includes('mp4') ? 'mp4' : 'm4a';
    const buf = Buffer.from(await audioFile.arrayBuffer());
    const whisperForm = new FormData();
    whisperForm.append('file', new Blob([new Uint8Array(buf)], { type: audioFile.type || 'audio/webm' }), `voice.${ext}`);
    whisperForm.append('model', 'whisper-1');
    whisperForm.append('language', 'ru');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
      body: whisperForm,
    });
    if (!whisperRes.ok) {
      const errText = await whisperRes.text().catch(() => '');
      console.error('[transcribe-report] Whisper error', whisperRes.status, errText);
      return NextResponse.json({ error: `Whisper error: ${whisperRes.status}` }, { status: 502 });
    }
    const whisperData = (await whisperRes.json()) as { text?: string };
    const rawTranscript = (whisperData.text || '').trim();

    if (!rawTranscript) {
      return NextResponse.json({ generalComment: '', remarks: [], rawTranscript: '' });
    }

    // 2. GPT-4o-mini structuring with JSON mode
    let parsed: { generalComment: string; remarks: string[] } = { generalComment: rawTranscript, remarks: [] };
    try {
      const gptRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${OPENAI_API_KEY}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: STRUCTURE_PROMPT },
            { role: 'user', content: rawTranscript },
          ],
          temperature: 0.2,
        }),
      });
      if (gptRes.ok) {
        const gptData = (await gptRes.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = gptData.choices?.[0]?.message?.content || '';
        const obj = JSON.parse(content);
        parsed = {
          generalComment: typeof obj.generalComment === 'string' ? obj.generalComment.trim() : '',
          remarks: Array.isArray(obj.remarks)
            ? obj.remarks.filter((r: unknown): r is string => typeof r === 'string' && r.trim().length > 0).map((r: string) => r.trim())
            : [],
        };
      } else {
        console.warn('[transcribe-report] GPT structuring failed, returning raw');
      }
    } catch (e) {
      console.warn('[transcribe-report] GPT JSON parse failed, returning raw', e);
    }

    return NextResponse.json({ ...parsed, rawTranscript });
  } catch (err) {
    console.error('[transcribe-report] FATAL', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}
