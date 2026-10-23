'use client';

import { useRef } from 'react';
import { cn } from '@/lib/cn';
import { useLowPower, useMotionOk, useOnScreen } from './hooks';

/**
 * Faint kiln smoke rising from the bottom edge of a section. CSS keyframes on
 * transform and opacity only; paused off-screen; none with reduced motion.
 */
export function SmokeParticles({ tone = 'green', className }: { tone?: 'green' | 'white'; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(ref);
  const motionOk = useMotionOk();
  const low = useLowPower();
  const puffs = [8, 22, 37, 63, 78, 91].slice(0, low ? 3 : 6);
  return (
    <div
      ref={ref}
      className={cn('pointer-events-none absolute inset-x-0 bottom-0 -z-[5] h-2/3 overflow-hidden', className)}
      aria-hidden
    >
      {motionOk &&
        puffs.map((x, i) => (
          <span
            key={x}
            className={cn(
              'mk-smoke absolute bottom-0 rounded-full blur-2xl',
              tone === 'white' ? 'bg-white/20' : 'bg-mk-primary/10',
            )}
            style={{
              left: `${x}%`,
              width: 90 + (i % 3) * 40,
              height: 90 + (i % 3) * 40,
              animationDelay: `${i * 1.7}s`,
              animationDuration: `${11 + (i % 3) * 2}s`,
              animationPlayState: onScreen ? 'running' : 'paused',
            }}
          />
        ))}
    </div>
  );
}

const blobTones = {
  green: 'bg-mk-primary/[0.09]',
  amber: 'bg-mk-amber/[0.12]',
  brick: 'bg-mk-brick/[0.07]',
  teal: 'bg-teal-500/[0.07]',
} as const;

export type BlobTone = keyof typeof blobTones;

const blobPlaces = [
  'left-[-12%] top-[-10%] h-[28rem] w-[34rem]',
  'right-[-14%] top-[30%] h-[32rem] w-[30rem]',
  'left-[20%] bottom-[-20%] h-[22rem] w-[36rem]',
];

/** Two or three large blurred colour fields that slowly drift and breathe behind a section. */
export function MeshBlobs({ tones = ['green', 'amber'], className }: { tones?: BlobTone[]; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const onScreen = useOnScreen(ref);
  const motionOk = useMotionOk();
  return (
    <div ref={ref} className={cn('pointer-events-none absolute inset-0 -z-[8] overflow-hidden', className)} aria-hidden>
      {tones.slice(0, 3).map((tone, i) => (
        <span
          key={i}
          className={cn('absolute rounded-full blur-3xl', blobPlaces[i], blobTones[tone], motionOk && 'mk-blob')}
          style={{ animationDelay: `${i * -6}s`, animationPlayState: onScreen ? 'running' : 'paused' }}
        />
      ))}
    </div>
  );
}
