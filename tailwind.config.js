/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        serif: ['"Newsreader"', '"Playfair Display"', "Georgia", "serif"],
        sans: ['"Plus Jakarta Sans"', "Inter", "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', "monospace"],
      },
      colors: {
        paper: "#FAF8F5",
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#1C1917",
          muted: "#78716C",
          subtle: "#A8A29E",
        },
        terracotta: {
          DEFAULT: "#C85A32",
          dark: "#B94A26",
          hover: "#A33C1B",
          subtle: "#FDF5F1",
          border: "#E8C2B3",
        },
        cognac: {
          DEFAULT: "#92400E",
          subtle: "#FEF3C7",
        },
        olive: {
          DEFAULT: "#4A5D4E",
          subtle: "#EDF2EE",
        },
        border: "#E7E5E4",
        input: "#D6D3D1",
        ring: "#C85A32",
        background: "#FAF8F5",
        foreground: "#1C1917",
      },
      borderRadius: {
        none: "0px",
        sm: "2px",
        DEFAULT: "2px",
        md: "3px",
        lg: "4px",
      },
      boxShadow: {
        sharp: "2px 2px 0px 0px #1C1917",
        "sharp-lg": "4px 4px 0px 0px #1C1917",
        "sharp-terracotta": "2px 2px 0px 0px #C85A32",
        "sharp-sm": "1px 1px 0px 0px #1C1917",
      },
    },
  },
  plugins: [],
};
