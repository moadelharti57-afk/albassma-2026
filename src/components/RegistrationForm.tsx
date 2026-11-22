import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { supabase } from '@/integrations/supabase/client';
import { downloadTicketPDF, generateQRCodeDataURL } from '@/lib/ticketUtils';
import { CLUB_MEMBERS } from '@/lib/clubMembers';
import { EVENT } from '@/config/event';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ClickSpark from '@/components/reactbits/ClickSpark';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Download, RotateCcw, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';

const registrationSchema = z.object({
  fullName: z.string().trim().min(2, 'Au moins 2 caractères').max(100),
  email: z.string().trim().email('Adresse email invalide').max(255),
  phone: z
    .string()
    .trim()
    .max(20)
    .regex(/^\+?[0-9][0-9 .-]*[0-9]$/, 'Chiffres uniquement (ex. 06 12 34 56 78)')
    .refine((v) => v.replace(/\D/g, '').length >= 8, 'Au moins 8 chiffres'),
  registeredBy: z.string().min(1, 'Choisissez un membre du club'),
});

type RegistrationFormData = z.infer<typeof registrationSchema>;

interface IssuedTicket {
  code: string;
  name: string;
  createdAt: string;
  qr: string;
  phone: string;
}

/** 06 12 34 56 78 → 212612345678 ; +212 6… → 2126… (format expected by wa.me) */
function toWhatsAppNumber(phone: string) {
  const digits = phone.replace(/\D/g, '');
  if (phone.trim().startsWith('+')) return digits;
  if (digits.startsWith('00')) return digits.slice(2);
  if (digits.startsWith('0')) return '212' + digits.slice(1);
  return digits;
}

function ticketMessage(t: IssuedTicket) {
  const link = `${window.location.origin}/verify?ticket=${t.code}`;
  return (
    `🎟️ Mon billet ${EVENT.name} ${EVENT.year}\n` +
    `Nom : ${t.name}\n` +
    `Code : ${t.code}\n` +
    `Billet (QR code) : ${link}\n\n` +
    `À présenter à l'entrée.`
  );
}

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.03c-.25.69-1.44 1.32-1.98 1.37-.51.05-.99.24-3.34-.7-2.82-1.11-4.6-3.99-4.74-4.18-.14-.18-1.13-1.5-1.13-2.87 0-1.36.71-2.03.97-2.31.25-.28.55-.35.73-.35.18 0 .37 0 .53.01.17.01.4-.06.62.48.23.55.78 1.91.85 2.05.07.14.12.3.02.48-.09.18-.14.3-.28.46-.14.16-.29.36-.42.48-.14.14-.28.29-.12.57.16.28.72 1.19 1.55 1.93 1.06.95 1.96 1.24 2.24 1.38.28.14.44.12.6-.07.16-.18.69-.81.88-1.09.18-.28.37-.23.62-.14.25.09 1.6.76 1.88.9.28.14.46.21.53.32.07.12.07.67-.18 1.36z" />
  </svg>
);

const fieldClass =
  'h-12 rounded-xl border-border bg-background/60 text-base placeholder:text-muted-foreground/60 focus-visible:ring-primary';

type Availability = 'loading' | 'open' | 'closed' | 'sold_out';

export const RegistrationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticket, setTicket] = useState<IssuedTicket | null>(null);
  const [availability, setAvailability] = useState<Availability>('loading');
  const [seatsLeft, setSeatsLeft] = useState<number | null>(null);
  // Anti-bot trap: a field humans never see. Bots that fill every input get caught.
  const [honeypot, setHoneypot] = useState('');
  const { toast } = useToast();
  const reduce = useReducedMotion();

  useEffect(() => {
    let alive = true;
    supabase.rpc('get_registration_status').then(({ data, error }) => {
      if (!alive) return;
      const s = data?.[0];
      // If the status can't be read, let people try: the server still enforces the rules.
      if (error || !s) return setAvailability('open');
      setSeatsLeft(s.seats_left);
      setAvailability(!s.registrations_open ? 'closed' : s.seats_left === 0 ? 'sold_out' : 'open');
    });
    return () => {
      alive = false;
    };
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    setError,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
  });

  const onSubmit = async (data: RegistrationFormData) => {
    if (honeypot) return; // silently ignore bots
    setIsSubmitting(true);

    try {
      // The server validates the details and generates the ticket code.
      const { data: rows, error: insertError } = await supabase.rpc('register_participant', {
        _full_name: data.fullName,
        _email: data.email,
        _phone: data.phone,
        _registered_by: data.registeredBy,
      });

      if (insertError) throw insertError;
      const issued = rows?.[0];
      if (!issued) throw new Error("L'inscription a échoué. Réessayez.");

      // Ask for the emails first, so they're on their way while the PDF is built.
      // The function looks up the address from the ticket on the server.
      supabase.functions
        .invoke('send-ticket-email', { body: { ticketCode: issued.ticket_code } })
        .catch((emailError) => console.warn('Ticket email failed:', emailError));

      const qr = await generateQRCodeDataURL(issued.ticket_code);
      setTicket({
        code: issued.ticket_code,
        name: data.fullName,
        createdAt: issued.created_at,
        qr,
        phone: data.phone,
      });

      await downloadTicketPDF(data.fullName, issued.ticket_code, issued.created_at);

      toast({
        title: 'Billet généré !',
        description: 'Le PDF est téléchargé et une copie part par email.',
      });
    } catch (error: unknown) {
      console.error('Registration error:', error);
      // Supabase errors are plain objects with a message, not Error instances.
      const message =
        typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message: unknown }).message)
          : '';

      if (message.includes('SOLD_OUT') || message.includes('REGISTRATIONS_CLOSED')) {
        setAvailability(message.includes('SOLD_OUT') ? 'sold_out' : 'closed');
        return;
      }

      if (message.includes('EMAIL_ALREADY_REGISTERED')) {
        setError('email', { message: 'Cet email a déjà un billet.' });
        toast({
          title: 'Cet email a déjà un billet',
          description:
            "Un seul billet par adresse email. Retrouvez votre billet dans votre boîte mail (pensez aux spams).",
          variant: 'destructive',
        });
        return;
      }

      const friendly: Record<string, string> = {
        'Invalid email': 'Adresse email invalide.',
        'Invalid name': 'Nom invalide.',
        'Invalid phone number': 'Numéro de téléphone invalide.',
        'Invalid club member': 'Membre du club invalide.',
      };
      toast({
        title: "L'inscription a échoué",
        description: friendly[message] ?? 'Réessayez dans un instant.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const startOver = () => {
    setTicket(null);
    reset();
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {ticket ? (
        <motion.div
          key="ticket"
          initial={reduce ? { opacity: 0 } : { opacity: 0, rotateY: -90, scale: 0.9 }}
          animate={{ opacity: 1, rotateY: 0, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 120, damping: 16 }}
          style={{ transformPerspective: 1200 }}
          className="w-full"
        >
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-[hsl(var(--brand-light))] via-[hsl(var(--brand))] to-[hsl(var(--brand-deep))] p-[1px] shadow-[0_30px_80px_-20px_hsl(var(--brand)/0.55)]">
            <div className="relative grid gap-6 rounded-[calc(2rem-1px)] bg-gradient-to-br from-[hsl(var(--brand-light))] to-[hsl(var(--brand))] p-6 text-black sm:grid-cols-[1fr_auto] sm:p-8">
              {/* Notches */}
              <span aria-hidden className="absolute -left-4 top-1/2 size-8 -translate-y-1/2 rounded-full bg-background" />
              <span aria-hidden className="absolute -right-4 top-1/2 size-8 -translate-y-1/2 rounded-full bg-background" />

              <div className="min-w-0">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
                  Admit one · {EVENT.edition}
                </p>
                <p className="font-display mt-2 text-4xl leading-none sm:text-5xl">{EVENT.name}</p>
                <p className="mt-6 text-xs uppercase tracking-[0.2em] opacity-70">Spectateur</p>
                <p className="truncate text-xl font-bold">{ticket.name}</p>
                <p className="mt-4 text-xs uppercase tracking-[0.2em] opacity-70">Code</p>
                <p className="font-mono text-2xl font-bold tracking-widest">{ticket.code}</p>
              </div>

              <div className="flex items-center justify-center border-t border-dashed border-black/30 pt-6 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
                <img src={ticket.qr} alt={`QR code du billet ${ticket.code}`} className="size-36 rounded-xl bg-white p-2" />
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <a
              href={`https://wa.me/${toWhatsAppNumber(ticket.phone)}?text=${encodeURIComponent(ticketMessage(ticket))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-[#25D366] px-5 py-3 text-sm font-bold text-black transition-transform active:scale-[0.98]"
            >
              <WhatsAppIcon />
              Recevoir sur WhatsApp
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(ticketMessage(ticket))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[#25D366]/60 px-5 py-3 text-sm font-semibold text-[#25D366] transition-colors hover:bg-[#25D366]/10"
            >
              <WhatsAppIcon />
              Partager
            </a>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            « Recevoir sur WhatsApp » ouvre votre conversation avec vous-même : appuyez sur Envoyer pour garder votre billet.
          </p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => downloadTicketPDF(ticket.name, ticket.code, ticket.createdAt)}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground"
            >
              <Download className="size-4" aria-hidden />
              Télécharger à nouveau
            </button>
            <button
              type="button"
              onClick={startOver}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold transition-colors hover:bg-secondary"
            >
              <RotateCcw className="size-4" aria-hidden />
              Inscrire une autre personne
            </button>
          </div>
        </motion.div>
      ) : availability === 'closed' || availability === 'sold_out' ? (
        <motion.div
          key="unavailable"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="glass rounded-[2rem] p-8 text-center"
          role="status"
        >
          <span className="mx-auto mb-5 grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Lock className="size-6" aria-hidden />
          </span>
          <h3 className="font-display text-4xl">
            {availability === 'sold_out' ? 'Complet !' : 'Inscriptions fermées'}
          </h3>
          <p className="mx-auto mt-3 max-w-sm text-muted-foreground">
            {availability === 'sold_out'
              ? 'Toutes les places ont été réservées. Merci pour votre enthousiasme, à la prochaine édition !'
              : 'Les inscriptions sont fermées pour le moment. Suivez le club pour les prochaines annonces.'}
          </p>
        </motion.div>
      ) : (
        <motion.form
          key="form"
          onSubmit={handleSubmit(onSubmit)}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          className="glass space-y-5 rounded-[2rem] p-6 sm:p-8"
          noValidate
        >
          {/* Anti-bot trap: hidden from people and screen readers */}
          <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
            <label htmlFor="website">Site web</label>
            <input
              id="website"
              name="website"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>

          {seatsLeft !== null && seatsLeft <= 50 && (
            <p className="rounded-xl bg-primary/10 px-4 py-2 text-center text-sm font-semibold text-primary">
              Plus que {seatsLeft} place{seatsLeft > 1 ? 's' : ''} disponible{seatsLeft > 1 ? 's' : ''} !
            </p>
          )}

          <div className="space-y-2">
            <Label htmlFor="fullName">Nom complet</Label>
            <Input
              id="fullName"
              autoComplete="name"
              placeholder="Votre nom et prénom"
              aria-invalid={!!errors.fullName}
              {...register('fullName')}
              className={cn(fieldClass, errors.fullName && 'border-destructive')}
            />
            {errors.fullName && <p className="text-sm text-destructive">{errors.fullName.message}</p>}
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="vous@exemple.com"
                aria-invalid={!!errors.email}
                {...register('email')}
                className={cn(fieldClass, errors.email && 'border-destructive')}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Téléphone</Label>
              <Input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="06 00 00 00 00"
                aria-invalid={!!errors.phone}
                {...register('phone')}
                className={cn(fieldClass, errors.phone && 'border-destructive')}
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="registeredBy">Membre du club qui vous a invité</Label>
            <Select onValueChange={(value) => setValue('registeredBy', value, { shouldValidate: true })}>
              <SelectTrigger
                id="registeredBy"
                className={cn(fieldClass, errors.registeredBy && 'border-destructive')}
              >
                <SelectValue placeholder="Choisir un membre" />
              </SelectTrigger>
              <SelectContent>
                {CLUB_MEMBERS.map((member) => (
                  <SelectItem key={member} value={member}>
                    {member}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.registeredBy && <p className="text-sm text-destructive">{errors.registeredBy.message}</p>}
          </div>

          <ClickSpark sparkColor={['#86de76', '#ffffff', '#32b577']} sparkCount={12} sparkRadius={42} shape="star" className="!h-auto">
            <button
              type="submit"
              disabled={isSubmitting}
              className="group relative flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-full bg-primary text-base font-bold text-primary-foreground shadow-[0_0_50px_-12px_hsl(var(--brand)/0.9)] transition-transform active:scale-[0.98] disabled:opacity-70"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-5 animate-spin" aria-hidden />
                  Génération du billet…
                </>
              ) : (
                'Générer mon billet'
              )}
              <span
                aria-hidden
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              />
            </button>
          </ClickSpark>

          <p className="text-center text-xs text-muted-foreground">
            Vos coordonnées servent uniquement à vous envoyer votre billet.
          </p>
        </motion.form>
      )}
    </AnimatePresence>
  );
};
