/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: 'class',
    content: [
      './src/**/*.{ts,tsx}',
      './app/**/*.{ts,tsx}',
      './components/**/*.{ts,tsx}',
    ],
    theme: {
      extend: {
        colors: {
          brand: {
            DEFAULT: '#3b82f6',
            dark: '#0f0f23',
            light: '#f9fafb',
          },
          accent: {
            blue: '#3b82f6',
            purple: '#a855f7',
            teal: '#14b8a6',
            white: '#ffffff',
          },
        },
        fontFamily: {
          sans: ['var(--font-geist-sans)', 'sans-serif'],
          mono: ['var(--font-geist-mono)', 'monospace'],
        },
      },
    },
    plugins: [],
  };