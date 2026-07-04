import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#4F46E5",
          hover: "#4338CA",
          tint: "#EEF2FF",
          text: "#3730A3",
        },
        status: {
          applied: "#A1A1AA",
          screening: "#378ADD",
          interview: "#7F77DD",
          offer: "#639922",
          rejected: "#E24B4A",
        },
        page: "#FAFAFA",
        column: "#F2F2F4",
        "card-border": "#DEDEE2",
      },
      fontFamily: {
        sans: ["var(--font-pretendard)"],
      },
    },
  },
};

export default config;
