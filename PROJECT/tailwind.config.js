/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        canvas: 'var(--bg-canvas)',
        card: 'var(--bg-card)',
        elevated: 'var(--bg-elevated)',
        hover: 'var(--bg-hover)',
        active: 'var(--bg-active)',

        border: 'var(--border)',
        borderMid: 'var(--border-mid)',
        borderStrong: 'var(--border-strong)',

        text1: 'var(--text-1)',
        text2: 'var(--text-2)',
        text3: 'var(--text-3)',
        text4: 'var(--text-4)',

        accent: 'var(--accent)',
        accentDim: 'var(--accent-dim)',
        accentBorder: 'var(--accent-border)',

        green: 'var(--green)',
        greenDim: 'var(--green-dim)',
        red: 'var(--red)',
        redDim: 'var(--red-dim)',
        amber: 'var(--amber)',
        amberDim: 'var(--amber-dim)',

        easy: 'var(--easy)',
        medium: 'var(--medium)',
        hard: 'var(--hard)',
      },
      borderRadius: {
        sm: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
        full: 'var(--r-full)',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif'
        ],
        mono: [
          'ui-monospace',
          'SFMono-Regular',
          'Menlo',
          'Monaco',
          'Consolas',
          'monospace'
        ],
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
      }
    },
  },
  plugins: [],
}
