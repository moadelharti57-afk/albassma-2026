import CountUp from '@/components/reactbits/CountUp';
import { LAST_EDITION_STATS, EVENT } from '@/config/event';
import { SectionHeading } from './SectionHeading';

export function Stats() {
  return (
    <section className="relative mx-auto max-w-6xl px-4 pb-24 pt-32 sm:px-6 sm:pt-40">
      <SectionHeading
        eyebrow={`Édition ${EVENT.year - 1}`}
        title="L'an dernier, la salle était pleine."
        intro="Cette année, on revient plus grand : nouvelle scène, nouveau billet, nouvelle expérience."
      />

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl bg-border lg:grid-cols-4">
        {LAST_EDITION_STATS.map((s) => (
          <div key={s.label} className="group relative bg-background p-6 sm:p-8">
            <div
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,hsl(var(--brand)/0.12),transparent_60%)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            />
            <dd className="font-display text-5xl text-brand-gradient sm:text-7xl">
              <CountUp to={s.value} duration={2.2} suffix={s.suffix ?? ''} />
            </dd>
            <dt className="mt-3 text-sm font-medium uppercase tracking-[0.16em] text-muted-foreground">{s.label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}
