/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        andino: { 
          50: '#f2f7f2', 100: '#e0eee1', 200: '#c2dfc5', 300: '#97c69c', 400: '#6aa872', 
          500: '#488a53', 600: '#356e40', 700: '#2c5735', 800: '#25472d', 900: '#203b27' 
        },
        lago: { 
          50: '#eff8ff', 100: '#dbeffe', 200: '#bfe3fe', 300: '#93d5fd', 400: '#60bffa', 
          500: '#3b9ff6', 600: '#2583eb', 700: '#1d6fd8', 800: '#1e5bb0', 900: '#1e4e8a' 
        },
        tierra: { 
          50: '#faf6f0', 100: '#f2e8d8', 200: '#e4cfab', 300: '#d4b07c', 400: '#c69359', 
          500: '#b97f41', 600: '#9d6534', 700: '#7f502c', 800: '#684328', 900: '#573823' 
        },
        oro: {
          400: '#fbbf24', 500: '#f59e0b', 600: '#d97706'
        }
      },
      fontFamily: { 
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Outfit', 'Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        'glow': '0 0 25px -5px rgba(72, 138, 83, 0.45)',
        'glow-lg': '0 0 45px -10px rgba(72, 138, 83, 0.55)',
        'glow-oro': '0 0 30px -5px rgba(245, 158, 11, 0.45)',
        '3d-card': '0 20px 40px -15px rgba(32, 59, 39, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.04)',
        '3d-card-hover': '0 30px 60px -18px rgba(32, 59, 39, 0.28), 0 10px 20px -10px rgba(44, 87, 53, 0.2)',
        'inner-light': 'inset 0 1px 1px 0 rgba(255, 255, 255, 0.25)'
      },
      animation: {
        'float-slow': 'float 7s ease-in-out infinite',
        'float-medium': 'float 5s ease-in-out infinite',
        'float-reverse': 'floatReverse 6s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
        'shimmer': 'shimmer 2.5s linear infinite',
        'fade-up': 'fadeUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'mountain-breathe': 'mountainBreathe 12s ease-in-out infinite'
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(-12px) rotate(1.5deg)' }
        },
        floatReverse: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '50%': { transform: 'translateY(10px) rotate(-1.5deg)' }
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.04)' }
        },
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(200%)' }
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(24px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        mountainBreathe: {
          '0%, 100%': { transform: 'scale(1) translateY(0)' },
          '50%': { transform: 'scale(1.015) translateY(-3px)' }
        }
      }
    }
  },
  plugins: []
};
