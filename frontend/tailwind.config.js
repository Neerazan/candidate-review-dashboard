/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ng: {
          blue: '#1A3DE8',
          'blue-dark': '#1430C0',
          'blue-light': '#EEF0FD',
          red: '#E01010',
          'red-light': '#FDEAEA',
          ink: '#0F0F1A',
          muted: '#5A5A72',
          ghost: '#9898A8',
          surface: '#F7F8FF',
          line: '#E4E6F0',
          white: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['"Manrope"', '"Segoe UI"', 'sans-serif'],
      },
      boxShadow: {
        panel: '0 10px 30px rgba(15, 15, 26, 0.08)',
      },
    },
  },
  plugins: [],
}
