'use client';
import { useState } from 'react';
import { Icons } from '../Icons';
import Bdg from '../Bdg';
import Modal from '../Modal';
import type { ProjectWithStats, VisitWithStats } from '../../lib/types';
import { formatDate, createVisit } from '../../lib/queries';

interface VisitsTabProps {
  project: ProjectWithStats;
  projectId: string;
  visits: VisitWithStats[];
  toast: (msg: string) => void;
  refetchVisits: () => void;
  canCreateVisit?: boolean;
}

export default function VisitsTab({ project, projectId, visits, toast, refetchVisits, canCreateVisit = true }: VisitsTabProps) {
  const [showModal, setShowModal] = useState(false);
  const [vTitle, setVTitle] = useState('');
  const [vDate, setVDate] = useState('');
  const [vNote, setVNote] = useState('');
  const [saving, setSaving] = useState(false);

  const planned = visits.filter(v => v.status === 'planned');
  const completed = visits.filter(v => v.status !== 'planned');
  const contractVisits = project.visit_count || completed.length;
  const remaining = Math.max(0, contractVisits - completed.length);

  const handleCreate = async () => {
    if (!vTitle.trim() || !vDate) return;
    setSaving(true);
    try {
      await createVisit({ project_id: projectId, title: vTitle, date: vDate, note: vNote || undefined, status: 'planned' });
      toast('Визит запланирован');
      refetchVisits();
      setShowModal(false);
      setVTitle('');
      setVDate('');
      setVNote('');
    } catch (e) {
      console.error(e);
    }
    setSaving(false);
  };

  const kpis = [
    { label: 'По договору', value: contractVisits },
    { label: 'Выполнено', value: completed.length },
    { label: 'Осталось', value: remaining, danger: remaining <= 2 },
    { label: 'Запланировано', value: planned.length },
  ];

  const pct = contractVisits > 0 ? Math.round((completed.length / contractVisits) * 100) : 0;

  return (
    <div className="animate-fade-in">
      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
        {kpis.map((k, i) => (
          <div key={i} className="card p-4 text-center">
            <div className={`text-[22px] font-bold font-mono-custom ${k.danger ? 'text-[#DC4A2A]' : ''}`}>{k.value}</div>
            <div className="text-[11px] text-[#9CA3AF] mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-2 bg-[#E5E7EB] rounded-full overflow-hidden">
          <div className="h-full bg-[#111827] rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
        <span className="text-[13px] font-medium font-mono-custom">{pct}%</span>
        {canCreateVisit && (
          <button className="btn btn-primary text-[12px] py-1.5 px-3 ml-2" onClick={() => setShowModal(true)}>
            <Icons.Plus className="w-3.5 h-3.5" /> Запланировать
          </button>
        )}
      </div>

      {/* Planned */}
      {planned.length > 0 && (
        <div className="mb-6">
          <h3 className="text-[13px] font-semibold text-[#6B7280] mb-3 flex items-center gap-1.5">
            <Icons.Calendar className="w-3.5 h-3.5" /> Запланированные
          </h3>
          <div className="space-y-2">
            {planned.map(v => (
              <div key={v.id} className="card p-4" style={{ borderLeft: '4px solid #2563EB' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium">{v.title}</div>
                    <div className="text-[12px] text-[#9CA3AF] mt-0.5">{formatDate(v.date)}</div>
                  </div>
                  <Bdg s="planned" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      <h3 className="text-[13px] font-semibold text-[#6B7280] mb-3 flex items-center gap-1.5">
        <Icons.Camera className="w-3.5 h-3.5" /> Выполненные
      </h3>
      <div className="space-y-2">
        {completed.map(v => (
          <div key={v.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium">{v.title}</div>
                <div className="text-[12px] text-[#9CA3AF] mt-0.5">
                  {formatDate(v.date)} · {v.author?.full_name || ''}
                  {v.photo_count > 0 && <span> · {v.photo_count} фото</span>}
                </div>
              </div>
              <Bdg s={v.status} />
            </div>
          </div>
        ))}
        {completed.length === 0 && <div className="text-[13px] text-[#9CA3AF]">Визитов пока нет</div>}
      </div>

      {/* Create Visit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Запланировать визит">
        <div className="space-y-4">
          <div className="modal-field">
            <label>Название</label>
            <input value={vTitle} onChange={e => setVTitle(e.target.value)} placeholder="Проверка штукатурки" />
          </div>
          <div className="modal-field">
            <label>Дата</label>
            <input type="date" value={vDate} onChange={e => setVDate(e.target.value)} />
          </div>
          <div className="modal-field">
            <label>Заметка</label>
            <textarea value={vNote} onChange={e => setVNote(e.target.value)} placeholder="Необязательно" rows={2} />
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Отмена</button>
            <button className="btn btn-primary" onClick={handleCreate} disabled={saving || !vTitle.trim() || !vDate}>
              {saving ? 'Сохранение...' : 'Запланировать'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
