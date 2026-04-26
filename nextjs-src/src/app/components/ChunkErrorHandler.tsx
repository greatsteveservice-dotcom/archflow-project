'use client';

import { useEffect } from 'react';

/**
 * Catches chunk-load failures (typical after a deploy when the active page
 * still references old bundle hashes that no longer exist on the server)
 * and recovers automatically by clearing the Service Worker + caches and
 * doing a hard reload.
 *
 * Without this, users see a blank "Application error: a client-side
 * exception has occurred" screen until they manually refresh.
 *
 * Loop guard via sessionStorage so a genuinely broken page doesn't
 * reload-spin.
 */
export default function ChunkErrorHandler() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const RELOAD_FLAG = 'af-chunk-reload';
    // Clear the loop guard once the page successfully renders for ~3s.
    const settleTimer = window.setTimeout(() => {
      sessionStorage.removeItem(RELOAD_FLAG);
    }, 3000);

    const isChunkError = (msg: unknown): boolean => {
      const s = typeof msg === 'string' ? msg : (msg as Error)?.message || '';
      return (
        /ChunkLoadError/i.test(s) ||
        /Loading chunk [\w-]+ failed/i.test(s) ||
        /Failed to fetch dynamically imported module/i.test(s) ||
        /Importing a module script failed/i.test(s)
      );
    };

    const recover = async () => {
      // Loop guard — if we already reloaded once and still hit the error,
      // don't keep spinning. Send the user to /reset for a clean wipe.
      if (sessionStorage.getItem(RELOAD_FLAG)) {
        sessionStorage.removeItem(RELOAD_FLAG);
        window.location.replace('/reset');
        return;
      }
      sessionStorage.setItem(RELOAD_FLAG, '1');

      try {
        if ('caches' in window) {
          const keys = await caches.keys();
          await Promise.all(keys.map((k) => caches.delete(k)));
        }
        if ('serviceWorker' in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
        }
      } catch {
        // ignore — reload anyway
      }
      window.location.reload();
    };

    const onError = (e: ErrorEvent) => {
      if (isChunkError(e.message) || isChunkError(e.error)) {
        e.preventDefault();
        void recover();
      }
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      if (isChunkError(e.reason)) {
        e.preventDefault();
        void recover();
      }
    };

    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      window.clearTimeout(settleTimer);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
    };
  }, []);

  return null;
}
