/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary:  { DEFAULT: '#4F46E5', hover: '#4338CA', light: '#EEF2FF' },
        success:  { DEFAULT: '#16A34A', light: '#DCFCE7' },
        warning:  { DEFAULT: '#D97706', light: '#FEF3C7' },
        danger:   { DEFAULT: '#DC2626', light: '#FEE2E2' },
        neutral:  { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 700: '#374151', 900: '#111827' },
      },
    },
  },
  plugins: [],
};
