/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'sans': ['Noto Sans CJK JP', 'Noto Sans JP', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Financial data colors
        'gain': {
          50: '#f0fdf4',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
        },
        'loss': {
          50: '#fef2f2', 
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
        }
      },
      // Responsive breakpoints for UI enhancement
      screens: {
        'xs': '320px',
        // sm: 640px (default)
        // md: 768px (default)
        // lg: 1024px (default)
        // xl: 1280px (default)
        '2xl': '1920px',
      },
      // Animation for smooth transitions
      transitionDuration: {
        '400': '400ms',
      },
      // Accessibility improvements
      outline: {
        'focus': ['2px solid #3b82f6', '2px'],
      }
    },
  },
  darkMode: 'class',
  plugins: [],
}