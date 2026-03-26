'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-srf-raised flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="w-14 h-14 rounded-full bg-err-bg flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-err" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-[18px] font-semibold mb-2">Что-то пошло не так</h2>
        <p className="text-[13px] text-ink-muted mb-6">
          Произошла непредвиденная ошибка. Попробуйте обновить страницу.
        </p>
        <button
          onClick={reset}
          className="btn btn-primary mx-auto"
        >
          Попробовать снова
        </button>
      </div>
    </div>
  );
}
