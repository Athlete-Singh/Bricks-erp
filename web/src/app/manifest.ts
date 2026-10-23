import type { MetadataRoute } from 'next';
import { brandConfig } from '@/lib/brand';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${brandConfig.productName} — Brick Kiln ERP`,
    short_name: brandConfig.productName,
    start_url: '/dashboard',
    display: 'standalone',
    background_color: '#F8FAF9',
    theme_color: brandConfig.colors.primary,
    icons: [
      { src: '/brand/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/brand/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/brand/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
