import type { Config } from "tailwindcss";

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
        body: ["'Vollkorn SC'", "serif"],
        mono: ["'Vollkorn SC'", "serif"],
        display: ["'Vollkorn SC'", "serif"],
      },
      borderRadius: {
        xl: "0px",
        "2xl": "0px",
      },
      boxShadow: {
        sm: "none",
        md: "none",
        lg: "none",
        xl: "none",
        "2xl": "none",
      },
    },
  },
  plugins: [],
};
export default config;
