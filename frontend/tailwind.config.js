/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        farm: {
          50: '#fdf8f0', 100: '#f5e6d0', 200: '#e8cba0', 300: '#d4a76a',
          400: '#c08a40', 500: '#a07030', 600: '#805a28', 700: '#604520',
          800: '#403018', 900: '#2a1e10',
        },
        earth: '#8B6914',
        clay: '#C67B4A',
        sage: '#8CA87C',
        wheat: '#F5DEB3',
        soil: '#5C4033',
        agri: {
          950: '#0a120d',
          900: '#0f1a14',
          800: '#152b1e',
          700: '#1e3324',
          600: '#2d4a35',
          500: '#40916c',
          400: '#52b788',
          300: '#74c69d',
          200: '#95d5b2',
          100: '#b7e4c7',
          50: '#d8f3dc',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0', transform: 'translateY(8px)' }, '100%': { opacity: '1', transform: 'translateY(0)' } },
      },
      animation: { fadeIn: 'fadeIn 0.3s ease-out' },
    },
  },
  plugins: [],
};
