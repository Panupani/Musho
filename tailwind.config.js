/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Sarabun', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // financial display sizes — big, readable at a glance
        'money-sm': ['1.5rem',  { lineHeight: '1.2', fontWeight: '700' }],
        'money':    ['2rem',    { lineHeight: '1.1', fontWeight: '700' }],
        'money-lg': ['2.5rem',  { lineHeight: '1',   fontWeight: '800' }],
      },
      spacing: {
        'tap': '52px',   // minimum accessible touch target
      },
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
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
}


