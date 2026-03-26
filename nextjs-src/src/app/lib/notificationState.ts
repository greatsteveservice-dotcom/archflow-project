// ============================================================
// Archflow: Состояние уведомлений (localStorage)
// ============================================================

const READ_KEY = 'archflow_notifications_read';
const PREFS_KEY = 'archflow_notification_prefs';
const MAX_READ_IDS = 200; // Чтобы localStorage не разрастался

// ======================== ПРОЧИТАННЫЕ ========================

/** Получить массив ID прочитанных уведомлений */
export function getReadNotificationIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(READ_KEY) || '[]');
  } catch {
    return [];
  }
}

/** Отметить уведомления как прочитанные */
export function markNotificationsRead(ids: string[]): void {
  const existing = getReadNotificationIds();
  const merged = [...new Set([...existing, ...ids])];
  // Храним только последние MAX_READ_IDS
  const trimmed = merged.slice(-MAX_READ_IDS);
  localStorage.setItem(READ_KEY, JSON.stringify(trimmed));
}

/** Отметить все как прочитанные */
export function markAllNotificationsRead(allIds: string[]): void {
  markNotificationsRead(allIds);
}

// ======================== НАСТРОЙКИ ========================

export interface NotificationPrefs {
  issues: boolean;
  overdue: boolean;
  clientView: boolean;
  contractorFix: boolean;
}

const DEFAULT_PREFS: NotificationPrefs = {
  issues: true,
  overdue: true,
  clientView: true,
  contractorFix: false,
};

/** Получить настройки уведомлений */
export function getNotificationPrefs(): NotificationPrefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (!stored) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_PREFS;
  }
}

/** Сохранить настройки уведомлений */
export function saveNotificationPrefs(prefs: NotificationPrefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
