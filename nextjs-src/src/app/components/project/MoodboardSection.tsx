'use client';

import { useState } from 'react';
import { useMoodboards } from '../../lib/hooks';
import { createMoodboard, deleteMoodboard, updateMoodboard } from '../../lib/queries';
import type { MoodboardWithStats } from '../../lib/types';
import MoodboardGrid from '../moodboard/MoodboardGrid';

interface MoodboardSectionProps {
  projectId: string;
  toast: (msg: string) => void;
  canEdit?: boolean;
  onBack: () => void;
}

export default function MoodboardSection({ projectId, toast, canEdit = true, onBack }: MoodboardSectionProps) {
  const { data: moodboards, refetch } = useMoodboards(projectId);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  const activeBoard = moodboards?.find(m => m.id === activeBoardId) || null;

  const handleCreate = async () => {
    const title = titleDraft.trim() || 'Без названия';
    setCreating(true);
    try {
      const board = await createMoodboard({ project_id: projectId, title });
      await refetch();
      setActiveBoardId(board.id);
      setTitleDraft('');
      toast('Мудборд создан');
    } catch {
      toast('Ошибка создания');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (board: MoodboardWithStats) => {
    if (!confirm(`Удалить «${board.title}»? Все изображения будут удалены.`)) return;
    try {
      await deleteMoodboard(board.id);
      if (activeBoardId === board.id) setActiveBoardId(null);
      await refetch();
      toast('Мудборд удалён');
    } catch {
      toast('Ошибка удаления');
    }
  };

  // Level 2: single board view
  if (activeBoard) {
    return (
      <div className="animate-fade-in">
        <button
          onClick={() => setActiveBoardId(null)}
          style={{
            fontFamily: 'var(--af-font)', fontSize: 8,
            letterSpacing: '0.14em', textTransform: 'uppercase', color: '#111',
            background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16,
          }}
        >
          ← Мудборды
        </button>
        <MoodboardGrid
          moodboard={activeBoard}
          projectId={projectId}
          toast={toast}
          canEdit={canEdit}
          onTitleChange={async (title) => {
            await updateMoodboard(activeBoard.id, { title });
            refetch();
          }}
        />
      </div>
    );
  }

  // Level 1: list of moodboards
  return (
    <div className="animate-fade-in">
      <button
        onClick={onBack}
        style={{
          fontFamily: 'var(--af-font)', fontSize: 8,
          letterSpacing: '0.14em', textTransform: 'uppercase', color: '#111',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 16,
        }}
      >
        ← Дизайн
      </button>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <h3 style={{ fontFamily: 'var(--af-font)', fontSize: 22, fontWeight: 900, color: '#111', margin: 0 }}>
          Мудборды
        </h3>
        {canEdit && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
              placeholder="Название..."
              style={{
                fontFamily: 'var(--af-font)', fontSize: 'var(--af-fs-11)',
                color: '#111', border: '0.5px solid #EBEBEB', padding: '8px 12px',
                outline: 'none', background: 'none', width: 180,
              }}
            />
            <button
              onClick={handleCreate}
              disabled={creating}
              className="af-btn"
              style={{
                fontFamily: 'var(--af-font)', fontSize: 8,
                textTransform: 'uppercase', letterSpacing: '0.12em',
                color: '#111', background: 'none', border: '0.5px solid #111',
                padding: '8px 14px', cursor: 'pointer',
                opacity: creating ? 0.5 : 1,
              }}
            >
              + Создать
            </button>
          </div>
        )}
      </div>

      {(!moodboards || moodboards.length === 0) ? (
        <div style={{ textAlign: 'center', padding: '48px 24px' }}>
          <div style={{ fontFamily: 'var(--af-font)', fontSize: 'var(--af-fs-12)', color: '#111', marginBottom: 16 }}>
            Мудборды пока не созданы
          </div>
          {canEdit && (
            <div style={{ fontFamily: 'var(--af-font)', fontSize: 'var(--af-fs-10)', color: '#888' }}>
              Создайте мудборд для визуальной концепции проекта
            </div>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {moodboards.map(board => (
            <div
              key={board.id}
              className="af-tab-row"
              onClick={() => setActiveBoardId(board.id)}
              style={{ cursor: 'pointer' }}
            >
              <span style={{
                fontFamily: 'var(--af-font)', fontSize: 'var(--af-fs-12)',
                fontWeight: 700, color: '#111', flex: '1 1 auto',
              }}>
                {board.title}
              </span>
              <span style={{
                fontFamily: 'var(--af-font)', fontSize: 8,
                textTransform: 'uppercase', letterSpacing: '0.12em', color: '#888',
                flexShrink: 0,
              }}>
                {board.item_count} {board.item_count === 1 ? 'элемент' : 'элементов'}
              </span>
              {canEdit && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(board); }}
                  style={{
                    fontFamily: 'var(--af-font)', fontSize: 7,
                    color: '#888', background: 'none', border: 'none',
                    cursor: 'pointer', padding: '4px 8px', flexShrink: 0,
                  }}
                >
                  Удалить
                </button>
              )}
              <span style={{
                fontFamily: 'var(--af-font)', fontSize: 'var(--af-fs-12)',
                color: '#111', flexShrink: 0,
              }}>→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
