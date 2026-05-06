'use client';
import { useEffect, useState, useMemo } from 'react';
import { Icons } from '../Icons';
import Bdg from '../Bdg';
import Modal from '../Modal';
import type { VisitWithStats, SupervisionConfig } from '../../lib/types';
import { formatDate, createVisit, loadSupervisionConfig, loadSupervisionConfigCached } from '../../lib/queries';

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

// ── Event chip (plazhka) ─────────────────────────────────────

/** Full-width event chip: black bg + white label */
function EventChip({ label }: { label: string; inverted?: boolean }) {
  return (
    <div style={{
      alignSelf: 'flex-start',
      background: 'transparent',
      color: '#111111',
      border: '1px solid #111111',
      fontFamily: 'var(--af-font-mono)',
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      textAlign: 'center',
      padding: '2px 6px',
      lineHeight: 1,
    }}>
      {label}
    </div>
  );
}

// ── Schedule helpers ─────────────────────────────────────────

/** Convert our weekday (0=Mon...5=Sat) to JS day (0=Sun,1=Mon...6=Sat) */
function toJsDay(wd: number): number {
  return wd === 6 ? 0 : wd + 1; // 0=Mon→1, 1=Tue→2, ..., 5=Sat→6, 6(Sun)→0
}

/** Check if a date matches the visit schedule */
function isScheduledVisitDate(date: Date, cfg: SupervisionConfig): boolean {
  const { type, weekday, customDay } = cfg.visitSchedule;
  const jsDay = date.getDay(); // 0=Sun

  if (type === 'weekly' && weekday !== null) {
    return jsDay === toJsDay(weekday);
  }
  if (type === 'biweekly' && weekday !== null) {
    const targetJsDay = toJsDay(weekday);
    if (jsDay !== targetJsDay) return false;
    const jan1 = new Date(date.getFullYear(), 0, 1);
    const dayOfYear = Math.floor((date.getTime() - jan1.getTime()) / 86400000);
    const weekNum = Math.ceil((dayOfYear + jan1.getDay() + 1) / 7);
    return weekNum % 2 === 0;
  }
  if (type === 'monthly' && weekday !== null) {
    // Once a month on that weekday (first occurrence)
    if (jsDay !== toJsDay(weekday)) return false;
    return date.getDate() <= 7; // first week of month
  }
  if (type === 'custom') {
    return date.getDate() === (customDay ?? 1);
  }
  return false;
}

/** Subtract N working days from a date (skip Sat/Sun) */
function subtractWorkingDays(date: Date, n: number): Date {
  const result = new Date(date);
  let remaining = n;
  while (remaining > 0) {
    result.setDate(result.getDate() - 1);
    const dow = result.getDay();
    if (dow !== 0 && dow !== 6) remaining--;
  }
  return result;
}

/** Get the billing date for a given month */
function getBillingDate(year: number, month: number, billingDay: number): Date {
  const maxDay = getDaysInMonth(year, month);
  return new Date(year, month, Math.min(billingDay, maxDay));
}

/** Get reminder date for a given month */
function getReminderDate(year: number, month: number, cfg: SupervisionConfig): Date {
  const billing = getBillingDate(year, month, cfg.billingDay);
  return subtractWorkingDays(billing, cfg.reminderDays);
}

/** Check if date is a payment reminder date */
function isPaymentReminderDate(date: Date, cfg: SupervisionConfig): boolean {
  const reminder = getReminderDate(date.getFullYear(), date.getMonth(), cfg);
  return date.getFullYear() === reminder.getFullYear()
    && date.getMonth() === reminder.getMonth()
    && date.getDate() === reminder.getDate();
}

/** Count working days between two dates */
function workingDaysBetween(from: Date, to: Date): number {
  let count = 0;
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);
  while (cur < end) {
    cur.setDate(cur.getDate() + 1);
    const dow = cur.getDay();
    if (dow !== 0 && dow !== 6) count++;
  }
  return count;
}

/** Format date as "DD.MM.YYYY" */
function fmtDMY(d: Date) {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

export default function CalendarView({ projectId, visits, toast, refetchVisits, canCreateVisit = true }: CalendarViewProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Create visit modal
  const [showModal, setShowModal] = useState(false);
  const [vTitle, setVTitle] = useState('');
  const [vDate, setVDate] = useState('');
  const [vNote, setVNote] = useState('');
  const [saving, setSaving] = useState(false);

  // Load supervision config from DB (with localStorage fallback so we don't
  // flash an empty calendar while the network round-trip is in flight).
  const [svConfig, setSvConfig] = useState<SupervisionConfig | null>(
    () => loadSupervisionConfigCached(projectId),
  );
  useEffect(() => {
    let cancelled = false;
    loadSupervisionConfig(projectId)
      .then((cfg) => { if (!cancelled) setSvConfig(cfg); })
      .catch((e) => console.error('[calendar] sv config load failed:', e));
    return () => { cancelled = true; };
  }, [projectId]);

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

  // Pre-compute scheduled visit dates and payment reminder dates for current month
  const { scheduledVisitDates, paymentReminderDates } = useMemo(() => {
    const sv = new Set<number>();
    const pr = new Set<number>();
    if (!svConfig) return { scheduledVisitDates: sv, paymentReminderDates: pr };

    const days = getDaysInMonth(currentYear, currentMonth);
    for (let d = 1; d <= days; d++) {
      const date = new Date(currentYear, currentMonth, d);
      if (isScheduledVisitDate(date, svConfig)) sv.add(d);
      if (isPaymentReminderDate(date, svConfig)) pr.add(d);
    }
    return { scheduledVisitDates: sv, paymentReminderDates: pr };
  }, [svConfig, currentYear, currentMonth]);

  // Task reminder: check if today is within the reminder window
  const taskReminder = useMemo(() => {
    if (!svConfig) return null;
    const billing = getBillingDate(today.getFullYear(), today.getMonth(), svConfig.billingDay);
    const reminder = getReminderDate(today.getFullYear(), today.getMonth(), svConfig);
    // Check: is today >= reminder date AND today <= billing date?
    if (today >= reminder && today <= billing) {
      const daysLeft = workingDaysBetween(today, billing);
      return { billingDate: billing, daysLeft };
    }
    return null;
  }, [svConfig]);

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
  const hasConfig = !!svConfig;

  return (
    <div className="animate-fade-in">

      {/* Task Reminder Block (only when reminder condition is active) */}
      {taskReminder && (
        <div style={{
          background: '#F6F6F4',
          borderLeft: '2px solid #111',
          padding: '10px 12px',
          marginBottom: 16,
        }}>
          <div style={{
            fontFamily: 'var(--af-font-mono)',
            fontSize: 'var(--af-fs-7)',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
            color: '#111',
            marginBottom: 4,
          }}>
            Задача
          </div>
          <div style={{
            fontFamily: 'var(--af-font-display)',
            fontSize: 'var(--af-fs-13)',
            fontWeight: 700,
            color: '#111',
            marginBottom: 2,
          }}>
            Выставить счёт
          </div>
          <div style={{
            fontFamily: 'var(--af-font-mono)',
            fontSize: 'var(--af-fs-7)',
            color: '#111',
            letterSpacing: '0.05em',
          }}>
            до {fmtDMY(taskReminder.billingDate)} · осталось {taskReminder.daysLeft} р.д.
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <button className="p-1.5 hover:bg-srf-secondary" onClick={prevMonth}>
            <Icons.ChevronLeft className="w-4 h-4" />
          </button>
          <h3 style={{
            fontFamily: 'var(--af-font-mono)',
            fontSize: 'var(--af-fs-11)',
            fontWeight: 400,
            minWidth: 140,
            textAlign: 'center',
            color: '#111',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
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
      <div style={{ background: '#FFFFFF', padding: 16 }}>
        <div className="grid grid-cols-7 gap-0.5 mb-2">
          {DAYS_RU.map(d => (
            <div key={d} style={{ background: '#FFFFFF', color: '#111', fontFamily: 'var(--af-font-mono)', fontSize: 'var(--af-fs-11)', fontWeight: 500, textAlign: 'center', padding: '4px 0', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-0.5">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-[70px] md:h-[84px]" style={{ background: '#FFFFFF', border: '0.5px dashed #EBEBEB' }} />
          ))}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayVisits = visitsByDate.get(dateStr) || [];
            const isToday = today.getFullYear() === currentYear && today.getMonth() === currentMonth && today.getDate() === day;
            const isSelected = selectedDate === dateStr;
            const hasScheduledVisit = hasConfig && scheduledVisitDates.has(day);
            const hasPaymentReminder = hasConfig && paymentReminderDates.has(day);
            const hasIcons = hasScheduledVisit || hasPaymentReminder;

            const inverted = isToday || isSelected;
            return (
              <div
                key={day}
                className="h-[70px] md:h-[84px] flex flex-col cursor-pointer transition-all"
                style={{
                  fontFamily: 'var(--af-font-mono)',
                  background: '#FFFFFF',
                  color: '#111111',
                  padding: '6px 6px',
                  gap: 6,
                  border: inverted ? '1px solid #111111' : '0.5px dashed #EBEBEB',
                }}
                onClick={() => handleDayClick(day)}
              >
                <span style={{
                  fontSize: 14,
                  fontWeight: isToday || isSelected ? 700 : 500,
                }}>{day}</span>
                {(hasScheduledVisit || hasPaymentReminder || (!hasIcons && dayVisits.length > 0)) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-start' }}>
                    {hasScheduledVisit && <EventChip label="Визит" />}
                    {hasPaymentReminder && <EventChip label="Счёт" />}
                    {!hasIcons && dayVisits.length > 0 && (
                      <EventChip label={`${dayVisits.length} визит${dayVisits.length > 1 ? 'а' : ''}`} />
                    )}
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
            <h4 style={{ fontFamily: 'var(--af-font-mono)', fontSize: 13, fontWeight: 600 }}>
              {formatDate(selectedDate)}
            </h4>
            {canCreateVisit && (
              <button style={{ fontFamily: 'var(--af-font-mono)', fontSize: 12 }} className="text-ink-muted hover:text-ink" onClick={() => handlePlanVisit(selectedDate)}>
                + Добавить визит
              </button>
            )}
          </div>
          {selectedVisits.length === 0 ? (
            <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 13 }} className="text-ink-faint">Нет визитов на эту дату</div>
          ) : (
            <div className="space-y-2">
              {selectedVisits.map(v => (
                <div key={v.id} className="card p-3 flex items-center justify-between">
                  <div>
                    <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 13, fontWeight: 500 }}>{v.title}</div>
                    <div style={{ fontFamily: 'var(--af-font-mono)', fontSize: 11 }} className="text-ink-faint mt-0.5">
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
