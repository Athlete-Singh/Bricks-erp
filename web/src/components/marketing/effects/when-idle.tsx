'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * Mounts purely decorative children once the browser is idle after load, so
 * they add nothing to hydration and do not delay the first interaction.
 */
export function WhenIdle({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 2500 });
      return () => window.cancelIdleCallback?.(id);
    }
    const t = setTimeout(() => setReady(true), 1200);
    return () => clearTimeout(t);
  }, []);
  return ready ? <>{children}</> : null;
}
