"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import VideoRecorderModal from "./VideoRecorderModal";

interface VideoRecord {
  id: string;
  title: string | null;
  duration_sec: number | null;
  size_bytes: number | null;
  transcript: string | null;
  transcript_status: string;
  created_by: string | null;
  created_at: string;
}

interface Props {
  fileId: string;
  canRecord: boolean;
  toast: (msg: string) => void;
  /** When the parent file is an image, pass its URL so recording uses
   *  canvas-composite mode (image fullscreen + camera circle). */
  imageUrl?: string;
}

function formatDuration(sec: number | null): string {
  if (!sec) return "—";
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function FileVideoSection({ fileId, canRecord, toast, imageUrl }: Props) {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [recorderOpen, setRecorderOpen] = useState(false);
  const [playerVideoId, setPlayerVideoId] = useState<string | null>(null);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [showTranscriptId, setShowTranscriptId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const refetch = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("design_file_videos")
      .select("id, title, duration_sec, size_bytes, transcript, transcript_status, created_by, created_at")
      .eq("file_id", fileId)
      .order("created_at", { ascending: false });
    setVideos((data as VideoRecord[]) || []);
    setLoading(false);
  }, [fileId]);

  useEffect(() => { refetch(); }, [refetch]);

  // Realtime: новые видео и обновления transcript
  useEffect(() => {
    const ch = supabase
      .channel(`file_videos:${fileId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "design_file_videos", filter: `file_id=eq.${fileId}` },
        () => refetch())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fileId, refetch]);

  const playVideo = async (id: string) => {
    setPlayerVideoId(id);
    setPlayerUrl(null);
    const { data: { session } } = await supabase.auth.getSession();
    const r = await fetch(`/api/videos/${id}/url`, {
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    const j = await r.json();
    if (r.ok) setPlayerUrl(j.url);
    else toast(j.error || "Не удалось загрузить видео");
  };

  const closePlayer = () => {
    setPlayerVideoId(null);
    setPlayerUrl(null);
  };

  const startEditTitle = (v: VideoRecord) => {
    setEditingId(v.id);
    setEditTitle(v.title || "");
  };

  const cancelEditTitle = () => {
    setEditingId(null);
    setEditTitle("");
  };

  const saveTitle = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    const r = await fetch(`/api/videos/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ title: editTitle.trim() || null }),
    });
    if (r.ok) {
      toast(editTitle.trim() ? "Название сохранено" : "Название убрано");
      cancelEditTitle();
      refetch();
    } else {
      const j = await r.json().catch(() => ({}));
      toast(j.error || "Не удалось сохранить");
    }
  };

  const deleteVideo = async (id: string) => {
    if (!confirm("Удалить видеообзор?")) return;
    const { data: { session } } = await supabase.auth.getSession();
    const r = await fetch(`/api/videos/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (r.ok) {
      toast("Удалено");
      refetch();
    } else toast("Не удалось удалить");
  };

  const sectionTitleStyle = {
    fontFamily: "var(--af-font-mono)", fontSize: 10,
    letterSpacing: "0.14em", textTransform: "uppercase" as const,
    color: "#646464", marginBottom: 12, marginTop: 0,
  };

  return (
    <div style={{ marginTop: 28, paddingTop: 20, borderTop: "0.5px solid #EBEBEB" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <p style={sectionTitleStyle}>Видеообзоры</p>
        {canRecord && (
          <button
            onClick={() => setRecorderOpen(true)}
            className="af-btn af-action"
            style={{ fontSize: 10, padding: "6px 10px", height: 'auto' }}
          >
            🎥 Записать
          </button>
        )}
      </div>

      {loading && <p style={{ fontSize: 12, color: "#888" }}>Загрузка...</p>}

      {!loading && videos.length === 0 && (
        <p style={{ fontSize: 12, color: "#888", margin: 0 }}>
          {canRecord
            ? "Запишите видеообзор, чтобы пояснить решения голосом — заказчик увидит видео здесь."
            : "Видеообзоров пока нет."}
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {videos.map((v) => (
          <div key={v.id} style={{
            border: "0.5px solid #EBEBEB", padding: 14, background: "#fff",
          }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <div style={{
                width: 56, height: 56, background: "#111", color: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", flexShrink: 0,
              }} onClick={() => playVideo(v.id)}>
                ▶
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {editingId === v.id ? (
                  <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                    <input
                      autoFocus
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTitle(v.id);
                        if (e.key === "Escape") cancelEditTitle();
                      }}
                      placeholder="Название видеообзора"
                      maxLength={200}
                      style={{
                        flex: 1, fontSize: 13, padding: "4px 6px",
                        border: "0.5px solid #111", outline: "none",
                        fontFamily: "var(--af-font)",
                      }}
                    />
                    <button
                      onClick={() => saveTitle(v.id)}
                      style={{ fontSize: 10, padding: "4px 8px", background: "#111", color: "#fff", border: "none", cursor: "pointer", fontFamily: "var(--af-font-mono)", letterSpacing: "0.1em", textTransform: "uppercase" }}
                    >Сохр.</button>
                    <button
                      onClick={cancelEditTitle}
                      style={{ fontSize: 10, padding: "4px 8px", background: "none", color: "#646464", border: "0.5px solid #EBEBEB", cursor: "pointer", fontFamily: "var(--af-font-mono)", letterSpacing: "0.1em", textTransform: "uppercase" }}
                    >×</button>
                  </div>
                ) : (
                  <p style={{ fontSize: 13, margin: 0, marginBottom: 4, display: "flex", alignItems: "baseline", gap: 8 }}>
                    <span style={{ fontWeight: v.title ? 600 : 400 }}>
                      {v.title || "Видеообзор"}
                    </span>
                    <span style={{ color: "#888" }}>· {formatDuration(v.duration_sec)}</span>
                    {canRecord && (
                      <button
                        onClick={() => startEditTitle(v)}
                        title="Переименовать"
                        style={{
                          fontSize: 9, color: "#888", background: "none", border: "none",
                          cursor: "pointer", padding: "0 4px", fontFamily: "var(--af-font-mono)",
                          letterSpacing: "0.1em", textTransform: "uppercase",
                        }}
                      >Перенаименовать</button>
                    )}
                  </p>
                )}
                <p style={{ fontSize: 10, color: "#888", margin: 0, fontFamily: "var(--af-font-mono)" }}>
                  {new Date(v.created_at).toLocaleDateString("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                  {v.transcript_status === "processing" && " · расшифровка..."}
                  {v.transcript_status === "failed" && " · расшифровка не получилась"}
                </p>
                {v.transcript && (
                  <button
                    onClick={() => setShowTranscriptId(showTranscriptId === v.id ? null : v.id)}
                    style={{
                      marginTop: 6, fontSize: 10, color: "#646464",
                      fontFamily: "var(--af-font-mono)", background: "none", border: "none",
                      padding: 0, cursor: "pointer", textDecoration: "underline",
                    }}
                  >
                    {showTranscriptId === v.id ? "Скрыть текст" : "Показать расшифровку"}
                  </button>
                )}
              </div>
              {canRecord && editingId !== v.id && (
                <button
                  onClick={() => deleteVideo(v.id)}
                  style={{
                    fontSize: 9, color: "#888", background: "none", border: "none",
                    cursor: "pointer", padding: 4, fontFamily: "var(--af-font-mono)",
                    letterSpacing: "0.1em", textTransform: "uppercase",
                  }}
                >
                  Удалить
                </button>
              )}
            </div>
            {showTranscriptId === v.id && v.transcript && (
              <p style={{
                marginTop: 12, fontSize: 13, lineHeight: 1.6, color: "#111",
                paddingTop: 12, borderTop: "0.5px solid #EBEBEB",
              }}>
                {v.transcript}
              </p>
            )}
          </div>
        ))}
      </div>

      {recorderOpen && (
        <VideoRecorderModal
          fileId={fileId}
          open={recorderOpen}
          onClose={() => setRecorderOpen(false)}
          onUploaded={refetch}
          toast={toast}
          imageUrl={imageUrl}
        />
      )}

      {playerVideoId && (
        <div
          onClick={closePlayer}
          style={{
            position: "fixed", inset: 0, background: "rgba(17,17,17,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 10001, padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "100%", maxWidth: 960, background: "#000" }}
          >
            {playerUrl ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                src={playerUrl}
                controls
                autoPlay
                style={{ width: "100%", display: "block", maxHeight: "85vh" }}
              />
            ) : (
              <div style={{ padding: 60, color: "#fff", textAlign: "center", fontSize: 13 }}>
                Загрузка плеера...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
