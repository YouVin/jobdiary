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
        platform: {
          saramin: { bg: "#F4F4F5", text: "#3F3F46" },
          wanted: { bg: "#EEF2FF", text: "#3730A3" },
          jobkorea: { bg: "#FEF2F2", text: "#991B1B" },
        },
        text: {
          primary: "#18181B",
          secondary: "#52525B",
          muted: "#A1A1AA",
        },
        page: "#FAFAFA",
        column: "#F2F2F4",
        card: "#FFFFFF",
        "card-border": "#DEDEE2",
      },
      fontFamily: {
        sans: ["var(--font-pretendard)"],
      },
    },
  },
};

export default config;
