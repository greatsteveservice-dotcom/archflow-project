'use client';

// Global error reporter — catches unhandled errors and sends to /api/error-report
// which forwards them to Telegram. Lightweight Sentry alternative.

let installed = false;
let userId: string | null = null;

// Deduplicate: don't send the same error twice within 60s
const sentErrors = new Map<string, number>();
const DEDUP_MS = 60_000;

function fingerprint(message: string): string {
  // Normalize dynamic parts: line numbers, column numbers, hashes
  return message
    .replace(/:\d+:\d+/g, ':X:X')
    .replace(/[a-f0-9]{8,}/gi, 'HASH')
    .slice(0, 200);
}

// Шумные benign-ошибки, которые не показывают реальных проблем —
// не репортим в бот, чтобы не плодить ложные алерты.
//   - "Lock was stolen"  : supabase-js v2 navigator.locks гонка (см. MEMORY.md
//     "Supabase auth lock contention"). Транзиентная, retry-слой её обрабатывает.
//   - AbortError         : пользователь ушёл со страницы / signal.abort, не баг.
//   - "ResizeObserver loop limit exceeded" / "ResizeObserver loop completed" :
//     известный benign Chrome warning, в каждом браузере свой текст.
//   - ChunkLoadError     : уже лечится тихим reload-handler'ом в layout.tsx
//     (см. MEMORY.md), репорт только захламляет ленту.
const SILENT_PATTERNS: RegExp[] = [
  /Lock was stolen/i,
  /\bAbortError\b/,
  /^The (operation|user) (was )?aborted/i,
  /signal is aborted/i,
  /ResizeObserver loop/i,
  /ChunkLoadError/i,
  /Loading chunk \d+ failed/i,
];

function isSilent(message: string): boolean {
  if (!message) return true;
  return SILENT_PATTERNS.some((re) => re.test(message));
}

function isDuplicate(msg: string): boolean {
  const fp = fingerprint(msg);
  const now = Date.now();
  const lastSent = sentErrors.get(fp);
  if (lastSent && now - lastSent < DEDUP_MS) return true;
  sentErrors.set(fp, now);
  // Cleanup old entries
  if (sentErrors.size > 50) {
    for (const [key, ts] of sentErrors) {
      if (now - ts > DEDUP_MS) sentErrors.delete(key);
    }
  }
  return false;
}

function send(data: {
  message: string;
  stack?: string;
  url?: string;
  extra?: Record<string, unknown>;
}) {
  if (isSilent(data.message)) return;
  if (isDuplicate(data.message)) return;

  const payload = {
    ...data,
    url: data.url || window.location.href,
    userAgent: navigator.userAgent,
    userId,
  };

  // Use sendBeacon for reliability (works even during page unload)
  const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
  if (navigator.sendBeacon) {
    navigator.sendBeacon('/api/error-report', blob);
  } else {
    fetch('/api/error-report', {
      method: 'POST',
      body: blob,
      keepalive: true,
    }).catch(() => {});
  }
}

/** Set current user ID for error reports */
export function setErrorReporterUser(id: string | null) {
  userId = id;
}

/** Manually report an error */
export function reportError(error: unknown, extra?: Record<string, unknown>) {
  if (typeof window === 'undefined') return;
  const message = error instanceof Error ? error.message : String(error || 'Unknown error');
  const stack = error instanceof Error ? error.stack : undefined;
  send({ message, stack, extra });
}

/** Install global error handlers. Call once at app startup. */
export function installErrorReporter() {
  if (typeof window === 'undefined' || installed) return;
  installed = true;

  // Catch unhandled JS errors
  window.addEventListener('error', (event) => {
    // Ignore errors from extensions or cross-origin scripts
    if (!event.filename || event.filename.includes('extension://')) return;
    send({
      message: event.message || 'Unknown error',
      stack: event.error?.stack,
      extra: { file: event.filename, line: event.lineno, col: event.colno },
    });
  });

  // Catch unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const message = reason instanceof Error ? reason.message : String(reason || 'Unhandled rejection');
    const stack = reason instanceof Error ? reason.stack : undefined;
    send({ message, stack, extra: { type: 'unhandledrejection' } });
  });
}
