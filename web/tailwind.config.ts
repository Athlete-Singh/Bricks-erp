import type { Config } from 'tailwindcss';

const scale = (name: string) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((step) => [step, `rgb(var(--${name}-${step}) / <alpha-value>)`]),
  );
const token = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

/** Colours come only from CSS variables in src/styles/tokens.css (light + .dark). */
const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: scale('brand'),
        gold: scale('gold'),
        background: token('background'),
        surface: { DEFAULT: token('surface'), muted: token('surface-muted') },
        border: token('border'),
        foreground: token('foreground'),
        muted: { foreground: token('muted-foreground') },
        primary: { DEFAULT: token('primary'), foreground: token('primary-foreground') },
        accent: { DEFAULT: token('accent'), foreground: token('accent-foreground') },
        success: token('success'),
        warning: token('warning'),
        danger: token('danger'),
        info: token('info'),
        ring: token('ring'),
      },
      fontFamily: { sans: ['"Inter Variable"', 'system-ui', 'sans-serif'] },
      borderRadius: { sm: '6px', DEFAULT: 'var(--radius)', md: 'var(--radius)', lg: '12px' },
    },
  },
  plugins: [],
};

export default config;
