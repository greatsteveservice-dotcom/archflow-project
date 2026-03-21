"use client";

import { useState, useRef } from "react";
import { Icons } from "./Icons";
import Loading, { ErrorMessage } from "./Loading";
import { useVisit, useVisitPhotos, useProject } from "../lib/hooks";
import { formatDate, uploadPhoto, createPhotoRecord, updatePhotoStatus } from "../lib/queries";
import { PHOTO_STATUS_CONFIG } from "../lib/types";
import type { PhotoStatus } from "../lib/types";

interface VisitPageProps {
  projectId: string;
  visitId: string;
  onNavigate: (page: string, ctx?: any) => void;
  toast: (msg: string) => void;
}

const ZONES = ["Спальня", "Гостиная", "Кухня", "Ванная", "Детская", "Прихожая", "Коридор", "Балкон"];

const STATUS_OPTIONS: { value: PhotoStatus; label: string }[] = [
  { value: "approved", label: "Принято" },
  { value: "issue", label: "Замечание" },
  { value: "in_progress", label: "В работе" },
  { value: "new", label: "Новое" },
];

export default function VisitPage({ projectId, visitId, onNavigate, toast }: VisitPageProps) {
  const { data: project, loading: loadingProject } = useProject(projectId);
  const { data: visit, loading: loadingVisit, error: errorVisit, refetch: refetchVisit } = useVisit(visitId);
  const { data: photos, loading: loadingPhotos, refetch: refetchPhotos } = useVisitPhotos(visitId);
  const [photoFilter, setPhotoFilter] = useState("all");

  // Upload modal state
  const [showUpload, setShowUpload] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoZone, setPhotoZone] = useState("Спальня");
  const [photoComment, setPhotoComment] = useState("");
  const [photoStatus, setPhotoStatus] = useState<PhotoStatus>("approved");
  const [savingPhoto, setSavingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (loadingProject || loadingVisit || loadingPhotos) return <Loading />;
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
    setPhotoError("");
    try {
      // Upload file to Supabase Storage
      const photoUrl = await uploadPhoto(photoFile, projectId, visitId);
      // Create record in DB
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
  };

  // --- Inline status change ---

  const handleStatusChange = async (photoId: string, newStatus: PhotoStatus) => {
    try {
      await updatePhotoStatus(photoId, newStatus);
      refetchPhotos();
      refetchVisit();
    } catch (err) {
      // silently fail — user sees old status
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Visit header */}
      <div className="card p-6 mb-5">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[15px] font-semibold font-mono-custom">{formatDate(visit.date)}</span>
              <span className="text-[13px] text-[#9CA3AF]">·</span>
              <span className="text-[13px] text-[#6B7280]">{visit.author?.full_name || '—'}</span>
            </div>
            <h2 className="text-lg font-semibold mb-1">{visit.title}</h2>
            <div className="text-[13px] text-[#9CA3AF]">
              {project.title} · {project.address || ''}
            </div>
          </div>
          <button className="btn btn-secondary">
            <Icons.Download /> Отчёт
          </button>
        </div>

        <div className="flex gap-6 mt-4 pt-3.5 border-t border-[#F3F4F6]">
          <div className="flex items-center gap-1.5 text-[13px]">
            <Icons.Camera className="w-4 h-4" />
            <strong>{allPhotos.length}</strong>
            <span className="text-[#9CA3AF]">фото</span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-[#16A34A]">
            <Icons.Check />
            <strong>{allPhotos.filter((p) => p.status === "approved").length}</strong>
            <span>принято</span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-[#DC2626]">
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
        <button className="btn btn-primary" onClick={() => setShowUpload(true)}>
          <Icons.Camera className="w-4 h-4" /> Добавить фото
        </button>
      </div>

      {/* Photo grid */}
      <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5 max-sm:grid-cols-1">
        {filteredPhotos.map((photo) => {
          const status = PHOTO_STATUS_CONFIG[photo.status as PhotoStatus] || PHOTO_STATUS_CONFIG.new;
          return (
            <div
              key={photo.id}
              className="card overflow-hidden hover:shadow-md"
            >
              <div className="w-full h-[180px] flex items-center justify-center text-[#9CA3AF] relative bg-gradient-to-br from-[#F3F4F6] to-[#E5E7EB] overflow-hidden">
                {photo.photo_url ? (
                  <img
                    src={photo.photo_url}
                    alt={photo.comment || 'Фото'}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Icons.ImageIcon />
                )}
                <div className="absolute top-2.5 left-2.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/90 text-[#6B7280] backdrop-blur-sm">
                  {photo.zone || 'Без зоны'}
                </div>
              </div>
              <div className="p-3.5">
                <div className="text-[13px] text-[#111827] leading-relaxed mb-2.5">
                  {photo.comment || 'Без комментария'}
                </div>
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
              </div>
            </div>
          );
        })}
      </div>

      {filteredPhotos.length === 0 && (
        <div className="text-center py-12 text-[#9CA3AF] text-sm">
          {photoFilter === "all" ? "Нет фото в этом визите" : "Нет фото с таким статусом"}
        </div>
      )}

      {/* ===== Upload Photo Modal ===== */}
      {showUpload && (
        <div className="modal-overlay" onClick={closeUploadModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-5">Добавить фото</h2>
            {photoError && (
              <div className="bg-[#FEF2F2] border border-[#DC2626]/20 text-[#DC2626] text-[13px] px-4 py-2.5 rounded-lg mb-4">
                {photoError}
              </div>
            )}
            <form onSubmit={handleSavePhoto}>
              {/* Drop zone */}
              <div
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? "border-[#111827] bg-[#F3F4F6]"
                    : photoPreview
                    ? "border-[#111827] bg-[#F9FAFB]"
                    : "border-[#E5E7EB] bg-[#F9FAFB] hover:border-[#D1D5DB] hover:bg-[#F3F4F6]"
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
                    <div className="text-[12px] text-[#6B7280]">
                      {photoFile?.name} ({((photoFile?.size || 0) / 1024 / 1024).toFixed(1)} МБ)
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="text-[#9CA3AF] mb-2">
                      <Icons.Camera className="w-6 h-6 mx-auto" />
                    </div>
                    <div className="text-[13px] text-[#6B7280]">
                      Перетащите фото или нажмите для выбора
                    </div>
                    <div className="text-[11px] text-[#9CA3AF] mt-1">JPG, PNG до 20 МБ</div>
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
              <div className="flex gap-2 justify-end mt-6">
                <button type="button" className="btn btn-secondary" onClick={closeUploadModal}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary" disabled={savingPhoto}>
                  {savingPhoto ? "Загрузка..." : "Сохранить"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
