"use client";

import { useState, useRef } from "react";
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
import OnboardingTip from "./OnboardingTip";

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

  // Upload modal state
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

  // Delete photo confirm
  const [photoToDelete, setPhotoToDelete] = useState<PhotoRecord | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState(false);

  if (loadingProject || loadingVisit || loadingPhotos) return <VisitPageSkeleton />;
  if (errorVisit) return <ErrorMessage message={errorVisit} />;
  if (!visit || !project) return <ErrorMessage message="Визит не найден" />;

  const allPhotos = photos || [];
  const filteredPhotos = photoFilter === "all" ? allPhotos : allPhotos.filter((p) => p.status === photoFilter);

  // --- File handling ---

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setPhotoError("Выберите изображение (JPG, PNG)");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setPhotoError("Файл слишком большой (макс. 20 МБ)");
      return;
    }
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setPhotoError("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileSelect(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  // --- Submit photo ---

  const handleSavePhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFile) { setPhotoError("Выберите фото"); return; }
    setSavingPhoto(true);
    setUploadStep('uploading');
    setPhotoError("");
    try {
      // Upload file to Supabase Storage
      const photoUrl = await uploadPhoto(photoFile, projectId, visitId);
      // Create record in DB
      setUploadStep('saving');
      await createPhotoRecord({
        visit_id: visitId,
        comment: photoComment.trim() || undefined,
        status: photoStatus,
        zone: photoZone,
        photo_url: photoUrl,
      });
      refetchPhotos();
      refetchVisit();
      closeUploadModal();
    } catch (err: any) {
      setPhotoError(err.message || "Ошибка загрузки фото");
    } finally {
      setSavingPhoto(false);
      setUploadStep('idle');
    }
  };

  const closeUploadModal = () => {
    setShowUpload(false);
    setPhotoFile(null);
    if (photoPreview) URL.revokeObjectURL(photoPreview);
    setPhotoPreview(null);
    setPhotoComment("");
    setPhotoZone("Спальня");
    setPhotoStatus("approved");
    setPhotoError("");
    setUploadStep('idle');
  };

  // --- Inline status change ---

  const handleStatusChange = async (photoId: string, newStatus: PhotoStatus) => {
    try {
      await updatePhotoStatus(photoId, newStatus);
      refetchPhotos();
      refetchVisit();
    } catch (err: any) {
      toast(err.message || 'Ошибка смены статуса');
    }
  };

  // --- Delete photo ---

  const handleDeletePhoto = async () => {
    if (!photoToDelete) return;
    setDeletingPhoto(true);
    try {
      await deletePhotoRecord(photoToDelete.id);
      toast('Фото удалено');
      refetchPhotos();
      refetchVisit();
      setPhotoToDelete(null);
    } catch (err: any) {
      toast(err.message || 'Ошибка удаления фото');
    } finally {
      setDeletingPhoto(false);
    }
  };

  return (
    <>
    <Topbar
      title={visit.title}
      onMenuToggle={onMenuToggle}
      onSearchOpen={onSearchOpen}
      breadcrumbs={[
        { label: 'Проекты', onClick: () => onNavigate('projects') },
        { label: project.title, onClick: () => onNavigate('project', projectId) },
        { label: 'Визит' },
      ]}
    />
    <div className="p-4 sm:p-8 animate-fade-in">
      <OnboardingTip
        id="visit-photos"
        title="Фотоотчёт визита"
        text="Загружайте фото с объекта, добавляйте комментарии и отмечайте замечания. Используйте drag-and-drop или кнопку загрузки."
        className="mb-5"
      />
      {/* Visit header */}
      <div className="card p-6 mb-5">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[15px] font-semibold font-mono-custom">{formatDate(visit.date)}</span>
              <span className="text-[13px] text-ink-faint">·</span>
              <span className="text-[13px] text-ink-muted">{visit.author?.full_name || '—'}</span>
            </div>
            <h2 className="text-lg font-semibold mb-1">{visit.title}</h2>
            <div className="text-[13px] text-ink-faint">
              {project.title} · {project.address || ''}
            </div>
          </div>
          <button className="btn btn-secondary">
            <Icons.Download /> Отчёт
          </button>
        </div>

        <div className="flex gap-6 mt-4 pt-3.5 border-t border-line-light">
          <div className="flex items-center gap-1.5 text-[13px]">
            <Icons.Camera className="w-4 h-4" />
            <strong>{allPhotos.length}</strong>
            <span className="text-ink-faint">фото</span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-ok">
            <Icons.Check />
            <strong>{allPhotos.filter((p) => p.status === "approved").length}</strong>
            <span>принято</span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-err">
            <Icons.Alert />
            <strong>{allPhotos.filter((p) => p.status === "issue").length}</strong>
            <span>замечаний</span>
          </div>
        </div>
      </div>

      {/* Filters + add button */}
      <div className="flex justify-between items-center mb-5">
        <div className="stab">
          {[
            { id: "all", label: `Все (${allPhotos.length})` },
            { id: "approved", label: `Принято (${allPhotos.filter((p) => p.status === "approved").length})` },
            { id: "issue", label: `Замечания (${allPhotos.filter((p) => p.status === "issue").length})` },
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
            <Icons.Camera className="w-4 h-4" /> Добавить фото
          </button>
        )}
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5 max-sm:grid-cols-1">
        {filteredPhotos.map((photo) => {
          const status = PHOTO_STATUS_CONFIG[photo.status as PhotoStatus] || PHOTO_STATUS_CONFIG.new;
          return (
            <div
              key={photo.id}
              className="card overflow-hidden hover:shadow-md group"
            >
              <div className="w-full h-[180px] flex items-center justify-center text-ink-faint relative bg-gradient-to-br from-srf-secondary to-line overflow-hidden">
                {photo.photo_url ? (
                  <img
                    src={photo.photo_url}
                    alt={photo.comment || 'Фото'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <Icons.ImageIcon />
                )}
                <div className="absolute top-2.5 left-2.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/90 text-ink-muted backdrop-blur-sm">
                  {photo.zone || 'Без зоны'}
                </div>
                {/* Delete button overlay */}
                {permissions.canChangePhotoStatus && (
                  <button
                    className="absolute top-2.5 right-2.5 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-white/90 backdrop-blur-sm text-ink-faint hover:text-err hover:bg-err-bg"
                    onClick={() => setPhotoToDelete(photo)}
                    title="Удалить фото"
                  >
                    <Icons.Trash className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div className="p-3.5">
                <div className="text-[13px] text-ink leading-relaxed mb-2.5">
                  {photo.comment || 'Без комментария'}
                </div>
                {permissions.canChangePhotoStatus ? (
                  <select
                    value={photo.status}
                    onChange={(e) => handleStatusChange(photo.id, e.target.value as PhotoStatus)}
                    className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full border-none cursor-pointer appearance-none ${status.bg} ${status.color}`}
                    style={{ paddingRight: '20px', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27currentColor%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 4px center', backgroundSize: '12px' }}
                  >
                    {Object.entries(PHOTO_STATUS_CONFIG).map(([key, cfg]) => (
                      <option key={key} value={key}>{cfg.label}</option>
                    ))}
                  </select>
                ) : (
                  <span className={`inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}>
                    {status.label}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {filteredPhotos.length === 0 && (
        <div className="text-center py-12 text-ink-faint text-sm">
          {photoFilter === "all" ? "Нет фото в этом визите" : "Нет фото с таким статусом"}
        </div>
      )}

      {/* ===== Upload Photo Modal ===== */}
      {showUpload && (
        <div className="modal-overlay" onClick={closeUploadModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-5">Добавить фото</h2>
            {photoError && (
              <div className="bg-err-bg border border-err/20 text-err text-[13px] px-4 py-2.5 rounded-lg mb-4">
                {photoError}
              </div>
            )}
            <form onSubmit={handleSavePhoto}>
              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? "border-ink bg-srf-secondary"
                    : photoPreview
                    ? "border-ink bg-srf-raised"
                    : "border-line bg-srf-raised hover:border-ink-ghost hover:bg-srf-secondary"
                }`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleInputChange}
                />
                {photoPreview ? (
                  <div>
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="max-h-[200px] mx-auto rounded-lg mb-2"
                    />
                    <div className="text-[12px] text-ink-muted">
                      {photoFile?.name} ({((photoFile?.size || 0) / 1024 / 1024).toFixed(1)} МБ)
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-ink-faint mb-2">
                      <Icons.Camera className="w-6 h-6 mx-auto" />
                    </div>
                    <div className="text-[13px] text-ink-muted">
                      Перетащите фото или нажмите для выбора
                    </div>
                    <div className="text-[11px] text-ink-faint mt-1">JPG, PNG до 20 МБ</div>
                  </>
                )}
              </div>

              <div className="modal-field mt-4 mb-4">
                <label>Зона</label>
                <select value={photoZone} onChange={(e) => setPhotoZone(e.target.value)}>
                  {ZONES.map((z) => (
                    <option key={z} value={z}>{z}</option>
                  ))}
                </select>
              </div>
              <div className="modal-field mb-4">
                <label>Комментарий</label>
                <textarea
                  value={photoComment}
                  onChange={(e) => setPhotoComment(e.target.value)}
                  placeholder="Опишите что на фото и какое решение принято..."
                  className="resize-y min-h-[80px]"
                />
              </div>
              <div className="modal-field mb-4">
                <label>Статус</label>
                <select value={photoStatus} onChange={(e) => setPhotoStatus(e.target.value as PhotoStatus)}>
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {/* Upload progress */}
              {savingPhoto && (
                <div className="mt-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="inline-block w-3.5 h-3.5 border-2 border-line border-t-ink rounded-full animate-spin" />
                    <span className="text-[12px] text-ink-muted">
                      {uploadStep === 'uploading' ? `Загрузка файла (${((photoFile?.size || 0) / 1024 / 1024).toFixed(1)} МБ)...` : 'Сохранение записи...'}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-srf-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-ink rounded-full animate-progress-indeterminate" />
                  </div>
                </div>
              )}
              <div className="flex gap-2 justify-end mt-6">
                <button type="button" className="btn btn-secondary" onClick={closeUploadModal} disabled={savingPhoto}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingPhoto}>
                  {savingPhoto ? (uploadStep === 'uploading' ? 'Загрузка...' : 'Сохранение...') : 'Сохранить'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm delete photo */}
      <ConfirmDialog
        open={!!photoToDelete}
        title="Удалить фото?"
        message={`Фото${photoToDelete?.zone ? ` из зоны «${photoToDelete.zone}»` : ''} будет безвозвратно удалено.`}
        confirmLabel="Удалить"
        loading={deletingPhoto}
        onConfirm={handleDeletePhoto}
        onCancel={() => setPhotoToDelete(null)}
      />
    </div>
    </>
  );
}
