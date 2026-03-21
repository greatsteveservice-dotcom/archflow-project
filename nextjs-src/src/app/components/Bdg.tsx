'use client';

const STATUS_MAP: Record<string, { bg: string; text: string; label: string }> = {
  // Visit / Photo
  issue: { bg: '#FEF0EC', text: '#DC4A2A', label: 'Замечание' },
  approved: { bg: '#ECFDF3', text: '#16A34A', label: 'Принято' },
  resolved: { bg: '#ECFDF3', text: '#16A34A', label: 'Исправлено' },
  issues_found: { bg: '#FEF0EC', text: '#DC4A2A', label: 'Есть замечания' },
  new: { bg: '#EFF6FF', text: '#2563EB', label: 'Новое' },
  in_progress: { bg: '#FFF7ED', text: '#D97706', label: 'В работе' },
  // Supply
  delivered: { bg: '#ECFDF3', text: '#16A34A', label: 'Доставлено' },
  ordered: { bg: '#EFF6FF', text: '#2563EB', label: 'Заказано' },
  in_production: { bg: '#FFF7ED', text: '#D97706', label: 'В производстве' },
  pending: { bg: '#FFF7ED', text: '#D97706', label: 'Ожидает' },
  in_review: { bg: '#EFF6FF', text: '#2563EB', label: 'На проверке' },
  // Invoice
  paid: { bg: '#ECFDF3', text: '#16A34A', label: 'Оплачен' },
  overdue: { bg: '#FEF0EC', text: '#DC4A2A', label: 'Просрочен' },
  // Project
  active: { bg: '#ECFDF3', text: '#16A34A', label: 'Активный' },
  completed: { bg: '#F3F4F6', text: '#6B7280', label: 'Завершён' },
  archived: { bg: '#F3F4F6', text: '#6B7280', label: 'В архиве' },
  // Visit status
  planned: { bg: '#EFF6FF', text: '#2563EB', label: 'Запланирован' },
  // Document
  draft: { bg: '#F3F4F6', text: '#6B7280', label: 'Черновик' },
  // Risk
  critical: { bg: '#FEE2E2', text: '#DC2626', label: 'Критично' },
  high: { bg: '#FEF0EC', text: '#EA580C', label: 'Высокий' },
  medium: { bg: '#FFF7ED', text: '#D97706', label: 'Средний' },
  low: { bg: '#ECFDF3', text: '#16A34A', label: 'Низкий' },
};

function getStatus(s: string) {
  return STATUS_MAP[s] || { bg: '#F3F4F6', text: '#6B7280', label: s };
}

export default function Bdg({ s }: { s: string }) {
  const m = getStatus(s);
  return (
    <span className="badge" style={{ background: m.bg, color: m.text }}>
      {m.label}
    </span>
  );
}

export { STATUS_MAP, getStatus };
