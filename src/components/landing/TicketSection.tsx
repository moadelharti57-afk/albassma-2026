import { RegistrationForm } from '@/components/RegistrationForm';
import { EVENT } from '@/config/event';
import { Countdown } from './Countdown';
import { SectionHeading } from './SectionHeading';

export function TicketSection() {
  return (
    <section id="billet" className="relative scroll-mt-24 overflow-hidden py-24 sm:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/2 h-[70vmin] w-[110vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(var(--brand)/0.14),transparent)] blur-3xl" />
      </div>

      <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <div className="lg:sticky lg:top-28">
          <SectionHeading
            eyebrow="Billetterie"
            title="Votre place vous attend."
            intro={`Inscrivez-vous et recevez votre billet ${EVENT.name} ${EVENT.year} avec QR code, tout de suite.`}
            className="mb-8 sm:mb-10"
          />
          <Countdown />
        </div>

        <RegistrationForm />
      </div>
    </section>
  );
}
