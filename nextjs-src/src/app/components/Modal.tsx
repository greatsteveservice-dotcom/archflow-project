"use client";

import { ReactNode, useEffect } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export default function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center sm:items-center items-end justify-center z-50 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-srf rounded-t-2xl sm:rounded-2xl p-5 sm:p-7 w-full sm:w-[440px] max-w-full sm:max-w-[90vw] max-h-[90vh] overflow-y-auto shadow-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold mb-5">{title}</h2>
        {children}
      </div>
    </div>
  );
}
