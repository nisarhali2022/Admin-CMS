/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
    './hooks/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#004f9f',
        'primary-dark': '#003d7a',
        'primary-light': '#e8f0fb',
        accent: '#f97316',
        'accent-dark': '#ea6c0a',
        navy: '#1e3a5f',
        'navy-dark': '#152b47',
        surface: '#f8fafc',
        border: '#e2e8f0',
        'text-primary': '#0f172a',
        'text-secondary': '#64748b',
        'text-muted': '#94a3b8',
      },
      fontFamily: {
        heading: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        body: ['var(--font-inter)', 'system-ui', 'sans-serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            color: '#0f172a',
            a: { color: '#004f9f', '&:hover': { color: '#003d7a' } },
            h2: { fontFamily: 'var(--font-inter)', color: '#0f172a' },
            h3: { fontFamily: 'var(--font-inter)', color: '#0f172a' },
            strong: { color: '#0f172a' },
          },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
}