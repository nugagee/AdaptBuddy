/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'neuro-blue': '#6C9BFF',
        'neuro-yellow': '#FFD166',
        'neuro-green': '#4CAF7D',
        'neuro-bg': '#F8F9FA',
      },
      fontFamily: {
        'dyslexic': ['Open Dyslexic', 'sans-serif'],
      }
    },
  },
  plugins: [],
}