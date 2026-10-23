'use client';

import { ArrowRight } from 'lucide-react';
import { finalCta } from '@/lib/marketing-content';
import { SmokeParticles } from '../effects/ambient';
import { BrickBackground } from '../effects/brick-background';
import { CursorSpotlight } from '../effects/spotlight';
import { openDemo } from '../demo';
import { buttonClass, Button } from '../ui/button';
import { Reveal } from '../ui/reveal';
import { useSignedIn } from '../use-signed-in';

export function FinalCta() {
  const signedIn = useSignedIn();
  return (
    <section aria-label={finalCta.title} className="relative px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
      <Reveal>
        <div className="relative isolate mx-auto max-w-7xl overflow-hidden rounded-[28px] px-6 py-14 text-center shadow-mk-device sm:px-12 sm:py-20">
          <BrickBackground variant="solid-green" />
          <CursorSpotlight tone="white" />
          <SmokeParticles tone="white" />
          <h2 className="relative mx-auto max-w-3xl text-3xl font-extrabold tracking-tight text-white sm:text-5xl">
            {finalCta.title}
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-base text-white/90 sm:text-lg">{finalCta.subtitle}</p>
          <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={openDemo}
              className={buttonClass(
                'outline',
                'lg',
                'mk-shine border-white bg-white text-mk-primary shadow-[0_10px_30px_-10px_rgb(0_0_0/0.4)] hover:bg-mk-primary-soft focus-visible:ring-white focus-visible:ring-offset-mk-primary',
              )}
            >
              {finalCta.demo}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden />
            </button>
            <Button
              href={signedIn ? '/dashboard' : '/login'}
              variant="ghost"
              size="lg"
              className="border border-white/50 text-white hover:bg-white/10 hover:text-white focus-visible:ring-white focus-visible:ring-offset-mk-primary"
            >
              {signedIn ? 'Open Dashboard' : finalCta.login}
            </Button>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
