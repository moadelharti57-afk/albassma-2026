import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { QrCode, Zap, Mail, Armchair } from 'lucide-react';
import { SectionHeading } from './SectionHeading';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const FEATURES = [
  {
    icon: Zap,
    title: 'Billet en 10 secondes',
    text: 'Un formulaire, un clic : votre billet PDF se télécharge immédiatement.',
  },
  {
    icon: QrCode,
    title: 'Entrée au QR code',
    text: "L'équipe scanne votre code à la porte. Pas de file, pas de papier.",
  },
  {
    icon: Mail,
    title: 'Copie par email',
    text: 'Votre billet vous attend aussi dans votre boîte mail.',
  },
  {
    icon: Armchair,
    title: 'Une vraie salle',
    text: 'Grand écran, son, lumière : une expérience de cinéma complète.',
  },
];

export function Experience() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    (_, contextSafe) => {
      ScrollTrigger.batch('.xp-card', {
        start: 'top 88%',
        once: true,
        onEnter: (els) =>
          gsap.fromTo(
            els,
            { y: 60, opacity: 0, rotateX: -12 },
            { y: 0, opacity: 1, rotateX: 0, duration: 1, stagger: 0.12, ease: 'power3.out' }
          ),
      });

      // 3D tilt + spotlight that follows the pointer
      const mm = gsap.matchMedia();
      mm.add('(pointer: fine) and (prefers-reduced-motion: no-preference)', () => {
        const cards = gsap.utils.toArray<HTMLElement>('.xp-card');
        const cleanups = cards.map((card) => {
          const rx = gsap.quickTo(card, 'rotateX', { duration: 0.5, ease: 'power3.out' });
          const ry = gsap.quickTo(card, 'rotateY', { duration: 0.5, ease: 'power3.out' });
          const move = contextSafe!((e: PointerEvent) => {
            const r = card.getBoundingClientRect();
            const px = (e.clientX - r.left) / r.width;
            const py = (e.clientY - r.top) / r.height;
            rx((0.5 - py) * 12);
            ry((px - 0.5) * 14);
            card.style.setProperty('--mx', `${px * 100}%`);
            card.style.setProperty('--my', `${py * 100}%`);
          });
          const leave = contextSafe!(() => {
            rx(0);
            ry(0);
          });
          card.addEventListener('pointermove', move);
          card.addEventListener('pointerleave', leave);
          return () => {
            card.removeEventListener('pointermove', move);
            card.removeEventListener('pointerleave', leave);
          };
        });
        return () => cleanups.forEach((c) => c());
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <section ref={root} id="experience" className="relative mx-auto max-w-6xl px-4 py-24 sm:px-6 sm:py-32">
      <SectionHeading
        eyebrow="L'expérience"
        title="Plus simple, plus rapide, plus cinéma."
        intro="Tout ce qui a marché l'an dernier, en mieux."
      />

      <div className="grid gap-5 sm:grid-cols-2" style={{ perspective: '1000px' }}>
        {FEATURES.map(({ icon: Icon, title, text }) => (
          <article
            key={title}
            className="xp-card glass group relative overflow-hidden rounded-[2rem] p-7 sm:p-9"
            style={{ transformStyle: 'preserve-3d' }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
              style={{
                background:
                  'radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), hsl(var(--brand) / 0.16), transparent 45%)',
              }}
            />
            <div style={{ transform: 'translateZ(40px)' }}>
              <span className="mb-8 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20">
                <Icon className="size-6" aria-hidden />
              </span>
              <h3 className="text-2xl font-bold">{title}</h3>
              <p className="mt-3 text-muted-foreground">{text}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
