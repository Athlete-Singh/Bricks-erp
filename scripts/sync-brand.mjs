#!/usr/bin/env node
/**
 * Copies the shared brand (assets/brand/) to where each app can read it:
 *   web    → web/public/brand/ (served files), web/src/app/ (favicon & icons),
 *            web/src/lib/brand.json (typed import)
 *   mobile → mobile/assets/brand/ (Flutter only bundles files inside its package)
 *
 * Runs before `web` dev and build. The copies are committed, so a deploy that
 * lacks assets/brand/ still builds — the script then warns and does nothing.
 * Run by hand after changing the logo or brand.json:  pnpm brand:sync
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'assets/brand');
const gen = join(src, 'generated');

if (!existsSync(join(src, 'brand.json'))) {
  console.warn('[brand:sync] assets/brand/brand.json not found — keeping the committed copies.');
  process.exit(0);
}

// Fail early on a broken brand.json rather than shipping it.
JSON.parse(readFileSync(join(src, 'brand.json'), 'utf8'));

/** [from, to] pairs, relative to the repo root. */
const copies = [
  ['assets/brand/brand.json', 'web/public/brand/brand.json'],
  ['assets/brand/brand.json', 'web/src/lib/brand.json'],
  ['assets/brand/logo-icon.png', 'web/public/brand/logo-icon.png'],
  ...[
    'logo-icon-128.webp',
    'logo-icon-256.webp',
    'logo-icon-512.webp',
    'icon-192.png',
    'icon-512.png',
    'maskable-512.png',
    'apple-touch-icon.png',
    'favicon.ico',
  ].map((f) => [`assets/brand/generated/${f}`, `web/public/brand/${f}`]),
  // Next.js app-router icon conventions: these generate the <link rel="icon"> tags.
  ['assets/brand/generated/favicon.ico', 'web/src/app/favicon.ico'],
  ['assets/brand/generated/icon-192.png', 'web/src/app/icon.png'],
  ['assets/brand/generated/apple-touch-icon.png', 'web/src/app/apple-icon.png'],

  ['assets/brand/brand.json', 'mobile/assets/brand/brand.json'],
  ...['logo-icon-256.webp', 'logo-icon-512.webp', 'android-foreground.png', 'ios-icon.png', 'splash-icon.png'].map(
    (f) => [`assets/brand/generated/${f}`, `mobile/assets/brand/${f}`],
  ),
];

let missing = 0;
for (const [from, to] of copies) {
  const a = join(root, from);
  if (!existsSync(a)) {
    console.warn(`[brand:sync] missing ${from} — run: python3 scripts/brand/generate-icons.py`);
    missing++;
    continue;
  }
  mkdirSync(dirname(join(root, to)), { recursive: true });
  copyFileSync(a, join(root, to));
}
console.log(`[brand:sync] ${copies.length - missing} files copied${missing ? `, ${missing} missing` : ''}.`);
if (!existsSync(gen)) console.warn('[brand:sync] no generated icons yet.');
