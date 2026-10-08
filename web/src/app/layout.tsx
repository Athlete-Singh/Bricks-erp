import type { Metadata } from 'next';
import '@fontsource-variable/inter';
import '../styles/tokens.css';
import '../styles/globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'BRICS ERP',
  description: 'Brick kiln ERP — production, labour, accounts, GST',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
