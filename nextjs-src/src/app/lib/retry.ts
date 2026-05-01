// ============================================================
// Archflow: shared retry helpers for Supabase calls
// ============================================================
// Used by useQuery in hooks.ts and by one-shot mutations (e.g. invite
// acceptance) that want the same backoff policy without going through
// React state.

import { isBackendError } from './health';

// Exponential backoff: 400ms, 1200ms, 3000ms → up to 3 retries (~4.6s).
const RETRY_DELAYS_MS = [400, 1200, 3000];

/** Run an async fn with backoff retry on transient backend errors. */
export async function runWithRetry<T>(
  fetcher: () => Promise<T>,
  isCancelled: () => boolean = () => false,
): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (isCancelled()) throw new Error('cancelled');
    try {
      return await fetcher();
    } catch (err) {
      lastErr = err;
      // Deterministic 4xx / business errors — never retry
      if (!isBackendError(err) && !isLockStolen(err)) throw err;
      if (attempt === RETRY_DELAYS_MS.length) throw err;
      const delay = RETRY_DELAYS_MS[attempt];
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

/** supabase-js navigator.locks contention surfaces as this error. */
export function isLockStolen(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '');
  return /lock was stolen/i.test(msg);
}

/** Errors we should silently retry/ignore in user-facing flows (not show in toast). */
export function isTransientError(err: unknown): boolean {
  if (!err) return false;
  const name = (err as { name?: string }).name;
  if (name === 'AbortError') return true;
  const msg = err instanceof Error ? err.message : String(err || '');
  if (/lock was stolen/i.test(msg)) return true;
  if (/fetch is aborted|fetch failed|failed to fetch/i.test(msg)) return true;
  if (/networkerror|load failed/i.test(msg)) return true;
  if (/\b(502|503|504)\b/.test(msg)) return true;
  return false;
}

/**
 * Convert any error into a user-facing message safe to render in the UI.
 * Hides raw fetch/network errors ("TypeError: Load failed", "Failed to fetch")
 * and any stack-trace-like text behind a generic Russian fallback.
 */
export function friendlyError(err: unknown): string {
  if (isTransientError(err)) return 'Соединение нестабильно. Попробуйте обновить страницу.';
  const msg = err instanceof Error ? err.message : String(err || '');
  if (!msg) return 'Не удалось загрузить данные';
  if (/typeerror|load failed|failed to fetch|networkerror|abort/i.test(msg)) {
    return 'Не удалось загрузить данные';
  }
  if (msg.length > 140 || /\b(at |\/api\/|node_modules)\b/.test(msg)) {
    return 'Не удалось загрузить данные';
  }
  return msg;
}
