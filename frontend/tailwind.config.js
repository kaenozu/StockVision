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
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        'loss': {
          50: '#fef2f2', 
          100: '#fee2e2',
          200: '#fecaca',
          300: '#fca5a5',
          400: '#f87171',
          500: '#ef4444',
          600: '#dc2626',
          700: '#b91c1c',
          800: '#991b1b',
          900: '#7f1d1d',
        },
        // Theme colors for UI enhancement
        'primary': {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        'secondary': {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        }
      },
      // Responsive breakpoints for UI enhancement
      screens: {
        'xs': '320px',
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
        '2xl': '1920px',
      },
      // Animation for smooth transitions
      transitionDuration: {
        '400': '400ms',
        '600': '600ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      // Accessibility improvements
      outline: {
        'focus': ['2px solid #3b82f6', '2px'],
      },
      // Enhanced spacing
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
      },
      // Enhanced border radius
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      // Box shadow enhancements
      boxShadow: {
        'soft': '0 2px 15px 0 rgba(0, 0, 0, 0.1)',
        'medium': '0 4px 25px 0 rgba(0, 0, 0, 0.15)',
        'strong': '0 10px 40px 0 rgba(0, 0, 0, 0.2)',
      },
      // Typography enhancements
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.75rem' }],
      }
    },
  },
  darkMode: 'class',
  plugins: [],
}