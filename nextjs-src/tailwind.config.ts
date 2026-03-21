import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: "#111827",
        "accent-light": "#F3F4F6",
        "accent-hover": "#1F2937",
        danger: "#E85D3A",
        "danger-bg": "#FEF0EC",
        warning: "#D4930D",
        "warning-bg": "#FFF8E7",
        success: "#2A9D5C",
        "success-bg": "#EAFAF1",
        surface: "#FFFFFF",
        "surface-hover": "#FAFAF8",
        "bg-main": "#F9FAFB",
        "border-main": "#E5E7EB",
        "border-light": "#F3F4F6",
        "text-primary": "#111827",
        "text-secondary": "#6B7280",
        "text-muted": "#9CA3AF",
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
