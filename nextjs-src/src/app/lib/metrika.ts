/**
 * Yandex Metrika helper — safe wrappers for ym() calls.
 * Does nothing if Metrika is not loaded or env var is missing.
 */

const METRIKA_ID = process.env.NEXT_PUBLIC_METRIKA_ID || process.env.NEXT_PUBLIC_YM_ID;

function ym(...args: any[]) {
  if (typeof window !== 'undefined' && window.ym && METRIKA_ID) {
    window.ym(Number(METRIKA_ID), ...args);
  }
}

/** Identify the current user after login */
export function metrikaSetUser(userId: string) {
  ym('setUserID', userId);
}

/** Track a goal event */
export function metrikaGoal(goal: string, params?: Record<string, any>) {
  if (params) {
    ym('reachGoal', goal, params);
  } else {
    ym('reachGoal', goal);
  }
}
