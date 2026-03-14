"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "../../../components/Sidebar";
import Modal from "../../../components/Modal";
import {
  IconChevronLeft, IconCamera, IconCheck, IconAlert,
  IconDownload, IconImage,
} from "../../../components/icons";
import { PROJECTS, VISITS, PHOTOS, STATUS_CONFIG } from "../../../lib/data";
import type { PhotoStatus } from "../../../lib/data";

export default function VisitPage() {
  const params = useParams();
  const projectId = Number(params.projectId);
  const visitId = Number(params.visitId);
  const project = PROJECTS.find((p) => p.id === projectId) || PROJECTS[0];
  const visit = VISITS.find((v) => v.id === visitId) || VISITS[0];
  const photos = PHOTOS.filter((p) => p.visitId === visit.id);

  const [photoFilter, setPhotoFilter] = useState<"all" | PhotoStatus>("all");
  const [showUpload, setShowUpload] = useState(false);

  const filteredPhotos = photoFilter === "all" ? photos : photos.filter((p) => p.status === photoFilter);

  const filterTabs = [
    { id: "all" as const, label: `Все (${photos.length})` },
    { id: "approved" as const, label: `Принято (${photos.filter((p) => p.status === "approved").length})` },
    { id: "issue" as const, label: `Замечания (${photos.filter((p) => p.status === "issue").length})` },
  ];

  return (
    <div className="flex min-h-screen bg-zhan-bg">
      <Sidebar />
      <div className="flex-1 overflow-y-auto main-scroll">
        {/* Topbar */}
        <div className="px-8 py-5 border-b border-zhan-border bg-zhan-surface sticky top-0 z-10">
          <Link
            href={`/project/${projectId}`}
            className="inline-flex items-center gap-1 text-[13px] text-zhan-text-muted hover:text-zhan-text transition-colors mb-1"
          >
            <IconChevronLeft /> Назад
          </Link>
          <div className="flex items-center gap-1.5 text-[13px] text-zhan-text-secondary flex-wrap">
            <Link href="/projects" className="text-zhan-text-muted hover:text-zhan-accent">Проекты</Link>
            <span className="text-zhan-text-muted">/</span>
            <Link href={`/project/${projectId}`} className="text-zhan-text-muted hover:text-zhan-accent">{project.title}</Link>
            <span className="text-zhan-text-muted">/</span>
            <span>{visit.date} — {visit.note}</span>
          </div>
        </div>

        <div className="p-8 animate-fade-in">
          {/* Visit header */}
          <div className="bg-zhan-surface border border-zhan-border rounded-xl p-6 mb-5">
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[15px] font-semibold font-mono">{visit.date}</span>
                  <span className="text-[13px] text-zhan-text-muted">·</span>
                  <span className="text-[13px] text-zhan-text-secondary">{visit.author}</span>
                </div>
                <h2 className="text-lg font-semibold mb-1">{visit.note}</h2>
                <div className="text-[13px] text-zhan-text-muted">{project.title} · {project.address}</div>
              </div>
              <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium border border-zhan-border hover:bg-zhan-surface-hover transition-colors">
                <IconDownload className="w-4 h-4" /> Скачать отчёт
              </button>
            </div>

            <div className="flex gap-6 mt-4 pt-3.5 border-t border-zhan-border-light">
              <div className="flex items-center gap-1.5 text-[13px]">
                <IconCamera className="w-4 h-4" /> <strong>{photos.length}</strong>
                <span className="text-zhan-text-muted">фото</span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px] text-zhan-success">
                <IconCheck /> <strong>{photos.filter((p) => p.status === "approved").length}</strong>
                <span>принято</span>
              </div>
              <div className="flex items-center gap-1.5 text-[13px] text-zhan-danger">
                <IconAlert /> <strong>{photos.filter((p) => p.status === "issue").length}</strong>
                <span>замечаний</span>
              </div>
            </div>
          </div>

          {/* Filters + Add button */}
          <div className="flex justify-between items-center mb-5">
            <div className="flex gap-1 bg-zhan-border-light rounded-lg p-[3px]">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setPhotoFilter(tab.id)}
                  className={`px-3.5 py-1.5 text-[13px] font-medium rounded-md transition-all
                    ${photoFilter === tab.id
                      ? "bg-zhan-surface text-zhan-text shadow-sm"
                      : "text-zhan-text-muted hover:text-zhan-text-secondary"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowUpload(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium bg-zhan-accent text-white hover:bg-zhan-accent-hover transition-colors"
            >
              <IconCamera className="w-4 h-4" /> Добавить фото
            </button>
          </div>

          {/* Photo grid */}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-3.5">
            {filteredPhotos.map((photo) => {
              const status = STATUS_CONFIG[photo.status];
              return (
                <div key={photo.id} className="bg-zhan-surface border border-zhan-border rounded-xl overflow-hidden hover:shadow-md transition-all">
                  <div className="w-full h-[180px] bg-gradient-to-br from-zhan-border-light to-[#D5D3CE] flex items-center justify-center text-zhan-text-muted relative">
                    <IconImage />
                    <span className="absolute top-2.5 left-2.5 text-[11px] font-medium px-2 py-0.5 rounded-md bg-white/90 text-zhan-text-secondary backdrop-blur-sm">
                      {photo.zone}
                    </span>
                  </div>
                  <div className="px-4 py-3.5">
                    <p className="text-[13px] text-zhan-text leading-relaxed mb-2.5">{photo.comment}</p>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full ${status.bg} ${status.color}`}>
                      {photo.status === "approved" && <IconCheck className="w-3 h-3" />}
                      {photo.status === "issue" && <IconAlert className="w-3 h-3" />}
                      {status.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Upload Modal */}
        <Modal open={showUpload} onClose={() => setShowUpload(false)} title="Добавить фото">
          <div className="border-2 border-dashed border-zhan-border rounded-xl py-8 text-center cursor-pointer hover:border-zhan-accent hover:bg-zhan-accent-light transition-all bg-zhan-surface-hover mb-4">
            <IconCamera className="w-6 h-6 mx-auto text-zhan-text-muted mb-2" />
            <div className="text-[13px] text-zhan-text-secondary">Перетащите фото или нажмите для выбора</div>
            <div className="text-[11px] text-zhan-text-muted mt-1">JPG, PNG до 20 МБ</div>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-zhan-text-secondary mb-1.5">Зона</label>
            <select className="w-full px-3 py-2.5 border border-zhan-border rounded-lg text-sm outline-none focus:border-zhan-accent bg-white">
              <option>Спальня</option>
              <option>Гостиная</option>
              <option>Кухня</option>
              <option>Ванная</option>
              <option>Детская</option>
              <option>Прихожая</option>
            </select>
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-zhan-text-secondary mb-1.5">Комментарий</label>
            <textarea
              placeholder="Опишите что на фото и какое решение принято..."
              className="w-full px-3 py-2.5 border border-zhan-border rounded-lg text-sm outline-none focus:border-zhan-accent resize-y min-h-[80px]"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-zhan-text-secondary mb-1.5">Статус</label>
            <select className="w-full px-3 py-2.5 border border-zhan-border rounded-lg text-sm outline-none focus:border-zhan-accent bg-white">
              <option>Принято</option>
              <option>Замечание</option>
              <option>В работе</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end mt-6">
            <button onClick={() => setShowUpload(false)} className="px-4 py-2 rounded-lg text-[13px] font-medium border border-zhan-border hover:bg-zhan-surface-hover transition-colors">
              Отмена
            </button>
            <button className="px-4 py-2 rounded-lg text-[13px] font-medium bg-zhan-accent text-white hover:bg-zhan-accent-hover transition-colors">
              Сохранить
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
