'use client';

import { useState } from 'react';

interface BoardData {
  id: string;
  title: string;
  description: string | null;
  color_palette: { hex: string; name?: string }[];
  client_can_comment: boolean;
}

interface ItemData {
  id: string;
  type: string;
  image_url: string | null;
  title: string | null;
  source_platform: string | null;
  text_content: string | null;
  text_color: string;
  bg_color: string;
  color_hex: string | null;
  color_name: string | null;
  client_reaction: string | null;
  dominant_colors: { hex: string; population: number }[] | null;
}

interface Props {
  board: BoardData;
  items: ItemData[];
  token: string;
}

export default function MoodboardPublicView({ board, items, token }: Props) {
  const [reactions, setReactions] = useState<Record<string, string | null>>(() => {
    const map: Record<string, string | null> = {};
    items.forEach(i => { map[i.id] = i.client_reaction; });
    return map;
  });

  const setReaction = async (itemId: string, reaction: string | null) => {
    const prev = reactions[itemId];
    const newReaction = prev === reaction ? null : reaction;
    setReactions(r => ({ ...r, [itemId]: newReaction }));

    try {
      await fetch('/api/moodboard/react', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, reaction: newReaction, token }),
      });
    } catch {
      setReactions(r => ({ ...r, [itemId]: prev }));
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: '#F6F6F4',
      fontFamily: "'Vollkorn SC', serif",
    }}>
      {/* Header */}
      <div style={{
        maxWidth: 1200, margin: '0 auto', padding: '40px 16px 20px',
      }}>
        <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#888', marginBottom: 8 }}>
          Archflow
        </div>
        <h1 style={{ fontSize: 32, fontWeight: 900, color: '#111', margin: 0, marginBottom: 8 }}>
          {board.title}
        </h1>
        {board.description && (
          <p style={{ fontSize: 14, color: '#888', margin: 0, marginBottom: 16 }}>
            {board.description}
          </p>
        )}
        {/* Color palette */}
        {board.color_palette && board.color_palette.length > 0 && (
          <div style={{ display: 'flex', gap: 2, marginBottom: 16 }}>
            {board.color_palette.map((c, i) => (
              <span key={i} style={{
                width: 24, height: 24, background: c.hex,
                border: '0.5px solid #EBEBEB',
              }} />
            ))}
          </div>
        )}
      </div>

      {/* Masonry grid */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 16px 80px' }}>
        <div className="af-masonry">
          {items.map(item => (
            <PublicCard
              key={item.id}
              item={item}
              reaction={reactions[item.id]}
              onReact={(r) => setReaction(item.id, r)}
            />
          ))}
        </div>
        {items.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#888', fontSize: 14 }}>
            Пока пусто
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        textAlign: 'center', padding: '20px 16px',
        borderTop: '0.5px solid #EBEBEB',
        fontSize: 10, color: '#888', letterSpacing: '0.1em',
      }}>
        Создано в Archflow
      </div>
    </div>
  );
}

function PublicCard({ item, reaction, onReact }: {
  item: ItemData;
  reaction: string | null | undefined;
  onReact: (r: string) => void;
}) {
  if (item.type === 'image') {
    return (
      <div className="af-masonry-item" style={{ position: 'relative' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.image_url || ''} alt={item.title || ''} loading="lazy"
          style={{ width: '100%', height: 'auto', display: 'block' }} />
        {item.source_platform && item.source_platform !== 'upload' && (
          <span style={{
            position: 'absolute', top: 6, left: 6,
            fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.08em',
            color: '#fff', background: 'rgba(0,0,0,0.55)', padding: '2px 6px',
          }}>{item.source_platform}</span>
        )}
        {item.title && <div className="af-masonry-overlay">{item.title}</div>}
        {/* Reaction buttons */}
        <div style={{
          position: 'absolute', bottom: 6, right: 6,
          display: 'flex', gap: 4,
        }}>
          {['like', 'dislike', 'maybe'].map(r => (
            <button
              key={r}
              onClick={(e) => { e.stopPropagation(); onReact(r); }}
              style={{
                width: 28, height: 28, fontSize: 12,
                background: reaction === r ? '#111' : 'rgba(255,255,255,0.9)',
                color: reaction === r ? '#fff' : '#111',
                border: '0.5px solid #111', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'Vollkorn SC', serif", fontWeight: 700,
              }}
            >
              {r === 'like' ? '+' : r === 'dislike' ? '-' : '?'}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (item.type === 'text_note') {
    return (
      <div className="af-masonry-item" style={{ padding: 16, background: item.bg_color, minHeight: 80 }}>
        <p style={{ fontSize: 14, color: item.text_color, lineHeight: 1.5, margin: 0 }}>
          {item.text_content}
        </p>
      </div>
    );
  }

  if (item.type === 'color_swatch') {
    return (
      <div className="af-masonry-item" style={{ background: item.color_hex || '#111', minHeight: 100, position: 'relative' }}>
        <div style={{ position: 'absolute', bottom: 8, left: 8 }}>
          <span style={{ fontSize: 8, color: '#fff', background: 'rgba(0,0,0,0.4)', padding: '1px 4px' }}>
            {item.color_hex}
          </span>
        </div>
      </div>
    );
  }

  return null;
}
