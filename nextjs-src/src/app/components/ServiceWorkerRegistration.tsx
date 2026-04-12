'use client';

import { useEffect, useState, useCallback } from 'react';

/**
 * Service Worker registration + update notification.
 *
 * Flow:
 * 1. Register /sw.js
 * 2. When a new SW is found and reaches "installed" state → show banner
 * 3. User clicks "Обновить" → send SKIP_WAITING → new SW activates
 * 4. On controllerchange → reload to pick up new code
 * 5. Poll for updates every 30 minutes
 *
 * The SW no longer calls self.skipWaiting() during install, so the new
 * version waits until the user explicitly confirms the update.
 */
export default function ServiceWorkerRegistration() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  const applyUpdate = useCallback(() => {
    if (!waitingWorker) return;
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    setUpdateAvailable(false);
  }, [waitingWorker]);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;

    const detectWaiting = (worker: ServiceWorker | null) => {
      if (!worker) return;
      if (worker.state === 'installed') {
        setWaitingWorker(worker);
        setUpdateAvailable(true);
        return;
      }
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') {
          setWaitingWorker(worker);
          setUpdateAvailable(true);
        }
      });
    };

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // If a SW is already waiting on first load
        if (reg.waiting) detectWaiting(reg.waiting);

        // Detect new SW installs
        reg.addEventListener('updatefound', () => {
          detectWaiting(reg.installing);
        });

        // Periodic update check every 30 min
        setInterval(() => {
          reg.update().catch(() => {});
        }, 30 * 60 * 1000);

        // Immediate update check on load
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

  if (!updateAvailable) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 48,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: '#111',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 16px',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 12,
        letterSpacing: '0.04em',
        border: '0.5px solid #333',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <span style={{ opacity: 0.85 }}>Доступно обновление</span>
      <button
        onClick={applyUpdate}
        style={{
          background: '#fff',
          color: '#111',
          border: 'none',
          padding: '6px 14px',
          fontFamily: 'inherit',
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Обновить
      </button>
      <button
        onClick={() => setUpdateAvailable(false)}
        style={{
          background: 'none',
          border: 'none',
          color: '#fff',
          opacity: 0.5,
          cursor: 'pointer',
          fontSize: 16,
          lineHeight: 1,
          padding: '0 4px',
        }}
        aria-label="Закрыть"
      >
        &times;
      </button>
    </div>
  );
}
