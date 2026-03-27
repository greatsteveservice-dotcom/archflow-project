import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

/** Helper: CSS variable as rgb() with alpha support */
const cv = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        // ─── Core Palette (CSS variables, RGB for opacity support) ───
        ink:            cv("ink"),
        "ink-hover":    cv("ink-hover"),
        "ink-secondary":cv("ink-secondary"),
        "ink-muted":    cv("ink-muted"),
        "ink-faint":    cv("ink-faint"),
        "ink-ghost":    cv("ink-ghost"),

        "srf":          cv("srf"),
        "srf-hover":    cv("srf-hover"),
        "srf-raised":   cv("srf-raised"),
        "srf-secondary":cv("srf-secondary"),

        "line":         cv("line"),
        "line-light":   cv("line-light"),

        // ─── Semantic ───
        "ok":      cv("ok"),
        "ok-bg":   cv("ok-bg"),
        "err":     cv("err"),
        "err-bg":  cv("err-bg"),
        "warn":    cv("warn"),
        "warn-bg": cv("warn-bg"),
        "info":    cv("info"),
        "info-bg": cv("info-bg"),
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
