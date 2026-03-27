'use client';
import { useEffect } from 'react';
import { Icons } from './Icons';

interface ToastProps {
  msg: string;
  onClose: () => void;
}

export default function Toast({ msg, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed bottom-6 right-6 z-[200] animate-slide-up">
      <div className="bg-[#111827] text-white text-sm px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2">
        <Icons.Check className="w-4 h-4 text-emerald-400" />
        {msg}
      </div>
    </div>
  );
}
