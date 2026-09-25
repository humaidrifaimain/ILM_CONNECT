/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Sharp Sans"', 'var(--font-manrope)', 'system-ui', 'sans-serif'],
        heading: ['var(--font-poppins)', '"Poppins"', 'var(--font-manrope)', 'system-ui', 'sans-serif'],
        display: ['var(--font-poppins)', '"Poppins"', 'var(--font-manrope)', 'system-ui', 'sans-serif'],
        serif: ['"Sharp Sans"', 'var(--font-manrope)', 'system-ui', 'sans-serif'],
        arabic: ['var(--font-amiri)', 'Noto Naskh Arabic', 'serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#095F46',
          primary: '#095F46',
          secondary: '#0B8663',
          bright: '#10BF8D',
          gray: '#B3B3B3',
        },
        emerald: {
          50: '#eefaf6',
          100: '#d7f4e9',
          200: '#afe9d4',
          300: '#77d8b8',
          400: '#10BF8D',
          500: '#0B8663',
          600: '#095F46',
          700: '#084e3b',
          800: '#073f31',
          900: '#06342a',
          950: '#031e18',
        },
        teal: {
          50: '#eefaf6',
          100: '#d7f4e9',
          200: '#afe9d4',
          300: '#77d8b8',
          400: '#10BF8D',
          500: '#0B8663',
          600: '#095F46',
          700: '#084e3b',
          800: '#073f31',
          900: '#06342a',
          950: '#031e18',
        },
      },
      borderRadius: {
        xl: '0.75rem',
        '2xl': '1rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.5s ease-out forwards',
        shimmer: 'shimmer 1.5s infinite',
      },
    },
  },
  plugins: [],
};
