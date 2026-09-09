/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      padding: {
        safe: "env(safe-area-inset-bottom, 0px)",
      },
    },
  },
  plugins: [],
}

