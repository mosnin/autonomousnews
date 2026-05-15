import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Times New Roman"', '"Cheltenham"', "Georgia", "serif"],
        display: ['"Georgia"', '"Times New Roman"', "serif"],
        sans: ['"Helvetica Neue"', "Helvetica", "Arial", "sans-serif"],
      },
      colors: {
        ink: "#121212",
        rule: "#e2e2e2",
        muted: "#5a5a5a",
        accent: "#326891",
        wash: "#f7f7f5",
      },
      maxWidth: {
        content: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
