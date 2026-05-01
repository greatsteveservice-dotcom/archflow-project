// ============================================================
// Archflow: global Supabase/backend health signal
// ============================================================
// Emits "online", "degraded", "offline" state based on
// real network responses from supabase-js. The lib/supabase.ts
// wrapper calls reportSuccess/reportFailure after each fetch.
//
// Components subscribe via useSupabaseHealth() to render
// the DatabaseBanner and hide flaky placeholders.
// ============================================================

'use client';

import { useEffect, useState } from 'react';

export type HealthStatus = 'online' | 'degraded' | 'offline';

export interface HealthState {
  status: HealthStatus;
  /** unix ms of last successful response */
  lastSuccessAt: number | null;
  /** unix ms of last failure */
  lastFailureAt: number | null;
  /** consecutive failures since last success */
  consecutiveFailures: number;
  /** reason of last failure (for debugging) */
  lastError: string | null;
}

// Thresholds
// Yandex Cloud cold queries on a fresh user (no cache) routinely take 3–8s
// for the first round of paginated fetches; tripping degraded after 2 misses
// produced false-positive banners. Bumped to 3/6 to give honest outages
// enough rope to surface while smoothing out cold-start jitter.
//
// Slow-response is intentionally NOT a degraded trigger anymore: a single
// 7-second TLS handshake in Telegram WKWebView used to flip the banner on
// the very first successful response. Slow ≠ broken — only real failures
// count.
const DEGRADED_AFTER_FAILURES = 3;   // 3 consecutive failures → degraded
const OFFLINE_AFTER_FAILURES = 6;    // 6 consecutive failures → offline

let _state: HealthState = {
  status: 'online',
  lastSuccessAt: null,
  lastFailureAt: null,
  consecutiveFailures: 0,
  lastError: null,
};

type Listener = (s: HealthState) => void;
const _listeners = new Set<Listener>();

function emit() {
  for (const l of _listeners) {
    try { l(_state); } catch { /* ignore */ }
  }
}

/** Dispatch a window event so non-subscriber hooks (useQuery) can also react */
function dispatchRecovered() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('archflow:health-recovered'));
  }
}

function computeStatus(failures: number, hasEverSucceeded: boolean): HealthStatus {
  // Cold-start guard: until the very first successful response we have no
  // signal that backend is actually broken vs. just slow handshake / fresh
  // session bootstrap. Stay 'online' so the banner never flashes for a new
  // user opening an invite link in a mobile in-app browser.
  if (!hasEverSucceeded) return 'online';
  if (failures >= OFFLINE_AFTER_FAILURES) return 'offline';
  if (failures >= DEGRADED_AFTER_FAILURES) return 'degraded';
  return 'online';
}

export function reportSuccess(_durationMs: number) {
  const wasUnhealthy = _state.status !== 'online';
  _state = {
    status: computeStatus(0, true),
    lastSuccessAt: Date.now(),
    lastFailureAt: _state.lastFailureAt,
    consecutiveFailures: 0,
    lastError: null,
  };
  emit();
  if (wasUnhealthy && _state.status === 'online') dispatchRecovered();
}

export function reportFailure(reason: string) {
  const failures = _state.consecutiveFailures + 1;
  const hasEverSucceeded = _state.lastSuccessAt !== null;
  _state = {
    status: computeStatus(failures, hasEverSucceeded),
    lastSuccessAt: _state.lastSuccessAt,
    lastFailureAt: Date.now(),
    consecutiveFailures: failures,
    lastError: reason,
  };
  emit();
}

/** Manually mark healthy (e.g. after user tap "try now") */
export function clearHealthErrors() {
  _state = {
    status: 'online',
    lastSuccessAt: Date.now(),
    lastFailureAt: _state.lastFailureAt,
    consecutiveFailures: 0,
    lastError: null,
  };
  emit();
}

export function getHealth(): HealthState {
  return _state;
}

/** React hook to subscribe to health changes */
export function useSupabaseHealth(): HealthState {
  const [state, setState] = useState<HealthState>(_state);

  useEffect(() => {
    const listener: Listener = (s) => setState(s);
    _listeners.add(listener);
    // Sync immediately on mount in case state changed before subscription
    setState(_state);
    return () => { _listeners.delete(listener); };
  }, []);

  return state;
}

// ============================================================
// Classify a fetch error as "backend-down" vs "4xx business error"
// Only backend-down errors should trigger degradation.
// ============================================================

export function isBackendError(err: unknown): boolean {
  if (err instanceof TypeError) return true; // network failure in browser fetch
  const name = (err as { name?: string } | null)?.name;
  // AbortError can come from user-side cancellation (component unmount,
  // navigation) — that's not a backend failure. supabase-js token-refresh
  // lock contention also surfaces as AbortError ("Lock was stolen by another
  // request"); we don't want that to escalate the health banner either.
  if (name === 'AbortError') return false;
  const msg = err instanceof Error ? err.message : String(err || '');
  if (/lock was stolen/i.test(msg)) return false;
  if (/timeout|timed out/i.test(msg)) return true;
  if (/failed to fetch|networkerror|load failed/i.test(msg)) return true;
  if (/502|503|504|ERR_NETWORK|ERR_TIMED_OUT/i.test(msg)) return true;
  if (/PGRST000|could not translate host name/i.test(msg)) return true;
  return false;
}
