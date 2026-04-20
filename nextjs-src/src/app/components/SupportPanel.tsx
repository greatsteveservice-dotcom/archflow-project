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

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SupportPanel({ open, onClose }: Props) {
  const { session } = useAuth();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [threadId, setThreadId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (!session?.access_token) return;
    let mounted = true;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;
      const { data: thread } = await supabase
        .from("support_threads")
        .select("id, has_unread")
        .eq("user_id", user.id)
        .single();
      if (!thread || !mounted) return;
      setThreadId(thread.id);

      const { data: msgs } = await supabase
        .from("support_messages")
        .select("id, thread_id, sender, body, created_at")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: true });
      if (msgs && mounted) setMessages(msgs);

      const channel = supabase
        .channel(`support:${thread.id}`)
        .on("postgres_changes", {
          event: "INSERT", schema: "public", table: "support_messages",
          filter: `thread_id=eq.${thread.id}`,
        }, (payload) => {
          const msg = payload.new as SupportMessage;
          if (msg.sender === "support") {
            setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
          }
        })
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

  // Mark as read when opened
  useEffect(() => {
    if (!open || !threadId) return;
    supabase.from("support_threads").update({ has_unread: false }).eq("id", threadId).then(() => {});
  }, [open, threadId]);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", h);
    return () => document.removeEventListener("keydown", h);
  }, [open, onClose]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    const optimisticMsg: SupportMessage = {
      id: crypto.randomUUID(),
      thread_id: threadId || "",
      sender: "user",
      body: text,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticMsg]);

    try {
      let projectName: string | undefined;
      try {
        const match = window.location.pathname.match(/\/projects\/([^/]+)/);
        if (match) {
          const { data } = await supabase.from("projects").select("title").eq("id", match[1]).maybeSingle();
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
          context: { page: document.title, url: window.location.pathname, project_name: projectName },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.thread_id && !threadId) {
          setThreadId(data.thread_id);
          const channel = supabase
            .channel(`support:${data.thread_id}`)
            .on("postgres_changes", {
              event: "INSERT", schema: "public", table: "support_messages",
              filter: `thread_id=eq.${data.thread_id}`,
            }, (payload) => {
              const msg = payload.new as SupportMessage;
              if (msg.sender === "support") {
                setMessages((prev) => prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]);
              }
            })
            .subscribe();
          if (channelRef.current) supabase.removeChannel(channelRef.current);
          channelRef.current = channel;
        }
        metrikaGoal("feedback_sent");
      }
    } catch { /* keep optimistic */ }
    finally { setSending(false); }
  }, [input, sending, threadId, session?.access_token]);

  const formatTime = (iso: string) => {
    try { return new Date(iso).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }); }
    catch { return ""; }
  };

  if (!open) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        zIndex: 200, display: "flex",
        alignItems: "flex-end", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          width: "100%", maxWidth: 480,
          height: "min(560px, 85dvh)",
          display: "flex", flexDirection: "column",
          marginBottom: `calc(68px + env(safe-area-inset-bottom))`,
          animation: "slideUp 0.2s ease",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "14px 16px",
          borderBottom: "0.5px solid #EBEBEB",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div style={{
              fontFamily: "var(--af-font)", fontWeight: 700, fontSize: 16, color: "#111", lineHeight: 1.2,
            }}>
              Поддержка
            </div>
            <div style={{
              fontFamily: "var(--af-font)", fontSize: 10, color: "#999", marginTop: 2,
            }}>
              Обычно отвечаем за час
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Закрыть"
            style={{
              width: 36, height: 36,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "transparent", border: "0.5px solid #EBEBEB",
              color: "#111", cursor: "pointer", fontSize: 18,
            }}
          >×</button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} style={{
          flex: 1, overflowY: "auto", padding: "12px 16px",
          display: "flex", flexDirection: "column", gap: 6,
          background: "#F6F6F4",
        }}>
          {messages.length === 0 && (
            <div style={{
              textAlign: "center", padding: "40px 16px",
              fontFamily: "var(--af-font)", fontSize: 11, color: "#999", lineHeight: 1.6,
            }}>
              Опишите проблему<br />— ответим быстро
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} style={{
              display: "flex",
              justifyContent: msg.sender === "user" ? "flex-end" : "flex-start",
            }}>
              <div style={{
                maxWidth: "82%", padding: "8px 10px",
                fontFamily: "var(--af-font)", fontSize: 12, lineHeight: 1.5,
                color: msg.sender === "user" ? "#fff" : "#111",
                background: msg.sender === "user" ? "#111" : "#fff",
                border: msg.sender === "support" ? "0.5px solid #EBEBEB" : "none",
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {msg.body}
                <div style={{
                  fontFamily: "var(--af-font)", fontSize: 9, opacity: 0.6,
                  marginTop: 3, textAlign: "right",
                  color: msg.sender === "user" ? "#fff" : "#999",
                }}>
                  {formatTime(msg.created_at)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input */}
        <div style={{
          padding: "10px 12px", borderTop: "0.5px solid #EBEBEB",
          display: "flex", gap: 8, alignItems: "flex-end",
          flexShrink: 0, background: "#fff",
        }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
            }}
            placeholder="Напишите сообщение..."
            rows={2}
            style={{
              flex: 1, resize: "none", border: "0.5px solid #EBEBEB",
              padding: "8px 10px", fontFamily: "var(--af-font)", fontSize: 12,
              color: "#111", background: "#F6F6F4", outline: "none",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            style={{
              width: 40, height: 40,
              background: !input.trim() ? "#EBEBEB" : "#111",
              color: "#fff", border: "none",
              cursor: !input.trim() ? "not-allowed" : "pointer",
              fontFamily: "var(--af-font)", fontSize: 18,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >→</button>
        </div>
      </div>
    </div>
  );
}
