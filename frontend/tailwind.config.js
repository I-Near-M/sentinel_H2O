/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        onahau: {
          50: '#ecfdff',
          100: '#ccf9ff',
          200: '#a3f2fe',
          300: '#64e5fc',
          400: '#1ecff2',
          500: '#02b2d8',
          600: '#048eb6',
          700: '#0b7193',
          800: '#135c77',
          900: '#144c65',
          950: '#073145',
        }
      },
      animation: {
        'float-slow': 'float 6s ease-in-out infinite',
        'float-medium': 'float 4s ease-in-out infinite',
        'pulse-subtle': 'pulseSlow 4s ease-in-out infinite',
      }
    },
  },
  plugins: [],
}
