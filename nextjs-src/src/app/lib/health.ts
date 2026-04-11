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
const DEGRADED_AFTER_FAILURES = 2;   // 2 consecutive failures → degraded
const OFFLINE_AFTER_FAILURES = 4;    // 4 consecutive failures → offline
const SLOW_RESPONSE_MS = 5000;       // >5s successful response → still degraded

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

function computeStatus(failures: number, slow: boolean): HealthStatus {
  if (failures >= OFFLINE_AFTER_FAILURES) return 'offline';
  if (failures >= DEGRADED_AFTER_FAILURES) return 'degraded';
  if (slow) return 'degraded';
  return 'online';
}

export function reportSuccess(durationMs: number) {
  const slow = durationMs > SLOW_RESPONSE_MS;
  const wasUnhealthy = _state.status !== 'online';
  _state = {
    status: computeStatus(0, slow),
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
  _state = {
    status: computeStatus(failures, false),
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
  const msg = err instanceof Error ? err.message : String(err || '');
  if (/timeout|timed out|abort/i.test(msg)) return true;
  if (/failed to fetch|networkerror|load failed/i.test(msg)) return true;
  if (/502|503|504|ERR_NETWORK|ERR_TIMED_OUT/i.test(msg)) return true;
  if (/PGRST000|could not translate host name/i.test(msg)) return true;
  return false;
}
