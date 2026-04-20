import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as cheerio from 'cheerio';

// Lazy init to avoid CI build failure
let _admin: ReturnType<typeof createClient> | null = null;
function getAdmin() {
  if (!_admin) _admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  return _admin;
}

function detectPlatform(url: string): string {
  const host = new URL(url).hostname.toLowerCase();
  if (host.includes('pinterest')) return 'pinterest';
  if (host.includes('behance')) return 'behance';
  if (host.includes('unsplash')) return 'unsplash';
  if (host.includes('dribbble')) return 'dribbble';
  return 'url';
}

export async function POST(req: Request) {
  try {
    const { url, moodboardId } = await req.json();
    if (!url || !moodboardId) {
      return NextResponse.json({ error: 'url and moodboardId required' }, { status: 400 });
    }

    // Verify auth
    const authHeader = req.headers.get('authorization');
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = getAdmin();
    const { data: { user }, error: authErr } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (authErr || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch URL and parse OG tags
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Archflow/1.0)' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) {
      return NextResponse.json({ error: `Failed to fetch URL: ${response.status}` }, { status: 400 });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const ogImage = $('meta[property="og:image"]').attr('content')
      || $('meta[name="twitter:image"]').attr('content')
      || $('meta[property="og:image:url"]').attr('content');
    const ogTitle = $('meta[property="og:title"]').attr('content')
      || $('title').text()
      || '';
    const ogDescription = $('meta[property="og:description"]').attr('content') || '';

    if (!ogImage) {
      return NextResponse.json({ error: 'No image found at this URL' }, { status: 400 });
    }

    // Resolve relative image URL
    const imageUrl = ogImage.startsWith('http') ? ogImage : new URL(ogImage, url).toString();

    // Download image
    const imgResponse = await fetch(imageUrl, {
      signal: AbortSignal.timeout(15000),
    });
    if (!imgResponse.ok) {
      return NextResponse.json({ error: 'Failed to download image' }, { status: 400 });
    }

    const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
    const contentType = imgResponse.headers.get('content-type') || 'image/jpeg';
    const ext = contentType.includes('png') ? 'png' : contentType.includes('webp') ? 'webp' : 'jpg';
    const ts = Date.now();
    const storagePath = `moodboard/${moodboardId}/${ts}_import.${ext}`;

    // Upload to storage
    const { error: uploadErr } = await admin.storage
      .from('moodboard-images')
      .upload(storagePath, imgBuffer, { contentType, upsert: false });

    if (uploadErr) {
      return NextResponse.json({ error: `Upload failed: ${uploadErr.message}` }, { status: 500 });
    }

    const { data: { publicUrl } } = admin.storage
      .from('moodboard-images')
      .getPublicUrl(storagePath);

    // Get max position
    const { data: lastItem } = await admin
      .from('moodboard_items')
      .select('position')
      .eq('moodboard_id', moodboardId)
      .order('position', { ascending: false })
      .limit(1)
      .single() as { data: { position: number } | null };
    const position = (lastItem?.position ?? -1) + 1;

    // Create moodboard item
    const { data: item, error: insertErr } = await admin
      .from('moodboard_items')
      .insert({
        moodboard_id: moodboardId,
        type: 'image' as const,
        position,
        image_url: publicUrl,
        file_path: storagePath,
        title: ogTitle.slice(0, 200) || null,
        source_url: url,
        source_platform: detectPlatform(url),
      } as any)
      .select()
      .single();

    if (insertErr) {
      return NextResponse.json({ error: `DB insert failed: ${insertErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ item });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
