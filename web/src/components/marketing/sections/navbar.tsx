'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { nav } from '@/lib/marketing-content';
import { brandConfig } from '@/lib/brand';
import { Logo } from '@/components/brand/logo';
import { cn } from '@/lib/cn';
import { openDemo } from '../demo';
import { Button } from '../ui/button';
import { useSignedIn } from '../use-signed-in';

/** The brand mark in the navbar, linking home. */
export function NavLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${brandConfig.productName} home`}
      className={cn(
        'rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-primary',
        className,
      )}
    >
      <Logo variant="horizontal" size="sm" animated priority />
    </Link>
  );
}

/** The section whose top has most recently passed under the navbar. */
function useActiveSection(ids: string[]): string | null {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const targets = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => el !== null);
    if (targets.length === 0) return;
    const visible = new Map<string, number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) visible.set(e.target.id, e.boundingClientRect.top);
          else visible.delete(e.target.id);
        }
        const first = ids.find((id) => visible.has(id));
        setActive(first ?? null);
      },
      { rootMargin: '-80px 0px -55% 0px' },
    );
    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

const sectionIds = nav.links.map((l) => l.href.slice(1));

export function Navbar() {
  const signedIn = useSignedIn();
  const active = useActiveSection(sectionIds);
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const account = signedIn ? { label: nav.openDashboard, href: '/dashboard' } : { label: nav.login, href: '/login' };

  return (
    <header
      className={cn(
        'sticky top-0 z-50 border-b bg-white/80 backdrop-blur-md transition-colors',
        scrolled || open ? 'border-mk-border' : 'border-transparent',
      )}
    >
      <nav
        aria-label="Main"
        className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8"
      >
        <NavLogo />

        <ul className="hidden items-center gap-1 lg:flex">
          {nav.links.map((link) => {
            const isActive = active === link.href.slice(1);
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  aria-current={isActive ? 'true' : undefined}
                  className={cn(
                    'relative rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-primary',
                    isActive ? 'text-mk-primary' : 'text-mk-muted hover:text-mk-text',
                  )}
                >
                  {link.label}
                  {isActive && (
                    <motion.span
                      layoutId="mk-nav-active"
                      className="absolute inset-x-3 -bottom-0.5 h-0.5 rounded-full bg-mk-primary"
                    />
                  )}
                </a>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2">
          <Button href={account.href} variant="outline" className="hidden sm:inline-flex">
            {account.label}
          </Button>
          <Button onClick={openDemo} className="hidden sm:inline-flex">
            {nav.demo}
          </Button>
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-mk-text hover:bg-mk-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-primary lg:hidden"
            aria-expanded={open}
            aria-controls="mk-mobile-menu"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mk-mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="overflow-hidden border-t border-mk-border bg-white lg:hidden"
          >
            <ul className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-3 sm:px-6">
              {nav.links.map((link) => {
                const isActive = active === link.href.slice(1);
                return (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      onClick={() => setOpen(false)}
                      aria-current={isActive ? 'true' : undefined}
                      className={cn(
                        'block rounded-xl px-3 py-3 text-base font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-primary',
                        isActive ? 'bg-mk-primary-soft text-mk-primary' : 'text-mk-text hover:bg-mk-bg',
                      )}
                    >
                      {link.label}
                    </a>
                  </li>
                );
              })}
              <li className="mt-2 grid grid-cols-2 gap-2 sm:hidden">
                <Button href={account.href} variant="outline" size="lg">
                  {account.label}
                </Button>
                <Button
                  size="lg"
                  onClick={() => {
                    setOpen(false);
                    openDemo();
                  }}
                >
                  {nav.demo}
                </Button>
              </li>
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
