/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Lexend', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          orange: '#FF7A00',
          orangeDark: '#E66E00',
          gradientStart: '#FC5D32',
          gradientEnd: '#FD943A',
        },
        dark: {
          bg: '#0A0A0A',
          surface: '#121212',
          card: '#1E1E1E',
          border: '#2A2A2A',
        },
        light: {
          bg: '#F8F7F4',
          surface: '#F7F8FC',
          card: '#FFFFFF',
          border: '#E8E8E8',
        }
      }
    },
  },
  plugins: [],
}
