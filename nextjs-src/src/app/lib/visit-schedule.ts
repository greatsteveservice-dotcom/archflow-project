// ============================================================
// Shared visit schedule utilities
// ============================================================

import type { SupervisionConfig } from './types';

/** Convert our weekday (0=Mon...5=Sat) to JS day (0=Sun,1=Mon...6=Sat) */
function toJsDay(wd: number): number {
  return wd === 6 ? 0 : wd + 1;
}

/** Check if a date matches the visit schedule */
export function isScheduledVisitDay(date: Date, cfg: SupervisionConfig): boolean {
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
    if (jsDay !== toJsDay(weekday)) return false;
    return date.getDate() <= 7;
  }
  if (type === 'custom') {
    return date.getDate() === (customDay ?? 1);
  }
  return false;
}

/** Check if today is a scheduled visit day for a project */
export function isTodayScheduledVisit(cfg: SupervisionConfig | null): boolean {
  if (!cfg) return false;
  return isScheduledVisitDay(new Date(), cfg);
}
