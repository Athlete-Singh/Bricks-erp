import type { Metadata, Viewport } from 'next';
import { Montserrat } from 'next/font/google';
import '@fontsource-variable/inter';
import '../styles/tokens.css';
import '../styles/globals.css';
import { brandConfig } from '@/lib/brand';
import { Providers } from './providers';

/** The logo's wordmark face (heavy geometric sans). Not preloaded: it is small text, never the LCP. */
const wordmark = Montserrat({
  subsets: ['latin'],
  weight: ['600', '800'],
  display: 'swap',
  preload: false,
  variable: '--font-wordmark',
});

export const metadata: Metadata = {
  title: `${brandConfig.productName} ERP`,
  description: 'Brick kiln ERP — production, labour, accounts, GST',
};

export const viewport: Viewport = {
  themeColor: brandConfig.colors.primary,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={wordmark.variable}>
      <body className="bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
