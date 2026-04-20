import { createClient } from '@supabase/supabase-js';
import BoardPublicView from './BoardPublicView';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export default async function BoardPublicPage({ params }: { params: { token: string } }) {
  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // Fetch moodboard by public token
  const { data: board } = await supabase
    .from('moodboards')
    .select('*')
    .eq('is_public', true)
    .eq('public_token', params.token)
    .single();

  if (!board) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'Vollkorn SC', serif", color: '#111',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Доска не найдена</h1>
          <p style={{ fontSize: 12, color: '#999' }}>Ссылка недействительна или доска закрыта</p>
        </div>
      </div>
    );
  }

  // Fetch items and sections
  const [{ data: items }, { data: sections }] = await Promise.all([
    supabase.from('moodboard_items').select('*').eq('moodboard_id', board.id).order('position'),
    supabase.from('moodboard_sections').select('*').eq('moodboard_id', board.id).order('sort_order'),
  ]);

  return (
    <BoardPublicView
      board={board}
      items={items || []}
      sections={sections || []}
      token={params.token}
    />
  );
}
