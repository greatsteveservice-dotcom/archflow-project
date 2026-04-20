import { NextResponse } from 'next/server';

// Lazy-init: avoid module-top-level throws during CI build "Collecting page data"
let _key: string | null = null;
function getKey(): string {
  if (_key) return _key;
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new Error('OPENAI_API_KEY not configured');
  _key = k;
  return _key;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audio = formData.get('audio');
    if (!audio || !(audio instanceof Blob)) {
      return NextResponse.json({ error: 'audio file required' }, { status: 400 });
    }

    // Limit size to 10MB
    if (audio.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'audio too large (max 10MB)' }, { status: 413 });
    }

    // OpenAI Whisper — reuse same model family as chat voice
    const openaiForm = new FormData();
    openaiForm.append('file', audio, 'voice.webm');
    openaiForm.append('model', 'gpt-4o-mini-transcribe');
    openaiForm.append('language', 'ru');
    openaiForm.append('response_format', 'text');

    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${getKey()}` },
      body: openaiForm,
    });

    if (!res.ok) {
      // Fallback to whisper-1 (broader compatibility) if mini-transcribe is unavailable
      const fallbackForm = new FormData();
      fallbackForm.append('file', audio, 'voice.webm');
      fallbackForm.append('model', 'whisper-1');
      fallbackForm.append('language', 'ru');
      fallbackForm.append('response_format', 'text');

      const fallback = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${getKey()}` },
        body: fallbackForm,
      });

      if (!fallback.ok) {
        const errText = await fallback.text().catch(() => '');
        return NextResponse.json({ error: `OpenAI: ${fallback.status} ${errText.slice(0, 200)}` }, { status: 500 });
      }
      const text = (await fallback.text()).trim();
      return NextResponse.json({ text });
    }

    const text = (await res.text()).trim();
    return NextResponse.json({ text });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
