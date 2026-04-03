'use client';
import { useState, useEffect } from 'react';
import { Icons } from '../Icons';
import type { VisitReportWithStats, ReportStatus } from '../../lib/types';
import { useVisitReports } from '../../lib/hooks';
import { createVisitReport, ensureTodayDraft, loadSupervisionConfig } from '../../lib/queries';
import { isTodayScheduledVisit } from '../../lib/visit-schedule';

// ─── Status config ───────────────────────────────────────
const STATUS_LABEL: Record<ReportStatus, string> = {
  draft: 'Черновик',
  filled: 'Заполнен',
  published: 'Опубликован',
};

const STATUS_STYLE: Record<ReportStatus, { border: string; color: string }> = {
  draft: { border: '#EBEBEB', color: '#111' },
  filled: { border: '#EBEBEB', color: '#111' },
  published: { border: '#111', color: '#111' },
};

// ─── Date formatting ─────────────────────────────────────
const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'];
const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота'];

function formatReportDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function getWeekdayName(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00');
  return WEEKDAYS[d.getDay()].toUpperCase();
}

function isToday(dateStr: string): boolean {
  return dateStr === new Date().toISOString().slice(0, 10);
}

// ─── Component ───────────────────────────────────────────
interface ReportsListViewProps {
  projectId: string;
  toast: (msg: string) => void;
  onSelectReport: (reportId: string) => void;
}

export default function ReportsListView({ projectId, toast, onSelectReport }: ReportsListViewProps) {
  const { data: reports, loading, refetch } = useVisitReports(projectId);
  const [creating, setCreating] = useState(false);

  // Auto-draft on mount
  useEffect(() => {
    const cfg = loadSupervisionConfig(projectId);
    const scheduled = isTodayScheduledVisit(cfg);
    if (scheduled) {
      ensureTodayDraft(projectId, true).then(created => {
        if (created) refetch();
      });
    }
  }, [projectId, refetch]);

  // Manual create
  const handleCreate = async () => {
    setCreating(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const report = await createVisitReport({
        project_id: projectId,
        visit_date: today,
      });
      toast('Отчёт создан');
      refetch();
      onSelectReport(report.id);
    } catch (err: any) {
      toast(err.message || 'Ошибка создания отчёта');
    } finally {
      setCreating(false);
    }
  };

  // Compute visit numbers
  const sorted = [...(reports || [])].sort(
    (a, b) => new Date(a.visit_date).getTime() - new Date(b.visit_date).getTime()
  );
  const visitNumberMap = new Map<string, number>();
  sorted.forEach((r, i) => visitNumberMap.set(r.id, i + 1));

  // Display order: today drafts first, then by date desc
  const displayReports = [...(reports || [])].sort((a, b) => {
    const aToday = isToday(a.visit_date) && a.status === 'draft' ? 1 : 0;
    const bToday = isToday(b.visit_date) && b.status === 'draft' ? 1 : 0;
    if (aToday !== bToday) return bToday - aToday;
    return new Date(b.visit_date).getTime() - new Date(a.visit_date).getTime();
  });

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: 24, color: '#111', margin: 0 }}>
          Отчёты
        </h2>
        <button
          onClick={handleCreate}
          disabled={creating}
          style={{
            width: 32,
            height: 32,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #EBEBEB',
            background: '#FFF',
            cursor: creating ? 'wait' : 'pointer',
            transition: 'all 0.12s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#111'; e.currentTarget.style.color = '#FFF'; e.currentTarget.style.borderColor = '#111'; }}
          onMouseLeave={e => { e.currentTarget.style.background = '#FFF'; e.currentTarget.style.color = '#111'; e.currentTarget.style.borderColor = '#EBEBEB'; }}
        >
          <Icons.Plus className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-11)', color: '#111' }}>
          Загрузка...
        </div>
      ) : displayReports.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--af-fs-11)', color: '#111' }}>
            Отчётов пока нет
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {displayReports.map(report => {
            const today = isToday(report.visit_date) && report.status === 'draft';
            const visitNum = visitNumberMap.get(report.id) || 0;
            const st = STATUS_STYLE[report.status];

            return (
              <div
                key={report.id}
                onClick={() => onSelectReport(report.id)}
                style={{
                  height: 64,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0 16px',
                  background: '#FFF',
                  borderBottom: '0.5px solid #EBEBEB',
                  borderLeft: today ? '2px solid #111' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'background 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#F6F6F4'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#FFF'; }}
              >
                {/* Left */}
                <div>
                  {today && (
                    <div style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 'var(--af-fs-7)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: '#111',
                      marginBottom: 2,
                    }}>
                      Сегодня
                    </div>
                  )}
                  <div style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: 14,
                    fontWeight: 700,
                    color: '#111',
                  }}>
                    {formatReportDate(report.visit_date)}
                  </div>
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--af-fs-7)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#111',
                    marginTop: 2,
                  }}>
                    {getWeekdayName(report.visit_date)} · Визит {visitNum}
                    {report.remark_count > 0 && ` · ${report.remark_count} замеч.`}
                  </div>
                </div>

                {/* Right */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 'var(--af-fs-9)',
                    padding: '2px 8px',
                    border: `1px solid ${st.border}`,
                    color: st.color,
                  }}>
                    {STATUS_LABEL[report.status]}
                  </span>
                  <span style={{ color: '#EBEBEB', fontSize: 14 }}>→</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
