import type { CSSProperties } from 'react';
import { brandConfig, brandIcon, leafIndex } from '@/lib/brand';
import { cn } from '@/lib/cn';

type Variant = 'icon' | 'horizontal' | 'stacked';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/** Icon edge in px; the wordmark scales from it. */
const iconPx: Record<Size, number> = { xs: 22, sm: 36, md: 48, lg: 72, xl: 120 };

/**
 * Where the chimney's top sits in logo-icon (percent of the icon box), so the
 * smoke stays on it at every size. Measured from assets/brand/generated/
 * logo-icon-transparent.png; re-measure if the icon artwork changes.
 */
const CHIMNEY = { left: 51.5, top: 19.5 };

function Leaf({ animated }: { animated: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      aria-hidden
      className={cn('absolute bottom-[0.62em] left-1/2 h-[0.42em] w-[0.42em]', animated && 'brand-leaf')}
      style={animated ? undefined : { transform: 'translateX(-50%)' }}
    >
      <path
        d="M1.5 14.5C1.5 6.5 7 1.5 14.5 1.5 14.5 9 9.5 14.5 1.5 14.5Z"
        fill="currentColor"
        className="text-[#3FA35B]"
      />
      <path d="M2.5 13.5 11 5" stroke="#E7F7EA" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

/** Line 1 in caps, with the target "i" drawn dotless and a leaf for its dot. */
function WordmarkLine({ text, animated, leaf }: { text: string; animated: boolean; leaf: boolean }) {
  // The leaf belongs to wordmark line 1 only, not the short product name.
  const at = leaf ? leafIndex(text) : -1;
  const upper = text.toUpperCase();
  if (at < 0) return <>{upper}</>;
  return (
    <>
      {upper.slice(0, at)}
      <span className="relative inline-block">
        {/* U+0131: a dotless i, so the leaf can be its dot. Not uppercased on purpose. */}
        ı
        <Leaf animated={animated} />
      </span>
      {upper.slice(at + 1)}
    </>
  );
}

function BrickGlyph({ colour }: { colour: string }) {
  return (
    <svg viewBox="0 0 24 14" aria-hidden className="h-[1.15em] w-auto">
      <path d="M2 4.5 12 1l10 3.5-10 3.5Z" fill={colour} opacity=".55" />
      <path d="M2 4.5v5L12 13V8Z" fill={colour} />
      <path d="M22 4.5v5L12 13V8Z" fill={colour} opacity=".8" />
      <path d="M7.2 4.2h2.6M11 3h2.6M14.6 4.6h2.6" stroke="#fff" strokeWidth=".9" />
    </svg>
  );
}

function Icon({ px, animated, priority }: { px: number; animated: boolean; priority?: boolean }) {
  const src = px <= 64 ? brandIcon.small : brandIcon.medium;
  const src2x = px <= 64 ? brandIcon.medium : brandIcon.large;
  return (
    <span
      className="relative inline-block shrink-0 transition-transform duration-300 group-hover/logo:-translate-y-0.5 motion-reduce:transition-none"
      style={{ width: px, height: px }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- tiny, pre-sized WebP; next/image adds nothing here */}
      <img
        src={src}
        srcSet={`${src} 1x, ${src2x} 2x`}
        width={px}
        height={px}
        alt=""
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
        className="h-full w-full select-none transition-[filter] duration-300 group-hover/logo:brightness-105"
        draggable={false}
      />
      {animated &&
        [0, 1, 2].map((i) => (
          <span
            key={i}
            aria-hidden
            className="brand-smoke pointer-events-none absolute rounded-full bg-[radial-gradient(circle,rgb(255_255_255/0.95),rgb(214_240_220/0.55)_55%,transparent_72%)]"
            style={
              {
                left: `${CHIMNEY.left}%`,
                top: `${CHIMNEY.top}%`,
                width: px * 0.16,
                height: px * 0.16,
                marginLeft: -px * 0.08,
                marginTop: -px * 0.08,
                animationDelay: `${i * 0.8}s`,
                filter: px < 48 ? undefined : 'blur(0.5px)',
              } as CSSProperties
            }
          />
        ))}
    </span>
  );
}

/**
 * The BRICS logo: the icon (an image, no text) and the wordmark (live text
 * from brand.json — never baked into an image).
 *
 * - `icon`: icon only.
 * - `horizontal`: icon, wordmark to the right (navbar, sidebar).
 * - `stacked`: icon on top, wordmark centred below (login, loader, footer).
 *
 * `name="product"` shows the short product name ("BRICS") instead of the
 * two-line wordmark. `tone="onDark"` for green backgrounds. Animation is
 * off with `animated={false}` and under prefers-reduced-motion.
 */
export function Logo({
  variant = 'horizontal',
  size = 'md',
  animated = false,
  name = 'wordmark',
  tone = 'default',
  priority,
  className,
}: {
  variant?: Variant;
  size?: Size;
  animated?: boolean;
  name?: 'wordmark' | 'product';
  tone?: 'default' | 'onDark';
  /** Load the icon early (above-the-fold logos). */
  priority?: boolean;
  className?: string;
}) {
  const px = iconPx[size];
  const b = brandConfig;
  const dark = tone === 'onDark';
  const ink = dark ? '#FFFFFF' : b.colors.dark;
  const accent = dark ? b.colors.light : b.colors.primary;
  const line1 = name === 'product' ? b.productName : b.wordmarkLine1;
  const showLine2 = name === 'wordmark' && b.wordmarkLine2.show;

  if (variant === 'icon') {
    return (
      <span className={cn('group/logo inline-flex', className)} role="img" aria-label={b.productName}>
        <Icon px={px} animated={animated} priority={priority} />
      </span>
    );
  }

  const stacked = variant === 'stacked';
  // Proportions taken from the reference artwork: cap height ≈ 30% of the icon when stacked.
  const fontPx = Math.round(px * (stacked ? 0.34 : name === 'product' ? 0.5 : 0.42));

  return (
    <span
      className={cn(
        'group/logo inline-flex',
        stacked ? 'flex-col items-center text-center' : 'items-center',
        className,
      )}
      style={{ gap: stacked ? px * 0.14 : px * 0.26 }}
    >
      <Icon px={px} animated={animated} priority={priority} />
      <span className="sr-only">{b.productName}</span>
      <span aria-hidden className="flex flex-col" style={{ alignItems: stacked ? 'center' : 'flex-start' }}>
        <span
          className="whitespace-nowrap font-wordmark font-extrabold leading-none tracking-[-0.01em]"
          style={{ color: ink, fontSize: fontPx }}
        >
          <WordmarkLine text={line1} animated={animated} leaf={name === 'wordmark'} />
        </span>
        {showLine2 && (
          <span
            className="mt-[0.45em] flex w-full items-center gap-[0.6em] font-wordmark font-semibold leading-none"
            style={{ color: ink, fontSize: Math.max(7, Math.round(fontPx * 0.32)) }}
          >
            <span className="h-px min-w-[1.2em] flex-1" style={{ background: accent }} />
            <span className="tracking-[0.32em]">{b.wordmarkLine2.text}</span>
            {b.wordmarkLine2.showBrickIcon && <BrickGlyph colour={accent} />}
            <span className="tracking-[0.32em]">{b.wordmarkLine2.year}</span>
            <span className="h-px min-w-[1.2em] flex-1" style={{ background: accent }} />
          </span>
        )}
      </span>
    </span>
  );
}
