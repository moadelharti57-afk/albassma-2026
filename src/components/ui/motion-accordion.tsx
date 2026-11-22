// Adapted from Unlumen UI "Motion FAQs Accordion" by Léo Wicki (MIT license),
// via 21st.dev. Restyled for the Albassma cinema theme.
// Source: https://ui.unlumen.com/components/motion-faqs-accordion
import * as React from 'react';
import { motion, useReducedMotion } from 'motion/react';

import { cn } from '@/lib/utils';

export interface MotionAccordionItem {
  question: React.ReactNode;
  answer: React.ReactNode;
}

export interface MotionAccordionProps {
  items: MotionAccordionItem[];
  /** @default 10 */
  gap?: number;
  className?: string;
}

function AccordionItem({
  item,
  index,
  isOpen,
  onToggle,
  itemId,
  panelId,
}: {
  item: MotionAccordionItem;
  index: number;
  isOpen: boolean;
  onToggle: () => void;
  itemId: string;
  panelId: string;
}) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [contentH, setContentH] = React.useState(0);
  const reduce = useReducedMotion();

  React.useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContentH(el.scrollHeight));
    ro.observe(el);
    setContentH(el.scrollHeight);
    return () => ro.disconnect();
  }, []);

  const spring = reduce ? { duration: 0 } : { type: 'spring' as const, stiffness: 280, damping: 28, mass: 0.9 };

  return (
    <motion.div
      layout={!reduce}
      className={cn(
        'glass overflow-hidden rounded-3xl text-foreground transition-colors duration-300',
        isOpen && 'border-primary/30'
      )}
      transition={spring}
      animate={{ scale: isOpen ? 1 : 0.985 }}
      initial={false}
      style={{ originX: 0.5, originY: 0 }}
    >
      <button
        id={itemId}
        type="button"
        aria-controls={panelId}
        aria-expanded={isOpen}
        onClick={onToggle}
        className="flex w-full cursor-pointer select-none items-center justify-between gap-4 px-5 py-5 text-left sm:px-7"
      >
        <span className="flex items-baseline gap-4">
          <span className="font-mono text-xs text-primary/70">{String(index + 1).padStart(2, '0')}</span>
          <span className="text-lg font-semibold leading-snug tracking-tight sm:text-xl">{item.question}</span>
        </span>

        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{ rotate: isOpen ? 180 : 0, scale: isOpen ? 1.05 : 1 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 28 }}
          className={cn(
            'inline-flex size-10 shrink-0 items-center justify-center rounded-full border transition-colors',
            isOpen ? 'border-primary bg-primary text-primary-foreground' : 'border-border text-foreground'
          )}
        >
          {isOpen ? (
            <svg width="14" height="14" viewBox="0 0 14 2" fill="none" aria-hidden>
              <path d="M1 1h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
              <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          )}
        </motion.span>
      </button>

      <motion.div
        id={panelId}
        role="region"
        aria-labelledby={itemId}
        animate={{ height: isOpen ? contentH : 0, opacity: isOpen ? 1 : 0 }}
        initial={false}
        transition={
          reduce
            ? { duration: 0 }
            : {
                height: { type: 'spring', stiffness: 340, damping: 34, mass: 0.9 },
                opacity: { duration: 0.2, ease: 'easeOut' },
              }
        }
        style={{ overflow: 'hidden' }}
      >
        <motion.div
          ref={contentRef}
          animate={{ y: isOpen ? 0 : -8 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 30, mass: 0.8 }}
          className="px-5 pb-6 pl-[3.25rem] sm:px-7 sm:pl-[3.75rem]"
        >
          <p className="text-base leading-7 text-muted-foreground sm:text-lg sm:leading-8">{item.answer}</p>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function MotionAccordion({ items, gap = 10, className }: MotionAccordionProps) {
  const rawId = React.useId();
  const baseId = `accordion-${rawId.replace(/:/g, '')}`;
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);
  const toggle = (i: number) => setOpenIndex((prev) => (prev === i ? null : i));

  return (
    <div className={cn('flex w-full flex-col', className)} style={{ gap }}>
      {items.map((item, i) => (
        <AccordionItem
          key={i}
          index={i}
          item={item}
          isOpen={openIndex === i}
          onToggle={() => toggle(i)}
          itemId={`${baseId}-trigger-${i}`}
          panelId={`${baseId}-panel-${i}`}
        />
      ))}
    </div>
  );
}

export default MotionAccordion;
