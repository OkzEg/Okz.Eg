/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Accent — terracotta #b77239
        wheat: {
          DEFAULT: '#b77239',
          50: '#f8efe6',
          100: '#f0dcc8',
          200: '#e0b890',
          300: '#c98a52',
          400: '#b77239',
          500: '#9a5d2e',
          600: '#7d4a24',
        },
        // Charcoal scale anchored on #2b262c
        timber: {
          50: '#f5f1e8',
          100: '#ebe5d8',
          200: '#d4cdc0',
          300: '#a39c94',
          400: '#6e686f',
          500: '#4a454c',
          600: '#3a353c',
          700: '#2b262c',
          800: '#1f1b20',
          900: '#121014',
        },
        cream: '#f5f1e8',
        ink: '#2b262c',
        primary: {
          50: '#f5f1e8',
          100: '#ebe5d8',
          500: '#4a454c',
          600: '#3a353c',
          700: '#2b262c',
          800: '#1f1b20',
          900: '#121014',
        },
      },
      fontFamily: {
        display: ['"Bebas Neue"', 'Impact', 'sans-serif'],
        sans: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
