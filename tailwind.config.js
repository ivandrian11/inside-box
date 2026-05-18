/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sasak: {
          gold: '#D4AF37',
          goldLight: '#F4DF8D',
          terracotta: '#A0522D',
          dark: '#1A1614',
          charcoal: '#2C2420',
          cream: '#F5E6D3',
          accent: '#556B2F',
        },
        studio: {
          bg: '#F8F9FD',
          primary: '#6A7BA8', // Darker blue for better contrast
          secondary: '#A5B1D1',
          text: '#1E293B',
          textLight: '#475569',
          border: '#CBD5E1', 
          accent: '#5A6991',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'serif'],
        body: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      animation: {
        float: 'float 6s ease-in-out infinite',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-20px)' },
        },
      },
    },
  },
  plugins: [],
}
