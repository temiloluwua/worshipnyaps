/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          50: '#eff6ff',
          100: '#dbeafe',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        sky: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          700: '#0369a1',
        },
        orange: {
          50: '#fff7ed',
          500: '#f97316',
          700: '#c2410c',
        },
        gray: {
          50: '#f9fafb',
          100: '#f3f4f6',
          300: '#d1d5db',
          600: '#4b5563',
          800: '#1f2937',
          900: '#111827',
        },
        green: {
          600: '#16a34a',
          700: '#15803d',
        },
        red: {
          500: '#ef4444',
          600: '#dc2626',
        },
      },
    },
  },
  plugins: [],
}