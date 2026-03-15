/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./*.{js,ts,jsx,tsx}",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        discord: '#5865f2',
        brand: {
          pink: '#eb459e',
          green: '#3ba55c',
          yellow: '#faa61a',
          red: '#ed4245'
        }
      }
    },
  },
  plugins: [],
}
