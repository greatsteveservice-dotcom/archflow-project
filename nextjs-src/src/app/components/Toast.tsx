'use client';
import { useEffect } from 'react';

interface ToastProps {
  msg: string;
  onClose: () => void;
}

export default function Toast({ msg, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-[200] animate-slide-up safe-bottom">
      <div style={{
        background: '#111',
        color: '#fff',
        fontFamily: 'var(--af-font-mono)',
        fontSize: 11,
        textTransform: 'uppercase' as const,
        letterSpacing: '0.12em',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}>
        <span style={{ color: '#EBEBEB' }}>→</span>
        {msg}
      </div>
    </div>
  );
}
