'use client';
import { Icons } from '../Icons';
import Bdg from '../Bdg';
import type { ProjectWithStats, VisitWithStats, Invoice } from '../../lib/types';
import { formatDate } from '../../lib/queries';

interface OverviewTabProps {
  project: ProjectWithStats;
  visits: VisitWithStats[];
  invoices: Invoice[];
  onTabChange: (tab: string) => void;
}

export default function OverviewTab({ project, visits, invoices, onTabChange }: OverviewTabProps) {
  const completed = visits.filter(v => v.status !== 'planned');
  const pendingInv = invoices.filter(i => i.status === 'pending');

  const kpis = [
    { label: 'Визитов', value: `${completed.length}`, sub: `из ${project.visit_count} всего` },
    { label: 'Фото', value: `${project.photo_count}`, sub: 'загружено' },
    { label: 'Замечаний', value: `${project.open_issues}`, sub: project.open_issues > 0 ? 'требуют внимания' : 'всё ОК', danger: project.open_issues > 0 },
    { label: 'Счетов', value: `${pendingInv.length}`, sub: pendingInv.length > 0 ? 'ожидают оплаты' : 'всё оплачено', danger: pendingInv.length > 0 },
  ];

  return (
    <div className="animate-fade-in">
      {/* KPI */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {kpis.map((k, i) => (
          <div key={i} className="card p-5">
            <div className="text-[12px] text-[#6B7280] mb-1">{k.label}</div>
            <div className={`text-[24px] font-bold font-mono-custom ${k.danger ? 'text-[#DC4A2A]' : ''}`}>{k.value}</div>
            <div className={`text-[11px] mt-0.5 ${k.danger ? 'text-[#DC4A2A]' : 'text-[#9CA3AF]'}`}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Info */}
        <div className="card p-5">
          <h3 className="text-[14px] font-semibold mb-4">Информация</h3>
          <div className="space-y-3 text-[13px]">
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Адрес</span>
              <span className="text-right">{project.address || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Заказчик</span>
              <span>{project.owner?.full_name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Старт</span>
              <span>{project.start_date ? formatDate(project.start_date) : '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Прогресс</span>
              <span className="font-mono-custom">{project.progress}%</span>
            </div>
          </div>
        </div>

        {/* Recent visits */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold">Последние визиты</h3>
            <button className="text-[12px] text-[#6B7280] hover:text-[#111827] cursor-pointer" onClick={() => onTabChange('journal')}>
              Все →
            </button>
          </div>
          <div className="space-y-3">
            {completed.slice(0, 4).map(v => (
              <div key={v.id} className="flex items-center justify-between text-[13px]">
                <div className="flex items-center gap-2 min-w-0">
                  <Icons.Camera className="w-3.5 h-3.5 text-[#9CA3AF] flex-shrink-0" />
                  <span className="truncate">{v.title}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                  <span className="text-[12px] text-[#9CA3AF]">{formatDate(v.date)}</span>
                  <Bdg s={v.status} />
                </div>
              </div>
            ))}
            {completed.length === 0 && (
              <div className="text-[13px] text-[#9CA3AF]">Визитов пока нет</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
