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
module.exports = {
  darkMode: 'class', // This enables class-based dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Your existing colors...
        'neuro-blue': '#3B82F6',
        'neuro-green': '#10B981',
        // Add sepia/comfort mode colors
        'sepia': {
          50: '#fdf8f1',
          100: '#f8efe3',
          200: '#f2e3d1',
          300: '#e8d3b8',
          400: '#dbbd9a',
          500: '#cba47b',
          600: '#b8895e',
          700: '#9b6f4a',
          800: '#7e5a3d',
          900: '#664a33',
        }
      },
    },
  },
  plugins: [],
}