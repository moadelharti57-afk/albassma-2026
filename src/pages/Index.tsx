import { SmoothScroll } from '@/components/landing/SmoothScroll';
import { Nav } from '@/components/landing/Nav';
import { Hero } from '@/components/landing/Hero';
import { Marquee } from '@/components/landing/Marquee';
import { Stats } from '@/components/landing/Stats';
import { Programme } from '@/components/landing/Programme';
import { Experience } from '@/components/landing/Experience';
import { TicketSection } from '@/components/landing/TicketSection';
import { Faq } from '@/components/landing/Faq';
import { Footer } from '@/components/landing/Footer';

const Index = () => {
  return (
    <SmoothScroll>
      <div className="grain relative overflow-x-clip">
        <a
          href="#billet"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-foreground"
        >
          Aller à la billetterie
        </a>
        <Nav />
        <main>
          <Hero />
          <Marquee />
          <Stats />
          <Programme />
          <Experience />
          <TicketSection />
          <Faq />
        </main>
        <Footer />
      </div>
    </SmoothScroll>
  );
};

export default Index;
