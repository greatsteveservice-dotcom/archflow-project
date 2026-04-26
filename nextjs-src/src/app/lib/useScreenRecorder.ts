"use client";

import { useCallback, useRef, useState } from "react";

// Loom-style screen + camera recorder.
// Захватывает экран (через getDisplayMedia) и камеру (через getUserMedia),
// миксует их в один canvas-stream с камерой как кружком в правом нижнем углу,
// записывает через MediaRecorder в webm.
//
// Ограничения:
// - Только в Chrome/Edge на десктопе (Safari getDisplayMedia ограничен)
// - Лимит длины 5 минут (300 сек) — иначе блобы становятся слишком тяжёлыми

export interface RecordingResult {
  blob: Blob;
  duration: number;
  mimeType: string;
}

export interface UseScreenRecorder {
  state: "idle" | "requesting" | "recording" | "stopping";
  duration: number;
  cameraStream: MediaStream | null;
  start: () => Promise<void>;
  stop: () => Promise<RecordingResult | null>;
  cancel: () => void;
  error: string | null;
}

const MAX_DURATION = 300; // 5 min

export function useScreenRecorder(): UseScreenRecorder {
  const [state, setState] = useState<UseScreenRecorder["state"]>("idle");
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const cleanup = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    cameraStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close().catch(() => {});
    screenStreamRef.current = null;
    cameraStreamRef.current = null;
    canvasRef.current = null;
    audioCtxRef.current = null;
    setCameraStream(null);
    setDuration(0);
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setState("requesting");
    try {
      const screen = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 } as any,
        audio: true, // системный звук, если разрешит ОС
      });
      const camera = await navigator.mediaDevices.getUserMedia({
        video: { width: 320, height: 240 },
        audio: true,
      });
      screenStreamRef.current = screen;
      cameraStreamRef.current = camera;
      setCameraStream(camera);

      // Если пользователь остановил расшаривание экрана через системную плашку —
      // автоматически завершаем запись.
      screen.getVideoTracks()[0].addEventListener("ended", () => {
        if (recorderRef.current?.state === "recording") recorderRef.current.stop();
      });

      const screenVideo = document.createElement("video");
      screenVideo.srcObject = screen;
      screenVideo.muted = true;
      await screenVideo.play();
      const cameraVideo = document.createElement("video");
      cameraVideo.srcObject = camera;
      cameraVideo.muted = true;
      await cameraVideo.play();

      const w = screenVideo.videoWidth || 1280;
      const h = screenVideo.videoHeight || 720;
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d")!;
      canvasRef.current = canvas;

      // Render loop — экран фоном, камера кружком в правом нижнем
      const camSize = Math.min(180, Math.round(h * 0.22));
      const camMargin = 24;
      const draw = () => {
        try {
          ctx.drawImage(screenVideo, 0, 0, w, h);
          ctx.save();
          ctx.beginPath();
          const cx = w - camMargin - camSize / 2;
          const cy = h - camMargin - camSize / 2;
          ctx.arc(cx, cy, camSize / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.lineWidth = 4;
          ctx.strokeStyle = "#fff";
          ctx.stroke();
          ctx.clip();
          ctx.drawImage(cameraVideo, w - camMargin - camSize, h - camMargin - camSize, camSize, camSize);
          ctx.restore();
        } catch {
          /* video not ready yet */
        }
        rafRef.current = requestAnimationFrame(draw);
      };
      draw();

      // Микс аудио: системный звук экрана (если есть) + микрофон камеры
      const audioCtx = new AudioContext();
      audioCtxRef.current = audioCtx;
      const dest = audioCtx.createMediaStreamDestination();
      if (screen.getAudioTracks().length > 0) {
        audioCtx.createMediaStreamSource(new MediaStream([screen.getAudioTracks()[0]])).connect(dest);
      }
      if (camera.getAudioTracks().length > 0) {
        audioCtx.createMediaStreamSource(new MediaStream([camera.getAudioTracks()[0]])).connect(dest);
      }

      const canvasStream = canvas.captureStream(30);
      dest.stream.getAudioTracks().forEach((t) => canvasStream.addTrack(t));

      // Выбор mime — webm/vp9 даёт хороший размер, webm/vp8 — фолбэк.
      // Safari не поддерживает webm в MediaRecorder, ему нужен mp4/h264.
      const mimeCandidates = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4;codecs=h264,aac",
        "video/mp4",
      ];
      const mimeType = mimeCandidates.find((m) => MediaRecorder.isTypeSupported(m)) || "";
      if (!mimeType) throw new Error("Браузер не поддерживает запись видео");

      const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 1_500_000 });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorderRef.current = recorder;
      recorder.start(1000); // chunks каждую секунду
      startedAtRef.current = Date.now();
      timerRef.current = setInterval(() => {
        const sec = Math.floor((Date.now() - startedAtRef.current) / 1000);
        setDuration(sec);
        if (sec >= MAX_DURATION && recorder.state === "recording") {
          recorder.stop();
        }
      }, 1000);

      setState("recording");
    } catch (e: any) {
      cleanup();
      setState("idle");
      const raw = e?.message || "";
      let msg = "Не удалось начать запись";
      if (e?.name === "NotAllowedError" || /not allowed/i.test(raw)) {
        msg = "Доступ к экрану или камере запрещён. Разрешите в настройках браузера и попробуйте снова.";
      } else if (e?.name === "NotFoundError" || /no.*device|not found/i.test(raw)) {
        msg = "Не найдена камера или микрофон. Подключите устройство и попробуйте снова.";
      } else if (/abort|cancel/i.test(raw)) {
        msg = "Выбор окна отменён.";
      } else if (/getDisplayMedia is not/i.test(raw)) {
        msg = "Браузер не поддерживает запись экрана. Используйте Chrome или Edge на десктопе.";
      }
      setError(msg);
    }
  }, [cleanup]);

  const stop = useCallback((): Promise<RecordingResult | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current;
      if (!recorder || recorder.state !== "recording") {
        cleanup();
        setState("idle");
        return resolve(null);
      }
      setState("stopping");
      recorder.onstop = () => {
        const totalSec = Math.floor((Date.now() - startedAtRef.current) / 1000);
        const mimeType = recorder.mimeType;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        cleanup();
        setState("idle");
        resolve({ blob, duration: totalSec, mimeType });
      };
      recorder.stop();
    });
  }, [cleanup]);

  const cancel = useCallback(() => {
    const recorder = recorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.onstop = null;
      try {
        recorder.stop();
      } catch {}
    }
    cleanup();
    setState("idle");
  }, [cleanup]);

  return { state, duration, cameraStream, start, stop, cancel, error };
}
