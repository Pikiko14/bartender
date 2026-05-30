/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{vue,ts,js}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#08080d',
          900: '#0f0f17',
          800: '#161622',
          700: '#1f1f2e',
          600: '#2a2a3d',
        },
        neon: {
          pink: '#ff2d95',
          purple: '#9d4edd',
          cyan: '#22d3ee',
          lime: '#a3e635',
          amber: '#fbbf24',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        neon: '0 0 20px rgba(255, 45, 149, 0.35)',
        'neon-cyan': '0 0 20px rgba(34, 211, 238, 0.35)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
};
