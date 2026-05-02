// ============================================================
// Archflow: shared retry helpers for Supabase calls
// ============================================================
// Used by useQuery in hooks.ts and by one-shot mutations (e.g. invite
// acceptance) that want the same backoff policy without going through
// React state.

import { isBackendError } from './health';
import { supabase } from './supabase';

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

/**
 * Stale/missing JWT surfacing as RLS or auth-protocol errors.
 * 42501 = "new row violates row-level security policy" (Postgres) — happens
 *   when the request was accepted but `auth.uid()` returned NULL because the
 *   JWT was anon/expired by the time it reached the database.
 * PGRST301 = JWT expired/invalid (PostgREST).
 * 401 status from auth or rest endpoints — same family.
 */
export function isAuthError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as { code?: string; status?: number; message?: string };
  if (e.code === '42501') return true;
  if (e.code === 'PGRST301') return true;
  if (e.status === 401) return true;
  const msg = (e.message || '').toLowerCase();
  if (/jwt expired|jwt is expired|invalid jwt|jwsinvalidsignature/.test(msg)) return true;
  if (/row-level security|row level security/.test(msg)) return true;
  return false;
}

/**
 * Run a Supabase mutation; if it fails with a stale-JWT / RLS error caused by
 * a dropped session, try to refresh the session once and re-run. Most "Failed
 * to send" toasts on mobile are JWT-expired-mid-flight; this hides them.
 */
export async function withReauth<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (!isAuthError(err)) throw err;
    const { data, error } = await supabase.auth.refreshSession();
    if (error || !data?.session) {
      // Refresh genuinely failed — surface a session-expired error so the UI
      // can prompt the user to reload instead of showing raw Postgres text.
      const e = new Error('SESSION_EXPIRED');
      (e as { code?: string }).code = 'SESSION_EXPIRED';
      throw e;
    }
    return await fn();
  }
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
  if (isAuthError(err)) return 'Сессия истекла. Обновите страницу и попробуйте снова.';
  const code = (err as { code?: string } | null)?.code;
  if (code === 'SESSION_EXPIRED') return 'Сессия истекла. Обновите страницу и попробуйте снова.';
  if (isTransientError(err)) return 'Соединение нестабильно. Попробуйте обновить страницу.';
  const msg = err instanceof Error ? err.message : String(err || '');
  if (!msg) return 'Не удалось загрузить данные';
  if (/typeerror|load failed|failed to fetch|networkerror|abort/i.test(msg)) {
    return 'Не удалось загрузить данные';
  }
  if (/row-level security|row level security/i.test(msg)) {
    return 'Сессия истекла. Обновите страницу и попробуйте снова.';
  }
  if (msg.length > 140 || /\b(at |\/api\/|node_modules)\b/.test(msg)) {
    return 'Не удалось загрузить данные';
  }
  return msg;
}
