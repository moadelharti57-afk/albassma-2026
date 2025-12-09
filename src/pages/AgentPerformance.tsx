import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { normalizeMemberName } from '@/lib/clubMembers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ArrowLeft, Users, Ticket, CheckCircle, TrendingUp, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';

interface AgentStats {
  name: string;
  totalRegistrations: number;
  checkedIn: number;
  checkInRate: number;
}

const AgentPerformance = () => {
  const [agents, setAgents] = useState<AgentStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ registrations: 0, checkedIn: 0 });

  useEffect(() => {
    fetchAgentStats();
  }, []);

  const fetchAgentStats = async () => {
    try {
      const { data, error } = await supabase
        .from('participants')
        .select('registered_by, is_checked');

      if (error) throw error;

      // Group by normalized registered_by name
      const statsMap = new Map<string, { total: number; checked: number }>();
      
      data?.forEach((p) => {
        const agent = normalizeMemberName(p.registered_by);
        const current = statsMap.get(agent) || { total: 0, checked: 0 };
        current.total += 1;
        if (p.is_checked) current.checked += 1;
        statsMap.set(agent, current);
      });

      // Convert to array and calculate rates
      const agentStats: AgentStats[] = Array.from(statsMap.entries())
        .map(([name, stats]) => ({
          name,
          totalRegistrations: stats.total,
          checkedIn: stats.checked,
          checkInRate: stats.total > 0 ? Math.round((stats.checked / stats.total) * 100) : 0,
        }))
        .sort((a, b) => b.totalRegistrations - a.totalRegistrations);

      setAgents(agentStats);
      setTotals({
        registrations: data?.length || 0,
        checkedIn: data?.filter(p => p.is_checked).length || 0,
      });
    } catch (error) {
      console.error('Error fetching agent stats:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-4 px-3 sm:py-12 sm:px-4">
      <div className="container max-w-2xl mx-auto">
        <Link to="/admin/dashboard" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4 sm:mb-6 transition-colors text-sm sm:text-base py-2">
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>

        <Card className="border-primary/20 shadow-lg mb-6">
          <CardHeader className="text-center pb-2 sm:pb-4">
            <div className="w-14 h-14 sm:w-12 sm:h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
              <TrendingUp className="w-7 h-7 sm:w-6 sm:h-6 text-primary" />
            </div>
            <CardTitle className="text-xl sm:text-2xl">Member Performance</CardTitle>
            <CardDescription className="text-sm sm:text-base">
              Track registrations by club member
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
          <Card className="border-primary/10">
            <CardContent className="p-4 sm:p-6 text-center">
              <Ticket className="w-8 h-8 text-primary mx-auto mb-2" />
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{totals.registrations}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Total Tickets</p>
            </CardContent>
          </Card>
          <Card className="border-primary/10">
            <CardContent className="p-4 sm:p-6 text-center">
              <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{totals.checkedIn}</p>
              <p className="text-xs sm:text-sm text-muted-foreground">Checked In</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Chart */}
        {!loading && agents.length > 0 && (
          <Card className="border-primary/20 mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Registrations Comparison
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ChartContainer
                config={{
                  registrations: { label: "Registrations", color: "hsl(var(--primary))" },
                  checkedIn: { label: "Checked In", color: "hsl(var(--chart-2))" },
                }}
                className="h-[250px] w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={agents} 
                    layout="vertical" 
                    margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                  >
                    <XAxis type="number" tickLine={false} axisLine={false} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      tickLine={false} 
                      axisLine={false}
                      width={80}
                      tick={{ fontSize: 12 }}
                    />
                    <ChartTooltip 
                      content={<ChartTooltipContent />}
                      cursor={{ fill: 'hsl(var(--muted))' }}
                    />
                    <Bar dataKey="totalRegistrations" name="Registrations" radius={[0, 4, 4, 0]}>
                      {agents.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={index === 0 ? 'hsl(var(--chart-1))' : index === 1 ? 'hsl(var(--chart-2))' : index === 2 ? 'hsl(var(--chart-3))' : 'hsl(var(--primary))'}
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="checkedIn" name="Checked In" fill="hsl(var(--chart-4))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Agent List */}
        <Card className="border-primary/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Club Members
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-6 text-center text-muted-foreground">Loading...</div>
            ) : agents.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">No registrations yet</div>
            ) : (
              <div className="divide-y divide-border">
                {agents.map((agent, index) => (
                  <div 
                    key={agent.name} 
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500/20 text-yellow-600' :
                        index === 1 ? 'bg-gray-300/30 text-gray-600' :
                        index === 2 ? 'bg-orange-400/20 text-orange-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{agent.name}</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {agent.checkedIn}/{agent.totalRegistrations} checked in
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl sm:text-2xl font-bold text-primary">{agent.totalRegistrations}</p>
                      <p className="text-xs text-muted-foreground">{agent.checkInRate}% rate</p>
                    </div>
                  </div>
                ))}
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
            Scan Tickets →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AgentPerformance;
