'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';
import { useEffect, useState } from 'react';
import { footer, whatsappHref } from '@/lib/marketing-content';

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden>
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.1l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.2 2.2 2.2 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3Z" />
    </svg>
  );
}

/** WhatsApp chat and "back to top", fixed bottom-right. */
export function FloatingActions() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 900);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="fixed bottom-3 right-3 z-40 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <AnimatePresence>
        {showTop && (
          <motion.button
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            onClick={() => window.scrollTo({ top: 0 })}
            aria-label={footer.backToTop}
            className="hidden h-11 w-11 items-center justify-center rounded-full border border-mk-border bg-white sm:flex text-mk-text shadow-mk-soft hover:bg-mk-primary-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-primary"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
      <a
        href={whatsappHref()}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={footer.whatsapp}
        className="flex h-11 w-11 items-center justify-center sm:h-14 sm:w-14 rounded-full bg-[#25D366] text-white shadow-mk-device transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-mk-primary focus-visible:ring-offset-2 motion-reduce:hover:scale-100"
      >
        <WhatsAppIcon className="h-6 w-6 sm:h-7 sm:w-7" />
      </a>
    </div>
  );
}
