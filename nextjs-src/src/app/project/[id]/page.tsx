"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Sidebar from "../../components/Sidebar";
import Modal from "../../components/Modal";
import {
  IconChevronLeft, IconMap, IconUsers, IconSend,
  IconDownload, IconPlus, IconCamera, IconAlert, IconCheck,
} from "../../components/icons";
import { PROJECTS, VISITS } from "../../lib/data";

export default function ProjectPage() {
  const params = useParams();
  const projectId = Number(params.id);
  const project = PROJECTS.find((p) => p.id === projectId) || PROJECTS[0];
  const projectVisits = VISITS.filter((v) => v.projectId === project.id);
  const [showInvite, setShowInvite] = useState(false);

  return (
    <div className="flex min-h-screen bg-zhan-bg">
      <Sidebar />
      <div className="flex-1 overflow-y-auto main-scroll">
        {/* Topbar */}
        <div className="px-8 py-5 border-b border-zhan-border bg-zhan-surface sticky top-0 z-10">
          <Link href="/projects" className="inline-flex items-center gap-1 text-[13px] text-zhan-text-muted hover:text-zhan-text transition-colors mb-1">
            <IconChevronLeft /> Назад
          </Link>
          <div className="flex items-center gap-1.5 text-[13px] text-zhan-text-secondary">
            <Link href="/projects" className="text-zhan-text-muted hover:text-zhan-accent">Проекты</Link>
            <span className="text-zhan-text-muted">/</span>
            <span>{project.title}</span>
          </div>
        </div>

        <div className="p-8 animate-fade-in">
          {/* Project header card */}
          <div className="bg-zhan-surface border border-zhan-border rounded-xl p-6 mb-5">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-xl font-semibold mb-1.5">{project.title}</h2>
                <div className="flex items-center gap-1.5 text-[13px] text-zhan-text-muted">
                  <IconMap /> {project.address}
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-zhan-text-secondary mt-1.5">
                  <IconUsers /> Заказчик: {project.client}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowInvite(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium bg-zhan-surface border border-zhan-border hover:bg-zhan-surface-hover transition-colors"
                >
                  <IconSend className="w-4 h-4" /> Пригласить
                </button>
                <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium bg-zhan-surface border border-zhan-border hover:bg-zhan-surface-hover transition-colors">
                  <IconDownload className="w-4 h-4" /> PDF отчёт
                </button>
              </div>
            </div>

            <div className="flex gap-6 mt-5 pt-4 border-t border-zhan-border-light items-center">
              <div>
                <div className="text-lg font-semibold font-mono">{project.visits}</div>
                <div className="text-[11px] text-zhan-text-muted">визитов</div>
              </div>
              <div>
                <div className="text-lg font-semibold font-mono">{project.photos}</div>
                <div className="text-[11px] text-zhan-text-muted">фото</div>
              </div>
              <div>
                <div className="text-lg font-semibold font-mono text-zhan-danger">2</div>
                <div className="text-[11px] text-zhan-text-muted">замечаний</div>
              </div>
              <div className="flex-1" />
              <div className="flex items-center gap-2">
                <span className="text-[13px] text-zhan-text-muted">Прогресс</span>
                <div className="progress-bar max-w-[120px] flex-1">
                  <div className="progress-fill" style={{ width: `${project.progress}%` }} />
                </div>
                <span className="text-[13px] font-semibold font-mono">{project.progress}%</span>
              </div>
            </div>
          </div>

          {/* Visits header */}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-base font-semibold">Визиты</h2>
            <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium bg-zhan-accent text-white hover:bg-zhan-accent-hover transition-colors">
              <IconPlus className="w-4 h-4" /> Новый визит
            </button>
          </div>

          {/* Timeline */}
          <div className="relative">
            <div className="timeline-line" />
            {projectVisits.map((visit) => (
              <Link
                key={visit.id}
                href={`/visit/${project.id}/${visit.id}`}
                className="relative ml-12 mb-4 block bg-zhan-surface border border-zhan-border rounded-xl px-5 py-[18px] hover:border-[#D5D3CE] hover:shadow-sm transition-all"
              >
                <div className="visit-dot" />
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[13px] font-semibold font-mono">{visit.date}</span>
                  <div className="flex gap-3">
                    <span className="flex items-center gap-1 text-xs text-zhan-text-secondary">
                      <IconCamera className="w-4 h-4" /> {visit.photos} фото
                    </span>
                    {visit.issues > 0 && (
                      <span className={`flex items-center gap-1 text-xs ${visit.issues > visit.resolved ? "text-zhan-danger" : "text-zhan-success"}`}>
                        <IconAlert className="w-3.5 h-3.5" /> {visit.resolved}/{visit.issues} исправлено
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-sm text-zhan-text-secondary">{visit.note}</div>
                <div className="flex gap-1.5 mt-2.5">
                  {visit.issues > 0 && visit.issues > visit.resolved && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-zhan-danger-bg text-zhan-danger">
                      {visit.issues - visit.resolved} открытых замечаний
                    </span>
                  )}
                  {visit.issues > 0 && visit.resolved === visit.issues && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-zhan-success-bg text-zhan-success">
                      <IconCheck className="w-3 h-3" /> Все исправлено
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Invite Modal */}
        <Modal open={showInvite} onClose={() => setShowInvite(false)} title="Пригласить участника">
          <div className="mb-4">
            <label className="block text-xs font-medium text-zhan-text-secondary mb-1.5">Email</label>
            <input
              type="email"
              placeholder="client@email.com"
              className="w-full px-3 py-2.5 border border-zhan-border rounded-lg text-sm font-sans outline-none focus:border-zhan-accent transition-colors"
            />
          </div>
          <div className="mb-4">
            <label className="block text-xs font-medium text-zhan-text-secondary mb-1.5">Роль</label>
            <select className="w-full px-3 py-2.5 border border-zhan-border rounded-lg text-sm font-sans outline-none focus:border-zhan-accent bg-white">
              <option>Заказчик (только просмотр)</option>
              <option>Подрядчик</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end mt-6">
            <button onClick={() => setShowInvite(false)} className="px-4 py-2 rounded-lg text-[13px] font-medium border border-zhan-border hover:bg-zhan-surface-hover transition-colors">
              Отмена
            </button>
            <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-[13px] font-medium bg-zhan-accent text-white hover:bg-zhan-accent-hover transition-colors">
              <IconSend className="w-4 h-4" /> Отправить
            </button>
          </div>
        </Modal>
      </div>
    </div>
  );
}
