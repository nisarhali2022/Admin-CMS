/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './features/**/*.{js,jsx}',
    '../packages/cms-core/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',
        primary: '#673de6',
        'primary-foreground': '#ffffff',
        muted: '#f4f5f7',
        'muted-foreground': '#6b7280',
      },
    },
  },
  plugins: [],
}
