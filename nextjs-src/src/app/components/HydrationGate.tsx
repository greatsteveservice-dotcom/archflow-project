'use client';

import { useEffect } from 'react';

// Hides the server-rendered fallback screen (#af-fallback-screen) once React
// successfully hydrates in the browser.
//
// If this useEffect never runs (JS fails to parse, network blocks main chunk,
// etc.), the fallback screen remains visible — so the user sees a helpful
// message and a link to /reset instead of a silent white page.
export default function HydrationGate() {
  useEffect(() => {
    const el = document.getElementById('af-fallback-screen');
    if (el) {
      // Hide only — DO NOT remove(). The node is part of the server-rendered
      // React tree (rendered inside layout.tsx JSX), so detaching it from the
      // DOM orphans React's internal references. On the next <body> update,
      // React's insertBefore() throws NotFoundError, which cascades into
      // React error #185 (recovery loop) and #327 (Suspense hydration fail) —
      // user sees "Application error: a client-side exception has occurred".
      el.style.display = 'none';
    }
  }, []);
  return null;
}
