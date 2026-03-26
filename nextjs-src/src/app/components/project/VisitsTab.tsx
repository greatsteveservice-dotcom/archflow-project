'use client';
import { useState } from 'react';
import { Icons } from '../Icons';
import Bdg from '../Bdg';
import Modal from '../Modal';
import ConfirmDialog from '../ConfirmDialog';
import type { ProjectWithStats, VisitWithStats } from '../../lib/types';
import { formatDate, createVisit, updateVisit, deleteVisit } from '../../lib/queries';

interface VisitsTabProps {
  project: ProjectWithStats;
  projectId: string;
  visits: VisitWithStats[];
  toast: (msg: string) => void;
  refetchVisits: () => void;
  canCreateVisit?: boolean;
}

export default function VisitsTab({ project, projectId, visits, toast, refetchVisits, canCreateVisit = true }: VisitsTabProps) {
  // Create modal
  const [showModal, setShowModal] = useState(false);
  const [vTitle, setVTitle] = useState('');
  const [vDate, setVDate] = useState('');
  const [vNote, setVNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Edit modal
  const [editVisit, setEditVisit] = useState<VisitWithStats | null>(null);
  const [eTitle, setETitle] = useState('');
  const [eDate, setEDate] = useState('');
  const [eNote, setENote] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  // Delete confirm
  const [visitToDelete, setVisitToDelete] = useState<VisitWithStats | null>(null);
  const [deleting, setDeleting] = useState(false);

  const planned = visits.filter(v => v.status === 'planned');
  const completed = visits.filter(v => v.status !== 'planned');
  const contractVisits = project.visit_count || completed.length;
  const remaining = Math.max(0, contractVisits - completed.length);

  const handleCreate = async () => {
    const errs: Record<string, string> = {};
    if (!vTitle.trim()) errs.title = 'Введите название визита';
    if (!vDate) errs.date = 'Выберите дату';
    if (Object.keys(errs).length > 0) { setErrors(errs); return; }
    setErrors({});
    setSaving(true);
    try {
      await createVisit({ project_id: projectId, title: vTitle, date: vDate, note: vNote || undefined, status: 'planned' });
      toast('Визит запланирован');
      refetchVisits();
      setShowModal(false);
      setVTitle('');
      setVDate('');
      setVNote('');
    } catch (e: any) {
      toast(e.message || 'Ошибка создания визита');
    }
    setSaving(false);
  };

  const openEditModal = (v: VisitWithStats) => {
    setEditVisit(v);
    setETitle(v.title);
    setEDate(v.date);
    setENote(v.note || '');
    setEditErrors({});
  };

  const handleSaveEdit = async () => {
    if (!editVisit) return;
    const errs: Record<string, string> = {};
    if (!eTitle.trim()) errs.title = 'Введите название визита';
    if (!eDate) errs.date = 'Выберите дату';
    if (Object.keys(errs).length > 0) { setEditErrors(errs); return; }
    setEditErrors({});
    setSavingEdit(true);
    try {
      await updateVisit(editVisit.id, { title: eTitle.trim(), date: eDate, note: eNote || undefined });
      toast('Визит обновлён');
      refetchVisits();
      setEditVisit(null);
    } catch (e: any) {
      toast(e.message || 'Ошибка обновления визита');
    }
    setSavingEdit(false);
  };

  const handleDelete = async () => {
    if (!visitToDelete) return;
    setDeleting(true);
    try {
      await deleteVisit(visitToDelete.id);
      toast('Визит удалён');
      refetchVisits();
      setVisitToDelete(null);
    } catch (e: any) {
      toast(e.message || 'Ошибка удаления визита');
    }
    setDeleting(false);
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
            <div className={`text-[22px] font-bold font-mono-custom ${k.danger ? 'text-err' : ''}`}>{k.value}</div>
            <div className="text-[11px] text-ink-faint mt-0.5">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex-1 h-2 bg-line rounded-full overflow-hidden">
          <div className="h-full bg-ink rounded-full transition-all" style={{ width: `${pct}%` }} />
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
          <h3 className="text-[13px] font-semibold text-ink-muted mb-3 flex items-center gap-1.5">
            <Icons.Calendar className="w-3.5 h-3.5" /> Запланированные
          </h3>
          <div className="space-y-2">
            {planned.map(v => (
              <div key={v.id} className="card p-4 group border-l-4 border-info">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium">{v.title}</div>
                    <div className="text-[12px] text-ink-faint mt-0.5">{formatDate(v.date)}</div>
                    {v.note && <div className="text-[12px] text-ink-muted mt-1">{v.note}</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Bdg s="planned" />
                    {canCreateVisit && (
                      <>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-srf-secondary text-ink-faint hover:text-ink"
                          onClick={() => openEditModal(v)}
                          title="Редактировать"
                        >
                          <Icons.Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-err-bg text-ink-faint hover:text-err"
                          onClick={() => setVisitToDelete(v)}
                          title="Удалить"
                        >
                          <Icons.Trash className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed */}
      <h3 className="text-[13px] font-semibold text-ink-muted mb-3 flex items-center gap-1.5">
        <Icons.Camera className="w-3.5 h-3.5" /> Выполненные
      </h3>
      <div className="space-y-2">
        {completed.map(v => (
          <div key={v.id} className="card p-4 group">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[13px] font-medium">{v.title}</div>
                <div className="text-[12px] text-ink-faint mt-0.5">
                  {formatDate(v.date)} · {v.author?.full_name || ''}
                  {v.photo_count > 0 && <span> · {v.photo_count} фото</span>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Bdg s={v.status} />
                {canCreateVisit && (
                  <>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-srf-secondary text-ink-faint hover:text-ink"
                      onClick={() => openEditModal(v)}
                      title="Редактировать"
                    >
                      <Icons.Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-err-bg text-ink-faint hover:text-err"
                      onClick={() => setVisitToDelete(v)}
                      title="Удалить"
                    >
                      <Icons.Trash className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        ))}
        {completed.length === 0 && <div className="text-[13px] text-ink-faint">Визитов пока нет</div>}
      </div>

      {/* Create Visit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Запланировать визит">
        <div className="space-y-4">
          <div className="modal-field">
            <label>Название *</label>
            <input value={vTitle} onChange={e => { setVTitle(e.target.value); setErrors(p => ({ ...p, title: '' })); }} placeholder="Проверка штукатурки" className={errors.title ? 'border-err' : ''} />
            {errors.title && <span className="text-[11px] text-err mt-0.5">{errors.title}</span>}
          </div>
          <div className="modal-field">
            <label>Дата *</label>
            <input type="date" value={vDate} onChange={e => { setVDate(e.target.value); setErrors(p => ({ ...p, date: '' })); }} className={errors.date ? 'border-err' : ''} />
            {errors.date && <span className="text-[11px] text-err mt-0.5">{errors.date}</span>}
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

      {/* Edit Visit Modal */}
      <Modal open={!!editVisit} onClose={() => setEditVisit(null)} title="Редактировать визит">
        <div className="space-y-4">
          <div className="modal-field">
            <label>Название *</label>
            <input value={eTitle} onChange={e => { setETitle(e.target.value); setEditErrors(p => ({ ...p, title: '' })); }} className={editErrors.title ? 'border-err' : ''} />
            {editErrors.title && <span className="text-[11px] text-err mt-0.5">{editErrors.title}</span>}
          </div>
          <div className="modal-field">
            <label>Дата *</label>
            <input type="date" value={eDate} onChange={e => { setEDate(e.target.value); setEditErrors(p => ({ ...p, date: '' })); }} className={editErrors.date ? 'border-err' : ''} />
            {editErrors.date && <span className="text-[11px] text-err mt-0.5">{editErrors.date}</span>}
          </div>
          <div className="modal-field">
            <label>Заметка</label>
            <textarea value={eNote} onChange={e => setENote(e.target.value)} placeholder="Необязательно" rows={2} />
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button className="btn btn-secondary" onClick={() => setEditVisit(null)}>Отмена</button>
            <button className="btn btn-primary" onClick={handleSaveEdit} disabled={savingEdit || !eTitle.trim() || !eDate}>
              {savingEdit ? 'Сохранение...' : 'Сохранить'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirm delete visit */}
      <ConfirmDialog
        open={!!visitToDelete}
        title="Удалить визит?"
        message={`Визит «${visitToDelete?.title || ''}» и все его фото будут безвозвратно удалены.`}
        confirmLabel="Удалить"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setVisitToDelete(null)}
      />
    </div>
  );
}
