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
      el.style.display = 'none';
      // Remove it after a short delay to free the DOM node
      setTimeout(() => {
        try { el.remove(); } catch {}
      }, 100);
    }
  }, []);
  return null;
}
