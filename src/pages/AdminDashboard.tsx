import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Users, CheckCircle, XCircle, ScanLine, TrendingUp, LogOut } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

interface Participant {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  ticket_code: string;
  created_at: string;
  is_checked: boolean;
  registered_by: string | null;
}

const AdminDashboard = () => {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [filteredParticipants, setFilteredParticipants] = useState<Participant[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const { signOut } = useAuth();

  useEffect(() => {
    fetchParticipants();
  }, []);

  useEffect(() => {
    filterParticipants();
  }, [searchTerm, statusFilter, participants]);

  const fetchParticipants = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("participants")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching participants:", error);
    } else {
      setParticipants(data || []);
    }
    setLoading(false);
  };

  const filterParticipants = () => {
    let filtered = [...participants];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.full_name.toLowerCase().includes(term) ||
          p.email.toLowerCase().includes(term) ||
          p.phone.includes(term) ||
          p.ticket_code.toLowerCase().includes(term) ||
          (p.registered_by && p.registered_by.toLowerCase().includes(term))
      );
    }

    // Status filter
    if (statusFilter === "checked") {
      filtered = filtered.filter((p) => p.is_checked);
    } else if (statusFilter === "pending") {
      filtered = filtered.filter((p) => !p.is_checked);
    }

    setFilteredParticipants(filtered);
  };

  const totalParticipants = participants.length;
  const checkedIn = participants.filter((p) => p.is_checked).length;
  const pending = totalParticipants - checkedIn;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground">Albassma Film - Participant Management</p>
            </div>
            <div className="flex gap-2">
              <Link to="/admin/performance">
                <Button variant="outline" className="gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Performance
                </Button>
              </Link>
              <Link to="/admin/scan">
                <Button variant="outline" className="gap-2">
                  <ScanLine className="h-4 w-4" />
                  QR Scanner
                </Button>
              </Link>
              <Button variant="ghost" className="gap-2" onClick={signOut}>
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Participants
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalParticipants}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Checked In
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{checkedIn}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pending
              </CardTitle>
              <XCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pending}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, phone, or ticket code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="checked">Checked In</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={fetchParticipants}>
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredParticipants.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No participants found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Ticket Code</TableHead>
                      <TableHead>Club Member</TableHead>
                      <TableHead>Registered</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredParticipants.map((participant) => (
                      <TableRow key={participant.id}>
                        <TableCell className="font-medium">
                          {participant.full_name}
                        </TableCell>
                        <TableCell>{participant.email}</TableCell>
                        <TableCell>{participant.phone}</TableCell>
                        <TableCell className="font-mono text-sm">
                          {participant.ticket_code}
                        </TableCell>
                        <TableCell>
                          {participant.registered_by || '-'}
                        </TableCell>
                        <TableCell>
                          {new Date(participant.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {participant.is_checked ? (
                            <Badge className="bg-primary/10 text-primary border-primary/20">
                              Checked In
                            </Badge>
                          ) : (
                            <Badge variant="outline">Pending</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Link to={`/verify?ticket=${participant.ticket_code}`}>
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          Showing {filteredParticipants.length} of {totalParticipants} participants
        </p>
      </main>
    </div>
  );
};

export default AdminDashboard;
