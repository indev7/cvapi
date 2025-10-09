import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        primary: 'var(--primary)',
        'primary-600': 'var(--primary-600)',
        secondary: 'var(--secondary)',
        accent: 'var(--accent)',
        muted: 'var(--muted)',
        card: 'var(--card)',
        border: 'var(--border)',
        success: 'var(--success)',
        warning: 'var(--warning)',
        danger: 'var(--danger)',
        'muted-text': 'var(--muted-text)'
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', ' -apple-system', 'Segoe UI', 'Roboto', 'Helvetica Neue', 'Arial'],
      },
      container: {
        center: true,
        padding: '1rem'
      }
    },
  },
  plugins: [],
};
export default config;