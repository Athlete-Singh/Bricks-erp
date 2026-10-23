import raw from './brand.json';

/**
 * The shared brand (assets/brand/brand.json, copied here by `pnpm brand:sync`).
 * Change the name or the wordmark in that file only; every logo reads it.
 */
export interface BrandConfig {
  productName: string;
  wordmarkLine1: string;
  wordmarkLine2: { show: boolean; text: string; year: string; showBrickIcon: boolean };
  /** "auto" = the last I in line 1; "none" = no leaf; otherwise that letter's last occurrence. */
  leafLetter: string;
  colors: { primary: string; dark: string; light: string };
  tagline: string;
}

const defaults: BrandConfig = {
  productName: 'BRICS',
  wordmarkLine1: 'BRICK KILN',
  wordmarkLine2: { show: true, text: 'ESTD', year: '1999', showBrickIcon: true },
  leafLetter: 'auto',
  colors: { primary: '#2D6A43', dark: '#0B4A2A', light: '#9BE59B' },
  tagline: '',
};

const input = raw as Partial<BrandConfig>;

export const brandConfig: BrandConfig = {
  ...defaults,
  ...input,
  wordmarkLine2: { ...defaults.wordmarkLine2, ...input.wordmarkLine2 },
  colors: { ...defaults.colors, ...input.colors },
};

/** Index in `text` of the letter that wears the leaf, or -1. */
export function leafIndex(text: string, leafLetter = brandConfig.leafLetter): number {
  if (leafLetter === 'none') return -1;
  const letter = leafLetter === 'auto' ? 'i' : leafLetter.toLowerCase();
  return text.toLowerCase().lastIndexOf(letter);
}

/** Served icon files (web/public/brand/). */
export const brandIcon = {
  small: '/brand/logo-icon-128.webp',
  medium: '/brand/logo-icon-256.webp',
  large: '/brand/logo-icon-512.webp',
} as const;
