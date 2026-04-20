'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useMoodboardItems } from '../../lib/hooks';
import { createMoodboardItem, deleteMoodboardItem, updateMoodboardItem, toggleMoodboardPublic } from '../../lib/queries';
import { supabase } from '../../lib/supabase';
import type { MoodboardWithStats, MoodboardItem } from '../../lib/types';

interface PendingUpload {
  id: string;
  name: string;
  blobUrl: string;
  progress: number;
}

interface MoodboardGridProps {
  moodboard: MoodboardWithStats;
  projectId: string;
  toast: (msg: string) => void;
  canEdit?: boolean;
  onTitleChange?: (title: string) => void;
}

export default function MoodboardGrid({ moodboard, projectId, toast, canEdit = true, onTitleChange }: MoodboardGridProps) {
  const { data: items, refetch } = useMoodboardItems(moodboard.id);
  const [pending, setPending] = useState<PendingUpload[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editing title
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(moodboard.title);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingTitle) titleInputRef.current?.focus();
  }, [editingTitle]);

  const saveTitle = () => {
    const t = titleDraft.trim();
    if (t && t !== moodboard.title) onTitleChange?.(t);
    setEditingTitle(false);
  };

  // Upload a single file
  const uploadOne = useCallback(async (file: File) => {
    const id = crypto.randomUUID();
    const blobUrl = URL.createObjectURL(file);
    setPending(prev => [...prev, { id, name: file.name, blobUrl, progress: 0 }]);

    try {
      // Progress simulation
      const interval = setInterval(() => {
        setPending(prev => prev.map(p => p.id === id ? { ...p, progress: Math.min(p.progress + 8, 90) } : p));
      }, 200);

      const ts = Date.now();
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `moodboard/${moodboard.id}/${ts}_${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from('moodboard-images')
        .upload(storagePath, file, { contentType: file.type, upsert: false });

      clearInterval(interval);

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('moodboard-images')
        .getPublicUrl(storagePath);

      await createMoodboardItem({
        moodboard_id: moodboard.id,
        type: 'image',
        image_url: publicUrl,
        file_path: storagePath,
        title: file.name.replace(/\.[^/.]+$/, ''),
        source_platform: 'upload',
      });

      setPending(prev => prev.filter(p => p.id !== id));
      URL.revokeObjectURL(blobUrl);
      refetch();
    } catch (err) {
      setPending(prev => prev.filter(p => p.id !== id));
      URL.revokeObjectURL(blobUrl);
      toast(`Ошибка загрузки: ${file.name}`);
    }
  }, [moodboard.id, refetch, toast]);

  // Handle file input change
  const handleFiles = useCallback((files: FileList | File[]) => {
    const arr = Array.from(files).filter(f => f.type.startsWith('image/'));
    arr.forEach(f => uploadOne(f));
  }, [uploadOne]);

  // Drag-drop handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    setDragging(false);
  };
  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  };

  // Clipboard paste
  useEffect(() => {
    if (!canEdit) return;
    const handler = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const f = items[i].getAsFile();
          if (f) imageFiles.push(f);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        handleFiles(imageFiles);
      }
    };
    document.addEventListener('paste', handler);
    return () => document.removeEventListener('paste', handler);
  }, [canEdit, handleFiles]);

  const handleDeleteItem = async (item: MoodboardItem) => {
    try {
      await deleteMoodboardItem(item.id, item.file_path);
      refetch();
    } catch {
      toast('Ошибка удаления');
    }
  };

  // URL import
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');
  const [importing, setImporting] = useState(false);

  // Text note
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [noteDraft, setNoteDraft] = useState('');
  const [noteBg, setNoteBg] = useState('#F6F6F4');

  // Color swatch
  const [showColorInput, setShowColorInput] = useState(false);
  const [colorHex, setColorHex] = useState('#111111');
  const [colorName, setColorName] = useState('');

  const handleAddNote = async () => {
    const text = noteDraft.trim();
    if (!text) return;
    try {
      await createMoodboardItem({
        moodboard_id: moodboard.id,
        type: 'text_note',
        text_content: text,
        bg_color: noteBg,
        text_color: noteBg === '#111111' ? '#FFFFFF' : '#111111',
      });
      setNoteDraft('');
      setShowNoteInput(false);
      refetch();
    } catch { toast('Ошибка'); }
  };

  // Sharing
  const [shareUrl, setShareUrl] = useState<string | null>(
    moodboard.is_public && moodboard.public_token
      ? `${typeof window !== 'undefined' ? window.location.origin : ''}/m/${moodboard.public_token}`
      : null
  );
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl).then(() => toast('Ссылка скопирована'));
      return;
    }
    setSharing(true);
    try {
      const token = await toggleMoodboardPublic(moodboard.id, true);
      if (token) {
        const url = `${window.location.origin}/m/${token}`;
        setShareUrl(url);
        navigator.clipboard.writeText(url).then(() => toast('Ссылка скопирована'));
      }
    } catch { toast('Ошибка'); }
    finally { setSharing(false); }
  };

  const handleUnshare = async () => {
    try {
      await toggleMoodboardPublic(moodboard.id, false);
      setShareUrl(null);
      toast('Доступ закрыт');
    } catch { toast('Ошибка'); }
  };

  const handleAddColor = async () => {
    if (!colorHex.match(/^#[0-9a-fA-F]{6}$/)) { toast('Неверный HEX'); return; }
    try {
      await createMoodboardItem({
        moodboard_id: moodboard.id,
        type: 'color_swatch',
        color_hex: colorHex,
        color_name: colorName.trim() || undefined,
      });
      setColorHex('#111111');
      setColorName('');
      setShowColorInput(false);
      refetch();
    } catch { toast('Ошибка'); }
  };

  const handleImportUrl = async () => {
    const url = urlDraft.trim();
    if (!url) return;
    setImporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/moodboard/import-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ url, moodboardId: moodboard.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import failed');
      setUrlDraft('');
      setShowUrlInput(false);
      refetch();
      toast('Импортировано');
    } catch (err: any) {
      toast(err?.message || 'Ошибка импорта');
    } finally {
      setImporting(false);
    }
  };

  const allItems = items || [];

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        {!editingTitle ? (
          <h3
            onClick={canEdit ? () => { setTitleDraft(moodboard.title); setEditingTitle(true); } : undefined}
            style={{
              fontFamily: 'var(--af-font)', fontSize: 22, fontWeight: 900,
              color: '#111', margin: 0, cursor: canEdit ? 'text' : 'default',
            }}
          >
            {moodboard.title}
          </h3>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              ref={titleInputRef}
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
              style={{
                fontFamily: 'var(--af-font)', fontSize: 16, color: '#111',
                border: '0.5px solid #111', padding: '8px 12px', outline: 'none',
                flex: '1 1 200px',
              }}
            />
            <button
              onClick={saveTitle}
              style={{
                fontFamily: 'var(--af-font)', fontSize: 9, textTransform: 'uppercase',
                letterSpacing: '0.12em', color: '#fff', background: '#111',
                border: '0.5px solid #111', padding: '8px 14px', cursor: 'pointer',
              }}
            >Сохранить</button>
          </div>
        )}
        {moodboard.description && (
          <p style={{ fontFamily: 'var(--af-font)', fontSize: 'var(--af-fs-11)', color: '#888', marginTop: 4 }}>
            {moodboard.description}
          </p>
        )}
      </div>

      {/* Toolbar */}
      {canEdit && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="af-btn"
            style={{
              fontFamily: 'var(--af-font)', fontSize: 8,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              color: '#111', background: 'none', border: '0.5px solid #111',
              padding: '8px 14px', cursor: 'pointer',
            }}
          >
            + Загрузить
          </button>
          <button
            onClick={() => { setShowUrlInput(!showUrlInput); setShowNoteInput(false); setShowColorInput(false); }}
            className="af-btn"
            style={{
              fontFamily: 'var(--af-font)', fontSize: 8,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              color: '#111', background: 'none', border: '0.5px solid #111',
              padding: '8px 14px', cursor: 'pointer',
            }}
          >
            По ссылке
          </button>
          <button
            onClick={() => { setShowNoteInput(!showNoteInput); setShowUrlInput(false); setShowColorInput(false); }}
            className="af-btn"
            style={{
              fontFamily: 'var(--af-font)', fontSize: 8,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              color: '#111', background: 'none', border: '0.5px solid #111',
              padding: '8px 14px', cursor: 'pointer',
            }}
          >
            Заметка
          </button>
          <button
            onClick={() => { setShowColorInput(!showColorInput); setShowUrlInput(false); setShowNoteInput(false); }}
            className="af-btn"
            style={{
              fontFamily: 'var(--af-font)', fontSize: 8,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              color: '#111', background: 'none', border: '0.5px solid #111',
              padding: '8px 14px', cursor: 'pointer',
            }}
          >
            Цвет
          </button>
          <button
            onClick={handleShare}
            disabled={sharing}
            className="af-btn"
            style={{
              fontFamily: 'var(--af-font)', fontSize: 8,
              textTransform: 'uppercase', letterSpacing: '0.12em',
              color: shareUrl ? '#fff' : '#111',
              background: shareUrl ? '#111' : 'none',
              border: '0.5px solid #111',
              padding: '8px 14px', cursor: 'pointer',
              opacity: sharing ? 0.5 : 1,
            }}
          >
            {shareUrl ? 'Скопировать ссылку' : 'Поделиться'}
          </button>
          {shareUrl && (
            <button
              onClick={handleUnshare}
              style={{
                fontFamily: 'var(--af-font)', fontSize: 7,
                color: '#888', background: 'none', border: 'none',
                cursor: 'pointer', padding: '8px 4px',
                textDecoration: 'underline',
              }}
            >
              Закрыть доступ
            </button>
          )}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            style={{ display: 'none' }}
            onChange={(e) => {
              if (e.target.files) {
                const files = Array.from(e.target.files);
                e.target.value = '';
                handleFiles(files);
              }
            }}
          />
        </div>
      )}

      {/* URL import input */}
      {showUrlInput && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <input
            type="url"
            value={urlDraft}
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleImportUrl(); if (e.key === 'Escape') { setShowUrlInput(false); setUrlDraft(''); } }}
            placeholder="Pinterest, Behance, Unsplash или любая ссылка..."
            disabled={importing}
            autoFocus
            style={{
              flex: 1, fontFamily: 'var(--af-font)', fontSize: 'var(--af-fs-11)',
              color: '#111', border: '0.5px solid #EBEBEB', padding: '8px 12px',
              outline: 'none', background: 'none',
            }}
          />
          <button
            onClick={handleImportUrl}
            disabled={importing || !urlDraft.trim()}
            style={{
              fontFamily: 'var(--af-font)', fontSize: 9,
              color: '#fff', background: '#111', border: '0.5px solid #111',
              padding: '8px 14px', cursor: 'pointer',
              opacity: importing || !urlDraft.trim() ? 0.5 : 1,
            }}
          >
            {importing ? '...' : 'Импорт'}
          </button>
        </div>
      )}

      {/* Text note input */}
      {showNoteInput && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'flex-start' }}>
          <textarea
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="Текст заметки..."
            autoFocus
            rows={3}
            style={{
              flex: 1, fontFamily: 'var(--af-font)', fontSize: 'var(--af-fs-11)',
              color: '#111', border: '0.5px solid #EBEBEB', padding: '8px 12px',
              outline: 'none', background: 'none', resize: 'vertical',
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ display: 'flex', gap: 2 }}>
              {['#F6F6F4', '#111111', '#FFFFFF', '#EBEBEB'].map(c => (
                <button
                  key={c}
                  onClick={() => setNoteBg(c)}
                  style={{
                    width: 20, height: 20, background: c,
                    border: noteBg === c ? '2px solid #111' : '0.5px solid #EBEBEB',
                    cursor: 'pointer', padding: 0,
                  }}
                />
              ))}
            </div>
            <button
              onClick={handleAddNote}
              disabled={!noteDraft.trim()}
              style={{
                fontFamily: 'var(--af-font)', fontSize: 9,
                color: '#fff', background: '#111', border: '0.5px solid #111',
                padding: '6px 12px', cursor: 'pointer',
                opacity: !noteDraft.trim() ? 0.5 : 1,
              }}
            >Добавить</button>
          </div>
        </div>
      )}

      {/* Color swatch input */}
      {showColorInput && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <input
            type="color"
            value={colorHex}
            onChange={(e) => setColorHex(e.target.value)}
            style={{ width: 40, height: 32, border: '0.5px solid #EBEBEB', padding: 0, cursor: 'pointer' }}
          />
          <input
            type="text"
            value={colorHex}
            onChange={(e) => setColorHex(e.target.value)}
            style={{
              width: 80, fontFamily: 'var(--af-font)', fontSize: 'var(--af-fs-11)',
              color: '#111', border: '0.5px solid #EBEBEB', padding: '8px',
              outline: 'none', background: 'none',
            }}
          />
          <input
            type="text"
            value={colorName}
            onChange={(e) => setColorName(e.target.value)}
            placeholder="Название цвета"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddColor(); }}
            style={{
              flex: 1, fontFamily: 'var(--af-font)', fontSize: 'var(--af-fs-11)',
              color: '#111', border: '0.5px solid #EBEBEB', padding: '8px 12px',
              outline: 'none', background: 'none',
            }}
          />
          <button
            onClick={handleAddColor}
            style={{
              fontFamily: 'var(--af-font)', fontSize: 9,
              color: '#fff', background: '#111', border: '0.5px solid #111',
              padding: '8px 14px', cursor: 'pointer',
            }}
          >Добавить</button>
        </div>
      )}

      {/* Masonry grid */}
      <div
        className={`af-masonry${dragging ? ' af-masonry-dragging' : ''}`}
        onDragOver={canEdit ? onDragOver : undefined}
        onDragLeave={canEdit ? onDragLeave : undefined}
        onDrop={canEdit ? onDrop : undefined}
      >
        {allItems.map(item => (
          <MasonryCard
            key={item.id}
            item={item}
            canEdit={canEdit}
            onDelete={() => handleDeleteItem(item)}
          />
        ))}
        {pending.map(p => (
          <div key={p.id} className="af-masonry-item" style={{ position: 'relative' }}>
            <img src={p.blobUrl} alt={p.name} style={{ width: '100%', height: 'auto', display: 'block', opacity: 0.5 }} />
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
              background: '#EBEBEB',
            }}>
              <div style={{ height: '100%', width: `${p.progress}%`, background: '#111', transition: 'width 0.3s' }} />
            </div>
          </div>
        ))}
      </div>

      {/* Empty state */}
      {allItems.length === 0 && pending.length === 0 && (
        <div
          onClick={canEdit ? () => fileInputRef.current?.click() : undefined}
          style={{
            textAlign: 'center', padding: '60px 24px',
            border: '0.5px dashed #EBEBEB', cursor: canEdit ? 'pointer' : 'default',
          }}
        >
          <div style={{ fontFamily: 'var(--af-font)', fontSize: 'var(--af-fs-12)', color: '#111', marginBottom: 8 }}>
            {canEdit ? 'Перетащите изображения или нажмите для загрузки' : 'Пока пусто'}
          </div>
          {canEdit && (
            <div style={{ fontFamily: 'var(--af-font)', fontSize: 'var(--af-fs-10)', color: '#888' }}>
              Ctrl+V для вставки из буфера
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MasonryCard — single item in the masonry grid
// ============================================================================

function MasonryCard({ item, canEdit, onDelete }: {
  item: MoodboardItem;
  canEdit: boolean;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);

  if (item.type === 'image') {
    return (
      <div
        className="af-masonry-item"
        style={{ position: 'relative' }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.image_url || ''}
          alt={item.title || ''}
          loading="lazy"
          style={{ width: '100%', height: 'auto', display: 'block' }}
        />
        {/* Source badge */}
        {item.source_platform && item.source_platform !== 'upload' && (
          <span style={{
            position: 'absolute', top: 6, left: 6,
            fontFamily: 'var(--af-font)', fontSize: 7,
            textTransform: 'uppercase', letterSpacing: '0.08em',
            color: '#fff', background: 'rgba(0,0,0,0.55)',
            padding: '2px 6px',
          }}>
            {item.source_platform}
          </span>
        )}
        {/* Title overlay */}
        {item.title && (
          <div className="af-masonry-overlay">
            {item.title}
          </div>
        )}
        {/* Delete button on hover */}
        {canEdit && hover && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              position: 'absolute', top: 6, right: 6,
              width: 24, height: 24,
              background: 'rgba(0,0,0,0.55)', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--af-font)',
            }}
          >✕</button>
        )}
        {/* Color dots */}
        {item.dominant_colors && item.dominant_colors.length > 0 && (
          <div style={{
            position: 'absolute', bottom: 6, right: 6,
            display: 'flex', gap: 2,
          }}>
            {item.dominant_colors.slice(0, 5).map((c, i) => (
              <span key={i} style={{
                width: 10, height: 10, background: c.hex,
                border: '0.5px solid rgba(255,255,255,0.5)',
                display: 'inline-block',
              }} />
            ))}
          </div>
        )}
        {/* Client reaction badge */}
        {item.client_reaction && (
          <span style={{
            position: 'absolute', top: 6, right: canEdit && hover ? 36 : 6,
            fontFamily: 'var(--af-font)', fontSize: 9,
            color: '#fff', background: '#111',
            padding: '2px 6px', fontWeight: 700,
          }}>
            {item.client_reaction === 'like' ? '+' : item.client_reaction === 'dislike' ? '-' : '?'}
          </span>
        )}
      </div>
    );
  }

  if (item.type === 'text_note') {
    return (
      <div
        className="af-masonry-item"
        style={{
          position: 'relative', padding: 16,
          background: item.bg_color || '#F6F6F4',
          minHeight: 80,
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <p style={{
          fontFamily: 'var(--af-font)', fontSize: 'var(--af-fs-12)',
          color: item.text_color || '#111', lineHeight: 1.5, margin: 0,
        }}>
          {item.text_content}
        </p>
        {canEdit && hover && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              position: 'absolute', top: 6, right: 6,
              width: 24, height: 24,
              background: 'rgba(0,0,0,0.2)', color: '#111',
              border: 'none', cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--af-font)',
            }}
          >✕</button>
        )}
      </div>
    );
  }

  if (item.type === 'color_swatch') {
    return (
      <div
        className="af-masonry-item"
        style={{
          position: 'relative',
          background: item.color_hex || '#111',
          minHeight: 100,
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <div style={{
          position: 'absolute', bottom: 8, left: 8,
          display: 'flex', flexDirection: 'column', gap: 2,
        }}>
          <span style={{
            fontFamily: 'var(--af-font)', fontSize: 8,
            color: '#fff', background: 'rgba(0,0,0,0.4)',
            padding: '1px 4px', letterSpacing: '0.06em',
          }}>
            {item.color_hex}
          </span>
          {item.color_name && (
            <span style={{
              fontFamily: 'var(--af-font)', fontSize: 8,
              color: '#fff', background: 'rgba(0,0,0,0.4)',
              padding: '1px 4px',
            }}>
              {item.color_name}
            </span>
          )}
        </div>
        {canEdit && hover && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            style={{
              position: 'absolute', top: 6, right: 6,
              width: 24, height: 24,
              background: 'rgba(0,0,0,0.4)', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--af-font)',
            }}
          >✕</button>
        )}
      </div>
    );
  }

  return null;
}
