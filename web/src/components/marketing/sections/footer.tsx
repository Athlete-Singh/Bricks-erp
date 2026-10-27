import { Mail, MessageCircle, Phone } from 'lucide-react';
import Link from 'next/link';
import { brand, contact, footer, nav, whatsappHref } from '@/lib/marketing-content';
import { Logo } from '@/components/brand/logo';
import { brandConfig } from '@/lib/brand';
import { BrickBackground } from '../effects/brick-background';

const linkClass =
  'rounded text-sm text-white/85 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white';

/** Kiln, chimney and a brick wall along the bottom edge; one wisp of smoke from the chimney. */
function Skyline() {
  return (
    <div className="pointer-events-none relative h-24 w-full sm:h-28" aria-hidden>
      <svg viewBox="0 0 1440 112" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full">
        <g fill="rgb(255 255 255 / 0.10)">
          <path d="M0 112V86h180v-14h120v40Z" />
          <path d="M260 112V64h150v48Z" />
          <path d="M318 64l8-58h18l8 58Z" />
          <path d="M520 112V78h220v34Z" />
          <path d="M900 112V60h140v52Z" />
          <path d="M952 60l7-48h16l7 48Z" />
          <path d="M1120 112V82h320v30Z" />
        </g>
        <g stroke="rgb(255 255 255 / 0.12)" fill="none">
          {Array.from({ length: 46 }, (_, i) => (
            <rect key={i} x={i * 32 - (Math.floor(i / 23) % 2) * 16} y={98} width={30} height={13} rx={1.5} />
          ))}
        </g>
        {/* Smoke lives inside the SVG so it stays on the chimney however the skyline is cropped. */}
        {[0, 1, 2].map((i) => (
          <circle
            key={i}
            className="mk-smoke"
            cx="335"
            cy="0"
            r="9"
            fill="rgb(255 255 255 / 0.3)"
            style={{
              transformBox: 'fill-box',
              transformOrigin: 'center',
              animationDelay: `${i * 2.2}s`,
              animationDuration: '7s',
              filter: 'blur(3px)',
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="relative isolate overflow-hidden pb-20 text-white sm:pb-0">
      <BrickBackground variant="solid-green" />
      <div className="mx-auto grid max-w-7xl gap-10 px-4 pt-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr] lg:px-8">
        <div>
          <Link
            href="/"
            aria-label={`${brandConfig.productName} home`}
            className="inline-flex rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Logo variant="stacked" size="lg" tone="onDark" />
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/85">{footer.tagline}</p>
        </div>
        <nav aria-label="Footer">
          <h2 className="text-sm font-semibold text-white">{footer.quickLinksTitle}</h2>
          <ul className="mt-4 grid gap-2.5">
            {nav.links.map((l) => (
              <li key={l.href}>
                <a href={l.href} className={linkClass}>
                  {l.label}
                </a>
              </li>
            ))}
            <li>
              <Link href="/login" className={`${linkClass} font-semibold text-white`}>
                {footer.login} →
              </Link>
            </li>
          </ul>
        </nav>
        <div>
          <h2 className="text-sm font-semibold text-white">{footer.contactTitle}</h2>
          <ul className="mt-4 grid gap-2.5">
            <li>
              <a href={contact.phoneHref} className={`${linkClass} inline-flex items-center gap-2`}>
                <Phone className="h-4 w-4" aria-hidden /> {contact.phone}
              </a>
            </li>
            <li>
              <a
                href={whatsappHref()}
                target="_blank"
                rel="noopener noreferrer"
                className={`${linkClass} inline-flex items-center gap-2`}
              >
                <MessageCircle className="h-4 w-4" aria-hidden /> {footer.whatsapp}
              </a>
            </li>
            <li>
              <a href={`mailto:${contact.email}`} className={`${linkClass} inline-flex items-center gap-2`}>
                <Mail className="h-4 w-4" aria-hidden /> {contact.email}
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-10 flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-white/15 px-4 py-5 text-xs text-white/80 sm:flex-row sm:px-6 lg:px-8">
        <p>
          © {new Date().getFullYear()} {brand.company}. All rights reserved.
        </p>
        <div className="flex items-center gap-4">
          <Link href="/privacy" className="underline underline-offset-4 hover:text-white transition">
            Privacy Policy
          </Link>
          <span className="text-white/40">·</span>
          <Link href="/delete-account" className="underline underline-offset-4 hover:text-white transition">
            Delete Account
          </Link>
        </div>
      </div>
      <Skyline />
    </footer>
  );
}
