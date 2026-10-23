import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/cn';
import { type HTMLAttributes } from 'react';

const badgeVariants = cva('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', {
  variants: {
    variant: {
      default: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
      success: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
      warning: 'bg-gold-100 text-gold-700 dark:bg-gold-900/30 dark:text-gold-300',
      danger: 'bg-danger/10 text-danger',
      muted: 'bg-surface-muted text-muted-foreground',
    },
  },
  defaultVariants: { variant: 'default' },
});

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
