import Link from 'next/link';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'outline' | 'ghost';
type Size = 'md' | 'lg';

const base =
  'group inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl font-semibold transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-primary focus-visible:ring-offset-2 focus-visible:ring-offset-mk-bg disabled:pointer-events-none disabled:opacity-50';

const variants: Record<Variant, string> = {
  primary:
    'mk-shine bg-mk-primary text-white shadow-mk-soft transition-shadow hover:bg-mk-primary-hover hover:shadow-[0_8px_24px_-6px_rgb(45_106_67/0.55)]',
  outline: 'border border-mk-border bg-mk-surface text-mk-text hover:border-mk-primary/40 hover:bg-mk-primary-soft',
  ghost: 'text-mk-text hover:bg-mk-primary-soft hover:text-mk-primary',
};

const sizes: Record<Size, string> = {
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
};

export function buttonClass(variant: Variant = 'primary', size: Size = 'md', className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

interface Style {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

type LinkProps = Style & { href: string; external?: boolean } & Omit<
    ComponentPropsWithoutRef<'a'>,
    'href' | 'className'
  >;
type ButtonProps = Style & { href?: undefined } & Omit<ComponentPropsWithoutRef<'button'>, 'className'>;

/**
 * One button for the home page. With `href` it renders a link — a Next link
 * for routes, a plain anchor for `#section` jumps and outside URLs.
 */
export function Button(props: LinkProps | ButtonProps) {
  if (props.href !== undefined) return <LinkButton {...props} />;
  const { variant, size, className, type = 'button', ...rest } = props;
  return <button type={type} className={buttonClass(variant, size, className)} {...rest} />;
}

function LinkButton({ variant, size, className, href, external, ...rest }: LinkProps) {
  const classes = buttonClass(variant, size, className);
  if (external) return <a href={href} className={classes} target="_blank" rel="noopener noreferrer" {...rest} />;
  if (href.startsWith('#')) return <a href={href} className={classes} {...rest} />;
  return <Link href={href} className={classes} {...rest} />;
}
