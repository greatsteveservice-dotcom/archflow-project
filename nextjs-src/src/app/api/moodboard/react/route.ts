import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

let _admin: ReturnType<typeof createClient> | null = null;
function getAdmin() {
  if (!_admin) _admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  return _admin;
}

export async function POST(req: Request) {
  try {
    const { itemId, reaction, token } = await req.json();
    if (!itemId || !token) {
      return NextResponse.json({ error: 'itemId and token required' }, { status: 400 });
    }
    if (reaction && !['like', 'dislike', 'maybe'].includes(reaction)) {
      return NextResponse.json({ error: 'Invalid reaction' }, { status: 400 });
    }

    const admin = getAdmin();

    // Verify token matches a public moodboard that owns this item
    const { data: item } = await admin
      .from('moodboard_items')
      .select('id, moodboard_id')
      .eq('id', itemId)
      .single() as { data: { id: string; moodboard_id: string } | null };

    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });

    const { data: board } = await admin
      .from('moodboards')
      .select('id, is_public, public_token')
      .eq('id', item.moodboard_id)
      .single() as { data: { id: string; is_public: boolean; public_token: string | null } | null };

    if (!board || !board.is_public || board.public_token !== token) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Update reaction (null to clear)
    const updatePayload: Record<string, unknown> = { client_reaction: reaction || null };
    await (admin.from('moodboard_items') as any)
      .update(updatePayload)
      .eq('id', itemId);

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
}
