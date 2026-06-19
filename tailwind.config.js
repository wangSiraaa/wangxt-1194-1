/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        steel: {
          950: "#0d0e11",
          900: "#14161b",
          850: "#191c22",
          800: "#1f232b",
          750: "#252a33",
          700: "#2a2f38",
          600: "#3a414d",
          500: "#4b5563",
        },
        spark: {
          DEFAULT: "#ff6a1a",
          300: "#ffae7c",
          400: "#ff8a4c",
          500: "#ff6a1a",
          600: "#e2540a",
        },
      },
      fontFamily: {
        display: ["Oswald", "sans-serif"],
        sans: ['"IBM Plex Sans"', "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      boxShadow: {
        "glow-spark": "0 0 22px rgba(255,106,26,0.35)",
        panel: "0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 24px rgba(0,0,0,0.4)",
      },
    },
  },
  plugins: [],
};
