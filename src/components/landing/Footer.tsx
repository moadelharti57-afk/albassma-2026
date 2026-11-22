import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { EVENT } from '@/config/event';

gsap.registerPlugin(ScrollTrigger, useGSAP);

export function Footer() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        gsap.fromTo(
          '.footer-word',
          { yPercent: 60, opacity: 0 },
          {
            yPercent: 0,
            opacity: 1,
            ease: 'none',
            scrollTrigger: { trigger: root.current, start: 'top bottom', end: 'bottom bottom', scrub: true },
          }
        );
      });
      return () => mm.revert();
    },
    { scope: root }
  );

  return (
    <footer ref={root} className="relative overflow-hidden border-t border-border pt-16">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-4 sm:flex-row sm:items-end sm:justify-between sm:px-6">
        <div>
          <p className="font-display text-3xl">On se voit en salle.</p>
          <p className="mt-2 text-muted-foreground">
            {EVENT.dateLabel} · {EVENT.venue}
          </p>
        </div>
        <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <li>
            <a href="#billet" className="hover:text-foreground">Billetterie</a>
          </li>
          <li>
            <Link to="/verify" className="hover:text-foreground">Vérifier un billet</Link>
          </li>
          {EVENT.instagram && (
            <li>
              <a href={EVENT.instagram} target="_blank" rel="noreferrer" className="hover:text-foreground">Instagram</a>
            </li>
          )}
          {EVENT.contactEmail && (
            <li>
              <a href={`mailto:${EVENT.contactEmail}`} className="hover:text-foreground">Contact</a>
            </li>
          )}
          <li>
            <Link to="/admin/login" className="hover:text-foreground">Espace staff</Link>
          </li>
        </ul>
      </div>

      <p
        aria-hidden
        className="footer-word font-display mt-10 select-none whitespace-nowrap text-center text-[23vw] leading-[0.78] text-brand-gradient opacity-90"
      >
        Albassma
      </p>

      <p className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Club {EVENT.club}. Tous droits réservés.
      </p>
    </footer>
  );
}
