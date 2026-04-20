import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { classifyImage } from '../../../lib/yandex-vision';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = req.headers.get('authorization') || '';
    const accessToken = auth.replace(/^Bearer\s+/i, '').trim();
    if (!accessToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${accessToken}` } },
    });
    const { data: { user } } = await anon.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const form = await req.formData();
    const file = form.get('image');
    if (!file || !(file instanceof Blob)) return NextResponse.json({ error: 'image file required' }, { status: 400 });
    if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'image too large (max 10MB)' }, { status: 413 });

    const arrayBuffer = await (file as Blob).arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    const labels = await classifyImage(base64, 5);
    // Pick most relevant labels (top 2-3) and build a search query
    const query = labels.slice(0, 3).join(' ') || 'интерьер';

    return NextResponse.json({ detectedQuery: query, labels });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
