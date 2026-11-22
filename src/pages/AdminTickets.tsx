import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Trash2, Search, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface Ticket {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  ticket_code: string;
  created_at: string;
  is_checked: boolean;
  registered_by: string | null;
}

/**
 * Admin-only ticket management.
 * Opening /admin/tickets?supprimer=CODE (the link in the club notification
 * email) shows the delete confirmation for that ticket straight away.
 * Nothing is deleted without clicking "Supprimer" in the dialog, so email
 * link scanners that open the URL can't delete anything.
 */
const AdminTickets = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const linkedCode = (searchParams.get('supprimer') ?? '').trim().toUpperCase();

  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(linkedCode);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Ticket | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchTickets = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('participants')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({ title: 'Erreur de chargement', description: error.message, variant: 'destructive' });
      } else {
        const list = data || [];
        setTickets(list);
        if (linkedCode) {
          const match = list.find((t) => t.ticket_code === linkedCode);
          if (match) {
            setToDelete(match);
          } else {
            toast({
              title: 'Billet introuvable',
              description: `Le billet ${linkedCode} n'existe pas ou a déjà été supprimé.`,
            });
          }
        }
      }
      setLoading(false);
    };
    fetchTickets();
    // Run once on load; the link code is read from the URL at that moment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clearLink = () => {
    if (searchParams.has('supprimer')) {
      searchParams.delete('supprimer');
      setSearchParams(searchParams, { replace: true });
    }
  };

  const handleDelete = async (ticket: Ticket) => {
    setDeletingId(ticket.id);
    const { error } = await supabase.from('participants').delete().eq('id', ticket.id);

    if (error) {
      toast({ title: 'Suppression impossible', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: 'Billet supprimé',
        description: `Le billet de ${ticket.full_name} (${ticket.ticket_code}) a été supprimé.`,
      });
      setTickets((prev) => prev.filter((t) => t.id !== ticket.id));
      if (ticket.ticket_code === linkedCode) setSearch('');
    }
    setDeletingId(null);
    setToDelete(null);
    clearLink();
  };

  const q = search.toLowerCase();
  const filteredTickets = tickets.filter(
    (ticket) =>
      ticket.full_name.toLowerCase().includes(q) ||
      ticket.email.toLowerCase().includes(q) ||
      ticket.ticket_code.toLowerCase().includes(q) ||
      ticket.phone.includes(search)
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/admin/dashboard">
            <Button variant="ghost" size="icon" aria-label="Retour au tableau de bord">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Gestion des billets</h1>
            <p className="text-muted-foreground">Supprimer les billets annulés ou invalides</p>
          </div>
        </div>

        <Card className="border-primary/20 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="w-5 h-5" />
              Rechercher
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Nom, email, téléphone ou code du billet..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md"
            />
          </CardContent>
        </Card>

        <Card className="border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Supprimer des billets
            </CardTitle>
            <CardDescription>
              La suppression est définitive : le billet ne pourra plus être utilisé à l'entrée.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Chargement des billets…</p>
            ) : filteredTickets.length === 0 ? (
              <p className="text-muted-foreground">Aucun billet trouvé.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Téléphone</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => (
                      <TableRow
                        key={ticket.id}
                        className={ticket.ticket_code === linkedCode ? 'bg-destructive/10' : undefined}
                      >
                        <TableCell className="font-medium">{ticket.full_name}</TableCell>
                        <TableCell>{ticket.email}</TableCell>
                        <TableCell>{ticket.phone}</TableCell>
                        <TableCell className="font-mono text-sm">{ticket.ticket_code}</TableCell>
                        <TableCell>
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              ticket.is_checked ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {ticket.is_checked ? 'Entré' : 'Non utilisé'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={deletingId === ticket.id}
                            onClick={() => setToDelete(ticket)}
                            aria-label={`Supprimer le billet de ${ticket.full_name}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog
        open={!!toDelete}
        onOpenChange={(open) => {
          if (!open) {
            setToDelete(null);
            clearLink();
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce billet ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le billet de <strong>{toDelete?.full_name}</strong> ({toDelete?.ticket_code}
              {toDelete?.email ? `, ${toDelete.email}` : ''}) sera supprimé définitivement. Cette action est
              irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => toDelete && handleDelete(toDelete)}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminTickets;
