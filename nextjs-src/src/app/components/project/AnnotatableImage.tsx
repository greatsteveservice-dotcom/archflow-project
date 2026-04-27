'use client';

import { useState, useRef, useEffect, MouseEvent } from 'react';
import { supabase } from '../../lib/supabase';
import {
  getFileAnnotations, createFileAnnotation,
  updateFileAnnotationStatus, deleteFileAnnotation,
} from '../../lib/queries';
import type { DesignFileAnnotation } from '../../lib/types';

const FONT = 'var(--af-font)';
const FONT_MONO = 'var(--af-font-mono)';

interface Props {
  fileId: string;
  imageUrl: string;
  alt: string;
  mode: 'view' | 'annotate';
  currentUserId: string;
  isDesigner: boolean;
}

export default function AnnotatableImage({
  fileId, imageUrl, alt, mode, currentUserId, isDesigner,
}: Props) {
  const [annotations, setAnnotations] = useState<DesignFileAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [openThreadId, setOpenThreadId] = useState<string | null>(null);
  const [draftAt, setDraftAt] = useState<{ x: number; y: number } | null>(null);
  const [draftText, setDraftText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [filter, setFilter] = useState<'open' | 'resolved' | 'all'>('open');
  const wrapRef = useRef<HTMLDivElement>(null);

  // Initial load + realtime subscription
  useEffect(() => {
    let mounted = true;
    getFileAnnotations(fileId).then(rows => { if (mounted) { setAnnotations(rows); setLoading(false); } });
    const ch = supabase
      .channel(`annotations:${fileId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'design_file_annotations',
        filter: `file_id=eq.${fileId}`,
      }, () => {
        getFileAnnotations(fileId).then(rows => { if (mounted) setAnnotations(rows); });
      })
      .subscribe();
    return () => { mounted = false; supabase.removeChannel(ch); };
  }, [fileId]);

  const rootPins = annotations.filter(a => a.parent_id === null);
  const repliesByParent = new Map<string, DesignFileAnnotation[]>();
  annotations.filter(a => a.parent_id).forEach(r => {
    const arr = repliesByParent.get(r.parent_id!) || [];
    arr.push(r);
    repliesByParent.set(r.parent_id!, arr);
  });

  const visiblePins = mode === 'view'
    ? rootPins.filter(p => p.status === 'open')
    : rootPins.filter(p => filter === 'all' || p.status === filter);
  const openCount = rootPins.filter(p => p.status === 'open').length;
  const resolvedCount = rootPins.filter(p => p.status === 'resolved').length;
  const openThread = openThreadId ? rootPins.find(p => p.id === openThreadId) : null;

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    if (mode !== 'annotate') return;
    if (!wrapRef.current) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-pin]') || target.closest('[data-draft]') || target.closest('[data-thread]')) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setDraftAt({ x, y });
    setDraftText('');
    setOpenThreadId(null);
  };

  const submitDraft = async () => {
    if (!draftAt || !draftText.trim()) return;
    try {
      await createFileAnnotation({ fileId, x: draftAt.x, y: draftAt.y, content: draftText.trim() });
      setDraftAt(null);
      setDraftText('');
    } catch (e) {
      console.error('[annotation] create failed', e);
    }
  };

  const submitReply = async (parentId: string) => {
    if (!replyText.trim()) return;
    try {
      await createFileAnnotation({ fileId, parentId, content: replyText.trim() });
      setReplyText('');
    } catch (e) {
      console.error('[annotation] reply failed', e);
    }
  };

  const toggleResolve = async (a: DesignFileAnnotation) => {
    try {
      await updateFileAnnotationStatus(a.id, a.status === 'open' ? 'resolved' : 'open');
    } catch (e) { console.error(e); }
  };

  const removeAnnotation = async (a: DesignFileAnnotation) => {
    if (!confirm('Удалить замечание?')) return;
    try {
      await deleteFileAnnotation(a.id);
      setOpenThreadId(null);
    } catch (e) { console.error(e); }
  };

  const canEdit = (a: DesignFileAnnotation) => a.author_id === currentUserId || isDesigner;

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }} className="af-annot-grid">
      <style>{`@media (max-width: 767px) { .af-annot-grid { flex-direction: column; } .af-annot-side { width: 100% !important; } }`}</style>

      {/* Image area with overlay */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          ref={wrapRef}
          onClick={handleClick}
          style={{
            position: 'relative',
            cursor: mode === 'annotate' ? 'crosshair' : 'default',
            userSelect: 'none',
            border: '0.5px solid #EBEBEB',
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={alt} style={{ width: '100%', height: 'auto', display: 'block' }} draggable={false} />

          {visiblePins.map(p => (
            <button
              key={p.id}
              data-pin
              onClick={(e) => { e.stopPropagation(); setOpenThreadId(p.id); setDraftAt(null); }}
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
              }}
              title={p.content}
            >
              {p.status === 'resolved' ? '✓' : p.number}
            </button>
          ))}

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
                <button onClick={() => { setDraftAt(null); setDraftText(''); }} style={btnGhost}>Esc</button>
                <button onClick={submitDraft} disabled={!draftText.trim()} style={{ ...btnSolid, opacity: draftText.trim() ? 1 : 0.4 }}>
                  Отправить
                </button>
              </div>
            </div>
          )}

          {openThread && (
            <div
              data-thread
              style={{
                position: 'absolute',
                left: `${openThread.x}%`, top: `${openThread.y}%`,
                transform: 'translate(20px, -50%)',
                background: '#FFF', border: '0.5px solid #111',
                width: 320, zIndex: 11,
                boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: 14, borderBottom: '0.5px solid #EBEBEB' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999' }}>
                    {openThread.number} · {openThread.author?.full_name || openThread.author?.email || 'Кто-то'} · {fmtAgo(openThread.created_at)}
                  </div>
                  <button onClick={() => setOpenThreadId(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#999' }}>×</button>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.5 }}>{openThread.content}</div>
              </div>
              {(repliesByParent.get(openThread.id) || []).length > 0 && (
                <div style={{ padding: '8px 14px', maxHeight: 200, overflowY: 'auto' }}>
                  {(repliesByParent.get(openThread.id) || []).map(r => (
                    <div key={r.id} style={{ marginBottom: 10 }}>
                      <div style={{ fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#999', marginBottom: 2 }}>
                        ↳ {r.author?.full_name || r.author?.email || 'Кто-то'} · {fmtAgo(r.created_at)}
                      </div>
                      <div style={{ fontSize: 12, lineHeight: 1.5 }}>{r.content}</div>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ padding: 12, borderTop: '0.5px solid #EBEBEB' }}>
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') submitReply(openThread.id); }}
                  placeholder="Ответ..."
                  style={{ width: '100%', border: '0.5px solid #EBEBEB', padding: '6px 8px', fontFamily: FONT, fontSize: 12, outline: 'none' }}
                />
              </div>
              {canEdit(openThread) && (
                <div style={{ display: 'flex', borderTop: '0.5px solid #EBEBEB' }}>
                  <button onClick={() => toggleResolve(openThread)} style={{ ...threadAction, borderRight: '0.5px solid #EBEBEB' }}>
                    {openThread.status === 'open' ? '✓ Решено' : '↺ Открыть'}
                  </button>
                  <button onClick={() => removeAnnotation(openThread)} style={threadAction}>
                    🗑 Удалить
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Side panel — only visible in annotate mode */}
      {mode === 'annotate' && (
        <div className="af-annot-side" style={{ width: 300, background: '#FFF', border: '0.5px solid #EBEBEB', padding: 14 }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#111', marginBottom: 12 }}>
            Замечания · {rootPins.length}
          </div>
          <div style={{ display: 'flex', gap: 0, marginBottom: 12, borderBottom: '0.5px solid #EBEBEB' }}>
            {(['open', 'resolved', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                flex: 1, padding: '6px 0', background: 'none',
                border: 'none', borderBottom: filter === f ? '2px solid #111' : '2px solid transparent',
                fontFamily: FONT_MONO, fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase',
                cursor: 'pointer', color: filter === f ? '#111' : '#999',
              }}>
                {f === 'open' && `Открытые ${openCount}`}
                {f === 'resolved' && `Решённые ${resolvedCount}`}
                {f === 'all' && `Все ${rootPins.length}`}
              </button>
            ))}
          </div>

          {loading && <div style={{ fontSize: 11, color: '#999', textAlign: 'center', padding: 16 }}>Загрузка…</div>}
          {!loading && visiblePins.length === 0 && (
            <div style={{ fontSize: 11, color: '#999', textAlign: 'center', padding: 16, lineHeight: 1.5 }}>
              {filter === 'open' ? 'Нет открытых замечаний' : filter === 'resolved' ? 'Ничего не решено' : 'Замечаний нет'}
              <br /><br />
              <span style={{ fontSize: 10 }}>Кликните на изображении, чтобы добавить</span>
            </div>
          )}
          {visiblePins.map(p => (
            <div
              key={p.id}
              onClick={() => { setOpenThreadId(p.id); setDraftAt(null); }}
              style={{
                padding: 10, marginBottom: 6,
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
                    {(p.author?.full_name || p.author?.email || 'Кто-то').slice(0, 18)} · {fmtAgo(p.created_at)}
                  </span>
                </div>
                {(repliesByParent.get(p.id) || []).length > 0 && (
                  <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: '#999' }}>↳ {(repliesByParent.get(p.id) || []).length}</span>
                )}
              </div>
              <div style={{ fontSize: 12, lineHeight: 1.4, color: p.status === 'resolved' ? '#999' : '#111' }}>
                {p.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function fmtAgo(iso: string): string {
  const d = new Date(iso).getTime();
  const diff = Date.now() - d;
  if (diff < 60_000) return 'сейчас';
  if (diff < 3600_000) return `${Math.round(diff / 60_000)} мин`;
  if (diff < 86_400_000) return `${Math.round(diff / 3600_000)} ч`;
  return `${Math.floor(diff / 86_400_000)} дн`;
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
