import SplitText from '@/components/reactbits/SplitText';
import { cn } from '@/lib/utils';

interface SectionHeadingProps {
  eyebrow: string;
  title: string;
  intro?: string;
  align?: 'left' | 'center';
  className?: string;
}

export function SectionHeading({ eyebrow, title, intro, align = 'left', className }: SectionHeadingProps) {
  const center = align === 'center';
  return (
    <div className={cn('mb-12 max-w-3xl sm:mb-16', center && 'mx-auto text-center', className)}>
      <span className="eyebrow mb-5">{eyebrow}</span>
      <h2 className="font-display text-5xl leading-[0.9] sm:text-7xl">
        <SplitText
          text={title}
          tag="span"
          className="block"
          textAlign={center ? 'center' : 'left'}
          splitType="words"
          effect="blur"
          delay={70}
          duration={0.9}
        />
      </h2>
      {intro && <p className="mt-5 text-lg text-muted-foreground">{intro}</p>}
    </div>
  );
}
