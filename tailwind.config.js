/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js}'],
  theme: {
    extend: {
      colors: {
        ink: '#243836',
        moss: '#0B8A8F',
        leaf: '#2AA8AD',
        sage: '#E7F2F0',
        straw: '#F7F3EA',
        paper: '#FFFDF7',
        clay: '#bd7651',
        honey: '#e8b65e'
      },
      fontFamily: { display: ['Georgia', 'serif'], sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: { soft: '0 18px 50px rgba(11, 138, 143, .10)' }
    }
  },
  plugins: [require('@tailwindcss/typography')]
};
