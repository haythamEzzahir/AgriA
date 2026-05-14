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
