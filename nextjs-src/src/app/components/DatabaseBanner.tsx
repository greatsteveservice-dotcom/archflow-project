"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabaseHealth, clearHealthErrors } from "../lib/health";

/**
 * Fixed top banner that appears when the Supabase backend is
 * degraded or offline. Auto-pings the database every 5s while
 * visible and disappears silently once it comes back.
 *
 * Shows a manual "Попробовать сейчас" button for the impatient.
 *
 * Important: the banner stays hidden until we've observed at least
 * one real successful response (`lastSuccessAt !== null`). On a cold
 * start in mobile in-app browsers (Telegram WKWebView, etc.) the very
 * first auth bootstrap can take 5–15s of TLS+DNS+session work; we
 * don't have any signal that distinguishes "slow handshake" from
 * "backend is down" until at least one request actually succeeds.
 */
export default function DatabaseBanner() {
  const health = useSupabaseHealth();
  const [checking, setChecking] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  // Update "time since last success" counter every second
  useEffect(() => {
    if (health.status === "online") return;
    if (!health.lastSuccessAt) return; // never fake-tick before a real success
    const tick = () => {
      setSecondsAgo(Math.floor((Date.now() - (health.lastSuccessAt ?? Date.now())) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [health.status, health.lastSuccessAt]);

  const pingBackend = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    try {
      // Hit the GoTrue health endpoint directly — it's public, requires only
      // an apikey, and bypasses our instrumented fetch so the ping itself
      // can never feed back into the failure counter.
      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/health`;
      const res = await fetch(url, {
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "" },
        cache: "no-store",
      });
      if (res.ok) clearHealthErrors();
    } catch {
      // Network failures here are not informative on their own; the next
      // user-driven request will surface them through instrumentedFetch.
    } finally {
      setChecking(false);
    }
  }, [checking]);

  // Auto-ping the backend every 5s while unhealthy
  useEffect(() => {
    if (health.status === "online") return;
    if (!health.lastSuccessAt) return;
    const id = setInterval(() => {
      void pingBackend();
    }, 5000);
    return () => clearInterval(id);
  }, [health.status, health.lastSuccessAt, pingBackend]);

  if (health.status === "online") return null;
  // Hide the banner entirely on cold start — see file-level comment.
  if (!health.lastSuccessAt) return null;

  const isOffline = health.status === "offline";
  const label = isOffline
    ? "Сервер недоступен"
    : "Соединение с базой нестабильно";

  const suffix =
    secondsAgo > 0
      ? ` — последний ответ ${formatDuration(secondsAgo)} назад`
      : "";

  return (
    <div
      role="alert"
      aria-live="polite"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        background: isOffline ? "#111" : "#3b3b3b",
        color: "#fff",
        padding: "10px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        flexWrap: "wrap",
        fontFamily: 'var(--af-font-mono)',
        fontSize: 10,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        borderBottom: "0.5px solid rgba(255,255,255,0.15)",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          background: isOffline ? "#ff6b6b" : "#ffd666",
          animation: "af-pulse 1.4s ease-in-out infinite",
        }}
      />
      <span>{label}{suffix}</span>
      <button
        onClick={() => void pingBackend()}
        disabled={checking}
        style={{
          fontFamily: "inherit",
          fontSize: 9,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#fff",
          background: "transparent",
          border: "0.5px solid rgba(255,255,255,0.4)",
          padding: "4px 10px",
          cursor: checking ? "wait" : "pointer",
          opacity: checking ? 0.5 : 1,
        }}
      >
        {checking ? "Проверяю..." : "Попробовать сейчас →"}
      </button>
      <style jsx>{`
        @keyframes af-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.4; transform: scale(0.7); }
        }
      `}</style>
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds} сек`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин`;
  return `${Math.floor(seconds / 3600)} ч`;
}
