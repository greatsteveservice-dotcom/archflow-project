import { createClient } from '@supabase/supabase-js'
import { reportSuccess, reportFailure, isBackendError } from './health'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

// We never abort fetches with our own timer — supabase-js wraps auth/token
// requests in navigator.locks.request(); aborting an inner fetch leaves the
// lock in a "stolen" state and the next acquirer throws
// "AbortError: Lock was stolen by another request". So instead of killing
// the request, we only mark the connection as degraded after a soft delay
// and let the underlying fetch finish naturally.
const SOFT_DEGRADE_MS = 12000;

/** fetch wrapper with health reporting (no forced abort) */
const instrumentedFetch: typeof fetch = (input, init) => {
  const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
  let degraded = false;
  const degradeTimer = setTimeout(() => {
    degraded = true;
    reportFailure('slow-response');
  }, SOFT_DEGRADE_MS);

  // Pass through the caller's abort signal unchanged — that lets legit
  // user-side cancellations (component unmount, navigation) still work,
  // without us injecting our own abort into the supabase auth lock.
  return fetch(input, init)
    .then((res) => {
      if (res.status >= 500) {
        reportFailure(`HTTP ${res.status}`);
      } else if (!degraded) {
        const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started;
        reportSuccess(duration);
      } else {
        // Late success after we already reported degradation — recovery
        const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - started;
        reportSuccess(duration);
      }
      return res;
    })
    .catch((err) => {
      // Only treat genuine backend errors as failures. AbortError from a
      // user-side signal is a normal cancellation, not a backend outage.
      const name = (err as { name?: string } | null)?.name;
      if (name !== 'AbortError' && isBackendError(err)) {
        reportFailure((err as Error)?.message || 'network error');
      }
      throw err;
    })
    .finally(() => clearTimeout(degradeTimer));
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  global: {
    fetch: instrumentedFetch,
  },
})
