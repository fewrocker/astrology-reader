/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mystic: {
          bg: '#0a0a0f',
          surface: '#12121a',
          border: '#1e1e2e',
          gold: '#c9a84c',
          purple: '#7c5cbf',
          blue: '#4a7fb5',
          text: '#e8e6e3',
          muted: '#8a8694',
        },
      },
      fontFamily: {
        heading: ['Playfair Display', 'serif'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
