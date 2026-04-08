'use client';

import { useEffect, useState } from 'react';

export default function ServiceWorkerRegistration() {
  const [showUpdate, setShowUpdate] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return;

    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        // Check for updates every 30 minutes
        setInterval(() => reg.update(), 30 * 60 * 1000);

        // Detect new SW waiting
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(newWorker);
              setShowUpdate(true);
            }
          });
        });
      })
      .catch(() => {});

    // Reload when new SW takes over
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleUpdate = () => {
    waitingWorker?.postMessage({ type: 'SKIP_WAITING' });
    setShowUpdate(false);
  };

  if (!showUpdate) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: 48,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 9999,
      background: '#111',
      color: '#fff',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 13,
      padding: '10px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      border: '1px solid #333',
      maxWidth: 'calc(100vw - 32px)',
    }}>
      <span>Доступно обновление</span>
      <button
        onClick={handleUpdate}
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 12,
          fontWeight: 500,
          padding: '4px 12px',
          border: '1px solid #fff',
          background: 'transparent',
          color: '#fff',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        Обновить
      </button>
    </div>
  );
}
