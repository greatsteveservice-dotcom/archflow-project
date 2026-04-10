'use client';

import { useEffect } from 'react';

// Auto-update Service Worker registration.
//
// Previously this component showed a "Доступно обновление" banner that the
// user had to click. Most users never clicked it, so they kept running stale
// SW builds — which caused white-screen issues on /invite/* links because
// the old SW intercepted the request and served broken cached HTML.
//
// New behavior:
// - Register /sw.js
// - Whenever a new SW is found (install or future updatefound), immediately
//   post SKIP_WAITING so it activates without waiting for tabs to close
// - On controllerchange (new SW took over), reload once to pick up new code
// - Poll for updates every 30 minutes
export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;

    const promoteWaiting = (worker: ServiceWorker | null) => {
      if (!worker) return;
      if (worker.state === 'installed') {
        worker.postMessage({ type: 'SKIP_WAITING' });
        return;
      }
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') {
          worker.postMessage({ type: 'SKIP_WAITING' });
        }
      });
    };

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // If a SW is already waiting on first load, activate it immediately
        if (reg.waiting) promoteWaiting(reg.waiting);

        // Detect new SW installs and auto-promote them
        reg.addEventListener('updatefound', () => {
          promoteWaiting(reg.installing);
        });

        // Periodic update check
        setInterval(() => {
          reg.update().catch(() => {});
        }, 30 * 60 * 1000);

        // Trigger an immediate update check on load
        reg.update().catch(() => {});
      })
      .catch(() => {});

    // Reload once when a new SW takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return;
      refreshing = true;
      window.location.reload();
    });
  }, []);

  return null;
}
