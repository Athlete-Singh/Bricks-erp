'use client';

import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/cn';
import { useMotionOk, useOnScreen } from './hooks';
import { edgeFade, grainTile, gridTile, mk, strokeOpacity, wallTile, type Intensity } from './patterns';

export type BrickVariant = 'wall' | 'cracked' | 'building' | 'blueprint' | 'stacked' | 'solid-green';

/** Brick size in the tile (two bricks per 64px course). */
const BW = 32;
const BH = 16;

const fadeStyle = {
  maskImage: edgeFade,
  WebkitMaskImage: edgeFade,
  maskComposite: 'intersect',
  WebkitMaskComposite: 'source-in',
} as const;

function Grain({ opacity = 0.025 }: { opacity?: number }) {
  return <div className="absolute inset-0 mix-blend-multiply" style={{ backgroundImage: grainTile, opacity }} />;
}

/**
 * A few bricks tinted terracotta, two missing, hairline cracks — leakage, drawn
 * in the wall itself. Kept to the outer thirds so text never sits on them.
 */
const cracked: { r: number; c: number; kind: 'tint' | 'missing' }[] = [
  { r: 3, c: 2, kind: 'tint' },
  { r: 4, c: 3, kind: 'missing' },
  { r: 9, c: 1, kind: 'tint' },
  { r: 14, c: 4, kind: 'tint' },
  { r: 22, c: 2, kind: 'missing' },
  { r: 27, c: 5, kind: 'tint' },
  { r: 5, c: 38, kind: 'tint' },
  { r: 6, c: 40, kind: 'missing' },
  { r: 12, c: 42, kind: 'tint' },
  { r: 18, c: 37, kind: 'tint' },
  { r: 25, c: 41, kind: 'missing' },
  { r: 31, c: 39, kind: 'tint' },
];

function CrackedOverlay() {
  return (
    <svg className="absolute left-0 top-0 h-full w-full" aria-hidden>
      {cracked.map(({ r, c, kind }) => {
        const x = c * BW + (r % 2 ? BW / 2 : 0);
        const y = r * BH;
        return kind === 'missing' ? (
          <rect key={`${r}-${c}`} x={x + 1} y={y + 1} width={BW - 1} height={BH - 1} fill={mk.bg} opacity={0.95} />
        ) : (
          <g key={`${r}-${c}`}>
            <rect x={x + 1} y={y + 1} width={BW - 1} height={BH - 1} fill={mk.brick} opacity={0.1} />
            <path
              d={`M${x + 6} ${y + 2} l4 4 -3 3 5 5`}
              fill="none"
              stroke={mk.brick}
              strokeOpacity={0.35}
              strokeWidth={0.8}
            />
          </g>
        );
      })}
    </svg>
  );
}

/** Drafting marks: dimension lines with end ticks and tiny labels. */
function BlueprintOverlay() {
  const dim = (x1: number, y1: number, x2: number, y2: number, label: string, key: string) => {
    const vertical = x1 === x2;
    return (
      <g key={key} stroke={mk.primary} strokeOpacity={0.22} fill={mk.primary} fillOpacity={0.3}>
        <line x1={x1} y1={y1} x2={x2} y2={y2} />
        {vertical ? (
          <>
            <line x1={x1 - 4} y1={y1} x2={x1 + 4} y2={y1} />
            <line x1={x2 - 4} y1={y2} x2={x2 + 4} y2={y2} />
          </>
        ) : (
          <>
            <line x1={x1} y1={y1 - 4} x2={x1} y2={y1 + 4} />
            <line x1={x2} y1={y2 - 4} x2={x2} y2={y2 + 4} />
          </>
        )}
        <text
          x={vertical ? x1 + 6 : (x1 + x2) / 2}
          y={vertical ? (y1 + y2) / 2 : y1 - 6}
          fontSize="9"
          fontFamily="ui-monospace, monospace"
          stroke="none"
          textAnchor={vertical ? 'start' : 'middle'}
        >
          {label}
        </text>
      </g>
    );
  };
  return (
    <svg className="absolute inset-0 h-full w-full" aria-hidden>
      {dim(32, 120, 224, 120, '230 mm', 'a')}
      {dim(40, 160, 40, 320, '1,000 bricks', 'b')}
      <svg x="100%" overflow="visible">
        {dim(-224, 140, -40, 140, '110 mm', 'c')}
        {dim(-48, 180, -48, 300, '75 mm', 'd')}
      </svg>
    </svg>
  );
}

/** Rows of the wall appear from the bottom up as the section scrolls in, or as steps advance. */
function BuildingWall({ progress, opacity }: { progress?: number; opacity: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const motionOk = useMotionOk();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const clip: MotionValue<string> = useTransform(scrollYProgress, (v) => {
    if (!motionOk) return 'inset(0 0 0 0)';
    const el = ref.current;
    const rows = el ? Math.max(1, Math.floor(el.offsetHeight / BH)) : 40;
    const reveal = Math.min(1, Math.max(v * 1.6 - 0.1, progress ?? 0));
    const shown = Math.ceil(reveal * rows) / rows;
    return `inset(${(1 - shown) * 100}% 0 0 0)`;
  });
  return (
    <div ref={ref} className="absolute inset-0">
      <div className="absolute inset-0" style={{ backgroundImage: wallTile(mk.primary, 0.02) }} />
      <motion.div
        className="absolute inset-0"
        style={{ backgroundImage: wallTile(mk.primary, opacity), clipPath: clip, backgroundPosition: 'left bottom' }}
      />
    </div>
  );
}

/** Columns of bricks rising like a bar chart along the bottom of the section. */
const stackHeights = [3, 5, 4, 7, 6, 9, 5, 8, 11, 7, 10, 6, 12, 9];

function StackedBricks() {
  const ref = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(ref, '-10% 0px');
  const motionOk = useMotionOk();
  return (
    <div ref={ref} className="absolute inset-x-0 bottom-0 flex h-2/3 items-end justify-between gap-1 px-2 opacity-70">
      {stackHeights.map((h, col) => (
        <div key={col} className={cn('flex flex-col-reverse gap-[3px]', col % 2 && 'hidden sm:flex')}>
          {Array.from({ length: h }, (_, i) => (
            <motion.span
              key={i}
              className="block h-3 w-8 rounded-[3px] border border-mk-primary/15 bg-mk-primary/[0.05]"
              initial={motionOk ? { opacity: 0, y: -24 } : false}
              animate={onScreen || !motionOk ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: col * 0.05 + i * 0.06, ease: 'easeOut' }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * The home page's signature backdrop. Absolutely fills its (relative,
 * isolated) parent behind the content. Static variants are plain CSS tiles;
 * only "building" and "stacked" run any script.
 */
export function BrickBackground({
  variant = 'wall',
  intensity = 'subtle',
  progress,
  className,
}: {
  variant?: BrickVariant;
  intensity?: Intensity;
  /** "building" only: 0–1 from the page (e.g. the active step), never less than the scroll reveal. */
  progress?: number;
  className?: string;
}) {
  const opacity = strokeOpacity[intensity];

  if (variant === 'solid-green') {
    return (
      <div className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)} aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-mk-primary to-mk-primary-deep" />
        <div className="absolute inset-0" style={{ backgroundImage: wallTile(mk.white, opacity + 0.06) }} />
        <Grain opacity={0.05} />
      </div>
    );
  }

  return (
    <div
      className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}
      style={fadeStyle}
      aria-hidden
    >
      {variant === 'building' ? (
        <BuildingWall progress={progress} opacity={opacity + 0.015} />
      ) : variant === 'blueprint' ? (
        <>
          <div className="absolute inset-0" style={{ backgroundImage: gridTile(mk.primary, 0.035) }} />
          <div className="absolute inset-0" style={{ backgroundImage: wallTile(mk.primary, opacity * 0.6) }} />
          <BlueprintOverlay />
        </>
      ) : (
        <div className="absolute inset-0" style={{ backgroundImage: wallTile(mk.primary, opacity) }} />
      )}
      {variant === 'cracked' && <CrackedOverlay />}
      {variant === 'stacked' && <StackedBricks />}
      <Grain />
    </div>
  );
}
