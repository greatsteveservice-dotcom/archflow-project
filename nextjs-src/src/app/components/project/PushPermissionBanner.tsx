'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../lib/auth';
import { savePushSubscription } from '../../lib/queries';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface PushPermissionBannerProps {
  onSubscribed?: () => void;
}

export default function PushPermissionBanner({ onSubscribed }: PushPermissionBannerProps) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    // Only show if push is supported, user is logged in, and permission not yet decided
    if (!user?.id) return;
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (!VAPID_PUBLIC_KEY) return;

    // Don't show if already granted or denied
    if (Notification.permission !== 'default') return;

    // Check if user dismissed recently (localStorage flag)
    const dismissed = localStorage.getItem('push_banner_dismissed');
    if (dismissed) {
      const ts = parseInt(dismissed, 10);
      // Re-show after 7 days
      if (Date.now() - ts < 7 * 24 * 60 * 60 * 1000) return;
    }

    setVisible(true);
  }, [user?.id]);

  const handleSubscribe = async () => {
    if (!user?.id) return;
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setVisible(false);
        return;
      }

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY).buffer as ArrayBuffer,
      });

      const json = subscription.toJSON();
      await savePushSubscription(user.id, {
        endpoint: json.endpoint!,
        keys: {
          p256dh: json.keys!.p256dh!,
          auth: json.keys!.auth!,
        },
      });

      setVisible(false);
      onSubscribed?.();
    } catch (err) {
      console.error('Push subscription failed:', err);
    }
    setSubscribing(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('push_banner_dismissed', String(Date.now()));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      padding: '8px 16px',
      background: 'var(--af-black)',
      color: 'var(--af-white)',
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: 10,
      letterSpacing: '0.04em',
    }}>
      <span style={{ flex: 1 }}>
        Получать уведомления о новых сообщениях?
      </span>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button
          onClick={handleSubscribe}
          disabled={subscribing}
          style={{
            padding: '4px 12px',
            background: 'var(--af-white)',
            color: 'var(--af-black)',
            border: 'none',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            fontWeight: 600,
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          {subscribing ? '...' : 'Да'}
        </button>
        <button
          onClick={handleDismiss}
          style={{
            padding: '4px 12px',
            background: 'transparent',
            color: 'var(--af-border)',
            border: '0.5px solid var(--af-border)',
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 9,
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '0.12em',
          }}
        >
          Позже
        </button>
      </div>
    </div>
  );
}
