/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        mushroom: {
          50:  '#f7f3ef',
          100: '#ede4d8',
          200: '#d9c8b1',
          300: '#c4aa89',
          400: '#ae8d62',
          500: '#9a7245',
          600: '#7d5c37',
          700: '#5f4529',
          800: '#402e1c',
          900: '#22180e',
        },
      },
    },
  },
  plugins: [],
}


