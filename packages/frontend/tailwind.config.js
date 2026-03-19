/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0066E6',
          dark: '#0052B8',
          light: '#1A7FFF',
        },
        secondary: {
          DEFAULT: '#1A1A1A',
          light: '#333333',
        },
      },
    },
  },
  plugins: [],
}
