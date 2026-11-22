import { Fragment } from 'react';

const WORDS = ['Cinéma', 'Culture', 'Communauté', 'Projection', 'Débat', 'Albassma 2026'];

/** A tilted strip of film running across the page. */
export function Marquee() {
  const row = (
    <div className="flex shrink-0 items-center gap-8 pr-8">
      {WORDS.map((w) => (
        <Fragment key={w}>
          <span className="font-display text-4xl text-foreground sm:text-6xl">{w}</span>
          <span aria-hidden className="text-3xl text-primary sm:text-5xl">✦</span>
        </Fragment>
      ))}
    </div>
  );

  return (
    <div aria-hidden className="relative z-10 -my-4 -rotate-2 select-none overflow-hidden py-2">
      <div className="bg-[hsl(var(--brand-deep))] shadow-2xl ring-1 ring-primary/10">
        <div className="film-holes h-3.5 bg-black/40" />
        <div className="flex w-max animate-marquee py-4" style={{ ['--marquee-duration' as string]: '36s' }}>
          {row}
          {row}
        </div>
        <div className="film-holes h-3.5 bg-black/40" />
      </div>
    </div>
  );
}
