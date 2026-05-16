import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "media",
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        serif:   ["var(--font-serif)",   "Georgia", "serif"],
        sans:    ["var(--font-sans)",    "Helvetica Neue", "Arial", "sans-serif"],
      },
      colors: {
        ink:     "rgb(var(--ink) / <alpha-value>)",
        paper:   "rgb(var(--paper) / <alpha-value>)",
        rule:    "rgb(var(--rule) / <alpha-value>)",
        muted:   "rgb(var(--muted) / <alpha-value>)",
        accent:  "rgb(var(--accent) / <alpha-value>)",
        wash:    "rgb(var(--wash) / <alpha-value>)",
      },
      maxWidth: {
        content: "1320px",
        prose:   "44rem",
      },
      letterSpacing: {
        kicker: "0.14em",
      },
      fontSize: {
        kicker: ["11px", { lineHeight: "1.4", letterSpacing: "0.14em" }],
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 280ms cubic-bezier(.2,.7,.3,1) both",
      },
    },
  },
  plugins: [],
};

export default config;
