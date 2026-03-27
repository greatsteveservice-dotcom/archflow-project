"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../lib/auth";

export default function FeedbackBar() {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  // Lock body scroll when modal open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open]);

  // Auto-close after "Спасибо"
  useEffect(() => {
    if (!sent) return;
    const t = setTimeout(() => { setSent(false); setOpen(false); }, 2000);
    return () => clearTimeout(t);
  }, [sent]);

  const close = useCallback(() => {
    setOpen(false);
    setText("");
    setSent(false);
  }, []);

  const handleSubmit = async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text.trim(),
          userEmail: profile?.email || undefined,
          userName: profile?.full_name || undefined,
        }),
      });
    } catch {
      // silently fail — don't block user
    }
    setSending(false);
    setText("");
    setSent(true);
  };

  return (
    <>
      {/* ── Fixed bottom bar ── */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          background: "#F6F6F4",
          borderTop: "0.5px solid #E0E0E0",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
            height: 48,
          }}
          className="feedback-bar-inner"
        >
          {/* Left */}
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span
              style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700,
                fontSize: 13,
                color: "#111",
                lineHeight: 1,
              }}
              className="feedback-bar-title"
            >
              Что-то не так?
            </span>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontWeight: 400,
                fontSize: 7,
                textTransform: "uppercase" as const,
                letterSpacing: "0.14em",
                color: "#AAA",
                lineHeight: 1,
              }}
            >
              Расскажи — исправим
            </span>
          </div>

          {/* Right */}
          <button
            onClick={() => setOpen(true)}
            style={{
              background: "#111",
              color: "#fff",
              fontFamily: "'IBM Plex Mono', monospace",
              fontWeight: 400,
              fontSize: 7,
              textTransform: "uppercase" as const,
              letterSpacing: "0.18em",
              padding: "7px 12px",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Написать →
          </button>
        </div>
      </div>

      {/* ── Modal ── */}
      {open && (
        <div
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.15s ease",
          }}
          className="feedback-modal-overlay"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              padding: 28,
              width: 480,
              maxWidth: "92vw",
              maxHeight: "90vh",
              overflowY: "auto",
              position: "relative",
              animation: "slideUp 0.2s ease",
            }}
            className="feedback-modal-panel"
          >
            {/* Close button */}
            <button
              onClick={close}
              style={{
                position: "absolute",
                top: 20,
                right: 20,
                background: "none",
                border: "none",
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 8,
                textTransform: "uppercase" as const,
                letterSpacing: "0.12em",
                color: "#CCC",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: 0,
              }}
            >
              ✕{'  '}Закрыть
            </button>

            {sent ? (
              /* Thank you state */
              <div style={{ textAlign: "center", padding: "40px 0" }}>
                <div
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 900,
                    fontSize: 32,
                    color: "#111",
                    marginBottom: 8,
                  }}
                >
                  Спасибо
                </div>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.2em",
                    color: "#AAA",
                  }}
                >
                  Мы учтём ваш отзыв
                </div>
              </div>
            ) : (
              /* Form */
              <>
                <h2
                  style={{
                    fontFamily: "'Playfair Display', serif",
                    fontWeight: 900,
                    fontSize: 24,
                    color: "#111",
                    marginBottom: 4,
                    lineHeight: 1.1,
                  }}
                  className="feedback-modal-title"
                >
                  Что случилось?
                </h2>
                <div
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.18em",
                    color: "#AAA",
                    marginBottom: 16,
                  }}
                >
                  Early Access · ArchFlow
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Опиши подробнее..."
                  style={{
                    width: "100%",
                    minHeight: 100,
                    border: "0.5px solid #CCC",
                    padding: 12,
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11,
                    fontWeight: 300,
                    color: "#111",
                    background: "#FAFAFA",
                    outline: "none",
                    resize: "vertical",
                    display: "block",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  onClick={handleSubmit}
                  disabled={!text.trim() || sending}
                  style={{
                    width: "100%",
                    height: 48,
                    marginTop: 12,
                    background: !text.trim() ? "#999" : "#111",
                    color: "#fff",
                    border: "none",
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 9,
                    fontWeight: 400,
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.2em",
                    cursor: !text.trim() ? "not-allowed" : "pointer",
                  }}
                >
                  {sending ? "Отправка..." : "Отправить"}
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Responsive overrides */}
      <style jsx>{`
        @media (max-width: 767px) {
          .feedback-bar-inner {
            height: 52px !important;
            padding: 0 16px !important;
          }
          .feedback-bar-title {
            font-size: 12px !important;
          }
          .feedback-modal-overlay {
            align-items: flex-end !important;
          }
          .feedback-modal-panel {
            width: 100% !important;
            max-width: 100% !important;
            padding: 20px !important;
            padding-bottom: calc(20px + env(safe-area-inset-bottom, 20px)) !important;
          }
          .feedback-modal-title {
            font-size: 20px !important;
          }
        }
      `}</style>
    </>
  );
}
