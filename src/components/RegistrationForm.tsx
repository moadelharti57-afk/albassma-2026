import { useState } from 'react';
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
import { Loader2, Download, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';

const registrationSchema = z.object({
  fullName: z.string().trim().min(2, 'Au moins 2 caractères').max(100),
  email: z.string().trim().email('Adresse email invalide').max(255),
  phone: z.string().trim().min(8, 'Au moins 8 chiffres').max(20),
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

export const RegistrationForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticket, setTicket] = useState<IssuedTicket | null>(null);
  const { toast } = useToast();
  const reduce = useReducedMotion();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<RegistrationFormData>({
    resolver: zodResolver(registrationSchema),
  });

  const onSubmit = async (data: RegistrationFormData) => {
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

      const qr = await generateQRCodeDataURL(issued.ticket_code);
      setTicket({ code: issued.ticket_code, name: data.fullName, createdAt: issued.created_at, qr });

      await downloadTicketPDF(data.fullName, issued.ticket_code, issued.created_at);

      // The email function looks up the address from the ticket on the server.
      supabase.functions
        .invoke('send-ticket-email', { body: { ticketCode: issued.ticket_code } })
        .catch((emailError) => console.warn('Ticket email failed:', emailError));

      toast({
        title: 'Billet généré !',
        description: 'Le PDF est téléchargé et une copie part par email.',
      });
    } catch (error: unknown) {
      console.error('Registration error:', error);
      toast({
        title: "L'inscription a échoué",
        description: error instanceof Error ? error.message : 'Réessayez dans un instant.',
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
