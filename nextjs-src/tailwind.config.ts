import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ─── Core Palette (90% of the UI) ───
        ink: "#111827",           // primary text, buttons, accents
        "ink-hover": "#1F2937",   // hover on ink backgrounds
        "ink-secondary": "#374151", // secondary text (darker muted)
        "ink-muted": "#6B7280",   // muted text, labels
        "ink-faint": "#9CA3AF",   // faint text, placeholders
        "ink-ghost": "#D1D5DB",   // disabled text, subtle icons

        "srf": "#FFFFFF",         // surface (cards, modals)
        "srf-hover": "#FAFAF8",   // surface hover
        "srf-raised": "#F9FAFB",  // raised background (page bg)
        "srf-secondary": "#F3F4F6", // secondary surface (empty states)

        "line": "#E5E7EB",        // borders
        "line-light": "#F3F4F6",  // subtle borders/dividers

        // ─── Semantic (10% — only when meaning matters) ───
        "ok": "#16A34A",          // success, approved, paid
        "ok-bg": "#ECFDF3",       // success background
        "err": "#DC2626",         // error, issue, critical
        "err-bg": "#FEF2F2",      // error background
        "warn": "#D97706",        // warning, pending, in progress
        "warn-bg": "#FFF7ED",     // warning background
        "info": "#2563EB",        // info, new, links
        "info-bg": "#EFF6FF",     // info background
      },
      fontFamily: {
        body: ["DM Sans", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
      borderRadius: {
        xl: "12px",
        "2xl": "16px",
      },
      boxShadow: {
        sm: "0 1px 3px rgba(0,0,0,0.04)",
        md: "0 4px 16px rgba(0,0,0,0.06)",
        lg: "0 8px 32px rgba(0,0,0,0.08)",
      },
    },
  },
  plugins: [],
};
export default config;
