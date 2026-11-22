import type { Config } from 'tailwindcss';

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        eneba: {
          canvas: "#4618AC",     // Deep violet primary background
          dark: "#1F0A4D",       // Dark purple card / surface
          surface: "#2A1163",    // Lighter purple surface / hover state
          border: "#3F1B85",     // Border line color
          yellow: "#FAD318",     // Bright yellow primary CTA
          yellowHover: "#E5BE0B",
          orange: "#FD5A20",     // Discount / hot badge
          aquamarine: "#63E3C2", // Cashback / secure badge
        }
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;