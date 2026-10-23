import dynamic from 'next/dynamic';
import { Fragment, type ReactNode } from 'react';
import { DemoModal } from './demo-modal';
import { BrickDivider } from './effects/brick-divider';
import { ScrollProgress } from './effects/scroll-progress';
import { FloatingActions } from './floating-actions';
import { Accounting } from './sections/accounting';
import { ModuleMarquee, Testimonials } from './sections/extras';
import { Faq } from './sections/faq';
import { FinalCta } from './sections/final-cta';
import { Footer } from './sections/footer';
import { Hero } from './sections/hero';
import { How } from './sections/how';
import { Navbar } from './sections/navbar';
import { Pricing } from './sections/pricing';
import { Roles } from './sections/roles';
import { Security } from './sections/security';
import { Why } from './sections/why';

/*
 * The heaviest interactive sections load as separate chunks. They still render
 * on the server (no layout shift, readable without JavaScript); only their
 * client code is split off the first load.
 */
const Tour = dynamic(() => import('./sections/tour').then((m) => m.Tour));
const Guards = dynamic(() => import('./sections/guards').then((m) => m.Guards));
const MobileApp = dynamic(() => import('./sections/mobile-app').then((m) => m.MobileApp));
const Flow = dynamic(() => import('./sections/flow').then((m) => m.Flow));
const Roi = dynamic(() => import('./sections/roi').then((m) => m.Roi));
const LiveFeed = dynamic(() => import('./sections/extras').then((m) => m.LiveFeed));
const BeforeAfter = dynamic(() => import('./sections/extras').then((m) => m.BeforeAfter));

type Surface = 'bg' | 'white';

/**
 * Sections in page order with the surface each one paints. Surfaces alternate,
 * and a stepped brick divider joins every change of surface.
 */
const sections: { key: string; surface: Surface; node: ReactNode }[] = [
  { key: 'why', surface: 'bg', node: <Why /> },
  { key: 'how', surface: 'white', node: <How /> },
  { key: 'tour', surface: 'bg', node: <Tour /> },
  { key: 'guards', surface: 'white', node: <Guards /> },
  { key: 'mobile', surface: 'bg', node: <MobileApp /> },
  { key: 'flow', surface: 'white', node: <Flow /> },
  { key: 'feed', surface: 'bg', node: <LiveFeed /> },
  { key: 'before-after', surface: 'white', node: <BeforeAfter /> },
  { key: 'roi', surface: 'bg', node: <Roi /> },
  { key: 'roles', surface: 'white', node: <Roles /> },
  { key: 'accounting', surface: 'bg', node: <Accounting /> },
  { key: 'security', surface: 'white', node: <Security /> },
  { key: 'testimonials', surface: 'white', node: <Testimonials /> },
  { key: 'pricing', surface: 'bg', node: <Pricing /> },
  { key: 'faq', surface: 'white', node: <Faq /> },
];

export function HomePage() {
  return (
    <>
      <ScrollProgress />
      <a
        href="#main"
        className="sr-only z-[70] rounded-lg bg-mk-primary px-4 py-2 font-semibold text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Navbar />
      <main id="main">
        <Hero />
        <ModuleMarquee />
        {sections.map((s, i) => {
          const prev = sections[i - 1];
          return (
            <Fragment key={s.key}>
              {prev && prev.surface !== s.surface && (
                <BrickDivider from={prev.surface} to={s.surface} shape={i % 2 ? 'a' : 'b'} />
              )}
              {s.node}
            </Fragment>
          );
        })}
        <BrickDivider from="white" to="bg" shape="b" />
        <FinalCta />
      </main>
      <BrickDivider from="bg" to="green" shape="a" />
      <Footer />
      <FloatingActions />
      <DemoModal />
    </>
  );
}
