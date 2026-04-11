"use client";

import { useEffect, useState, useCallback } from "react";
import { useSupabaseHealth, clearHealthErrors } from "../lib/health";
import { supabase } from "../lib/supabase";

/**
 * Fixed top banner that appears when the Supabase backend is
 * degraded or offline. Auto-pings the database every 5s while
 * visible and disappears silently once it comes back.
 *
 * Shows a manual "Попробовать сейчас" button for the impatient.
 */
export default function DatabaseBanner() {
  const health = useSupabaseHealth();
  const [checking, setChecking] = useState(false);
  const [secondsAgo, setSecondsAgo] = useState<number>(0);

  // Update "time since last success" counter every second
  useEffect(() => {
    if (health.status === "online") return;
    const tick = () => {
      if (health.lastSuccessAt) {
        setSecondsAgo(Math.floor((Date.now() - health.lastSuccessAt) / 1000));
      } else {
        setSecondsAgo((s) => s + 1);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [health.status, health.lastSuccessAt]);

  // Auto-ping the backend every 5s while unhealthy
  useEffect(() => {
    if (health.status === "online") return;
    const id = setInterval(() => {
      void pingBackend();
    }, 5000);
    return () => clearInterval(id);
  }, [health.status]);

  const pingBackend = useCallback(async () => {
    if (checking) return;
    setChecking(true);
    try {
      // Lightweight query that actually exercises Postgres through PostgREST
      const { error } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .limit(1);
      if (!error) {
        clearHealthErrors();
      }
    } catch {
      // instrumentedFetch in lib/supabase.ts already reported the failure
    } finally {
      setChecking(false);
    }
  }, [checking]);

  if (health.status === "online") return null;

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
        fontFamily: "'IBM Plex Mono', monospace",
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
