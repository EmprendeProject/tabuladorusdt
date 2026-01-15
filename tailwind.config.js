/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#FF3399",
        "primary-light": "#FF85C1",
        "background-light": "#fdfbf7",
        "background-dark": "#1a1216",
        "accent-purple": "#a855f7",
      },
      fontFamily: {
        display: ["Noto Serif", "serif"],
        sans: ["Noto Sans", "ui-sans-serif", "system-ui"],
      },
      borderRadius: {
        DEFAULT: "0.25rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
    },
  },
  plugins: [],
}
