"use client";

import { useEffect } from "react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Удалить",
  cancelLabel = "Отмена",
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) onCancel();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in"
      onClick={loading ? undefined : onCancel}
    >
      <div
        className="bg-srf p-6 w-full max-w-[380px] mx-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-[15px] font-semibold mb-2">{title}</h3>
        <p className="text-[13px] text-ink-muted leading-relaxed mb-6">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            className="btn btn-secondary text-[13px] py-2 px-4"
            onClick={onCancel}
            disabled={loading}
          >
            {cancelLabel}
          </button>
          <button
            className={`text-[13px] py-2 px-4 font-medium transition-all ${
              danger
                ? "bg-[#111] text-white hover:bg-[#111]"
                : "bg-ink text-srf hover:bg-ink-hover"
            } ${loading ? "opacity-60 cursor-not-allowed" : ""}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Удаление..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
