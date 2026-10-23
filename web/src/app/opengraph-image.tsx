import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { brandConfig } from '@/lib/brand';

export const alt = `${brandConfig.productName} — Brick Kiln ERP & Accounting`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/**
 * The share card, drawn at build time: the icon image plus the wordmark as
 * text from brand.json, so renaming never needs a new picture.
 */
export default async function OpengraphImage() {
  const icon = await readFile(join(process.cwd(), 'public/brand/icon-512.png'));
  const iconSrc = `data:image/png;base64,${icon.toString('base64')}`;
  const b = brandConfig;
  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 56,
        background: 'linear-gradient(135deg, #F3FAF5 0%, #E6F2EA 55%, #D6ECDD 100%)',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- ImageResponse renders plain img only */}
      <img src={iconSrc} width={300} height={300} alt="" />
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 96, fontWeight: 800, color: b.colors.dark, letterSpacing: -2, lineHeight: 1 }}>
          {b.wordmarkLine1.toUpperCase()}
        </div>
        {b.wordmarkLine2.show && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 18, color: b.colors.dark }}>
            <div style={{ width: 90, height: 3, background: b.colors.primary }} />
            <div style={{ fontSize: 32, letterSpacing: 10 }}>{`${b.wordmarkLine2.text}  ${b.wordmarkLine2.year}`}</div>
            <div style={{ width: 90, height: 3, background: b.colors.primary }} />
          </div>
        )}
        <div style={{ marginTop: 36, fontSize: 34, color: '#334155' }}>
          {`${b.productName} · Know every brick, every rupee.`}
        </div>
      </div>
    </div>,
    size,
  );
}
