// Interactive mockup of annotation/review UI for design files.
// Click on the image in "Замечания" mode to add pins. Click a pin to open thread.
// All state is local — no DB. For UX validation only.
"use client";

import { useState, useRef, useEffect, MouseEvent } from "react";

const FONT = "var(--af-font)";
const FONT_MONO = "var(--af-font-mono)";

interface Reply {
  id: string;
  author: string;
  role: 'designer' | 'client';
  text: string;
  ago: string;
}
interface Pin {
  id: string;
  number: number;
  x: number; // %
  y: number; // %
  author: string;
  role: 'designer' | 'client';
  text: string;
  ago: string;
  status: 'open' | 'resolved';
  replies: Reply[];
}

const SAMPLE_IMG =
  "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&w=1600&q=80";

const INITIAL_PINS: Pin[] = [
  {
    id: '1', number: 1, x: 38, y: 18,
    author: 'Иван', role: 'client',
    text: 'Свет какой-то жёлтый, можно холоднее?',
    ago: '2 дн', status: 'open',
    replies: [
      { id: 'r1', author: 'Анна', role: 'designer', text: 'Поменяю на 4000K в следующей версии', ago: '1 дн' },
    ],
  },
  {
    id: '2', number: 2, x: 56, y: 62,
    author: 'Иван', role: 'client',
    text: 'Этот стол низковат, нужно барный высотой 105 см',
    ago: '1 дн', status: 'open',
    replies: [],
  },
  {
    id: '3', number: 3, x: 22, y: 48,
    author: 'Иван', role: 'client',
    text: 'Шкаф слева — какой материал?',
    ago: '3 дн', status: 'resolved',
    replies: [
      { id: 'r3', author: 'Анна', role: 'designer', text: 'Шпон дуба натурального, светлая морилка', ago: '3 дн' },
    ],
  },
];

export default function AnnotationMockupPage() {
  const [mode, setMode] = useState<'view' | 'annotate'>('annotate');
  const [pins, setPins] = useState<Pin[]>(INITIAL_PINS);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [draftAt, setDraftAt] = useState<{ x: number; y: number } | null>(null);
  const [draftText, setDraftText] = useState('');
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const [replyText, setReplyText] = useState('');
  const imgWrapRef = useRef<HTMLDivElement>(null);

  const handleImageClick = (e: MouseEvent<HTMLDivElement>) => {
    if (mode !== 'annotate') return;
    if (!imgWrapRef.current) return;
    // Don't open draft if clicking an existing pin
    if ((e.target as HTMLElement).closest('[data-pin]')) return;
    if ((e.target as HTMLElement).closest('[data-draft]')) return;

    const rect = imgWrapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setDraftAt({ x, y });
    setDraftText('');
    setOpenThreadId(null);
  };

  const submitDraft = () => {
    if (!draftAt || !draftText.trim()) return;
    const newPin: Pin = {
      id: `p${Date.now()}`,
      number: pins.length + 1,
      x: draftAt.x, y: draftAt.y,
      author: 'Вы',
      role: 'designer',
      text: draftText.trim(),
      ago: 'сейчас',
      status: 'open',
      replies: [],
    };
    setPins([...pins, newPin]);
    setDraftAt(null);
    setDraftText('');
  };

  const cancelDraft = () => {
    setDraftAt(null);
    setDraftText('');
  };

  const openThread = (id: string) => {
    setOpenThreadId(id);
    setDraftAt(null);
    setReplyText('');
  };

  const addReply = (pinId: string) => {
    if (!replyText.trim()) return;
    setPins(pins.map(p => p.id === pinId ? {
      ...p,
      replies: [...p.replies, {
        id: `r${Date.now()}`, author: 'Вы', role: 'designer',
        text: replyText.trim(), ago: 'сейчас',
      }],
    } : p));
    setReplyText('');
  };

  const toggleResolve = (pinId: string) => {
    setPins(pins.map(p => p.id === pinId ? {
      ...p, status: p.status === 'open' ? 'resolved' : 'open',
    } : p));
  };

  const visiblePins = pins.filter(p => mode === 'annotate' ? (filter === 'all' || p.status === filter) : p.status === 'open');
  const openCount = pins.filter(p => p.status === 'open').length;
  const resolvedCount = pins.filter(p => p.status === 'resolved').length;
  const openThread_ = openThreadId ? pins.find(p => p.id === openThreadId) : null;

  return (
    <div style={{ minHeight: '100vh', background: '#F6F6F4', fontFamily: FONT, color: '#111' }}>
      {/* Topbar */}
      <div style={{
        height: 48, background: '#FFF', borderBottom: '0.5px solid #EBEBEB',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.04em' }}>
          ← Кухня визуализация v3.jpg
        </div>
        <button
          onClick={() => { setMode(mode === 'view' ? 'annotate' : 'view'); setOpenThreadId(null); setDraftAt(null); }}
          style={{
            height: 32, padding: '0 14px',
            background: mode === 'annotate' ? '#111' : 'transparent',
            color: mode === 'annotate' ? '#F6F6F4' : '#111',
            border: '0.5px solid #111',
            fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.08em',
            textTransform: 'uppercase', cursor: 'pointer',
          }}
        >
          {mode === 'annotate' ? 'Просмотр' : `Замечания (${openCount})`}
        </button>
      </div>

      {/* Content layout */}
      <div style={{ display: 'flex', minHeight: 'calc(100vh - 48px)' }}>
        {/* Image area */}
        <div style={{ flex: 1, padding: 24, overflow: 'auto' }}>
          <div
            ref={imgWrapRef}
            onClick={handleImageClick}
            style={{
              position: 'relative',
              maxWidth: 980,
              margin: '0 auto',
              cursor: mode === 'annotate' ? 'crosshair' : 'default',
              userSelect: 'none',
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={SAMPLE_IMG}
              alt="Кухня"
              style={{ width: '100%', display: 'block', border: '0.5px solid #EBEBEB' }}
              draggable={false}
            />

            {/* Pins */}
            {visiblePins.map(p => (
              <button
                key={p.id}
                data-pin
                onClick={(e) => { e.stopPropagation(); openThread(p.id); }}
                style={{
                  position: 'absolute',
                  left: `${p.x}%`, top: `${p.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 28, height: 28,
                  background: p.status === 'resolved' ? '#FFF' : '#111',
                  color: p.status === 'resolved' ? '#999' : '#FFF',
                  border: p.status === 'resolved' ? '0.5px solid #EBEBEB' : '2px solid #FFF',
                  fontFamily: FONT, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: p.status === 'open' ? '0 2px 8px rgba(0,0,0,0.4)' : 'none',
                  transition: 'transform 0.15s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.15)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'translate(-50%, -50%)')}
                title={p.text}
              >
                {p.status === 'resolved' ? '✓' : p.number}
              </button>
            ))}

            {/* Draft (new pin form) */}
            {draftAt && (
              <div
                data-draft
                style={{
                  position: 'absolute',
                  left: `${draftAt.x}%`, top: `${draftAt.y}%`,
                  transform: 'translate(0, 12px)',
                  background: '#FFF', border: '0.5px solid #111',
                  width: 280, padding: 12, zIndex: 10,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Marker on point */}
                <div style={{
                  position: 'absolute', left: 0, top: -28,
                  width: 28, height: 28, background: '#111', color: '#FFF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, transform: 'translate(-50%, 0)',
                  border: '2px solid #FFF',
                }}>+</div>
                <textarea
                  autoFocus
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  placeholder="Замечание..."
                  rows={3}
                  style={{
                    width: '100%', border: '0.5px solid #EBEBEB', padding: 8,
                    fontFamily: FONT, fontSize: 12, resize: 'vertical', outline: 'none',
                  }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
                  <button onClick={cancelDraft} style={btnGhost}>Esc</button>
                  <button onClick={submitDraft} disabled={!draftText.trim()} style={{ ...btnSolid, opacity: draftText.trim() ? 1 : 0.4 }}>Отправить</button>
                </div>
              </div>
            )}

            {/* Thread popup */}
            {openThread_ && (
              <div
                data-pin
                style={{
                  position: 'absolute',
                  left: `${openThread_.x}%`, top: `${openThread_.y}%`,
                  transform: 'translate(20px, -50%)',
                  background: '#FFF', border: '0.5px solid #111',
                  width: 320, padding: 0, zIndex: 11,
                  boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ padding: 14, borderBottom: '0.5px solid #EBEBEB' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999' }}>
                      ① · {openThread_.author} · {openThread_.role === 'client' ? 'заказчик' : 'дизайнер'} · {openThread_.ago}
                    </div>
                    <button onClick={() => setOpenThreadId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#999' }}>×</button>
                  </div>
                  <div style={{ fontSize: 13, lineHeight: 1.5 }}>{openThread_.text}</div>
                </div>
                {openThread_.replies.length > 0 && (
                  <div style={{ padding: '8px 14px', maxHeight: 180, overflowY: 'auto' }}>
                    {openThread_.replies.map(r => (
                      <div key={r.id} style={{ marginBottom: 10 }}>
                        <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999', marginBottom: 2 }}>
                          ↳ {r.author} · {r.ago}
                        </div>
                        <div style={{ fontSize: 12, lineHeight: 1.5 }}>{r.text}</div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ padding: 12, borderTop: '0.5px solid #EBEBEB' }}>
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addReply(openThread_.id); }}
                    placeholder="Ответ..."
                    style={{ width: '100%', border: '0.5px solid #EBEBEB', padding: '6px 8px', fontFamily: FONT, fontSize: 12, outline: 'none' }}
                  />
                </div>
                <div style={{ display: 'flex', borderTop: '0.5px solid #EBEBEB' }}>
                  <button onClick={() => toggleResolve(openThread_.id)} style={{ ...threadAction, borderRight: '0.5px solid #EBEBEB' }}>
                    {openThread_.status === 'open' ? '✓ Решено' : '↺ Открыть снова'}
                  </button>
                  <button onClick={() => { setPins(pins.filter(p => p.id !== openThread_.id)); setOpenThreadId(null); }} style={threadAction}>
                    🗑 Удалить
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Side panel */}
        {mode === 'annotate' && (
          <div style={{ width: 320, background: '#FFF', borderLeft: '0.5px solid #EBEBEB', padding: 16, overflowY: 'auto' }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#111', marginBottom: 12 }}>
              Замечания · {pins.length}
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '0.5px solid #EBEBEB' }}>
              {(['open', 'resolved', 'all'] as const).map(f => (
                <button key={f} onClick={() => setFilter(f)} style={{
                  flex: 1, padding: '8px 0', background: 'none',
                  border: 'none',
                  borderBottom: filter === f ? '2px solid #111' : '2px solid transparent',
                  fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                  cursor: 'pointer', color: filter === f ? '#111' : '#999',
                }}>
                  {f === 'open' && `● Открытые (${openCount})`}
                  {f === 'resolved' && `✓ Решённые (${resolvedCount})`}
                  {f === 'all' && `Все (${pins.length})`}
                </button>
              ))}
            </div>

            {/* Pins list */}
            {visiblePins.length === 0 && (
              <div style={{ fontSize: 11, color: '#999', textAlign: 'center', padding: 24 }}>
                {filter === 'open' ? 'Нет открытых замечаний' : filter === 'resolved' ? 'Ничего не решено' : 'Замечаний нет'}
                <br /><br />
                {mode === 'annotate' && <span style={{ fontSize: 10 }}>Кликните на изображении, чтобы добавить</span>}
              </div>
            )}
            {visiblePins.map(p => (
              <div
                key={p.id}
                onClick={() => openThread(p.id)}
                style={{
                  padding: 12, marginBottom: 8,
                  border: openThreadId === p.id ? '0.5px solid #111' : '0.5px solid #EBEBEB',
                  cursor: 'pointer', background: openThreadId === p.id ? '#F6F6F4' : '#FFF',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{
                      width: 18, height: 18,
                      background: p.status === 'resolved' ? '#FFF' : '#111',
                      color: p.status === 'resolved' ? '#999' : '#FFF',
                      border: p.status === 'resolved' ? '0.5px solid #EBEBEB' : 'none',
                      fontSize: 10, fontWeight: 700,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>{p.status === 'resolved' ? '✓' : p.number}</span>
                    <span style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.06em', textTransform: 'uppercase', color: '#999' }}>
                      {p.author} · {p.ago}
                    </span>
                  </div>
                  {p.replies.length > 0 && <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: '#999' }}>↳ {p.replies.length}</span>}
                </div>
                <div style={{ fontSize: 12, lineHeight: 1.5, color: p.status === 'resolved' ? '#999' : '#111' }}>
                  {p.text}
                </div>
              </div>
            ))}

            {/* Hint */}
            <div style={{
              marginTop: 24, padding: 12, background: '#F6F6F4',
              fontFamily: FONT_MONO, fontSize: 10, lineHeight: 1.6, color: '#666',
            }}>
              💡 <b>Как пользоваться:</b><br />
              · Клик на картинке — добавить пин<br />
              · Клик на пине — открыть тред<br />
              · «Решено» — закрыть замечание (станет серым ✓)
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const btnGhost: React.CSSProperties = {
  padding: '6px 10px', background: 'transparent', border: '0.5px solid #EBEBEB',
  fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
  cursor: 'pointer', color: '#666',
};
const btnSolid: React.CSSProperties = {
  padding: '6px 12px', background: '#111', border: 'none', color: '#FFF',
  fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
  cursor: 'pointer',
};
const threadAction: React.CSSProperties = {
  flex: 1, padding: '10px 0', background: 'none', border: 'none',
  fontFamily: FONT_MONO, fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase',
  cursor: 'pointer', color: '#111',
};
