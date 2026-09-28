/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js}'],
  theme: {
    extend: {
      colors: {
        ink: '#19352b',
        moss: '#2e6b4f',
        leaf: '#6f9d63',
        sage: '#dfe9d2',
        straw: '#f4eedf',
        clay: '#bd7651',
        honey: '#e8b65e'
      },
      fontFamily: { display: ['Georgia', 'serif'], sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'] },
      boxShadow: { soft: '0 18px 50px rgba(35, 67, 47, .10)' }
    }
  },
  plugins: [require('@tailwindcss/typography')]
};
