/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        google: {
          blue: '#1a73e8',
          'blue-hover': '#1557b0',
          'blue-surface': '#e8f0fe',
          'blue-border': '#c2e7ff',
          green: '#1e8e3e',
          'green-hover': '#137333',
          'green-surface': '#e6f4ea',
          'green-border': '#a8dab5',
          red: '#d93025',
          'red-surface': '#fce8e6',
          'red-border': '#f6c7c3',
          yellow: '#f9ab00',
          'yellow-hover': '#e37400',
          'yellow-surface': '#fef7e0',
          'yellow-border': '#fdd663',
          gray: {
            50: '#f8fafd',
            100: '#f1f3f4',
            200: '#e8eaed',
            300: '#dadce0',
            400: '#bdc1c6',
            500: '#5f6368',
            600: '#444746',
            700: '#3c4043',
            900: '#202124',
          },
        },
        // Alias lama -> palet Google Workspace ( agar komponen lain ikut konsisten).
        navy: { DEFAULT: '#1a73e8', 700: '#1557b0', 50: '#e8f0fe' },
        gold: { DEFAULT: '#f9ab00' },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['"Roboto Mono"', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      borderRadius: {
        card: '16px',
        inner: '10px',
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(60,64,67,0.08), 0 1px 2px 0 rgba(60,64,67,0.05)',
        'card-hover': '0 4px 12px 0 rgba(60,64,67,0.12)',
        bar: '0 -1px 3px 0 rgba(60,64,67,0.08), 0 -1px 2px 0 rgba(60,64,67,0.04)',
        pill: '0 1px 2px 0 rgba(60,64,67,0.30)',
      },
      keyframes: {
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-dot': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.45', transform: 'scale(0.85)' },
        },
      },
      animation: {
        'fade-in-up': 'fade-in-up 0.28s ease-out both',
        'pulse-dot': 'pulse-dot 1.8s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
