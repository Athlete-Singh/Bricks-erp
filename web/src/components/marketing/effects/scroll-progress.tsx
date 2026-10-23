'use client';

import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { useMotionOk } from './hooks';

/** A thin green bar across the top that fills as the page is read, with a brick riding its tip. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const motionOk = useMotionOk();
  const smooth = useSpring(scrollYProgress, { stiffness: 140, damping: 30, mass: 0.3 });
  const progress = motionOk ? smooth : scrollYProgress;
  const tip = useTransform(progress, (v) => `calc(${v * 100}vw - 10px)`);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px]" aria-hidden>
      <motion.div
        className="h-full origin-left bg-gradient-to-r from-mk-primary to-mk-primary-hover"
        style={{ scaleX: progress }}
      />
      <motion.span
        className="absolute -top-[3px] left-0 block h-[9px] w-[14px] rounded-[2px] border border-white/70 bg-mk-brick shadow-sm"
        style={{ x: tip }}
      />
    </div>
  );
}
