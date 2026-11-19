/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif']
      },
      colors: {
        plum: {
          50: '#faf6fb', 100: '#f3eaf6', 200: '#e6d3ed', 300: '#d0aedd', 400: '#b382c7',
          500: '#975eae', 600: '#7c4592', 700: '#653877', 800: '#4b2a59', 900: '#2f1a39', 950: '#1e1026'
        }
      },
      keyframes: {
        pop: { '0%': { opacity: 0, transform: 'translateY(8px) scale(.98)' }, '100%': { opacity: 1, transform: 'none' } },
        slide: { '0%': { opacity: 0, transform: 'translateX(16px)' }, '100%': { opacity: 1, transform: 'none' } }
      },
      animation: {
        pop: 'pop .18s ease-out',
        slide: 'slide .2s ease-out'
      }
    }
  },
  plugins: []
};
