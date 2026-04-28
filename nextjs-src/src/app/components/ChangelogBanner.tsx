"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "changelog_seen_esign";

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
        Обновление
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
        Электронная подпись договоров —<br />
        теперь в Archflow
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
        Больше не нужно распечатывать, подписывать, сканировать и отправлять
        договор туда-обратно. Загрузите PDF в проект, отправьте заказчику —
        он получит СМС со ссылкой, прочитает, введёт код. Юридическая
        чистота за две минуты.
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
            Как это работает
          </div>
          <p
            style={{
              fontFamily: "var(--af-font)",
              fontSize: "var(--af-fs-12)",
              lineHeight: 1.6,
              color: "#111111",
              margin: 0,
              marginBottom: 12,
            }}
          >
            Вы закончили обсуждение условий с клиентом. Загружаете финальный
            PDF договора в раздел документов проекта. Нажимаете «Отправить
            на подпись». Вводите телефон заказчика.
          </p>
          <p
            style={{
              fontFamily: "var(--af-font)",
              fontSize: "var(--af-fs-12)",
              lineHeight: 1.6,
              color: "#111111",
              margin: 0,
              marginBottom: 12,
            }}
          >
            Клиент получает СМС, открывает документ с телефона — без
            регистрации, без приложений. Читает и подписывает кодом. В вашем
            проекте статус договора меняется на «Подписан».
          </p>
          <p
            style={{
              fontFamily: "var(--af-font)",
              fontSize: "var(--af-fs-12)",
              lineHeight: 1.6,
              color: "#111111",
              margin: 0,
              marginBottom: 18,
            }}
          >
            Подписанный документ хранится в проекте. Если возникнет спор —
            у вас есть доказательство с датой и фактом подписания, которое
            суд принимает как письменное доказательство.
          </p>
          <div
            style={{
              fontFamily: "var(--af-font-mono)",
              fontSize: "var(--af-fs-8)",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              marginBottom: 4,
            }}
          >
            Где искать
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
            Дизайн → Документы → Акты / Договора
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
