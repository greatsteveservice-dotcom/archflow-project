"use client";

import { useEffect, useRef, useState } from "react";
import { useScreenRecorder } from "../lib/useScreenRecorder";
import { supabase } from "../lib/supabase";

interface Props {
  fileId: string;
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
  toast: (msg: string) => void;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Простой детект — Safari не поддерживает getDisplayMedia как Chrome/Edge
function isSafari(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /^((?!chrome|android).)*safari/i.test(ua);
}

export default function VideoRecorderModal({ fileId, open, onClose, onUploaded, toast }: Props) {
  const recorder = useScreenRecorder();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const previewVideoRef = useRef<HTMLVideoElement | null>(null);
  const [browserUnsupported, setBrowserUnsupported] = useState(false);

  useEffect(() => {
    if (open && typeof navigator !== "undefined") {
      const noDM = !navigator.mediaDevices || typeof (navigator.mediaDevices as any).getDisplayMedia !== "function";
      if (noDM || isSafari()) setBrowserUnsupported(true);
    }
  }, [open]);

  // Callback ref — привязываем камеру когда video element появляется в DOM
  const setPreviewVideoEl = (el: HTMLVideoElement | null) => {
    previewVideoRef.current = el;
    if (el && recorder.cameraStream) {
      el.srcObject = recorder.cameraStream;
      el.play().catch(() => {});
    }
  };

  // Если камера-стрим обновился, а video уже отрисован — переподключить
  useEffect(() => {
    if (previewVideoRef.current && recorder.cameraStream) {
      previewVideoRef.current.srcObject = recorder.cameraStream;
      previewVideoRef.current.play().catch(() => {});
    }
  }, [recorder.cameraStream]);

  // Очистка при закрытии
  useEffect(() => {
    if (!open && recorder.state !== "idle") recorder.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleStart = async () => {
    await recorder.start();
  };

  const handleStop = async () => {
    const result = await recorder.stop();
    if (!result) return;
    await uploadVideo(result.blob, result.duration, result.mimeType);
  };

  const uploadVideo = async (blob: Blob, durationSec: number, mimeType: string) => {
    setUploading(true);
    setProgress(0);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) throw new Error("Не авторизован");

      const r1 = await fetch("/api/videos/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ fileId, mimeType }),
      });
      const j1 = await r1.json();
      if (!r1.ok) throw new Error(j1.error || "Не удалось получить ссылку для загрузки");

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", j1.uploadUrl);
        xhr.setRequestHeader("Content-Type", mimeType);
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed: HTTP ${xhr.status}`));
        };
        xhr.onerror = () => reject(new Error("Сетевая ошибка"));
        xhr.send(blob);
      });

      const r3 = await fetch(`/api/videos/${j1.videoId}/finalize`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ duration_sec: durationSec }),
      });
      if (!r3.ok) {
        const t = await r3.text().catch(() => "");
        throw new Error(`Не удалось завершить: ${t || r3.status}`);
      }

      toast("Видеообзор загружен");
      onUploaded();
      onClose();
    } catch (e: any) {
      toast(e?.message || "Ошибка загрузки");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  if (!open) return null;

  const isRecording = recorder.state === "recording";
  const isStopping = recorder.state === "stopping";
  const showFloating = isRecording || isStopping || uploading;

  // ── Floating-виджет в правом нижнем углу — экран свободен для взаимодействия ──
  if (showFloating) {
    return (
      <div
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 10000,
          background: "#fff", border: "0.5px solid #111",
          padding: 16, width: 220,
          boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
          fontFamily: "var(--af-font)",
        }}
      >
        <p style={{
          fontFamily: "var(--af-font-mono)", fontSize: 9,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: "#646464", margin: 0, marginBottom: 10,
        }}>
          {isRecording ? "Запись" : isStopping ? "Остановка..." : `Загрузка ${progress}%`}
        </p>

        {/* Камера-превью (всегда в DOM пока stream активен) */}
        <div style={{
          position: "relative", width: 96, height: 96, margin: "0 auto 12px",
          borderRadius: "50%", overflow: "hidden", border: "2px solid #111",
          background: "#111",
        }}>
          <video
            ref={setPreviewVideoEl}
            muted
            playsInline
            autoPlay
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
          {isRecording && (
            <div style={{
              position: "absolute", top: 6, left: 6, width: 8, height: 8,
              borderRadius: "50%", background: "#c00", animation: "afpulse 1.5s infinite",
            }} />
          )}
        </div>

        <p style={{
          textAlign: "center", fontFamily: "var(--af-font-mono)",
          fontSize: 18, fontWeight: 600, margin: 0, marginBottom: 12,
        }}>
          {isRecording ? formatDuration(recorder.duration) : isStopping ? "..." : `${progress}%`}
        </p>

        {uploading && (
          <div style={{ height: 4, background: "#EBEBEB", marginBottom: 12 }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#111", transition: "width .2s" }} />
          </div>
        )}

        {isRecording && (
          <button
            onClick={handleStop}
            className="af-btn"
            style={{ width: "100%", background: "#c00", borderColor: "#c00", color: "#fff" }}
          >
            Остановить
          </button>
        )}

        <style>{`
          @keyframes afpulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>
    );
  }

  // ── Стартовая модалка ──
  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(17,17,17,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10000, padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff", maxWidth: 480, width: "100%", padding: 28,
          fontFamily: "var(--af-font)",
        }}
      >
        <p style={{
          fontFamily: "var(--af-font-mono)", fontSize: 10,
          letterSpacing: "0.14em", textTransform: "uppercase",
          color: "#646464", margin: 0, marginBottom: 14,
        }}>
          Видеообзор
        </p>
        <h3 style={{
          fontFamily: "var(--af-font-display)", fontSize: 22, fontWeight: 700,
          margin: 0, marginBottom: 16,
        }}>
          Записать пояснение
        </h3>

        {browserUnsupported ? (
          <>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "#c00", marginBottom: 12 }}>
              Запись видеообзоров не поддерживается в этом браузере.
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "#333", marginBottom: 20 }}>
              Откройте Archflow в Chrome или Edge на десктопе. Safari, мобильные Safari/Chrome не умеют захватывать экран.
            </p>
            <button onClick={onClose} className="af-btn af-btn-ghost" style={{ width: "100%" }}>
              Закрыть
            </button>
          </>
        ) : recorder.error ? (
          <>
            <p style={{ fontSize: 13, lineHeight: 1.6, color: "#c00", marginBottom: 16 }}>
              {recorder.error}
            </p>
            <p style={{ fontSize: 12, lineHeight: 1.5, color: "#666", marginBottom: 20 }}>
              Возможные причины: запретили доступ к экрану или камере, отменили выбор окна. Попробуйте снова и в диалоге браузера выберите «Поделиться» вкладкой/окном с открытым файлом.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleStart} className="af-btn" style={{ flex: 1 }}>
                Попробовать снова
              </button>
              <button onClick={onClose} className="af-btn af-btn-ghost" style={{ flex: 1 }}>
                Отмена
              </button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: "#333", marginBottom: 14 }}>
              Запишите 1–3 минуты с пояснением: открыть чертёж/визуализацию на экране и проговорить решения. Заказчик увидит видео рядом с файлом. Максимум 5 минут.
            </p>
            <p style={{ fontSize: 12, lineHeight: 1.5, color: "#646464", marginBottom: 8, fontWeight: 600 }}>
              Дальше браузер спросит:
            </p>
            <ul style={{ fontSize: 12, lineHeight: 1.6, color: "#333", marginBottom: 16, paddingLeft: 18, margin: 0 }}>
              <li><b>Что записывать</b> — выберите «Вкладку» с этим файлом или «Окно». Запись «Всего экрана» тоже работает.</li>
              <li><b>Камеру и микрофон</b> — разрешите оба, чтобы было слышно вас и видно лицо.</li>
            </ul>
            <p style={{ fontSize: 11, color: "#888", margin: 0, marginBottom: 20, marginTop: 12 }}>
              После старта окно свернётся в маленький виджет в углу — экран будет свободен для взаимодействия.
            </p>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={handleStart} className="af-btn" style={{ flex: 1 }}>
                Начать запись
              </button>
              <button onClick={onClose} className="af-btn af-btn-ghost" style={{ flex: 1 }}>
                Отмена
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
