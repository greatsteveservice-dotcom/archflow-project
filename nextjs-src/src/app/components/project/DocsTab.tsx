'use client';
import { Icons } from '../Icons';
import Bdg from '../Bdg';
import type { Document } from '../../lib/types';
import { useProjectDocuments } from '../../lib/hooks';
import { formatDate } from '../../lib/queries';

const FORMAT_COLORS: Record<string, { bg: string; text: string }> = {
  PDF: { bg: '#FEE2E2', text: '#DC2626' },
  DWG: { bg: '#DBEAFE', text: '#2563EB' },
  XLSX: { bg: '#D1FAE5', text: '#059669' },
  PNG: { bg: '#FEF3C7', text: '#D97706' },
};

interface DocsTabProps {
  projectId: string;
  toast: (msg: string) => void;
}

export default function DocsTab({ projectId, toast }: DocsTabProps) {
  const { data: docs, loading } = useProjectDocuments(projectId);

  if (loading) return <div className="text-[13px] text-[#9CA3AF]">Загрузка...</div>;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-[14px] font-semibold">Документы</h3>
        <button className="btn btn-primary text-[12px] py-1.5 px-3" onClick={() => toast('Загрузка документов скоро будет доступна')}>
          <Icons.Plus className="w-3.5 h-3.5" /> Загрузить
        </button>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
        {(docs || []).map((doc: Document) => {
          const fmt = FORMAT_COLORS[doc.format?.toUpperCase() || ''] || { bg: '#F3F4F6', text: '#6B7280' };
          return (
            <div key={doc.id} className="card p-4 cursor-pointer" onClick={() => toast(`Открытие: ${doc.title}`)}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-[11px] font-bold" style={{ background: fmt.bg, color: fmt.text }}>
                  {doc.format?.toUpperCase() || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{doc.title}</div>
                  <div className="text-[11px] text-[#9CA3AF] mt-0.5">
                    {doc.version || ''} · {doc.uploaded_by || ''} · {formatDate(doc.created_at)}
                  </div>
                </div>
              </div>
              <Bdg s={doc.status} />
            </div>
          );
        })}
        {(!docs || docs.length === 0) && (
          <div className="text-[13px] text-[#9CA3AF] col-span-full">Документов пока нет</div>
        )}
      </div>
    </div>
  );
}
