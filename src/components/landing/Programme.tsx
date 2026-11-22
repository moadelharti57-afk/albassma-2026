import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { PROGRAMME } from '@/config/event';
import { SectionHeading } from './SectionHeading';

gsap.registerPlugin(ScrollTrigger, useGSAP);

/**
 * Desktop: the section pins and the programme scrolls sideways like a film
 * strip. Mobile / reduced motion: a plain vertical list.
 */
export function Programme() {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add('(min-width: 1024px) and (prefers-reduced-motion: no-preference)', () => {
        const el = track.current!;
        const distance = () => el.scrollWidth - window.innerWidth + 64;

        const tween = gsap.to(el, {
          x: () => -distance(),
          ease: 'none',
          scrollTrigger: {
            trigger: '.programme-pin',
            start: 'top top',
            end: () => `+=${distance()}`,
            pin: true,
            scrub: 1,
            invalidateOnRefresh: true,
          },
        });

        // Each frame lights up as it passes the centre
        gsap.utils.toArray<HTMLElement>('.programme-card').forEach((card) => {
          gsap.fromTo(
            card,
            { opacity: 0.35, scale: 0.92, rotateY: -14 },
            {
              opacity: 1,
              scale: 1,
              rotateY: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: card,
                containerAnimation: tween,
                start: 'left 95%',
                end: 'left 45%',
                scrub: true,
              },
            }
          );
        });

        gsap.to('.programme-progress', {
          scaleX: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: '.programme-pin',
            start: 'top top',
            end: () => `+=${distance()}`,
            scrub: true,
          },
        });
      });

      mm.add('(max-width: 1023px), (prefers-reduced-motion: reduce)', () => {
        ScrollTrigger.batch('.programme-card', {
          start: 'top 88%',
          once: true,
          onEnter: (els) =>
            gsap.fromTo(els, { y: 40, opacity: 0 }, { y: 0, opacity: 1, stagger: 0.1, duration: 0.8, ease: 'power3.out' }),
        });
      });

      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section ref={root} id="programme" className="relative">
      <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
        <SectionHeading eyebrow="Programme" title="Le déroulé de la soirée" />
      </div>

      <div className="programme-pin relative overflow-hidden lg:flex lg:h-screen lg:items-center">
        <div
          ref={track}
          className="flex flex-col gap-5 px-4 pb-10 sm:px-6 lg:w-max lg:flex-row lg:gap-8 lg:pl-[max(1.5rem,calc((100vw-72rem)/2+1.5rem))] lg:pr-16"
          style={{ perspective: '1200px' }}
        >
          {PROGRAMME.map((item, i) => (
            <article
              key={item.time}
              className="programme-card glass relative flex shrink-0 flex-col justify-between overflow-hidden rounded-[2rem] p-7 sm:p-9 lg:h-[62vh] lg:w-[min(30rem,40vw)]"
            >
              <div aria-hidden className="film-holes absolute inset-x-0 top-0 h-3 bg-[hsl(var(--brand)/0.1)]" />
              <div aria-hidden className="film-holes absolute inset-x-0 bottom-0 h-3 bg-[hsl(var(--brand)/0.1)]" />
              <div className="flex items-start justify-between">
                <span className="font-mono text-sm text-primary">Scène {String(i + 1).padStart(2, '0')}</span>
                <span aria-hidden className="font-display text-7xl text-foreground/5 sm:text-9xl">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <div className="mt-10 lg:mt-0">
                <p className="font-display text-6xl text-brand-gradient sm:text-8xl">{item.time}</p>
                <h3 className="mt-4 text-2xl font-bold sm:text-3xl">{item.title}</h3>
                <p className="mt-3 max-w-sm text-muted-foreground">{item.text}</p>
              </div>
            </article>
          ))}
        </div>

        <div aria-hidden className="absolute inset-x-6 bottom-10 hidden h-px bg-border lg:block">
          <div className="programme-progress h-full origin-left scale-x-0 bg-primary" />
        </div>
      </div>
    </section>
  );
}
