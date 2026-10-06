/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#070B0D',
        panel: '#111A1F',
        line: '#2A3237',
        text: '#E3E8EB',
        muted: '#AEB8BE',
        accent: '#5B8FB5',
      },
      boxShadow: { glow: '0 0 0 1px rgba(91,143,181,.18), 0 20px 50px rgba(0,0,0,.28)' },
    },
  },
  plugins: [],
};
