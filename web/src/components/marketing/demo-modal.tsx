'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, Loader2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { submitDemoRequest } from '@/features/marketing/api/demo-request';
import { validateDemoRequest, type DemoErrors, type DemoField } from '@/lib/demo-request';
import { demo, whatsappHref } from '@/lib/marketing-content';
import { cn } from '@/lib/cn';
import { OPEN_DEMO_EVENT } from './demo';
import { Button } from './ui/button';

type Status = 'idle' | 'submitting' | 'success' | 'error';

const empty: Record<DemoField, string> = { name: '', mobile: '', kilnName: '', location: '', kilnCount: '1' };

const fieldProps: Record<DemoField, { type: string; inputMode?: 'numeric' | 'tel'; autoComplete?: string }> = {
  name: { type: 'text', autoComplete: 'name' },
  mobile: { type: 'tel', inputMode: 'tel', autoComplete: 'tel-national' },
  kilnName: { type: 'text', autoComplete: 'organization' },
  location: { type: 'text', autoComplete: 'address-level2' },
  kilnCount: { type: 'number', inputMode: 'numeric' },
};

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function DemoModal() {
  const [open, setOpen] = useState(false);
  const [values, setValues] = useState(empty);
  const [errors, setErrors] = useState<DemoErrors>({});
  const [status, setStatus] = useState<Status>('idle');
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const onOpen = () => {
      returnFocus.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    };
    window.addEventListener(OPEN_DEMO_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_DEMO_EVENT, onOpen);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    // A finished request starts fresh next time; a half-filled one is kept.
    if (status === 'success') {
      setValues(empty);
      setStatus('idle');
    }
    returnFocus.current?.focus();
  }, [status]);

  // Lock page scroll, move focus in, trap Tab, close on Escape.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(
      () =>
        (
          dialogRef.current?.querySelector<HTMLElement>('input') ??
          dialogRef.current?.querySelector<HTMLElement>('button')
        )?.focus(),
      50,
    );
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const items = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, close]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const result = validateDemoRequest(values);
    if (!result.ok) {
      setErrors(result.errors);
      const firstBad = (Object.keys(result.errors) as DemoField[])[0];
      if (firstBad) dialogRef.current?.querySelector<HTMLElement>(`#demo-${firstBad}`)?.focus();
      return;
    }
    setErrors({});
    setStatus('submitting');
    try {
      const res = await submitDemoRequest(result.data);
      if (!res.ok) {
        setErrors(res.fields ?? {});
        setStatus('idle');
        return;
      }
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const set = (field: DemoField, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
    if (errors[field]) setErrors((er) => ({ ...er, [field]: undefined }));
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(e) => e.target === e.currentTarget && close()}
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="demo-title"
            aria-describedby="demo-subtitle"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-[24px] bg-white p-6 shadow-mk-device sm:rounded-[24px] sm:p-8"
          >
            <button
              type="button"
              onClick={close}
              aria-label={demo.close}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-mk-muted hover:bg-mk-bg hover:text-mk-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-primary"
            >
              <X className="h-5 w-5" />
            </button>

            {status === 'success' ? (
              <div className="py-6 text-center" role="status">
                <motion.span
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-mk-primary-soft"
                >
                  <CheckCircle2 className="h-9 w-9 text-mk-primary" aria-hidden />
                </motion.span>
                <h2 id="demo-title" className="mt-5 text-2xl font-bold text-mk-text">
                  {demo.successTitle}
                </h2>
                <p id="demo-subtitle" className="mt-2 text-mk-muted">
                  {demo.successText}
                </p>
                <Button className="mt-6" size="lg" onClick={close}>
                  {demo.close}
                </Button>
              </div>
            ) : (
              <>
                <h2 id="demo-title" className="pr-10 text-2xl font-bold text-mk-text">
                  {demo.title}
                </h2>
                <p id="demo-subtitle" className="mt-1 text-sm text-mk-muted">
                  {demo.subtitle}
                </p>
                <form onSubmit={submit} noValidate className="mt-6 grid gap-4">
                  <fieldset disabled={status === 'submitting'} className="grid gap-4 sm:grid-cols-2">
                    {(Object.keys(empty) as DemoField[]).map((field) => (
                      <div key={field} className={cn(field === 'name' || field === 'kilnName' ? 'sm:col-span-2' : '')}>
                        <label htmlFor={`demo-${field}`} className="mb-1.5 block text-sm font-medium text-mk-text">
                          {demo.fields[field]}
                        </label>
                        <input
                          id={`demo-${field}`}
                          name={field}
                          {...fieldProps[field]}
                          {...(field === 'kilnCount' ? { min: 1, max: 50 } : {})}
                          value={values[field]}
                          onChange={(e) => set(field, e.target.value)}
                          aria-invalid={errors[field] ? true : undefined}
                          aria-describedby={errors[field] ? `demo-${field}-error` : undefined}
                          className={cn(
                            'h-12 w-full rounded-xl border bg-white px-4 text-base text-mk-text placeholder:text-mk-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-mk-primary disabled:bg-mk-bg',
                            errors[field] ? 'border-mk-red' : 'border-mk-border',
                          )}
                        />
                        {errors[field] && (
                          <p id={`demo-${field}-error`} className="mt-1 text-sm text-mk-red">
                            {errors[field]}
                          </p>
                        )}
                      </div>
                    ))}
                  </fieldset>
                  {status === 'error' && (
                    <p className="rounded-xl bg-mk-red-soft px-4 py-3 text-sm text-mk-red" role="alert">
                      {demo.error}{' '}
                      <a
                        href={whatsappHref()}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold underline"
                      >
                        WhatsApp
                      </a>
                    </p>
                  )}
                  <Button type="submit" size="lg" disabled={status === 'submitting'} className="mt-2 w-full">
                    {status === 'submitting' ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
                        {demo.submitting}
                      </>
                    ) : (
                      demo.submit
                    )}
                  </Button>
                </form>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
