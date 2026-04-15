"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { metrikaGoal } from "../lib/metrika";

interface SupportMessage {
  id: string;
  thread_id: string;
  sender: "user" | "support";
  body: string;
  created_at: string;
}

export default function FeedbackBar() {
  const { profile, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [hasUnread, setHasUnread] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Scroll to bottom when messages change or chat opens
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  // Load thread & subscribe to realtime
  useEffect(() => {
    if (!session?.access_token) return;

    let mounted = true;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      // Get existing thread
      const { data: thread } = await supabase
        .from("support_threads")
        .select("id, has_unread")
        .eq("user_id", user.id)
        .single();

      if (!thread || !mounted) return;

      setThreadId(thread.id);
      setHasUnread(thread.has_unread || false);

      // Load message history
      const { data: msgs } = await supabase
        .from("support_messages")
        .select("id, thread_id, sender, body, created_at")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: true });

      if (msgs && mounted) setMessages(msgs);

      // Subscribe to new messages
      const channel = supabase
        .channel(`support:${thread.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "support_messages",
            filter: `thread_id=eq.${thread.id}`,
          },
          (payload) => {
            const msg = payload.new as SupportMessage;
            if (msg.sender === "support") {
              setMessages((prev) => {
                if (prev.some((m) => m.id === msg.id)) return prev;
                return [...prev, msg];
              });
              setHasUnread(true);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;
    }

    init();

    return () => {
      mounted = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [session?.access_token]);

  // Mark as read when opening
  const handleOpen = useCallback(async () => {
    setOpen(true);
    if (hasUnread && threadId) {
      setHasUnread(false);
      await supabase
        .from("support_threads")
        .update({ has_unread: false })
        .eq("id", threadId);
    }
  }, [hasUnread, threadId]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open]);

  // Send message
  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    // Optimistic UI
    const optimisticMsg: SupportMessage = {
      id: crypto.randomUUID(),
      thread_id: threadId || "",
      sender: "user",
      body: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      // Get current project name from URL
      let projectName: string | undefined;
      try {
        const match = window.location.pathname.match(/\/projects\/([^/]+)/);
        if (match) {
          const { data } = await supabase
            .from("projects")
            .select("title")
            .eq("id", match[1])
            .maybeSingle();
          if (data?.title) projectName = data.title;
        }
      } catch {}

      const res = await fetch("/api/support-send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          body: text,
          context: {
            page: document.title,
            url: window.location.pathname,
            project_name: projectName,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.thread_id && !threadId) {
          setThreadId(data.thread_id);

          // Subscribe to new thread's messages
          const channel = supabase
            .channel(`support:${data.thread_id}`)
            .on(
              "postgres_changes",
              {
                event: "INSERT",
                schema: "public",
                table: "support_messages",
                filter: `thread_id=eq.${data.thread_id}`,
              },
              (payload) => {
                const msg = payload.new as SupportMessage;
                if (msg.sender === "support") {
                  setMessages((prev) => {
                    if (prev.some((m) => m.id === msg.id)) return prev;
                    return [...prev, msg];
                  });
                  setHasUnread(true);
                }
              }
            )
            .subscribe();

          if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
          }
          channelRef.current = channel;
        }
        metrikaGoal("feedback_sent");
      }
    } catch {
      // keep optimistic message visible
    } finally {
      setSending(false);
    }
  }, [input, sending, threadId, session?.access_token]);

  // Format time
  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString("ru-RU", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "";
    }
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
          borderTop: "0.5px solid #EBEBEB",
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
                fontFamily: "var(--af-font-mono)",
                fontWeight: 400,
                fontSize: "var(--af-fs-9)",
                textTransform: "uppercase" as const,
                letterSpacing: "0.14em",
                color: "#111",
                lineHeight: 1,
              }}
              className="feedback-bar-title"
            >
              Что-то не так?
            </span>
            <span
              style={{
                fontFamily: "var(--af-font-mono)",
                fontWeight: 400,
                fontSize: "var(--af-fs-7)",
                textTransform: "uppercase" as const,
                letterSpacing: "0.14em",
                color: "#111",
                lineHeight: 1,
              }}
            >
              Расскажи — исправим
            </span>
          </div>

          {/* Right — button with unread dot */}
          <button
            onClick={handleOpen}
            style={{
              background: "#111",
              color: "#fff",
              fontFamily: "var(--af-font-mono)",
              fontWeight: 400,
              fontSize: "var(--af-fs-7)",
              textTransform: "uppercase" as const,
              letterSpacing: "0.18em",
              padding: "7px 12px",
              border: "none",
              cursor: "pointer",
              whiteSpace: "nowrap",
              display: "flex",
              alignItems: "center",
              gap: 6,
              position: "relative",
            }}
          >
            Написать →
            {hasUnread && (
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "#E24B4A",
                  display: "inline-block",
                  flexShrink: 0,
                }}
              />
            )}
          </button>
        </div>
      </div>

      {/* ── Chat panel ── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 50,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "flex-end",
            animation: "fadeIn 0.15s ease",
          }}
          className="feedback-modal-overlay"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              width: 380,
              maxWidth: "100vw",
              height: "min(520px, 80vh)",
              display: "flex",
              flexDirection: "column",
              position: "relative",
              animation: "slideUp 0.2s ease",
              marginRight: 20,
              marginBottom: 68,
            }}
            className="feedback-chat-panel"
          >
            {/* Header */}
            <div
              style={{
                padding: "14px 16px",
                borderBottom: "0.5px solid #EBEBEB",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "var(--af-font-display)",
                    fontWeight: 900,
                    fontSize: 16,
                    color: "#111",
                    lineHeight: 1.2,
                  }}
                >
                  Поддержка
                </div>
                <div
                  style={{
                    fontFamily: "var(--af-font-mono)",
                    fontSize: "var(--af-fs-7)",
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.14em",
                    color: "#111",
                    opacity: 0.5,
                    marginTop: 2,
                  }}
                >
                  обычно отвечаем за час
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  fontFamily: "var(--af-font-mono)",
                  fontSize: "var(--af-fs-8)",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.12em",
                  color: "#111",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                ✕
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "12px 16px",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                background: "#F6F6F4",
              }}
            >
              {messages.length === 0 && (
                <div
                  style={{
                    textAlign: "center",
                    padding: "40px 16px",
                    fontFamily: "var(--af-font-mono)",
                    fontSize: "var(--af-fs-9)",
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.14em",
                    color: "#111",
                    opacity: 0.4,
                    lineHeight: 1.6,
                  }}
                >
                  Опишите проблему
                  <br />— ответим быстро
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent:
                      msg.sender === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "82%",
                      padding: "8px 10px",
                      fontFamily: "var(--af-font-mono)",
                      fontSize: "var(--af-fs-9)",
                      lineHeight: 1.5,
                      color: msg.sender === "user" ? "#fff" : "#111",
                      background: msg.sender === "user" ? "#111" : "#fff",
                      border:
                        msg.sender === "support"
                          ? "0.5px solid #EBEBEB"
                          : "none",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {msg.body}
                    <div
                      style={{
                        fontFamily: "var(--af-font-mono)",
                        fontSize: 9,
                        opacity: 0.5,
                        marginTop: 3,
                        textAlign: "right",
                        color: msg.sender === "user" ? "#fff" : "#111",
                      }}
                    >
                      {formatTime(msg.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <div
              style={{
                padding: "10px 12px",
                borderTop: "0.5px solid #EBEBEB",
                display: "flex",
                gap: 8,
                alignItems: "flex-end",
                flexShrink: 0,
                background: "#fff",
              }}
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Напишите сообщение..."
                rows={2}
                style={{
                  flex: 1,
                  resize: "none",
                  border: "0.5px solid #EBEBEB",
                  padding: "8px 10px",
                  fontFamily: "var(--af-font-mono)",
                  fontSize: "var(--af-fs-9)",
                  color: "#111",
                  background: "#F6F6F4",
                  outline: "none",
                  display: "block",
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                style={{
                  width: 36,
                  height: 36,
                  background: !input.trim() ? "#EBEBEB" : "#111",
                  color: "#fff",
                  border: "none",
                  cursor: !input.trim() ? "not-allowed" : "pointer",
                  fontFamily: "var(--af-font-mono)",
                  fontSize: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                →
              </button>
            </div>
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
            justify-content: stretch !important;
          }
          .feedback-chat-panel {
            width: 100% !important;
            max-width: 100% !important;
            margin-right: 0 !important;
            margin-bottom: 52px !important;
            height: min(480px, 70vh) !important;
          }
        }
      `}</style>
    </>
  );
}
