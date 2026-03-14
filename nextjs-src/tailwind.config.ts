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
        accent: "#2C5F2D",
        "accent-light": "#E8F0E8",
        "accent-hover": "#1E4620",
        danger: "#E85D3A",
        "danger-bg": "#FEF0EC",
        warning: "#D4930D",
        "warning-bg": "#FFF8E7",
        success: "#2A9D5C",
        "success-bg": "#EAFAF1",
        surface: "#FFFFFF",
        "surface-hover": "#FAFAF8",
        "bg-main": "#F7F6F3",
        "border-main": "#E8E6E1",
        "border-light": "#F0EEE9",
        "text-primary": "#1A1A1A",
        "text-secondary": "#6B6B6B",
        "text-muted": "#9B9B9B",
      },
      fontFamily: {
        body: ["Outfit", "sans-serif"],
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
