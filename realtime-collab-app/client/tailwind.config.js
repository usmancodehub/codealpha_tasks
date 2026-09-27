/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      screens: {
        xs: '480px', // extra small breakpoint for phones
      },
      colors: {
        dark: '#0f172a',
        panel: '#1e293b',
        light: '#f8fafc',
        primary: '#3b82f6',
        accent: '#8b5cf6',
      },
    },
  },
  plugins: [],
};