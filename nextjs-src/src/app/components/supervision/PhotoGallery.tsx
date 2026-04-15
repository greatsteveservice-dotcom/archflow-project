'use client';
import { useState, useMemo, useRef } from 'react';
import Image from 'next/image';
import { Icons } from '../Icons';
import Modal from '../Modal';
import type { PhotoRecordWithVisit, PhotoStatus, VisitWithStats } from '../../lib/types';
import { useProjectPhotos } from '../../lib/hooks';
import { formatDate, updatePhotoStatus, updatePhotoRecord, uploadPhoto, createPhotoRecord, createVisit } from '../../lib/queries';
import { PHOTO_STATUS_CONFIG } from '../../lib/types';

const ZONES = ['Спальня', 'Гостиная', 'Кухня', 'Ванная', 'Детская', 'Прихожая', 'Коридор', 'Балкон', 'Гардеробная'];

interface PhotoGalleryProps {
  projectId: string;
  toast: (msg: string) => void;
  canChangePhotoStatus?: boolean;
  canUploadPhoto?: boolean;
  visits?: VisitWithStats[];
  refetchVisits?: () => void;
}

export default function PhotoGallery({ projectId, toast, canChangePhotoStatus = true, canUploadPhoto = true, visits = [], refetchVisits }: PhotoGalleryProps) {
  const { data: photos, loading, refetch } = useProjectPhotos(projectId);
  const [filter, setFilter] = useState<'all' | 'issue' | 'approved' | 'in_progress'>('all');
  const [selectedPhoto, setSelectedPhoto] = useState<PhotoRecordWithVisit | null>(null);

  // Edit state for detail modal
  const [isEditing, setIsEditing] = useState(false);
  const [editZone, setEditZone] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  // Upload modal state
  const [showUpload, setShowUpload] = useState(false);
  const [selectedVisitId, setSelectedVisitId] = useState('');
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [photoZone, setPhotoZone] = useState('Спальня');
  const [photoComment, setPhotoComment] = useState('');
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>('approved');
  const [saving, setSaving] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [uploadError, setUploadError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick visit creation
  const [showNewVisit, setShowNewVisit] = useState(false);
  const [newVisitTitle, setNewVisitTitle] = useState('');
  const [newVisitDate, setNewVisitDate] = useState(new Date().toISOString().slice(0, 10));
  const [creatingVisit, setCreatingVisit] = useState(false);

  const filtered = useMemo(() => {
    if (!photos) return [];
    if (filter === 'all') return photos;
    return photos.filter(p => p.status === filter);
  }, [photos, filter]);

  // Group photos by visit (date descending)
  const groupedByVisit = useMemo(() => {
    const groups: { visitId: string; title: string; date: string; photos: typeof filtered }[] = [];
    const map = new Map<string, typeof filtered>();
    const meta = new Map<string, { title: string; date: string }>();
    for (const p of filtered) {
      const key = p.visit_id || '_none';
      if (!map.has(key)) {
        map.set(key, []);
        meta.set(key, { title: p.visit_title || 'Без визита', date: p.visit_date || '' });
      }
      map.get(key)!.push(p);
    }
    for (const [visitId, photos] of map) {
      const m = meta.get(visitId)!;
      groups.push({ visitId, title: m.title, date: m.date, photos });
    }
    groups.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    return groups;
  }, [filtered]);

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

  const handleStartEdit = () => {
    if (!selectedPhoto) return;
    setEditZone(selectedPhoto.zone || '');
    setEditComment(selectedPhoto.comment || '');
    setIsEditing(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedPhoto) return;
    setEditSaving(true);
    try {
      await updatePhotoRecord(selectedPhoto.id, {
        zone: editZone || undefined,
        comment: editComment.trim() || undefined,
      });
      setSelectedPhoto(prev => prev ? { ...prev, zone: editZone, comment: editComment.trim() } : null);
      setIsEditing(false);
      refetch();
      toast('Фото обновлено');
    } catch (e: any) {
      toast(e.message || 'Ошибка');
    } finally {
      setEditSaving(false);
    }
  };

  // Upload handlers
  const handleFilesSelect = (files: FileList | File[]) => {
    const validFiles: File[] = [];
    const previews: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > 20 * 1024 * 1024) continue;
      validFiles.push(file);
      previews.push(URL.createObjectURL(file));
    }
    if (validFiles.length === 0) { setUploadError('Нет подходящих изображений (макс. 20 МБ)'); return; }
    setPhotoFiles(prev => [...prev, ...validFiles]);
    setPhotoPreviews(prev => [...prev, ...previews]);
    setUploadError('');
  };

  const handleRemoveFile = (idx: number) => {
    URL.revokeObjectURL(photoPreviews[idx]);
    setPhotoFiles(prev => prev.filter((_, i) => i !== idx));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFilesSelect(e.dataTransfer.files);
  };

  const handleOpenUpload = () => {
    // Pre-select the first visit if available
    if (visits.length > 0 && !selectedVisitId) {
      setSelectedVisitId(visits[0].id);
    }
    setShowUpload(true);
  };

  const closeUploadModal = () => {
    setShowUpload(false);
    photoPreviews.forEach(p => URL.revokeObjectURL(p));
    setPhotoFiles([]); setPhotoPreviews([]);
    setPhotoComment(''); setPhotoZone('Спальня');
    setPhotoStatus('approved'); setUploadError(''); setUploadProgress({ current: 0, total: 0 });
    setShowNewVisit(false); setNewVisitTitle(''); setNewVisitDate(new Date().toISOString().slice(0, 10));
  };

  const handleSavePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photoFiles.length === 0) { setUploadError('Выберите фото'); return; }
    if (!selectedVisitId) { setUploadError('Выберите визит'); return; }
    setSaving(true); setUploadError('');
    setUploadProgress({ current: 0, total: photoFiles.length });
    try {
      for (let i = 0; i < photoFiles.length; i++) {
        setUploadProgress({ current: i + 1, total: photoFiles.length });
        const photoUrl = await uploadPhoto(photoFiles[i], projectId, selectedVisitId);
        await createPhotoRecord({
          visit_id: selectedVisitId,
          comment: photoFiles.length === 1 ? (photoComment.trim() || undefined) : undefined,
          status: photoStatus,
          zone: photoZone,
          photo_url: photoUrl,
        });
      }
      refetch();
      refetchVisits?.();
      closeUploadModal();
      toast(photoFiles.length === 1 ? 'Фото добавлено' : `Загружено ${photoFiles.length} фото`);
    } catch (err: unknown) {
      setUploadError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setSaving(false); setUploadProgress({ current: 0, total: 0 });
    }
  };

  const handleCreateVisit = async () => {
    if (!newVisitTitle.trim() || !newVisitDate) return;
    setCreatingVisit(true);
    try {
      const visit = await createVisit({
        project_id: projectId,
        title: newVisitTitle.trim(),
        date: newVisitDate,
        status: 'planned',
      });
      setSelectedVisitId(visit.id);
      setShowNewVisit(false);
      setNewVisitTitle('');
      refetchVisits?.();
      toast('Визит создан');
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : 'Ошибка');
    } finally {
      setCreatingVisit(false);
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
        {canUploadPhoto && (
          <button
            onClick={handleOpenUpload}
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--af-font-mono)',
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

      {/* Gallery grouped by visit */}
      {filtered.length > 0 ? (
        <div className="space-y-6">
          {groupedByVisit.map(group => (
            <div key={group.visitId}>
              {/* Visit header */}
              <div style={{
                display: 'flex', alignItems: 'baseline', gap: 8,
                marginBottom: 10, borderBottom: '0.5px solid rgb(var(--line))',
                paddingBottom: 6,
              }}>
                <span style={{
                  fontFamily: 'var(--af-font-display)', fontSize: 15, fontWeight: 700,
                  color: 'rgb(var(--ink))',
                }}>
                  {group.date ? formatDate(group.date) : '—'}
                </span>
                <span style={{
                  fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-11)',
                  color: 'rgb(var(--ink))', opacity: 0.5,
                }}>
                  {group.title}
                </span>
                <span style={{
                  fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-10)',
                  color: 'rgb(var(--ink))', opacity: 0.3, marginLeft: 'auto',
                }}>
                  {group.photos.length} фото
                </span>
              </div>
              {/* Photo grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {group.photos.map(photo => {
                  const cfg = PHOTO_STATUS_CONFIG[photo.status];
                  return (
                    <div
                      key={photo.id}
                      className="group cursor-pointer overflow-hidden border border-line hover:border-ink-ghost transition-all"
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      {photo.photo_url ? (
                        <div className="aspect-square bg-srf-secondary relative">
                          <Image src={photo.photo_url} alt="" fill sizes="(max-width: 640px) 50vw, 25vw" className="object-cover" />
                          <div className="absolute top-2 right-2">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 ${cfg.bg} ${cfg.color}`}>
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
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Icons.Camera className="w-8 h-8 text-ink-ghost mb-2" />
          <div className="text-[13px] text-ink-faint" style={{ marginBottom: canUploadPhoto ? 12 : 0 }}>
            {filter !== 'all' ? 'Нет фото с таким статусом' : 'Фотографий пока нет'}
          </div>
          {canUploadPhoto && filter === 'all' && (
            <button
              onClick={handleOpenUpload}
              style={{
                fontFamily: 'var(--af-font-mono)',
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
      <Modal open={!!selectedPhoto} onClose={() => { setSelectedPhoto(null); setIsEditing(false); }} title={selectedPhoto?.comment || 'Фото'}>
        {selectedPhoto && (
          <div className="space-y-4">
            {selectedPhoto.photo_url && (
              <Image src={selectedPhoto.photo_url} alt="" width={960} height={720} sizes="(max-width: 480px) 92vw, 448px" className="w-full" style={{ height: 'auto' }} />
            )}
            {isEditing ? (
              <div className="space-y-3">
                <div className="modal-field">
                  <label>Зона</label>
                  <select value={editZone} onChange={e => setEditZone(e.target.value)}>
                    <option value="">—</option>
                    {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                  </select>
                </div>
                <div className="modal-field">
                  <label>Комментарий</label>
                  <textarea value={editComment} onChange={e => setEditComment(e.target.value)} placeholder="Опишите фото..." className="resize-y min-h-[60px]" rows={2} />
                </div>
                <div className="flex gap-2 justify-end">
                  <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)} disabled={editSaving}>Отмена</button>
                  <button type="button" className="btn btn-primary" onClick={handleSaveEdit} disabled={editSaving}>
                    {editSaving ? 'Сохранение...' : 'Сохранить'}
                  </button>
                </div>
              </div>
            ) : (
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
                      className="text-[12px] border border-line px-2 py-1 bg-srf"
                    >
                      <option value="new">Новое</option>
                      <option value="issue">Замечание</option>
                      <option value="in_progress">В работе</option>
                      <option value="resolved">Исправлено</option>
                      <option value="approved">Принято</option>
                    </select>
                  ) : (
                    <span className={`text-[11px] font-medium px-2 py-0.5 ${PHOTO_STATUS_CONFIG[selectedPhoto.status].bg} ${PHOTO_STATUS_CONFIG[selectedPhoto.status].color}`}>
                      {PHOTO_STATUS_CONFIG[selectedPhoto.status].label}
                    </span>
                  )}
                </div>
                {canChangePhotoStatus && (
                  <button
                    onClick={handleStartEdit}
                    style={{
                      fontFamily: 'var(--af-font-mono)', fontSize: 9, letterSpacing: '0.1em',
                      textTransform: 'uppercase', color: 'rgb(var(--ink))', background: 'none',
                      border: '0.5px solid rgb(var(--line))', padding: '4px 12px', cursor: 'pointer',
                      marginTop: 8,
                    }}
                  >
                    Редактировать
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Upload photo modal */}
      {showUpload && (
        <div className="af-modal-overlay" onClick={closeUploadModal}>
          <div className="af-modal" onClick={e => e.stopPropagation()}>
            <h2 className="af-modal-title">Добавить фото</h2>

            {uploadError && (
              <div style={{ border: '0.5px solid #111', padding: 12, marginBottom: 16, fontFamily: 'var(--af-font-mono)', fontSize: 11 }}>
                {uploadError}
              </div>
            )}

            <form onSubmit={handleSavePhoto}>
              {/* Visit selector */}
              <div className="modal-field mb-4">
                <label>Визит *</label>
                {visits.length > 0 ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select
                      value={selectedVisitId}
                      onChange={e => setSelectedVisitId(e.target.value)}
                      style={{ flex: 1 }}
                    >
                      <option value="">Выберите визит</option>
                      {visits.map(v => (
                        <option key={v.id} value={v.id}>
                          {v.title} — {formatDate(v.date)}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowNewVisit(!showNewVisit)}
                      style={{
                        fontFamily: 'var(--af-font-mono)',
                        fontSize: 9,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: '#111',
                        background: 'none',
                        border: '0.5px solid #EBEBEB',
                        padding: '4px 8px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      + Новый
                    </button>
                  </div>
                ) : (
                  <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 11, color: '#111', marginBottom: 8 }}>
                    Нет визитов. Создайте визит, чтобы загрузить фото.
                    <button
                      type="button"
                      onClick={() => setShowNewVisit(true)}
                      style={{
                        display: 'block',
                        marginTop: 8,
                        fontFamily: 'var(--af-font-mono)',
                        fontSize: 10,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: '#fff',
                        background: '#111',
                        border: 'none',
                        padding: '6px 14px',
                        cursor: 'pointer',
                      }}
                    >
                      + Создать визит
                    </button>
                  </div>
                )}
              </div>

              {/* Inline visit creation */}
              {showNewVisit && (
                <div style={{ background: '#F6F6F4', padding: 12, marginBottom: 16 }}>
                  <div style={{
                    fontFamily: 'var(--af-font-mono)', fontSize: 8,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    color: '#111', marginBottom: 8,
                  }}>
                    Новый визит
                  </div>
                  <div className="modal-field mb-3">
                    <label>Название *</label>
                    <input
                      value={newVisitTitle}
                      onChange={e => setNewVisitTitle(e.target.value)}
                      placeholder="Проверка штукатурки"
                    />
                  </div>
                  <div className="modal-field mb-3">
                    <label>Дата *</label>
                    <input
                      type="date"
                      value={newVisitDate}
                      onChange={e => setNewVisitDate(e.target.value)}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={() => setShowNewVisit(false)}
                      style={{ fontFamily: 'var(--af-font-mono)', fontSize: 9, color: '#111', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      Отмена
                    </button>
                    <button
                      type="button"
                      onClick={handleCreateVisit}
                      disabled={creatingVisit || !newVisitTitle.trim() || !newVisitDate}
                      style={{
                        fontFamily: 'var(--af-font-mono)', fontSize: 9,
                        padding: '4px 12px', background: '#111', color: '#FFF',
                        border: 'none', cursor: creatingVisit ? 'wait' : 'pointer',
                        opacity: creatingVisit || !newVisitTitle.trim() ? 0.5 : 1,
                      }}
                    >
                      {creatingVisit ? '...' : 'Создать'}
                    </button>
                  </div>
                </div>
              )}

              {/* Drop zone */}
              <div
                className={`af-upload ${isDragging ? 'dragging' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
              >
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { if (e.target.files?.length) handleFilesSelect(e.target.files); e.target.value = ''; }} />
                {photoPreviews.length > 0 ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
                    {photoPreviews.map((preview, idx) => (
                      <div key={idx} style={{ position: 'relative', width: 80, height: 80 }}>
                        <img src={preview} alt="" style={{ width: 80, height: 80, objectFit: 'cover' }} />
                        <button
                          type="button"
                          onClick={e => { e.stopPropagation(); handleRemoveFile(idx); }}
                          style={{
                            position: 'absolute', top: -6, right: -6,
                            width: 18, height: 18, borderRadius: '50%',
                            background: '#111', color: '#fff', border: 'none',
                            fontSize: 10, cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    <div
                      style={{
                        width: 80, height: 80, border: '1px dashed rgb(var(--line))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 24, color: 'rgb(var(--ink))', opacity: 0.3, cursor: 'pointer',
                      }}
                    >
                      +
                    </div>
                  </div>
                ) : (
                  <span className="af-upload-label">Перетащите фото или нажмите (можно несколько)</span>
                )}
              </div>

              <div className="modal-field mt-4 mb-4">
                <label>Зона</label>
                <select value={photoZone} onChange={e => setPhotoZone(e.target.value)}>
                  {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>
              <div className="modal-field mb-4">
                <label>Комментарий</label>
                <textarea value={photoComment} onChange={e => setPhotoComment(e.target.value)} placeholder="Опишите фото..." className="resize-y min-h-[60px]" rows={2} />
              </div>
              <div className="modal-field mb-4">
                <label>Статус</label>
                <select value={photoStatus} onChange={e => setPhotoStatus(e.target.value as PhotoStatus)}>
                  <option value="approved">Принято</option>
                  <option value="issue">Замечание</option>
                  <option value="in_progress">В работе</option>
                  <option value="new">Новое</option>
                </select>
              </div>

              {saving && (
                <div style={{ marginTop: 16 }}>
                  <div className="af-label" style={{ marginBottom: 8 }}>
                    Загрузка {uploadProgress.current} из {uploadProgress.total}...
                  </div>
                  <div style={{ width: '100%', height: 3, background: '#EBEBEB', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: '#111', width: `${(uploadProgress.current / uploadProgress.total) * 100}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>
              )}

              <div className="flex gap-2 justify-end mt-6">
                <button type="button" className="btn btn-secondary" onClick={closeUploadModal} disabled={saving}>Отмена</button>
                <button type="submit" className="btn btn-primary" disabled={saving || !selectedVisitId || photoFiles.length === 0}>
                  {saving ? 'Загрузка...' : photoFiles.length > 1 ? `Загрузить (${photoFiles.length})` : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
