import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = 'center',
  className,
  as: Heading = 'h2',
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: 'center' | 'left';
  className?: string;
  as?: 'h1' | 'h2' | 'h3';
}) {
  return (
    <div className={cn('max-w-3xl', align === 'center' ? 'mx-auto text-center' : 'text-left', className)}>
      {eyebrow && <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-mk-primary">{eyebrow}</p>}
      <Heading className="text-3xl font-bold tracking-tight text-mk-text sm:text-4xl">{title}</Heading>
      {subtitle && <p className="mt-4 text-base leading-relaxed text-mk-muted sm:text-lg">{subtitle}</p>}
    </div>
  );
}
