import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
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

interface Participant {
  id: string;
  full_name: string;
  email: string;
  phone: string;
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

  const verifyTicket = async (code: string) => {
    if (!code.trim()) {
      setStatus('idle');
      return;
    }

    setStatus('loading');
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .eq('ticket_code', code.trim().toUpperCase())
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setStatus('invalid');
        return;
      }

      setParticipant(data);
      setStatus(data.is_checked ? 'used' : 'valid');
    } catch (error) {
      console.error('Verification error:', error);
      setStatus('invalid');
    }
  };

  useEffect(() => {
    if (ticketFromUrl) {
      setTicketInput(ticketFromUrl);
      verifyTicket(ticketFromUrl);
    }
  }, [ticketFromUrl]);

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
      const { error } = await supabase
        .from('participants')
        .update({ is_checked: true })
        .eq('id', participant.id);

      if (error) throw error;

      setParticipant({ ...participant, is_checked: true });
      setStatus('used');
      toast({
        title: 'Check-in Successful',
        description: `${participant.full_name} has been checked in.`,
      });
    } catch (error: any) {
      toast({
        title: 'Check-in Failed',
        description: error.message,
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
        return <AlertTriangle className="w-14 h-14 sm:w-16 sm:h-16 text-yellow-500" />;
      case 'invalid':
        return <XCircle className="w-14 h-14 sm:w-16 sm:h-16 text-destructive" />;
    }
  };

  const renderStatusBadge = () => {
    switch (status) {
      case 'valid':
        return <Badge className="bg-primary text-primary-foreground">VALID TICKET</Badge>;
      case 'used':
        return <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">ALREADY USED</Badge>;
      case 'invalid':
        return <Badge variant="destructive">INVALID TICKET</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background py-4 px-3 sm:py-12 sm:px-4">
      <div className="container max-w-lg mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors text-sm sm:text-base py-2">
          <ArrowLeft className="w-5 h-5" />
          Back to Home
        </Link>

        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="text-center pb-2 sm:pb-4">
            <div className="flex justify-center mb-3">
              {renderStatusIcon()}
            </div>
            <CardTitle className="text-xl sm:text-2xl">Ticket Verification</CardTitle>
            <CardDescription>Enter ticket code or scan QR</CardDescription>
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {/* Manual Input Form */}
            <form onSubmit={handleManualVerify} className="mb-6">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter ticket code..."
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
                Enter a ticket code above to verify
              </p>
            )}

            {status === 'loading' && (
              <p className="text-center text-muted-foreground">Verifying ticket...</p>
            )}

            {status === 'invalid' && (
              <div className="text-center">
                <div className="flex justify-center mb-3">
                  {renderStatusBadge()}
                </div>
                <p className="text-muted-foreground text-sm">
                  This ticket code is invalid or does not exist.
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
                      <p className="text-xs text-muted-foreground">Full Name</p>
                      <p className="font-medium text-foreground truncate">{participant.full_name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="font-medium text-foreground truncate">{participant.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="font-medium text-foreground">{participant.phone}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-primary flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-muted-foreground">Registered</p>
                      <p className="font-medium text-foreground">
                        {new Date(participant.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {status === 'valid' && (
                  <Button 
                    className="w-full min-h-14 text-base font-medium" 
                    onClick={handleCheckIn}
                    disabled={isCheckingIn}
                    size="lg"
                  >
                    {isCheckingIn ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Checking In...
                      </>
                    ) : (
                      <>
                        <UserCheck className="mr-2 h-5 w-5" />
                        Mark as Checked-In
                      </>
                    )}
                  </Button>
                )}

                {status === 'used' && (
                  <div className="text-center text-sm text-muted-foreground py-2">
                    This ticket has already been used for entry.
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
            Scan QR Code →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Verify;
