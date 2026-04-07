'use client';

import { useEffect, useState } from 'react';

export default function ServiceWorkerRegistration() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Check for updates every 30 minutes
        setInterval(() => reg.update(), 30 * 60 * 1000);

        // If there's already a waiting worker on load
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setShowUpdate(true);
          return;
        }

        // Detect new service worker installing
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            // New SW installed and waiting — show update banner
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setShowUpdate(true);
            }
          });
        });
      })
      .catch(() => {
        // SW registration failed — silently ignore in production
      });

    // When new SW takes over, reload to get fresh assets
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
  };

  if (!showUpdate) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 48,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        background: 'var(--af-black)',
        color: 'var(--af-white)',
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 13,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        border: '1px solid rgb(var(--line))',
        maxWidth: 'calc(100vw - 32px)',
      }}
    >
      <span>Доступно обновление</span>
      <button
        onClick={handleUpdate}
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          fontWeight: 500,
          padding: '4px 12px',
          border: '1px solid var(--af-white)',
          background: 'transparent',
          color: 'var(--af-white)',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Обновить
      </button>
    </div>
  );
}
