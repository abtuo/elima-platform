import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  safelist: [
    "from-blue-500", "to-blue-600",
    "from-purple-500", "to-purple-600",
    "from-green-500", "to-green-600",
    "from-amber-500", "to-amber-600",
    "from-slate-600", "to-slate-700",
    "bg-purple-500", "bg-blue-500", "bg-green-500", "bg-amber-500",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#2E8B57",
        secondary: "#FFD700",
        accent: "#1F2937",
        background: "#F9FAFB",
        success: "#22C55E",
        danger: "#EF4444",
        revision: "#7C3AED",
        parent: "#2E8B57",
        teacher: "#256F47",
        admin: "#1F2937",
        muted: "#6B7280",
      },
      borderRadius: {
        xl2: "1.25rem",
        xl3: "1.75rem",
      },
      boxShadow: {
        soft: "0 10px 30px rgba(31, 41, 55, 0.08)",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
