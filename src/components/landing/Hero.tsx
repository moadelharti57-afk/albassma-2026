import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ArrowDown, CalendarDays, MapPin } from 'lucide-react';
import SplitText from '@/components/reactbits/SplitText';
import ShinyText from '@/components/reactbits/ShinyText';
import { heroState } from '@/components/three/heroState';
import { EVENT } from '@/config/event';
import { Magnetic } from './Magnetic';

gsap.registerPlugin(ScrollTrigger, useGSAP);

// three.js is heavy: load it after the first paint
const TicketScene = lazy(() => import('@/components/three/TicketScene'));

/**
 * Only load the 3D scene on devices that can handle it: WebGL available,
 * not in data-saver mode, and not a low-memory / low-core phone.
 * Everyone else gets the same page with the glowing backdrop only.
 */
function canRun3D() {
  try {
    const nav = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean; effectiveType?: string };
    };
    if (nav.connection?.saveData) return false;
    if (nav.connection?.effectiveType && /(^|-)2g$/.test(nav.connection.effectiveType)) return false;
    if (typeof nav.deviceMemory === 'number' && nav.deviceMemory <= 2) return false;
    if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2) return false;
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

export function Hero() {
  const root = useRef<HTMLElement>(null);
  const [inView, setInView] = useState(true);
  const [webgl] = useState(() => typeof window !== 'undefined' && canRun3D());

  // Stop rendering the 3D scene once the hero is off screen
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Pointer → 3D tilt
  useEffect(() => {
    const move = (e: PointerEvent) => {
      heroState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      heroState.pointerY = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => window.removeEventListener('pointermove', move);
  }, []);

  useGSAP(
    () => {
      // Scroll progress through the hero drives the ticket flip in 3D
      ScrollTrigger.create({
        trigger: root.current,
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onUpdate: (self) => {
          heroState.scroll = self.progress;
        },
      });

      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.from('.hero-fade', {
          y: 24,
          opacity: 0,
          duration: 1,
          ease: 'power3.out',
          stagger: 0.12,
          delay: 0.9,
        });
        gsap.to('.hero-copy', {
          yPercent: -18,
          opacity: 0.15,
          ease: 'none',
          scrollTrigger: { trigger: root.current, start: 'top top', end: 'bottom top', scrub: true },
        });
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section ref={root} id="top" className="relative isolate flex min-h-[100svh] flex-col overflow-hidden">
      {/* Backdrop glows */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-20">
        <div className="absolute left-1/2 top-[38%] h-[60vmin] w-[90vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(var(--brand)/0.22),transparent)] blur-2xl" />
        <div className="absolute -right-[10%] bottom-[5%] h-[50vmin] w-[50vmin] rounded-full bg-[radial-gradient(closest-side,hsl(var(--brand-deep)/0.28),transparent)] blur-2xl" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-background via-background/80 to-transparent lg:h-1/2" />
      </div>

      {/* 3D (sits under the bottom fade on small screens so text stays readable) */}
      <div aria-hidden className="absolute inset-0 -z-30 lg:-z-10">
        {webgl && (
          <Suspense fallback={null}>
            <TicketScene active={inView} />
          </Suspense>
        )}
      </div>

      <div className="hero-copy relative mx-auto mt-auto w-full max-w-6xl px-4 pb-10 pt-32 sm:px-6 sm:pb-14">
        <div className="hero-fade mb-5 flex flex-wrap items-center gap-3">
          <span className="eyebrow">
            <span className="size-1.5 rounded-full bg-primary animate-flicker" />
            {EVENT.club} présente
          </span>
          <ShinyText
            text={EVENT.edition}
            className="font-mono text-xs uppercase tracking-[0.3em]"
            color="hsl(0 0% 72%)"
            shineColor="#86de76"
            speed={3}
          />
        </div>

        <h1 className="sr-only">
          {EVENT.name} {EVENT.year}
        </h1>
        <div aria-hidden className="select-none">
          <SplitText
            text="ALBASSMA"
            tag="span"
            className="font-display block text-[22vw] leading-[0.82] text-brand-gradient sm:text-[15vw] lg:text-[min(11vw,10.5rem)]"
            textAlign="left"
            splitType="chars"
            effect="flip"
            trigger="load"
            delay={45}
            duration={1.1}
            hoverEffect="wave"
          />
          <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
            <SplitText
              text={`FILM ${EVENT.year}`}
              tag="span"
              className="font-display block text-[15vw] leading-[0.85] text-foreground sm:text-[10vw] lg:text-[min(7.4vw,7rem)]"
              textAlign="left"
              splitType="chars"
              effect="rise"
              mask
              trigger="load"
              delay={40}
              duration={1}
            />
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_auto] md:items-end">
          <div className="hero-fade space-y-4">
            <p className="max-w-md text-lg text-muted-foreground sm:text-xl">{EVENT.tagline}</p>
            <ul className="flex flex-wrap gap-2 text-sm">
              <li className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5">
                <CalendarDays className="size-4 text-primary" aria-hidden />
                {EVENT.dateLabel}
              </li>
              <li className="glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5">
                <MapPin className="size-4 text-primary" aria-hidden />
                {EVENT.venue}
              </li>
            </ul>
          </div>

          <div className="hero-fade flex flex-wrap items-center gap-3">
            <Magnetic>
              <a
                href="#billet"
                className="group relative inline-flex items-center gap-3 overflow-hidden rounded-full bg-primary px-7 py-4 text-base font-bold text-primary-foreground shadow-[0_0_60px_-10px_hsl(var(--brand)/0.8)]"
              >
                <span className="relative z-10">Obtenir mon billet</span>
                <span className="relative z-10 grid size-7 place-items-center rounded-full bg-primary-foreground text-primary transition-transform duration-500 group-hover:rotate-[-45deg]">
                  →
                </span>
                <span
                  aria-hidden
                  className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                />
              </a>
            </Magnetic>
            <a
              href="#programme"
              className="inline-flex items-center gap-2 rounded-full px-4 py-4 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Programme
              <ArrowDown className="size-4" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
