import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  ArrowLeft,
  UserCheck,
  Search,
  Ticket
} from 'lucide-react';

type VerificationStatus = 'idle' | 'loading' | 'valid' | 'used' | 'invalid';

// Visitors only get name + status. Signed-in staff also get contact details.
interface Participant {
  full_name: string;
  email?: string;
  phone?: string;
  ticket_code: string;
  created_at: string;
  is_checked: boolean;
}

const Verify = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const ticketFromUrl = searchParams.get('ticket');
  const [ticketInput, setTicketInput] = useState(ticketFromUrl || '');
  const [status, setStatus] = useState<VerificationStatus>(ticketFromUrl ? 'loading' : 'idle');
  const [participant, setParticipant] = useState<Participant | null>(null);
  const [isCheckingIn, setIsCheckingIn] = useState(false);
  const { toast } = useToast();
  const { isStaff, loading: authLoading } = useAuth();

  const verifyTicket = async (rawCode: string) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) {
      setStatus('idle');
      return;
    }

    setStatus('loading');
    try {
      let found: Participant | null = null;

      if (isStaff) {
        const { data, error } = await supabase
          .from('participants')
          .select('full_name, email, phone, ticket_code, created_at, is_checked')
          .eq('ticket_code', code)
          .maybeSingle();
        if (error) throw error;
        found = data;
      } else {
        const { data, error } = await supabase.rpc('verify_ticket', { _ticket_code: code });
        if (error) throw error;
        const row = data?.[0];
        found = row ? { ...row, ticket_code: code } : null;
      }

      if (!found) {
        setParticipant(null);
        setStatus('invalid');
        return;
      }

      setParticipant(found);
      setStatus(found.is_checked ? 'used' : 'valid');
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('invalid');
    }
  };

  useEffect(() => {
    if (ticketFromUrl && !authLoading) {
      setTicketInput(ticketFromUrl);
      verifyTicket(ticketFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketFromUrl, authLoading, isStaff]);

  const handleManualVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (ticketInput.trim()) {
      setSearchParams({ ticket: ticketInput.trim().toUpperCase() });
      verifyTicket(ticketInput);
    }
  };

  const handleCheckIn = async () => {
    if (!participant) return;

    setIsCheckingIn(true);
    try {
      const { data: checkedIn, error } = await supabase.rpc('check_in_ticket', {
        _ticket_code: participant.ticket_code,
      });

      if (error) throw error;

      if (!checkedIn) {
        // Someone else scanned it first.
        setParticipant({ ...participant, is_checked: true });
        setStatus('used');
        toast({
          title: 'Déjà utilisé',
          description: 'Ce billet a déjà été scanné.',
          variant: 'destructive',
        });
        return;
      }

      setParticipant({ ...participant, is_checked: true });
      setStatus('used');
      toast({
        title: 'Entrée validée',
        description: `${participant.full_name} est enregistré(e).`,
      });
    } catch (error: unknown) {
      toast({
        title: 'Échec de la validation',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setIsCheckingIn(false);
    }
  };

  const renderStatusIcon = () => {
    switch (status) {
      case 'idle':
        return <Ticket className="w-14 h-14 sm:w-16 sm:h-16 text-muted-foreground" />;
      case 'loading':
        return <Loader2 className="w-14 h-14 sm:w-16 sm:h-16 text-muted-foreground animate-spin" />;
      case 'valid':
        return <CheckCircle className="w-14 h-14 sm:w-16 sm:h-16 text-primary" />;
      case 'used':
        return <AlertTriangle className="w-14 h-14 sm:w-16 sm:h-16 text-[hsl(var(--paper))]" />;
      case 'invalid':
        return <XCircle className="w-14 h-14 sm:w-16 sm:h-16 text-destructive" />;
    }
  };

  const renderStatusBadge = () => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-primary text-primary-foreground">BILLET VALIDE</Badge>;
      case 'used':
        return <Badge variant="secondary" className="bg-[hsl(var(--paper))] text-[hsl(var(--brand-deep))] border-transparent">DÉJÀ UTILISÉ</Badge>;
      case 'invalid':
        return <Badge variant="destructive">BILLET INVALIDE</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background py-4 px-3 sm:py-12 sm:px-4">
      <div className="container max-w-lg mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors text-sm sm:text-base py-2">
          <ArrowLeft className="w-5 h-5" />
          Retour à l'accueil
        </Link>

        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="text-center pb-2 sm:pb-4">
            <div className="flex justify-center mb-3">
              {renderStatusIcon()}
            </div>
            <CardTitle className="text-xl sm:text-2xl">Vérification du billet</CardTitle>
            <CardDescription>Saisissez le code ou scannez le QR</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {/* Manual Input Form */}
            <form onSubmit={handleManualVerify} className="mb-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Code du billet..."
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value.toUpperCase())}
                  className="font-mono text-center text-base min-h-12 uppercase"
                />
                <Button type="submit" size="lg" className="min-h-12 px-4" disabled={status === 'loading'}>
                  {status === 'loading' ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Search className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </form>

            {status === 'idle' && (
              <p className="text-center text-muted-foreground text-sm">
                Saisissez un code ci-dessus pour le vérifier
              </p>
            )}

            {status === 'loading' && (
              <p className="text-center text-muted-foreground">Vérification…</p>
            )}

            {status === 'invalid' && (
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  {renderStatusBadge()}
                </div>
                <p className="text-muted-foreground text-sm">
                  Ce code est invalide ou n'existe pas.
                </p>
              </div>
            )}

            {(status === 'valid' || status === 'used') && participant && (
              <div className="space-y-4">
                <div className="flex justify-center mb-4">
                  {renderStatusBadge()}
                </div>

                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <User className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Nom complet</p>
                      <p className="font-medium text-foreground truncate">{participant.full_name}</p>
                    </div>
                  </div>

                  {participant.email && (
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Email</p>
                        <p className="font-medium text-foreground truncate">{participant.email}</p>
                      </div>
                    </div>
                  )}

                  {participant.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">Téléphone</p>
                        <p className="font-medium text-foreground">{participant.phone}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Inscrit le</p>
                      <p className="font-medium text-foreground">
                        {new Date(participant.created_at).toLocaleString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </div>

                {status === 'valid' && !isStaff && (
                  <div className="text-center text-sm text-muted-foreground py-2">
                    Présentez ce billet à l'entrée.{' '}
                    <Link
                      to="/admin/login"
                      state={{ from: `/verify?ticket=${participant.ticket_code}` }}
                      className="text-primary hover:underline"
                    >
                      Connexion staff
                    </Link>
                  </div>
                )}

                {status === 'valid' && isStaff && (
                  <Button
                    className="w-full min-h-14 text-base font-medium" 
                    onClick={handleCheckIn}
                    disabled={isCheckingIn}
                    size="lg"
                  >
                    {isCheckingIn ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Validation…
                      </>
                    ) : (
                      <>
                        <UserCheck className="mr-2 h-5 w-5" />
                        Valider l'entrée
                      </>
                    )}
                  </Button>
                )}

                {status === 'used' && (
                  <div className="text-center text-sm text-muted-foreground py-2">
                    Ce billet a déjà été utilisé pour entrer.
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="mt-6 flex flex-col gap-3">
          <Link 
            to="/admin/scan" 
            className="block text-center text-primary hover:text-primary/80 font-medium transition-colors py-3 px-4 bg-primary/5 rounded-lg"
          >
            Scanner un QR code →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Verify;
