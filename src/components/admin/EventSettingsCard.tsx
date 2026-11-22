import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Settings2 } from 'lucide-react';

/** Open/close registrations and set the seat limit. Admins edit, staff read. */
export function EventSettingsCard({ ticketsIssued }: { ticketsIssued: number }) {
  const { isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [open, setOpen] = useState(true);
  const [maxTickets, setMaxTickets] = useState('');

  useEffect(() => {
    supabase
      .from('event_settings')
      .select('registrations_open, max_tickets')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setOpen(data.registrations_open);
          setMaxTickets(data.max_tickets ? String(data.max_tickets) : '');
        }
        setLoading(false);
      });
  }, []);

  const save = async () => {
    const trimmed = maxTickets.trim();
    const max = trimmed === '' ? null : Number(trimmed);
    if (max !== null && (!Number.isInteger(max) || max <= 0)) {
      toast({ title: 'Nombre de places invalide', description: 'Entrez un nombre entier positif, ou laissez vide.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from('event_settings')
      .update({ registrations_open: open, max_tickets: max, updated_at: new Date().toISOString() })
      .eq('id', 1);
    setSaving(false);
    if (error) {
      toast({ title: 'Enregistrement impossible', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Réglages enregistrés' });
    }
  };

  const max = Number(maxTickets) || null;
  const left = max ? Math.max(max - ticketsIssued, 0) : null;

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Settings2 className="h-5 w-5" />
          Billetterie
        </CardTitle>
        <CardDescription>
          {left === null
            ? `${ticketsIssued} billet${ticketsIssued > 1 ? 's' : ''} · places illimitées`
            : `${ticketsIssued} / ${max} billets · ${left} place${left > 1 ? 's' : ''} restante${left > 1 ? 's' : ''}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <div className="grid gap-6 sm:grid-cols-[auto_1fr_auto] sm:items-end">
            <div className="flex items-center gap-3">
              <Switch id="reg-open" checked={open} onCheckedChange={setOpen} disabled={!isAdmin} />
              <Label htmlFor="reg-open">{open ? 'Inscriptions ouvertes' : 'Inscriptions fermées'}</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="max-tickets">Nombre de places (vide = illimité)</Label>
              <Input
                id="max-tickets"
                inputMode="numeric"
                placeholder="ex. 300"
                value={maxTickets}
                onChange={(e) => setMaxTickets(e.target.value.replace(/[^0-9]/g, ''))}
                disabled={!isAdmin}
                className="max-w-[12rem]"
              />
            </div>
            {isAdmin ? (
              <Button onClick={save} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enregistrer'}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground">Seul un admin peut modifier.</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
