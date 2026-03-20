/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class', // Enables class-based dark mode
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'neuro-blue': '#3B82F6',
        'neuro-green': '#10B981',
        'neuro-yellow': '#FFD166',
        'neuro-bg': '#F8F9FA',
        // Sepia/comfort mode colors
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
      fontFamily: {
        'dyslexic': ['Open Dyslexic', 'sans-serif'],
      },
      animation: {
        'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      animationDelay: {
        '200': '200ms',
        '400': '400ms',
      }
    },
  },
  plugins: [],
}