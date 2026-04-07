"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Icons } from "./Icons";
import Topbar from "./Topbar";
import { ErrorMessage } from "./Loading";
import { VisitPageSkeleton } from "./Skeleton";
import ConfirmDialog from "./ConfirmDialog";
import { useVisit, useVisitPhotos, useProject } from "../lib/hooks";
import { usePermissions } from "../lib/permissions";
import { formatDate, uploadPhoto, createPhotoRecord, updatePhotoStatus, deletePhotoRecord } from "../lib/queries";
import { PHOTO_STATUS_CONFIG } from "../lib/types";
import type { PhotoStatus, PhotoRecord } from "../lib/types";

interface VisitPageProps {
  projectId: string;
  visitId: string;
  onNavigate: (page: string, ctx?: any) => void;
  toast: (msg: string) => void;
  onMenuToggle?: () => void;
  onSearchOpen?: () => void;
}

const ZONES = ["Спальня", "Гостиная", "Кухня", "Ванная", "Детская", "Прихожая", "Коридор", "Балкон"];

const STATUS_OPTIONS: { value: PhotoStatus; label: string }[] = [
  { value: "approved", label: "Принято" },
  { value: "issue", label: "Замечание" },
  { value: "in_progress", label: "В работе" },
  { value: "new", label: "Новое" },
];

export default function VisitPage({ projectId, visitId, onNavigate, toast, onMenuToggle, onSearchOpen }: VisitPageProps) {
  const { data: project, loading: loadingProject } = useProject(projectId);
  const { data: visit, loading: loadingVisit, error: errorVisit, refetch: refetchVisit } = useVisit(visitId);
  const { data: photos, loading: loadingPhotos, refetch: refetchPhotos } = useVisitPhotos(visitId);
  const { permissions } = usePermissions(projectId);
  const [photoFilter, setPhotoFilter] = useState("all");

  // Upload state
  const [showUpload, setShowUpload] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoZone, setPhotoZone] = useState("Спальня");
  const [photoComment, setPhotoComment] = useState("");
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>("approved");
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [uploadStep, setUploadStep] = useState<'idle' | 'uploading' | 'saving'>('idle');
  const [photoError, setPhotoError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirm
  const [photoToDelete, setPhotoToDelete] = useState<PhotoRecord | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState(false);

  if (loadingProject || loadingVisit || loadingPhotos) return <VisitPageSkeleton />;
  if (errorVisit) return <ErrorMessage message={errorVisit} />;
  if (!visit || !project) return <ErrorMessage message="Визит не найден" />;

  const allPhotos = photos || [];
  const filteredPhotos = photoFilter === "all" ? allPhotos : allPhotos.filter((p) => p.status === photoFilter);

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) { setPhotoError("Выберите изображение"); return; }
    if (file.size > 20 * 1024 * 1024) { setPhotoError("Файл слишком большой (макс. 20 МБ)"); return; }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoError("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleSavePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) { setPhotoError("Выберите фото"); return; }
    setSavingPhoto(true); setUploadStep('uploading'); setPhotoError("");
    try {
      const photoUrl = await uploadPhoto(photoFile, projectId, visitId);
      setUploadStep('saving');
      await createPhotoRecord({
        visit_id: visitId,
        comment: photoComment.trim() || undefined,
        status: photoStatus,
        zone: photoZone,
        photo_url: photoUrl,
      });
      refetchPhotos(); refetchVisit(); closeUploadModal();
    } catch (err: any) {
      setPhotoError(err.message || "Ошибка загрузки");
    } finally {
      setSavingPhoto(false); setUploadStep('idle');
    }
  };

  const closeUploadModal = () => {
    setShowUpload(false); setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null); setPhotoComment(""); setPhotoZone("Спальня");
    setPhotoStatus("approved"); setPhotoError(""); setUploadStep('idle');
  };

  const handleStatusChange = async (photoId: string, newStatus: PhotoStatus) => {
    try {
      await updatePhotoStatus(photoId, newStatus);
      refetchPhotos(); refetchVisit();
    } catch (err: any) {
      toast(err.message || 'Ошибка смены статуса');
    }
  };

  const handleDeletePhoto = async () => {
    if (!photoToDelete) return;
    setDeletingPhoto(true);
    try {
      await deletePhotoRecord(photoToDelete.id);
      toast('Фото удалено'); refetchPhotos(); refetchVisit(); setPhotoToDelete(null);
    } catch (err: any) {
      toast(err.message || 'Ошибка удаления');
    } finally { setDeletingPhoto(false); }
  };

  return (
    <>
      <Topbar
        title={visit.title}
        depth={4}
        onSearchOpen={onSearchOpen}
        onLogoClick={() => onNavigate('projects')}
        breadcrumbs={[
          { label: 'Проекты', onClick: () => onNavigate('projects') },
          { label: project.title, onClick: () => onNavigate('project', projectId) },
          { label: 'Надзор', onClick: () => onNavigate('project', projectId) },
          { label: visit.title },
        ]}
      />

      <div className="af-layout">
        {/* Section hero */}
        <div className="af-section-hero">
          <h1 className="af-section-hero-title">{visit.title}</h1>
          <div className="af-label" style={{ marginTop: 8 }}>
            {formatDate(visit.date)} · {visit.author?.full_name || '—'} · {project.title}
          </div>
        </div>

        <div className="af-content">
          {/* Stats row */}
          <div className="grid grid-cols-3" style={{ gap: 'var(--af-gap)', marginBottom: 24 }}>
            <div className="af-metric">
              <div className="af-metric-value">{allPhotos.length}</div>
              <div className="af-metric-label">Фото</div>
            </div>
            <div className="af-metric">
              <div className="af-metric-value">{allPhotos.filter(p => p.status === "approved").length}</div>
              <div className="af-metric-label">Принято</div>
            </div>
            <div className="af-metric">
              <div className="af-metric-value">{allPhotos.filter(p => p.status === "issue").length}</div>
              <div className="af-metric-label">Замечаний</div>
            </div>
          </div>

          {/* Filters + add */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
            <div className="stab">
              {[
                { id: "all", label: `Все (${allPhotos.length})` },
                { id: "approved", label: `Принято` },
                { id: "issue", label: `Замечания` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`stb ${photoFilter === tab.id ? "active" : ""}`}
                  onClick={() => setPhotoFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            {permissions.canUploadPhoto && (
              <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
                + Добавить фото
              </button>
            )}
          </div>

          {/* Photo grid */}
          <div className="af-file-grid">
            {filteredPhotos.map((photo) => {
              const status = PHOTO_STATUS_CONFIG[photo.status as PhotoStatus] || PHOTO_STATUS_CONFIG.new;
              return (
                <div key={photo.id} className="af-file-thumb group" style={{ aspectRatio: '1/1' }}>
                  {photo.photo_url ? (
                    <Image src={photo.photo_url} alt={photo.comment || 'Фото'} fill sizes="33vw" style={{ objectFit: 'cover' }} />
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: '100%', color: 'var(--af-border)' }}>
                      —
                    </div>
                  )}
                  {/* Zone label */}
                  <div className="af-file-label">{photo.zone || '—'}</div>
                  {/* Status overlay */}
                  <div style={{
                    position: 'absolute', top: 8, left: 8,
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    background: 'rgba(255,255,255,0.9)', padding: '2px 6px',
                    color: 'var(--af-black)',
                  }}>
                    {status.label}
                  </div>
                  {/* Status change + delete */}
                  {permissions.canChangePhotoStatus && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      display: 'flex', gap: 4,
                    }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <select
                        value={photo.status}
                        onChange={(e) => handleStatusChange(photo.id, e.target.value as PhotoStatus)}
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
                          textTransform: 'uppercase', background: 'rgba(255,255,255,0.9)',
                          border: '0.5px solid var(--af-border)', padding: '2px 4px', cursor: 'pointer',
                        }}
                      >
                        {Object.entries(PHOTO_STATUS_CONFIG).map(([key, cfg]) => (
                          <option key={key} value={key}>{cfg.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => setPhotoToDelete(photo)}
                        style={{
                          fontFamily: "'IBM Plex Mono', monospace", fontSize: 8,
                          background: 'rgba(255,255,255,0.9)',
                          border: '0.5px solid var(--af-border)', padding: '2px 6px', cursor: 'pointer',
                        }}
                        title="Удалить"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                  {/* Comment overlay */}
                  {photo.comment && (
                    <div style={{
                      position: 'absolute', bottom: 0, left: 0, right: 0,
                      background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                      padding: '24px 8px 8px',
                      fontFamily: "'IBM Plex Mono', monospace", fontSize: 10,
                      color: 'var(--af-white)', lineHeight: 1.4,
                    }}>
                      {photo.comment}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {filteredPhotos.length === 0 && (
            <div className="af-empty">
              <div className="af-empty-dash">—</div>
              <div className="af-empty-label">
                {photoFilter === "all" ? "Нет фото в этом визите" : "Нет фото с таким статусом"}
              </div>
            </div>
          )}

          {/* Upload modal */}
          {showUpload && (
            <div className="af-modal-overlay" onClick={closeUploadModal}>
              <div className="af-modal" onClick={(e) => e.stopPropagation()}>
                <h2 className="af-modal-title">Добавить фото</h2>
                {photoError && (
                  <div style={{ border: '0.5px solid var(--af-black)', padding: 12, marginBottom: 16, fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>
                    {photoError}
                  </div>
                )}
                <form onSubmit={handleSavePhoto}>
                  {/* Drop zone */}
                  <div
                    className={`af-upload ${isDragging ? 'dragging' : ''}`}
                    onClick={() => fileInputRef.current?.click()}
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                  >
                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleInputChange} />
                    {photoPreview ? (
                      <div style={{ textAlign: 'center' }}>
                        <img src={photoPreview} alt="Preview" style={{ maxHeight: 200, margin: '0 auto 8px' }} />
                        <div className="af-label">{photoFile?.name}</div>
                      </div>
                    ) : (
                      <span className="af-upload-label">Перетащите фото или нажмите</span>
                    )}
                  </div>

                  <div className="modal-field mt-4 mb-4">
                    <label>Зона</label>
                    <select value={photoZone} onChange={(e) => setPhotoZone(e.target.value)}>
                      {ZONES.map(z => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </div>
                  <div className="modal-field mb-4">
                    <label>Комментарий</label>
                    <textarea value={photoComment} onChange={(e) => setPhotoComment(e.target.value)} placeholder="Опишите фото..." className="resize-y min-h-[80px]" />
                  </div>
                  <div className="modal-field mb-4">
                    <label>Статус</label>
                    <select value={photoStatus} onChange={(e) => setPhotoStatus(e.target.value as PhotoStatus)}>
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>

                  {savingPhoto && (
                    <div style={{ marginTop: 16 }}>
                      <div className="af-label" style={{ marginBottom: 8 }}>
                        {uploadStep === 'uploading' ? 'Загрузка файла...' : 'Сохранение...'}
                      </div>
                      <div style={{ width: '100%', height: 2, background: 'var(--af-border)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: 'var(--af-black)' }} className="animate-progress-indeterminate" />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 justify-end mt-6">
                    <button type="button" className="btn btn-secondary" onClick={closeUploadModal} disabled={savingPhoto}>Отмена</button>
                    <button type="submit" className="btn btn-primary" disabled={savingPhoto}>
                      {savingPhoto ? 'Загрузка...' : 'Сохранить'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          <ConfirmDialog
            open={!!photoToDelete}
            title="Удалить фото?"
            message={`Фото${photoToDelete?.zone ? ` из зоны «${photoToDelete.zone}»` : ''} будет удалено.`}
            confirmLabel="Удалить"
            loading={deletingPhoto}
            onConfirm={handleDeletePhoto}
            onCancel={() => setPhotoToDelete(null)}
          />
        </div>
      </div>
    </>
  );
}
