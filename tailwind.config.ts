import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Alpine Daylight tokens
        bone: "#F6F5F0",
        paper: "#FFFFFF",
        line: "#E2E0D8",
        "line-strong": "#CFCDC3",
        ink: "#1F2A24",
        muted: "#6E7469",
        moss: {
          50: "#EEF3EF",
          100: "#DDE8E0",
          200: "#C0D2C6",
          300: "#97B4A3",
          400: "#6C8F79",
          500: "#2D4F3E",
          600: "#274536",
          700: "#203A2D",
          800: "#1A2F25",
          900: "#12211A",
        },
        burnt: {
          DEFAULT: "#D95D24",
          50: "#FBEDE5",
          100: "#F6D8C8",
          500: "#D95D24",
          600: "#B84A1C",
          700: "#8F3A16",
        },
        // Legacy semantic names kept so existing components inherit the light theme.
        charcoal: "#F6F5F0",
        panel: "#FFFFFF",
        gold: {
          50: "#EEF3EF",
          100: "#DDE8E0",
          200: "#1F3A2C",
          300: "#2D4F3E",
          400: "#274536",
          500: "#2D4F3E",
          600: "#203A2D",
          700: "#1A2F25",
          800: "#162A20",
          900: "#12211A",
        },
        emerald: "#2D4F3E",
        amber: "#B84A1C",
        coral: "#B23A2E",
        coraltext: "#9E3227",
      },
      fontFamily: {
        sans: ["Plus Jakarta Sans", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      borderRadius: {
        card: "16px",
        control: "8px",
        overlay: "20px",
      },
      boxShadow: {
        float:
          "0 16px 40px rgba(45,79,62,0.12), 0 3px 10px rgba(45,79,62,0.06)",
      },
      keyframes: {
        "amber-pulse": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.6" },
        },
      },
      animation: {
        "amber-pulse": "amber-pulse 2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
} satisfies Config;
