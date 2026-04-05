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
          50: '#eef9f1',
          100: '#97dece',
          500: '#2dbc75', // BUS365 Green
          600: '#249a5f',
          700: '#1d7d4d',
          900: '#0b2e1c',
        },
        'dark-sidebar': '#222d32',
        'dark-sidebar-hover': '#1a2226',
        'dark-sidebar-active': '#1e282c',
        'sidebar-bg': "var(--sidebar-bg)",
        'sidebar-text': "var(--sidebar-text)",
        'sidebar-hover-bg': "var(--sidebar-hover-bg)",
        'sidebar-active-bg': "var(--sidebar-active-bg)",
        'stat-indigo': '#6610f2',
        'stat-red': '#dc3545',
        'stat-blue': '#007bff',
        'stat-cyan': '#17a2b8',
        'uber-blue': '#0052FF', // High-contrast Brand Blue
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
