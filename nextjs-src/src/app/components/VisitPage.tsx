"use client";

import { useState } from "react";
import { Icons } from "./Icons";
import Loading, { ErrorMessage } from "./Loading";
import { useVisit, useVisitPhotos, useProject } from "../lib/hooks";
import { formatDate } from "../lib/queries";
import { PHOTO_STATUS_CONFIG } from "../lib/types";
import type { PhotoStatus } from "../lib/types";

interface VisitPageProps {
  projectId: string;
  visitId: string;
  onNavigate: (page: string, ctx?: any) => void;
}

export default function VisitPage({ projectId, visitId, onNavigate }: VisitPageProps) {
  const { data: project, loading: loadingProject } = useProject(projectId);
  const { data: visit, loading: loadingVisit, error: errorVisit } = useVisit(visitId);
  const { data: photos, loading: loadingPhotos } = useVisitPhotos(visitId);
  const [photoFilter, setPhotoFilter] = useState("all");
  const [showUpload, setShowUpload] = useState(false);

  if (loadingProject || loadingVisit || loadingPhotos) return <Loading />;
  if (errorVisit) return <ErrorMessage message={errorVisit} />;
  if (!visit || !project) return <ErrorMessage message="Визит не найден" />;

  const allPhotos = photos || [];
  const filteredPhotos = photoFilter === "all" ? allPhotos : allPhotos.filter((p) => p.status === photoFilter);

  return (
    <div className="animate-fade-in">
      {/* Visit header */}
      <div className="bg-white border border-[#E8E6E1] rounded-xl p-6 mb-5">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[15px] font-semibold font-mono-custom">{formatDate(visit.date)}</span>
              <span className="text-[13px] text-[#9B9B9B]">·</span>
              <span className="text-[13px] text-[#6B6B6B]">{visit.author?.full_name || '—'}</span>
            </div>
            <h2 className="text-lg font-semibold mb-1">{visit.title}</h2>
            <div className="text-[13px] text-[#9B9B9B]">
              {project.title} · {project.address || ''}
            </div>
          </div>
          <button className="btn btn-secondary">
            <Icons.Download /> Скачать отчёт
          </button>
        </div>

        <div className="flex gap-6 mt-4 pt-3.5 border-t border-[#F0EEE9]">
          <div className="flex items-center gap-1.5 text-[13px]">
            <Icons.Camera className="w-4 h-4" />
            <strong>{allPhotos.length}</strong>
            <span className="text-[#9B9B9B]">фото</span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-[#2A9D5C]">
            <Icons.Check />
            <strong>{allPhotos.filter((p) => p.status === "approved").length}</strong>
            <span>принято</span>
          </div>
          <div className="flex items-center gap-1.5 text-[13px] text-[#E85D3A]">
            <Icons.Alert />
            <strong>{allPhotos.filter((p) => p.status === "issue").length}</strong>
            <span>замечаний</span>
          </div>
        </div>
      </div>

      {/* Filters + add button */}
      <div className="flex justify-between items-center mb-5">
        <div className="filter-tabs">
          {[
            { id: "all", label: `Все (${allPhotos.length})` },
            { id: "approved", label: `Принято (${allPhotos.filter((p) => p.status === "approved").length})` },
            { id: "issue", label: `Замечания (${allPhotos.filter((p) => p.status === "issue").length})` },
          ].map((tab) => (
            <button
              key={tab.id}
              className={`filter-tab ${photoFilter === tab.id ? "active" : ""}`}
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
              className="bg-white border border-[#E8E6E1] rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md"
            >
              <div className="w-full h-[180px] flex items-center justify-center text-[#9B9B9B] relative bg-gradient-to-br from-[#E8E6E1] to-[#D5D3CE]">
                <Icons.ImageIcon />
                <div className="absolute top-2.5 left-2.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/90 text-[#6B6B6B] backdrop-blur-sm">
                  {photo.zone || 'Без зоны'}
                </div>
              </div>
              <div className="p-3.5">
                <div className="text-[13px] text-[#1A1A1A] leading-relaxed mb-2.5">
                  {photo.comment || 'Без комментария'}
                </div>
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}
                >
                  {photo.status === "approved" && <Icons.Check />}
                  {photo.status === "issue" && <Icons.Alert />}
                  {status.label}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Upload modal */}
      {showUpload && (
        <div className="modal-overlay" onClick={() => setShowUpload(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-5">Добавить фото</h2>
            <div className="border-2 border-dashed border-[#E8E6E1] rounded-xl p-8 text-center cursor-pointer transition-all duration-200 bg-[#FAFAF8] hover:border-[#2C5F2D] hover:bg-[#E8F0E8]">
              <div className="text-[#9B9B9B] mb-2">
                <Icons.Camera className="w-6 h-6 mx-auto" />
              </div>
              <div className="text-[13px] text-[#6B6B6B]">
                Перетащите фото или нажмите для выбора
              </div>
              <div className="text-[11px] text-[#9B9B9B] mt-1">JPG, PNG до 20 МБ</div>
            </div>
            <div className="modal-field mt-4 mb-4">
              <label>Зона</label>
              <select>
                <option>Спальня</option>
                <option>Гостиная</option>
                <option>Кухня</option>
                <option>Ванная</option>
                <option>Детская</option>
                <option>Прихожая</option>
              </select>
            </div>
            <div className="modal-field mb-4">
              <label>Комментарий</label>
              <textarea
                placeholder="Опишите что на фото и какое решение принято..."
                className="resize-y min-h-[80px]"
              />
            </div>
            <div className="modal-field mb-4">
              <label>Статус</label>
              <select>
                <option>Принято</option>
                <option>Замечание</option>
                <option>В работе</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button className="btn btn-secondary" onClick={() => setShowUpload(false)}>
                Отмена
              </button>
              <button className="btn btn-primary">Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
