import { useState } from 'react';
import { useLenis } from 'lenis/react';
import { Ticket } from 'lucide-react';
import { EVENT } from '@/config/event';
import { Magnetic } from './Magnetic';
import { cn } from '@/lib/utils';

const LINKS = [
  { href: '#programme', label: 'Programme' },
  { href: '#experience', label: 'Expérience' },
  { href: '#faq', label: 'FAQ' },
];

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);

  useLenis(({ scroll, direction }) => {
    setScrolled(scroll > 40);
    setHidden(scroll > 400 && direction === 1);
  });

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        hidden ? '-translate-y-full' : 'translate-y-0'
      )}
    >
      <nav
        className={cn(
          'mx-auto mt-3 flex max-w-6xl items-center justify-between rounded-full px-4 py-2.5 transition-all duration-500 sm:px-5',
          scrolled ? 'glass mx-3 shadow-lg sm:mx-auto' : 'bg-transparent'
        )}
        aria-label="Navigation principale"
      >
        <a href="#top" className="flex items-center gap-2" aria-label={`${EVENT.name}, retour en haut`}>
          <span className="grid size-8 place-items-center rounded-full bg-primary text-primary-foreground">
            <span className="font-display text-sm leading-none">A</span>
          </span>
          <span className="font-display text-lg tracking-wide">
            Albassma<span className="text-primary">·</span>
            {String(EVENT.year).slice(2)}
          </span>
        </a>

        <ul className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex">
          {LINKS.map((l) => (
            <li key={l.href}>
              <a href={l.href} className="transition-colors hover:text-foreground">
                {l.label}
              </a>
            </li>
          ))}
        </ul>

        <Magnetic>
          <a
            href="#billet"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-[0_0_30px_-6px_hsl(var(--brand)/0.7)] transition-transform hover:scale-[1.03]"
          >
            <Ticket className="size-4" aria-hidden />
            Réserver
          </a>
        </Magnetic>
      </nav>
    </header>
  );
}
