import type { Config } from 'tailwindcss';

const scale = (name: string) =>
  Object.fromEntries(
    [50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((step) => [
      step,
      `rgb(var(--${name}-${step}) / <alpha-value>)`,
    ]),
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
        mk: {
          bg: token('mk-bg'),
          surface: token('mk-surface'),
          border: token('mk-border'),
          primary: {
            DEFAULT: token('mk-primary'),
            hover: token('mk-primary-hover'),
            soft: token('mk-primary-soft'),
            deep: token('mk-primary-deep'),
          },
          text: token('mk-text'),
          muted: token('mk-muted'),
          brick: { DEFAULT: token('mk-brick'), soft: token('mk-brick-soft') },
          amber: { DEFAULT: token('mk-amber'), soft: token('mk-amber-soft') },
          red: { DEFAULT: token('mk-red'), soft: token('mk-red-soft') },
        },
      },
      boxShadow: {
        'mk-soft': '0 1px 2px rgb(15 23 42 / 0.04), 0 8px 24px -12px rgb(15 23 42 / 0.12)',
        'mk-lift': '0 2px 4px rgb(15 23 42 / 0.04), 0 20px 40px -16px rgb(45 106 67 / 0.25)',
        'mk-device': '0 30px 60px -20px rgb(15 23 42 / 0.30), 0 12px 24px -12px rgb(15 23 42 / 0.15)',
      },
      fontFamily: {
        sans: ['"Inter Variable"', 'system-ui', 'sans-serif'],
        wordmark: ['var(--font-wordmark)', 'Montserrat', 'system-ui', 'sans-serif'],
      },
      borderRadius: { sm: '6px', DEFAULT: 'var(--radius)', md: 'var(--radius)', lg: '12px', mk: '20px' },
    },
  },
  plugins: [],
};

export default config;
