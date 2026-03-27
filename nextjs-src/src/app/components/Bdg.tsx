'use client';

/**
 * Monochrome badge system.
 * 3 variants using line weight instead of color:
 *   filled  — dark bg, white text → needs attention (issues, overdue, critical)
 *   outlined — border, no fill → in progress / active states
 *   ghost   — light bg, muted text → completed / neutral / done
 */

type Variant = 'filled' | 'outlined' | 'ghost';

const STATUS_MAP: Record<string, { variant: Variant; label: string }> = {
  // ── Needs attention (filled) ──
  issue:        { variant: 'filled',   label: 'Замечание' },
  issues_found: { variant: 'filled',   label: 'Есть замечания' },
  overdue:      { variant: 'filled',   label: 'Просрочен' },
  critical:     { variant: 'filled',   label: 'Критично' },
  high:         { variant: 'filled',   label: 'Высокий' },

  // ── In progress (outlined) ──
  active:        { variant: 'outlined', label: 'Активный' },
  in_progress:   { variant: 'outlined', label: 'В работе' },
  in_production: { variant: 'outlined', label: 'В производстве' },
  pending:       { variant: 'outlined', label: 'Ожидает' },
  new:           { variant: 'outlined', label: 'Новое' },
  ordered:       { variant: 'outlined', label: 'Заказано' },
  planned:       { variant: 'outlined', label: 'Запланирован' },
  in_review:     { variant: 'outlined', label: 'На проверке' },
  medium:        { variant: 'outlined', label: 'Средний' },

  // ── Done / neutral (ghost) ──
  approved:  { variant: 'ghost', label: 'Принято' },
  resolved:  { variant: 'ghost', label: 'Исправлено' },
  paid:      { variant: 'ghost', label: 'Оплачен' },
  delivered: { variant: 'ghost', label: 'Доставлено' },
  completed: { variant: 'ghost', label: 'Завершён' },
  archived:  { variant: 'ghost', label: 'В архиве' },
  low:       { variant: 'ghost', label: 'Низкий' },
  draft:     { variant: 'ghost', label: 'Черновик' },
};

const VARIANT_CLASSES: Record<Variant, string> = {
  filled:   'bg-ink text-srf',
  outlined: 'border border-ink-ghost text-ink-secondary bg-transparent',
  ghost:    'bg-srf-secondary text-ink-muted',
};

function getStatus(s: string) {
  return STATUS_MAP[s] || { variant: 'ghost' as Variant, label: s };
}

export default function Bdg({ s }: { s: string }) {
  const m = getStatus(s);
  return (
    <span className={`badge ${VARIANT_CLASSES[m.variant]}`}>
      {m.label}
    </span>
  );
}

export { STATUS_MAP, getStatus };
export type { Variant };
