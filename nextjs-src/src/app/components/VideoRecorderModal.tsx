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

export default function VideoRecorderModal({ fileId, open, onClose, onUploaded, toast }: Props) {
  const recorder = useScreenRecorder();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const previewRef = useRef<HTMLVideoElement | null>(null);

  // Превью камеры в модалке во время записи
  useEffect(() => {
    if (previewRef.current && recorder.cameraStream) {
      previewRef.current.srcObject = recorder.cameraStream;
      previewRef.current.play().catch(() => {});
    }
  }, [recorder.cameraStream]);

  // Очистка при закрытии
  useEffect(() => {
    if (!open && recorder.state !== "idle") recorder.cancel();
  }, [open, recorder]);

  if (!open) return null;

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

      // 1. Получить presigned URL
      const r1 = await fetch("/api/videos/upload-url", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ fileId, mimeType }),
      });
      const j1 = await r1.json();
      if (!r1.ok) throw new Error(j1.error || "Не удалось получить ссылку для загрузки");

      // 2. Загрузить blob прямо в S3 (с прогрессом через XMLHttpRequest — fetch не даёт upload progress)
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

      // 3. Подтвердить + запустить транскрипцию
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

  const isRecording = recorder.state === "recording";
  const isStopping = recorder.state === "stopping";

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(17,17,17,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 10000, padding: 16,
      }}
      onClick={() => { if (!isRecording && !uploading) onClose(); }}
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
          {recorder.state === "idle" && !uploading && "Записать пояснение"}
          {recorder.state === "requesting" && "Выберите экран и камеру"}
          {isRecording && `Запись · ${formatDuration(recorder.duration)}`}
          {isStopping && "Завершаем запись..."}
          {uploading && `Загрузка · ${progress}%`}
        </h3>

        {recorder.error && (
          <p style={{ fontSize: 13, color: "#c00", marginBottom: 12 }}>{recorder.error}</p>
        )}

        {/* Превью камеры в кружке во время записи */}
        {(isRecording || isStopping) && (
          <div style={{
            position: "relative", width: 160, height: 160, margin: "0 auto 20px",
            borderRadius: "50%", overflow: "hidden", border: "2px solid #111",
          }}>
            <video
              ref={previewRef}
              muted
              playsInline
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            {isRecording && (
              <div style={{
                position: "absolute", top: 8, left: 8, width: 10, height: 10,
                borderRadius: "50%", background: "#c00", animation: "afpulse 1.5s infinite",
              }} />
            )}
          </div>
        )}

        {recorder.state === "idle" && !uploading && (
          <>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: "#333", marginBottom: 20 }}>
              Запишите 1-3 минуты с пояснением: открыть чертёж/визуализацию на экране и проговорить решения. Заказчик увидит видео рядом с файлом. Максимум 5 минут.
            </p>
            <p style={{ fontSize: 11, color: "#888", marginBottom: 20 }}>
              Браузер запросит разрешение на запись экрана и камеры.
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

        {isRecording && (
          <button onClick={handleStop} className="af-btn" style={{ width: "100%", background: "#c00", borderColor: "#c00", color: "#fff" }}>
            Остановить запись
          </button>
        )}

        {uploading && (
          <div style={{ marginTop: 12, height: 4, background: "#EBEBEB" }}>
            <div style={{ height: "100%", width: `${progress}%`, background: "#111", transition: "width .2s" }} />
          </div>
        )}

        <style>{`
          @keyframes afpulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}</style>
      </div>
    </div>
  );
}
