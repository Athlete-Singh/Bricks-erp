'use client';

import { motion, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/cn';
import { useLowPower, useMotionOk, useOnScreen } from './hooks';

/** One isometric brick: a light top, a mid front face and a dark side. */
export function IsoBrick({ className, tone = 'brick' }: { className?: string; tone?: 'brick' | 'green' }) {
  const faces =
    tone === 'brick'
      ? { top: '#E8957F', front: '#C8553D', side: '#9E3F2C' }
      : { top: '#8FC9A1', front: '#2D6A43', side: '#1F4D31' };
  return (
    <svg viewBox="0 0 60 40" className={className} aria-hidden>
      <path d="M8 12 30 4l22 8-22 8Z" fill={faces.top} />
      <path d="M8 12v14l22 8V20Z" fill={faces.front} />
      <path d="M52 12v14l-22 8V20Z" fill={faces.side} />
      <path d="M14 20.5v5M22 23.5v5" stroke="#000" strokeOpacity=".12" />
    </svg>
  );
}

interface Spot {
  /** Percent from the left; kept within the outer 6% on each side so text is never covered. */
  x: number;
  y: number;
  size: number;
  /** 0.2 (far) … 1 (near): sets parallax speed, blur and opacity. */
  depth: number;
  tone: 'brick' | 'green';
  delay: number;
}

const spots: Spot[] = [
  { x: 3, y: 18, size: 44, depth: 0.9, tone: 'brick', delay: 0 },
  { x: 2, y: 58, size: 28, depth: 0.4, tone: 'green', delay: 1.2 },
  { x: 5, y: 86, size: 36, depth: 0.7, tone: 'brick', delay: 2.1 },
  { x: 94, y: 10, size: 30, depth: 0.5, tone: 'green', delay: 0.6 },
  { x: 96, y: 46, size: 22, depth: 0.25, tone: 'brick', delay: 1.8 },
  { x: 95, y: 74, size: 40, depth: 0.85, tone: 'brick', delay: 0.3 },
  { x: 5, y: 40, size: 18, depth: 0.2, tone: 'brick', delay: 2.6 },
  { x: 92, y: 94, size: 24, depth: 0.35, tone: 'green', delay: 1.4 },
];

function Floater({ spot, play }: { spot: Spot; play: boolean }) {
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, (v) => v * -0.12 * spot.depth);
  return (
    <motion.div
      className="absolute"
      style={{
        left: `${spot.x}%`,
        top: `${spot.y}%`,
        width: spot.size,
        y,
        opacity: 0.25 + spot.depth * 0.5,
        filter: spot.depth < 0.4 ? 'blur(1.5px)' : undefined,
      }}
    >
      <div
        className="mk-float"
        style={{
          animationDelay: `${spot.delay}s`,
          animationDuration: `${7 + spot.depth * 4}s`,
          animationPlayState: play ? 'running' : 'paused',
        }}
      >
        <IsoBrick tone={spot.tone} className="drop-shadow-sm" />
      </div>
    </motion.div>
  );
}

/**
 * Small 3D bricks drifting in the side margins at different depths. Wide
 * screens only (on a phone the margins are where the text is); static and
 * fewer on weak devices; still when off-screen or with reduced motion.
 */
export function FloatingBricks({ count = 8, className }: { count?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(ref);
  const motionOk = useMotionOk();
  const low = useLowPower();
  const shown = spots.slice(0, low ? Math.min(4, count) : count);
  return (
    <div ref={ref} className={cn('pointer-events-none absolute inset-0 -z-[5] hidden md:block', className)} aria-hidden>
      {shown.map((s, i) => (
        <Floater key={i} spot={s} play={onScreen && motionOk} />
      ))}
    </div>
  );
}
