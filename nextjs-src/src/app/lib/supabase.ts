import { createClient } from '@supabase/supabase-js'
import { reportSuccess, reportFailure, isBackendError } from './health'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

// Fail fast on dead backend — default browser fetch has no timeout at all,
// which means a hanging Postgres makes every query block for 30+ seconds.
// 8s is long enough for a cold Postgres query on slow 3G but short enough
// to surface outages quickly to the DatabaseBanner.
const REQUEST_TIMEOUT_MS = 8000;

/** fetch wrapper with timeout + health reporting */
const instrumentedFetch: typeof fetch = (input, init) => {
  const ctrl = new AbortController();
  const signal = init?.signal
    ? mergeSignals(init.signal, ctrl.signal)
    : ctrl.signal;
  const timeoutId = setTimeout(() => ctrl.abort('request-timeout'), REQUEST_TIMEOUT_MS);
  const started = typeof performance !== 'undefined' ? performance.now() : Date.now();

  return fetch(input, { ...init, signal })
    .then((res) => {
      // 5xx = server error → degrade
      if (res.status >= 500) {
        reportFailure(`HTTP ${res.status}`);
      } else {
        const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started;
        reportSuccess(duration);
      }
      return res;
    })
    .catch((err) => {
      if (isBackendError(err)) {
        reportFailure(err?.message || 'network error');
      }
      throw err;
    })
    .finally(() => clearTimeout(timeoutId));
};

function mergeSignals(a: AbortSignal, b: AbortSignal): AbortSignal {
  if (a.aborted) return a;
  if (b.aborted) return b;
  const ctrl = new AbortController();
  const onAbortA = () => ctrl.abort((a as any).reason);
  const onAbortB = () => ctrl.abort((b as any).reason);
  a.addEventListener('abort', onAbortA, { once: true });
  b.addEventListener('abort', onAbortB, { once: true });
  return ctrl.signal;
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: instrumentedFetch,
  },
})
