"use client";

import { useState } from "react";
import { Icons } from "./Icons";
import { PROJECTS, VISITS } from "./data";

interface ProjectPageProps {
  projectId: number;
  onNavigate: (page: string, ctx?: any) => void;
}

export default function ProjectPage({ projectId, onNavigate }: ProjectPageProps) {
  const project = PROJECTS.find((p) => p.id === projectId) || PROJECTS[0];
  const projectVisits = VISITS.filter((v) => v.projectId === project.id);
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="animate-fade-in">
      {/* Header card */}
      <div className="bg-white border border-[#E8E6E1] rounded-xl p-6 mb-5">
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-xl font-semibold mb-1.5">{project.title}</h2>
            <div className="flex items-center gap-1.5 text-[13px] text-[#9B9B9B]">
              <Icons.Map /> {project.address}
            </div>
            <div className="flex items-center gap-1.5 text-[13px] text-[#6B6B6B] mt-1.5">
              <Icons.Users /> Заказчик: {project.client}
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setShowInvite(true)}>
              <Icons.Send /> Пригласить
            </button>
            <button className="btn btn-secondary">
              <Icons.Download /> PDF отчёт
            </button>
          </div>
        </div>

        <div className="flex gap-6 mt-5 pt-4 border-t border-[#F0EEE9] items-center">
          <div>
            <div className="text-lg font-semibold font-mono-custom">{project.visits}</div>
            <div className="text-[11px] text-[#9B9B9B]">визитов</div>
          </div>
          <div>
            <div className="text-lg font-semibold font-mono-custom">{project.photos}</div>
            <div className="text-[11px] text-[#9B9B9B]">фото</div>
          </div>
          <div>
            <div className="text-lg font-semibold font-mono-custom text-[#E85D3A]">2</div>
            <div className="text-[11px] text-[#9B9B9B]">замечаний</div>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <span className="text-[13px] text-[#9B9B9B]">Прогресс</span>
            <div className="h-1 bg-[#F0EEE9] rounded-sm overflow-hidden flex-1 max-w-[120px]">
              <div
                className="h-full bg-[#2C5F2D] rounded-sm transition-all duration-700"
                style={{ width: `${project.progress}%` }}
              />
            </div>
            <span className="text-[13px] font-semibold font-mono-custom">{project.progress}%</span>
          </div>
        </div>
      </div>

      {/* Visits header */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base font-semibold">Визиты</h2>
        <button className="btn btn-primary">
          <Icons.Plus /> Новый визит
        </button>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-[#F0EEE9]" />

        {projectVisits.map((visit) => (
          <div
            key={visit.id}
            className="relative ml-12 mb-4 bg-white border border-[#E8E6E1] rounded-xl px-5 py-[18px] cursor-pointer transition-all duration-200 hover:border-[#D5D3CE] hover:shadow-sm"
            onClick={() => onNavigate("visit", { projectId: project.id, visitId: visit.id })}
          >
            {/* Dot */}
            <div className="absolute -left-9 top-5 w-2.5 h-2.5 rounded-full bg-[#2C5F2D] border-2 border-[#F7F6F3] shadow-[0_0_0_2px_#E8F0E8]" />

            <div className="flex justify-between items-center mb-2">
              <span className="text-[13px] font-semibold font-mono-custom">{visit.date}</span>
              <div className="flex gap-3">
                <span className="flex items-center gap-1 text-xs text-[#6B6B6B]">
                  <Icons.Camera className="w-4 h-4" /> {visit.photos} фото
                </span>
                {visit.issues > 0 && (
                  <span
                    className="flex items-center gap-1 text-xs"
                    style={{ color: visit.issues > visit.resolved ? "#E85D3A" : "#2A9D5C" }}
                  >
                    <Icons.Alert /> {visit.resolved}/{visit.issues} исправлено
                  </span>
                )}
              </div>
            </div>
            <div className="text-sm text-[#6B6B6B] leading-relaxed">{visit.note}</div>

            <div className="flex gap-1.5 mt-2.5">
              {visit.issues > 0 && visit.issues > visit.resolved && (
                <span className="badge bg-[#FEF0EC] text-[#E85D3A]">
                  {visit.issues - visit.resolved} открытых замечаний
                </span>
              )}
              {visit.issues > 0 && visit.resolved === visit.issues && (
                <span className="badge bg-[#EAFAF1] text-[#2A9D5C]">
                  <Icons.Check /> Все исправлено
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div className="modal-overlay" onClick={() => setShowInvite(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-semibold mb-5">Пригласить участника</h2>
            <div className="modal-field mb-4">
              <label>Email</label>
              <input type="email" placeholder="client@email.com" />
            </div>
            <div className="modal-field mb-4">
              <label>Роль</label>
              <select>
                <option>Заказчик (только просмотр)</option>
                <option>Подрядчик</option>
              </select>
            </div>
            <div className="flex gap-2 justify-end mt-6">
              <button className="btn btn-secondary" onClick={() => setShowInvite(false)}>
                Отмена
              </button>
              <button className="btn btn-primary">
                <Icons.Send /> Отправить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
