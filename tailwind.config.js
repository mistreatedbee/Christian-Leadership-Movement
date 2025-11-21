export default {
  content: [
  './index.html',
  './src/**/*.{js,ts,jsx,tsx}'
],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'brand-dark-blue': '#1B1C5F',
        'navy-ink': '#12133F',
        'gold': '#BD9E39',
        'soft-gold': '#D8C27A',
        'muted-gray': '#F5F6FA',
      },
      darkMode: {
        'brand-dark-blue': '#2B3C7F',
        'navy-ink': '#1A2B5F',
        'muted-gray': '#1F2937',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'card': '8px',
        'hero': '20px',
      },
      boxShadow: {
        'soft': '0 6px 18px rgba(16, 24, 40, 0.08)',
      }
    },
  },
  plugins: [],
}