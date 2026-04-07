"use client";

import { useState, useEffect } from "react";
import { Icons } from "./Icons";

const STORAGE_KEY = "archflow_tips_dismissed";

interface OnboardingTipProps {
  id: string;
  title: string;
  text: string;
  className?: string;
}

function getDismissedTips(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function dismissTip(id: string) {
  const dismissed = getDismissedTips();
  if (!dismissed.includes(id)) {
    dismissed.push(id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissed));
  }
}

export default function OnboardingTip({ id, title, text, className = "" }: OnboardingTipProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = getDismissedTips();
    if (!dismissed.includes(id)) {
      setVisible(true);
    }
  }, [id]);

  if (!visible) return null;

  const handleDismiss = () => {
    dismissTip(id);
    setVisible(false);
  };

  return (
    <div className={`bg-[var(--af-black)] text-white px-4 py-3 flex items-start gap-3 animate-fade-in ${className}`}>
      <div className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Icons.Info className="w-3 h-3" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[13px] font-medium mb-0.5" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{title}</div>
        <div className="text-[12px] text-[var(--af-border)] leading-relaxed" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{text}</div>
      </div>
      <button
        onClick={handleDismiss}
        className="p-1 text-[var(--af-border)] hover:text-white transition-colors flex-shrink-0"
      >
        <Icons.X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/** Reset all tips (for testing) */
export function resetOnboardingTips() {
  localStorage.removeItem(STORAGE_KEY);
}
