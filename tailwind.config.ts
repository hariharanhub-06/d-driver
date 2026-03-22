import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: 'class',
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'card-bg': "var(--card-bg)",
        'border-default': "var(--border)",
        primary: {
          50: '#f2f7ff',
          100: '#e5effe',
          500: '#276ef1', // Uber Blue
          600: '#1e56be',
          700: '#153e8b',
          900: '#000000', // Uber Black
        },
        uber: {
          black: '#000000',
          white: '#ffffff',
          blue: '#276ef1',
          muted: '#262626',
        }
      },
      borderRadius: {
        'xl': '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'sans-serif'],
      },
      boxShadow: {
        'soft': '0 4px 24px -2px rgba(0, 0, 0, 0.1)',
        'premium': '0 12px 48px -12px rgba(0, 0, 0, 0.2)',
      }
    },
  },
  plugins: [],
};
export default config;
