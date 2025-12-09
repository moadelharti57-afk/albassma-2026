import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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
  AlertDialogTrigger,
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

const AdminTickets = () => {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchTickets = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('participants')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Error fetching tickets', description: error.message, variant: 'destructive' });
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('participants').delete().eq('id', id);

    if (error) {
      toast({ title: 'Error deleting ticket', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Ticket deleted', description: 'The ticket has been permanently removed.' });
      setTickets(tickets.filter(t => t.id !== id));
    }
    setDeletingId(null);
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.full_name.toLowerCase().includes(search.toLowerCase()) ||
    ticket.email.toLowerCase().includes(search.toLowerCase()) ||
    ticket.ticket_code.toLowerCase().includes(search.toLowerCase()) ||
    ticket.phone.includes(search)
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/admin/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Manage Tickets</h1>
            <p className="text-muted-foreground">Delete cancelled or invalid tickets</p>
          </div>
        </div>

        <Card className="border-primary/20 mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Tickets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Input
              placeholder="Search by name, email, phone or ticket code..."
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
              Delete Tickets
            </CardTitle>
            <CardDescription>
              Permanently remove tickets from the system. This action cannot be undone.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading tickets...</p>
            ) : filteredTickets.length === 0 ? (
              <p className="text-muted-foreground">No tickets found.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Ticket Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTickets.map((ticket) => (
                      <TableRow key={ticket.id}>
                        <TableCell className="font-medium">{ticket.full_name}</TableCell>
                        <TableCell>{ticket.email}</TableCell>
                        <TableCell>{ticket.phone}</TableCell>
                        <TableCell className="font-mono text-sm">{ticket.ticket_code}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs ${ticket.is_checked ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                            {ticket.is_checked ? 'Checked In' : 'Not Used'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="sm" disabled={deletingId === ticket.id}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Ticket?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This will permanently delete the ticket for <strong>{ticket.full_name}</strong> ({ticket.ticket_code}). This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(ticket.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
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
    </div>
  );
};

export default AdminTickets;
