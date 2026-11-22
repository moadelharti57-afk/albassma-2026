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
}

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
      setTicket({ code: issued.ticket_code, name: data.fullName, createdAt: issued.created_at, qr });

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

          <div className="mt-5 flex flex-wrap gap-3">
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
