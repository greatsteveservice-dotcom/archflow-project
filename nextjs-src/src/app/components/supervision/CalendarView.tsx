'use client';
import { useState, useMemo } from 'react';
import { Icons } from '../Icons';
import Bdg from '../Bdg';
import Modal from '../Modal';
import type { VisitWithStats } from '../../lib/types';
import { formatDate, createVisit } from '../../lib/queries';

interface CalendarViewProps {
  projectId: string;
  visits: VisitWithStats[];
  toast: (msg: string) => void;
  refetchVisits: () => void;
  canCreateVisit?: boolean;
}

const DAYS_RU = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const MONTHS_RU = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1; // Monday = 0
}

export default function CalendarView({ projectId, visits, toast, refetchVisits, canCreateVisit = true }: CalendarViewProps) {
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Create visit modal
  const [showModal, setShowModal] = useState(false);
  const [vTitle, setVTitle] = useState('');
  const [vDate, setVDate] = useState('');
  const [vNote, setVNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Map visits by date
  const visitsByDate = useMemo(() => {
    const map = new Map<string, VisitWithStats[]>();
    visits.forEach(v => {
      const d = v.date.split('T')[0];
      const arr = map.get(d) || [];
      arr.push(v);
      map.set(d, arr);
    });
    return map;
  }, [visits]);

  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDay = getFirstDayOfMonth(currentYear, currentMonth);

  const prevMonth = () => {
    if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y - 1); }
    else setCurrentMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y + 1); }
    else setCurrentMonth(m => m + 1);
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    setSelectedDate(selectedDate === dateStr ? null : dateStr);
  };

  const handlePlanVisit = (date?: string) => {
    setVDate(date || `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`);
    setVTitle('');
    setVNote('');
    setShowModal(true);
  };

  const handleCreate = async () => {
    if (!vTitle.trim() || !vDate) return;
    setSaving(true);
    try {
      await createVisit({ project_id: projectId, title: vTitle, date: vDate, note: vNote || undefined, status: 'planned' });
      toast('Визит запланирован');
      refetchVisits();
      setShowModal(false);
    } catch (e: any) {
      toast(e.message || 'Ошибка');
    }
    setSaving(false);
  };

  const selectedVisits = selectedDate ? visitsByDate.get(selectedDate) || [] : [];

  const getStatusColor = (v: VisitWithStats) => {
    if (v.status === 'planned') return 'bg-[#AAA]';
    if (v.status === 'issues_found') return 'bg-[#111]';
    return 'bg-[#E0E0E0]';
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button className="p-1.5 hover:bg-srf-secondary" onClick={prevMonth}>
            <Icons.ChevronLeft className="w-4 h-4" />
          </button>
          <h3 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 15,
            fontWeight: 700,
            minWidth: 140,
            textAlign: 'center',
            color: '#111',
          }}>
            {MONTHS_RU[currentMonth]} {currentYear}
          </h3>
          <button className="p-1.5 hover:bg-srf-secondary" onClick={nextMonth}>
            <Icons.ChevronRight className="w-4 h-4" />
          </button>
        </div>
        {canCreateVisit && (
          <button className="btn btn-primary text-[12px] py-1.5 px-3 whitespace-nowrap" onClick={() => handlePlanVisit()}>
            + Запланировать
          </button>
        )}
      </div>

      {/* Calendar grid */}
      <div className="card p-4">
        <div className="grid grid-cols-7 gap-0.5 mb-2">
          {DAYS_RU.map(d => (
            <div key={d} className="text-[11px] font-medium text-ink-faint text-center py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayVisits = visitsByDate.get(dateStr) || [];
            const isToday = today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day;
            const isSelected = selectedDate === dateStr;

            return (
              <div
                key={day}
                className={`aspect-square flex flex-col items-center justify-center rounded-lg cursor-pointer transition-all text-[13px]
                  ${isSelected ? 'text-white' : isToday ? 'bg-srf-secondary font-semibold' : 'hover:bg-srf-raised'}
                `}
                style={isSelected ? { background: '#3D3D3D' } : undefined}
                onClick={() => handleDayClick(day)}
              >
                <span>{day}</span>
                {dayVisits.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayVisits.slice(0, 3).map((v, idx) => (
                      <div key={idx} className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/70' : getStatusColor(v)}`} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected date visits */}
      {selectedDate && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[13px] font-semibold">
              {formatDate(selectedDate)}
            </h4>
            {canCreateVisit && (
              <button className="text-[12px] text-ink-muted hover:text-ink" onClick={() => handlePlanVisit(selectedDate)}>
                + Добавить визит
              </button>
            )}
          </div>
          {selectedVisits.length === 0 ? (
            <div className="text-[13px] text-ink-faint">Нет визитов на эту дату</div>
          ) : (
            <div className="space-y-2">
              {selectedVisits.map(v => (
                <div key={v.id} className="card p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[13px] font-medium">{v.title}</div>
                    <div className="text-[11px] text-ink-faint mt-0.5">
                      {v.photo_count > 0 && `${v.photo_count} фото · `}
                      {v.author?.full_name || ''}
                    </div>
                  </div>
                  <Bdg s={v.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Visit Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Запланировать визит">
        <div className="space-y-4">
          <div className="modal-field">
            <label>Название *</label>
            <input value={vTitle} onChange={e => setVTitle(e.target.value)} placeholder="Проверка штукатурки" />
          </div>
          <div className="modal-field">
            <label>Дата *</label>
            <input type="date" value={vDate} onChange={e => setVDate(e.target.value)} />
          </div>
          <div className="modal-field">
            <label>Заметка</label>
            <textarea value={vNote} onChange={e => setVNote(e.target.value)} placeholder="Необязательно" rows={2} />
          </div>
          <div className="flex gap-2 justify-end">
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
