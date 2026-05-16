"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "changelog_seen_free_2026_05";

interface Props {
  onNavigate?: (page: string, ctx?: any) => void;
}

export default function ChangelogBanner({}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) === "1") setDismissed(true);
    } catch {}
  }, []);

  if (dismissed) return null;

  const handleDismiss = () => {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setDismissed(true);
  };

  return (
    <div
      style={{
        marginTop: 32,
        background: "#F6F6F4",
        color: "#111111",
        borderLeft: "4px solid var(--af-ochre)",
        padding: "28px 28px 28px 26px",
        position: "relative",
        fontFamily: "var(--af-font)",
      }}
    >
      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        aria-label="Скрыть"
        style={{
          position: "absolute",
          top: 14,
          right: 14,
          background: "none",
          border: "none",
          color: "#111111",
          cursor: "pointer",
          fontFamily: "var(--af-font-mono)",
          fontSize: 18,
          padding: 4,
          opacity: 0.5,
          lineHeight: 1,
        }}
      >
        ×
      </button>

      {/* Tag */}
      <div
        style={{
          fontFamily: "var(--af-font-mono)",
          fontSize: "var(--af-fs-8)",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--af-ochre)",
          marginBottom: 14,
        }}
      >
        Обновление · Доступ
      </div>

      {/* Title */}
      <h2
        style={{
          fontFamily: "var(--af-font-display)",
          fontSize: "clamp(22px, 2.6vw, 30px)",
          fontWeight: 900,
          lineHeight: 1.1,
          margin: 0,
          marginBottom: 14,
          color: "#111111",
          letterSpacing: "-0.01em",
        }}
      >
        Archflow — бесплатно<br />
        для всех дизайнеров
      </h2>

      {/* Summary */}
      <p
        style={{
          fontFamily: "var(--af-font)",
          fontSize: "var(--af-fs-12)",
          lineHeight: 1.55,
          color: "#111111",
          margin: 0,
          marginBottom: 22,
          maxWidth: 720,
        }}
      >
        Все модули включены. Электронная подпись по 63-ФЗ — тоже. Без
        ограничений по проектам, заказчикам и размеру студии. Платная
        подписка отпугивала тех, кому сервис нужен больше всего.
        Поэтому она отменена.
      </p>

      {/* Expanded content */}
      {expanded && (
        <div
          style={{
            borderTop: "1px solid #EBEBEB",
            paddingTop: 22,
            marginBottom: 22,
            maxWidth: 720,
          }}
        >
          <div
            style={{
              fontFamily: "var(--af-font-mono)",
              fontSize: "var(--af-fs-8)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Что входит
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", marginBottom: 18 }}>
            {[
              "Неограниченные проекты",
              "Все модули: Дизайн, Авторский надзор, Комплектация, Чат, Ассистент",
              "Электронная подпись договоров (63-ФЗ) включена",
              "Приоритетная поддержка",
              "Навсегда. Без карты. Без триала.",
            ].map((t) => (
              <li
                key={t}
                style={{
                  fontFamily: "var(--af-font)",
                  fontSize: "var(--af-fs-12)",
                  lineHeight: 1.7,
                  borderBottom: "1px solid #EBEBEB",
                  padding: "6px 0",
                  color: "#111111",
                }}
              >
                — {t}
              </li>
            ))}
          </ul>
          <div
            style={{
              fontFamily: "var(--af-font-mono)",
              fontSize: "var(--af-fs-8)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Что делать существующим подписчикам
          </div>
          <p
            style={{
              fontFamily: "var(--af-font)",
              fontSize: "var(--af-fs-12)",
              color: "#111111",
              margin: 0,
              lineHeight: 1.55,
            }}
          >
            Ничего. Списания остановлены, оставшийся оплаченный период
            учтён — после него доступ сохраняется без оплаты.
          </p>
        </div>
      )}

      {/* Toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="af-changelog-btn-light"
      >
        {expanded ? "Скрыть" : "Подробнее"} →
      </button>
    </div>
  );
}
