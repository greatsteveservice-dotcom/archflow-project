import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { reportSuccess, reportFailure, isBackendError, getHealth } from './health'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder'

// Lazy reference to the Supabase client so the fetch interceptor (defined
// before createClient) can call client.auth.signOut() once instantiated.
let clientRef: SupabaseClient | null = null;

// One-shot guard: if many requests fail with 401 at once we only want to sign
// out / trigger redirect once. Re-armed after the auth event has been handled.
let signOutInFlight = false;

/**
 * Detects "JWT-broken" auth errors from Supabase REST / Storage / Realtime
 * responses. PostgREST returns 401 with code 'PGRST301' or messages like
 * "JWT expired", "Invalid JWT", "Expected 3 parts in JWT" when the access
 * token is stale or refresh has silently failed.
 *
 * When detected we trigger supabase.auth.signOut() — this fires SIGNED_OUT
 * via onAuthStateChange in AuthProvider, which clears the session; the
 * catch-all router then redirects to /welcome (or /login). Without this,
 * the response is swallowed by the fetch* layer as "no row" and the user
 * sees a misleading "Проект не найден" instead of being asked to re-login.
 */
async function isAuthBroken(res: Response): Promise<boolean> {
  if (res.status !== 401 && res.status !== 403) return false;
  try {
    const cloned = res.clone();
    const text = await cloned.text();
    return (
      text.includes('PGRST301') ||
      text.includes('JWT expired') ||
      text.includes('Invalid JWT') ||
      text.includes('Expected 3 parts in JWT') ||
      text.includes('JWSError') ||
      text.includes('bad_jwt')
    );
  } catch {
    return false;
  }
}

function isAuthEndpoint(input: RequestInfo | URL): boolean {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  return url.includes('/auth/v1/');
}

// We never abort fetches with our own timer — supabase-js wraps auth/token
// requests in navigator.locks.request(); aborting an inner fetch leaves the
// lock in a "stolen" state and the next acquirer throws
// "AbortError: Lock was stolen by another request". So instead of killing
// the request, we only mark the connection as degraded after a soft delay
// and let the underlying fetch finish naturally.
//
// Bumped 12s → 20s because Telegram WKWebView cold-start (TLS + DNS + first
// session bootstrap) routinely takes 12–18s on cellular networks. The old
// timer was synthesising failures on a perfectly healthy backend.
const SOFT_DEGRADE_MS = 20000;

/** fetch wrapper with health reporting (no forced abort) */
const instrumentedFetch: typeof fetch = (input, init) => {
  const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
  let degraded = false;
  const degradeTimer = setTimeout(() => {
    // Cold-start safety: don't fabricate the very first failure ourselves.
    // Until the first real success arrives we cannot distinguish a slow
    // handshake from an actual outage, so leave the health state alone and
    // let the fetch resolve (or genuinely reject) on its own.
    if (getHealth().lastSuccessAt === null) return;
    degraded = true;
    reportFailure('slow-response');
  }, SOFT_DEGRADE_MS);

  // Pass through the caller's abort signal unchanged — that lets legit
  // user-side cancellations (component unmount, navigation) still work,
  // without us injecting our own abort into the supabase auth lock.
  return fetch(input, init)
    .then(async (res) => {
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
      // Auth-broken detection (PGRST301 / Invalid JWT). Skip the auth endpoint
      // itself — getSession/refreshSession naturally return 401 when refresh
      // fails and we don't want to recurse.
      if (!isAuthEndpoint(input) && !signOutInFlight && await isAuthBroken(res)) {
        signOutInFlight = true;
        // Fire-and-forget: signOut clears localStorage and emits SIGNED_OUT;
        // AuthProvider + catch-all router then redirect to /welcome.
        (clientRef?.auth.signOut() ?? Promise.resolve())
          .catch(() => { /* signOut is idempotent locally */ })
          .finally(() => {
            // Re-arm after a short window so we don't loop if the page
            // somehow stays mounted after redirect.
            setTimeout(() => { signOutInFlight = false; }, 10_000);
          });
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

// Populate the lazy reference used by instrumentedFetch.
clientRef = supabase;
