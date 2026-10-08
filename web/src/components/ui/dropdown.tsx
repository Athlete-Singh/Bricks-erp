'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface DropdownProps {
  /** The control that opens the menu. Gets the open state so it can show a caret. */
  trigger: (props: { open: boolean }) => ReactNode;
  children: (props: { close: () => void }) => ReactNode;
  align?: 'start' | 'end';
  label: string;
  className?: string;
}

/**
 * Small menu used by the user, company and kiln switchers. Hand-rolled rather
 * than pulling in a headless-UI dependency for three call sites: closes on Esc,
 * on outside click, and returns focus to the trigger.
 */
export function Dropdown({ trigger, children, align = 'end', label, className }: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={label}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {trigger({ open })}
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className={cn(
            'absolute top-full z-50 mt-1 min-w-[12rem] overflow-hidden rounded-md border border-border bg-surface py-1 shadow-lg',
            align === 'end' ? 'right-0' : 'left-0',
          )}
        >
          {children({ close: () => setOpen(false) })}
        </div>
      )}
    </div>
  );
}

interface DropdownItemProps {
  onSelect?: () => void;
  disabled?: boolean;
  active?: boolean;
  children: ReactNode;
  className?: string;
}

export function DropdownItem({ onSelect, disabled, active, children, className }: DropdownItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onSelect}
      className={cn(
        'flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors',
        'hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        active ? 'font-medium text-primary' : 'text-foreground',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{children}</p>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-border" role="separator" />;
}
