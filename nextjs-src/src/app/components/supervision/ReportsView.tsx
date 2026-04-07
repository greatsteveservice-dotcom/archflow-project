'use client';
import { Icons } from '../Icons';
import Bdg from '../Bdg';
import type { VisitWithStats } from '../../lib/types';
import { formatDate } from '../../lib/queries';

interface ReportsViewProps {
  visits: VisitWithStats[];
  onSelectVisit: (visitId: string) => void;
}

export default function ReportsView({ visits, onSelectVisit }: ReportsViewProps) {
  const completed = visits
    .filter(v => v.status !== 'planned')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <Icons.File className="w-4 h-4 text-ink-muted" />
        <h3 className="text-[14px] font-semibold">Отчёты по визитам</h3>
        <span className="text-[11px] text-ink-faint">({completed.length})</span>
      </div>

      {completed.length > 0 ? (
        <div className="space-y-2">
          {completed.map(v => (
            <div
              key={v.id}
              className="card p-4 cursor-pointer hover:bg-srf-raised group"
              onClick={() => onSelectVisit(v.id)}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-medium truncate">{v.title}</div>
                  <div className="text-[12px] text-ink-faint mt-0.5 flex items-center gap-2">
                    <span>{formatDate(v.date)}</span>
                    <span>·</span>
                    <span>{v.author?.full_name || 'Автор'}</span>
                    {v.photo_count > 0 && (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <Icons.Camera className="w-3 h-3" /> {v.photo_count}
                        </span>
                      </>
                    )}
                    {v.issue_count > 0 && (
                      <>
                        <span>·</span>
                        <span style={{ color: 'var(--af-black)', fontWeight: 500 }}>{v.issue_count} замеч.</span>
                      </>
                    )}
                  </div>
                  {v.note && <div className="text-[12px] text-ink-muted mt-1 truncate">{v.note}</div>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                  <Bdg s={v.status} />
                  <Icons.ChevronRight className="w-4 h-4 text-ink-ghost" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Icons.File className="w-8 h-8 text-ink-ghost mb-2" />
          <div className="text-[13px] text-ink-faint">Завершённых визитов пока нет</div>
        </div>
      )}
    </div>
  );
}
