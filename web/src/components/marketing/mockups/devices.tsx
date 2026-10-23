import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** A laptop drawn in CSS: bezel, screen, hinge and base. */
export function LaptopFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('w-full', className)}>
      <div className="rounded-t-2xl border border-slate-300 bg-slate-800 p-2 pb-3 shadow-mk-device sm:p-3">
        <div className="mx-auto mb-1.5 h-1.5 w-1.5 rounded-full bg-slate-600" aria-hidden />
        <div className="overflow-hidden rounded-md bg-mk-bg">{children}</div>
      </div>
      <div className="relative mx-auto h-3 w-[108%] -translate-x-[3.7%] rounded-b-xl bg-gradient-to-b from-slate-300 to-slate-400 shadow-mk-soft sm:h-4">
        <div
          className="absolute left-1/2 top-0 h-1.5 w-1/5 -translate-x-1/2 rounded-b-md bg-slate-400/80"
          aria-hidden
        />
      </div>
    </div>
  );
}

/** A phone drawn in CSS, with a notch. */
export function PhoneFrame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-[2.2rem] border border-slate-300 bg-slate-900 p-2 shadow-mk-device', className)}>
      <div className="relative overflow-hidden rounded-[1.75rem] bg-mk-bg">
        <div
          className="absolute left-1/2 top-1.5 z-10 h-4 w-20 -translate-x-1/2 rounded-full bg-slate-900"
          aria-hidden
        />
        {children}
      </div>
    </div>
  );
}

/** A browser window with a fake address bar. */
export function BrowserFrame({ url, children, className }: { url: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('overflow-hidden rounded-mk border border-mk-border bg-mk-surface shadow-mk-device', className)}>
      <div className="flex items-center gap-3 border-b border-mk-border bg-slate-50 px-4 py-2.5">
        <div className="flex gap-1.5" aria-hidden>
          <span className="h-3 w-3 rounded-full bg-red-400" />
          <span className="h-3 w-3 rounded-full bg-amber-400" />
          <span className="h-3 w-3 rounded-full bg-green-500" />
        </div>
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-mk-border bg-white px-3 py-1 text-xs text-mk-muted">
          <svg viewBox="0 0 16 16" className="h-3 w-3 shrink-0 fill-mk-primary" aria-hidden>
            <path d="M8 1a3.5 3.5 0 0 0-3.5 3.5V6H4a1 1 0 0 0-1 1v7a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1h-.5V4.5A3.5 3.5 0 0 0 8 1Zm2 5H6V4.5a2 2 0 1 1 4 0V6Z" />
          </svg>
          <span className="truncate">{url}</span>
        </div>
      </div>
      {children}
    </div>
  );
}
