import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { brand, seo } from '@/lib/marketing-content';

/**
 * Inter through next/font on the home page: self-hosted, the Latin file
 * preloaded, and a size-matched fallback, so the headline neither waits for
 * the font nor reflows when it arrives. latin-ext carries the ₹ sign.
 */
const inter = Inter({ subsets: ['latin', 'latin-ext'], display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(brand.siteUrl),
  title: seo.title,
  description: seo.description,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: brand.name,
    title: seo.title,
    description: seo.description,
    locale: 'en_IN',
  },
  twitter: { card: 'summary_large_image', title: seo.title, description: seo.description },
};

/** The public home page. Light only — the owner panel's dark mode does not apply here. */
export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`mk-root min-h-screen bg-mk-bg text-mk-text [color-scheme:light] ${inter.className}`}>
      {children}
    </div>
  );
}
