import { MotionAccordion } from '@/components/ui/motion-accordion';
import { FAQ } from '@/config/event';
import { SectionHeading } from './SectionHeading';

export function Faq() {
  return (
    <section id="faq" className="relative mx-auto max-w-3xl scroll-mt-24 px-4 py-24 sm:px-6 sm:py-32">
      <SectionHeading eyebrow="FAQ" title="Questions fréquentes" align="center" />
      <MotionAccordion items={FAQ} gap={12} />
    </section>
  );
}
