'use client';
import { useState, useMemo } from 'react';
import Image from 'next/image';
import { Icons } from '../Icons';
import Modal from '../Modal';
import type { PhotoRecordWithVisit, PhotoStatus } from '../../lib/types';
import { useProjectPhotos } from '../../lib/hooks';
import { formatDate, updatePhotoStatus } from '../../lib/queries';
import { PHOTO_STATUS_CONFIG } from '../../lib/types';

interface PhotoGalleryProps {
  projectId: string;
  toast: (msg: string) => void;
  canChangePhotoStatus?: boolean;
  onAddPhoto?: () => void;
}

export default function PhotoGallery({ projectId, toast, canChangePhotoStatus = true, onAddPhoto }: PhotoGalleryProps) {
  const { data: photos, loading, refetch } = useProjectPhotos(projectId);
  const [filter, setFilter] = useState<'all' | 'issue' | 'approved' | 'in_progress'>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecordWithVisit | null>(null);

  const filtered = useMemo(() => {
    if (!photos) return [];
    if (filter === 'all') return photos;
    return photos.filter(p => p.status === filter);
  }, [photos, filter]);

  const statusCounts = useMemo(() => {
    if (!photos) return { all: 0, issue: 0, approved: 0, in_progress: 0 };
    return {
      all: photos.length,
      issue: photos.filter(p => p.status === 'issue').length,
      approved: photos.filter(p => p.status === 'approved').length,
      in_progress: photos.filter(p => p.status === 'in_progress').length,
    };
  }, [photos]);

  const handleStatusChange = async (photoId: string, newStatus: PhotoStatus) => {
    try {
      await updatePhotoStatus(photoId, newStatus);
      toast('Статус обновлён');
      refetch();
      if (selectedPhoto?.id === photoId) {
        setSelectedPhoto(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (e: any) {
      toast(e.message || 'Ошибка');
    }
  };

  if (loading) return <div className="text-[13px] text-ink-faint py-4">Загрузка...</div>;

  return (
    <div className="animate-fade-in">
      {/* Filters + Add photo */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {([
          { key: 'all', label: 'Все' },
          { key: 'issue', label: 'Замечания' },
          { key: 'in_progress', label: 'В работе' },
          { key: 'approved', label: 'Принятые' },
        ] as const).map(f => (
          <button
            key={f.key}
            className={`text-[11px] px-2.5 py-1 rounded-lg transition-all ${
              filter === f.key ? 'bg-ink text-srf' : 'bg-srf-secondary text-ink-muted hover:bg-line'
            }`}
            onClick={() => setFilter(f.key)}
          >
            {f.label} <span className="ml-0.5 opacity-60">{statusCounts[f.key]}</span>
          </button>
        ))}
        {onAddPhoto && (
          <button
            onClick={onAddPhoto}
            style={{
              marginLeft: 'auto',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 9,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: '#111',
              background: 'none',
              border: '0.5px solid #EBEBEB',
              padding: '4px 12px',
              cursor: 'pointer',
            }}
          >
            + Добавить фото
          </button>
        )}
      </div>

      {/* Gallery grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {filtered.map(photo => {
            const cfg = PHOTO_STATUS_CONFIG[photo.status];
            return (
              <div
                key={photo.id}
                className="group cursor-pointer rounded-xl overflow-hidden border border-line hover:border-ink-ghost transition-all"
                onClick={() => setSelectedPhoto(photo)}
              >
                {photo.photo_url ? (
                  <div className="aspect-square bg-srf-secondary relative">
                    <Image src={photo.photo_url} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
                    <div className="absolute top-2 right-2">
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.color}`}>
                        {cfg.label}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-square bg-srf-secondary flex items-center justify-center">
                    <Icons.Camera className="w-6 h-6 text-ink-ghost" />
                  </div>
                )}
                <div className="p-2">
                  <div className="text-[11px] text-ink-muted truncate">{photo.comment || photo.zone || '—'}</div>
                  <div className="text-[10px] text-ink-faint mt-0.5">
                    {photo.visit_title || ''} · {photo.visit_date ? formatDate(photo.visit_date) : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Icons.Camera className="w-8 h-8 text-ink-ghost mb-2" />
          <div className="text-[13px] text-ink-faint" style={{ marginBottom: onAddPhoto ? 12 : 0 }}>
            {filter !== 'all' ? 'Нет фото с таким статусом' : 'Фотографий пока нет'}
          </div>
          {onAddPhoto && filter === 'all' && (
            <button
              onClick={onAddPhoto}
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: '#fff',
                background: '#111',
                border: 'none',
                padding: '10px 24px',
                cursor: 'pointer',
              }}
            >
              + Добавить фото
            </button>
          )}
        </div>
      )}

      {/* Photo detail modal */}
      <Modal open={!!selectedPhoto} onClose={() => setSelectedPhoto(null)} title={selectedPhoto?.comment || 'Фото'}>
        {selectedPhoto && (
          <div className="space-y-4">
            {selectedPhoto.photo_url && (
              <Image src={selectedPhoto.photo_url} alt="" width={960} height={720} sizes="(max-width: 480px) 92vw, 448px" className="w-full" style={{ height: 'auto' }} />
            )}
            <div className="space-y-2 text-[13px]">
              {selectedPhoto.comment && (
                <div><span className="text-ink-muted">Комментарий:</span> {selectedPhoto.comment}</div>
              )}
              {selectedPhoto.zone && (
                <div><span className="text-ink-muted">Зона:</span> {selectedPhoto.zone}</div>
              )}
              <div><span className="text-ink-muted">Визит:</span> {selectedPhoto.visit_title} ({selectedPhoto.visit_date ? formatDate(selectedPhoto.visit_date) : '—'})</div>
              <div className="flex items-center gap-2">
                <span className="text-ink-muted">Статус:</span>
                {canChangePhotoStatus ? (
                  <select
                    value={selectedPhoto.status}
                    onChange={e => handleStatusChange(selectedPhoto.id, e.target.value as PhotoStatus)}
                    className="text-[12px] border border-line rounded-lg px-2 py-1 bg-srf"
                  >
                    <option value="new">Новое</option>
                    <option value="issue">Замечание</option>
                    <option value="in_progress">В работе</option>
                    <option value="resolved">Исправлено</option>
                    <option value="approved">Принято</option>
                  </select>
                ) : (
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${PHOTO_STATUS_CONFIG[selectedPhoto.status].bg} ${PHOTO_STATUS_CONFIG[selectedPhoto.status].color}`}>
                    {PHOTO_STATUS_CONFIG[selectedPhoto.status].label}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
