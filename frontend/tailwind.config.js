/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: '#0D1F3C', 700: '#16305a', 50: '#eef1f6' },
        gold: { DEFAULT: '#C9A227' },
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'Segoe UI', 'Noto Sans JP', 'sans-serif'] },
    },
  },
  plugins: [],
};
