import type { CSSProperties } from "react";

export const metadata = {
  title: "Подписка оформлена — Archflow",
};

const S: Record<string, CSSProperties> = {
  wrap: {
    minHeight: "100dvh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    fontFamily: "var(--af-font)",
    color: "#111",
    background: "#F6F6F4",
  },
  card: {
    maxWidth: 480,
    width: "100%",
    padding: "48px 32px",
    background: "#fff",
    textAlign: "center",
  },
  label: {
    fontFamily: "var(--af-font-mono)",
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: "#646464",
    marginBottom: 16,
    display: "block",
  },
  h1: {
    fontFamily: "var(--af-font-display)",
    fontSize: 32,
    fontWeight: 900,
    lineHeight: 1.1,
    marginBottom: 16,
  },
  p: {
    fontSize: 14,
    lineHeight: 1.6,
    marginBottom: 28,
  },
  btn: {
    display: "inline-block",
    fontFamily: "var(--af-font-mono)",
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: "0.14em",
    textTransform: "uppercase",
    padding: "12px 22px",
    background: "#111",
    color: "#fff",
    textDecoration: "none",
    border: "1px solid #111",
  },
};

export default function BillingSuccessPage() {
  return (
    <div style={S.wrap}>
      <div style={S.card}>
        <span style={S.label}>Archflow</span>
        <h1 style={S.h1}>Подписка оформлена</h1>
        <p style={S.p}>
          Оплата прошла успешно. Чек отправлен на email. Подписка активируется
          в течение нескольких минут.
        </p>
        <a href="/projects" style={S.btn}>
          → К проектам
        </a>
      </div>
    </div>
  );
}
