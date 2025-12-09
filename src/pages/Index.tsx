import { RegistrationForm } from '@/components/RegistrationForm';
import { Film, Calendar, MapPin } from 'lucide-react';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/20" />
        <div className="relative container mx-auto px-4 py-16 md:py-24">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
              <Film className="w-4 h-4" />
              Digital Guichet
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4 tracking-tight">
              Albassma Filme
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              Organized by <span className="text-primary font-semibold">Mohandiss Al Bassma</span>
            </p>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Get your digital ticket now and join us for an unforgettable cinema experience
            </p>
          </div>

          {/* Event Info Pills */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-full shadow-sm border border-border">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">Coming Soon</span>
            </div>
            <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-full shadow-sm border border-border">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">Event Venue</span>
            </div>
          </div>

          {/* Registration Form */}
          <RegistrationForm />
        </div>
      </header>

      {/* Footer */}
      <footer className="border-t border-border py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Mohandiss Al Bassma Club. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
