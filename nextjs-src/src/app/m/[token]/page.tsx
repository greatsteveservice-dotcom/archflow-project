import { createClient } from '@supabase/supabase-js';
import type { Metadata } from 'next';
import MoodboardPublicView from './MoodboardPublicView';

let _admin: ReturnType<typeof createClient> | null = null;
function getAdmin() {
  if (!_admin) _admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  return _admin;
}

interface PageProps {
  params: Promise<{ token: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const admin = getAdmin();
  const { data: board } = await admin
    .from('moodboards')
    .select('title, description')
    .eq('public_token', token)
    .eq('is_public', true)
    .single() as { data: { title: string; description: string | null } | null };

  return {
    title: board ? `${board.title} — Archflow` : 'Мудборд — Archflow',
    description: board?.description || 'Визуальная концепция проекта',
  };
}

export default async function MoodboardPublicPage({ params }: PageProps) {
  const { token } = await params;
  const admin = getAdmin();

  const { data: board } = await admin
    .from('moodboards')
    .select('*')
    .eq('public_token', token)
    .eq('is_public', true)
    .single() as { data: any };

  if (!board) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        minHeight: '100vh', fontFamily: "'Vollkorn SC', serif",
        background: '#F6F6F4', color: '#111',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Мудборд не найден</h1>
          <p style={{ fontSize: 12, color: '#888' }}>Ссылка недействительна или доступ закрыт</p>
        </div>
      </div>
    );
  }

  const { data: items } = await admin
    .from('moodboard_items')
    .select('*')
    .eq('moodboard_id', board.id)
    .order('position', { ascending: true }) as { data: any[] | null };

  return <MoodboardPublicView board={board} items={items || []} token={token} />;
}
