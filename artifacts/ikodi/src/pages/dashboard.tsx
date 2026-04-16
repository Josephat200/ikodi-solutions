import { useGetDashboardSummary, useGetRecentActivity, useGetFinancialOverview, useGetSponsorshipStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Heart, DollarSign, AlertCircle, TrendingUp, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function Dashboard() {
  const { data: summary, isLoading } = useGetDashboardSummary();
  const { data: activity } = useGetRecentActivity();
  const { data: financial } = useGetFinancialOverview({});
  const { data: stats } = useGetSponsorshipStats();

  const pieData = stats ? [
    { name: "Fully Sponsored", value: stats.fullySponsored, color: "hsl(174 60% 35%)" },
    { name: "Partially Sponsored", value: stats.partiallySponsored, color: "hsl(35 100% 57%)" },
    { name: "Unsponsored", value: stats.unsponsored, color: "hsl(0 72% 51%)" },
  ] : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">IKODI Student Sponsorship Overview</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Total Students</p>
                <p className="text-3xl font-bold mt-1">{summary?.totalStudents ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{summary?.activeStudents ?? 0} active</p>
              </div>
              <div className="bg-primary/10 p-3 rounded-xl">
                <Users className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Active Sponsors</p>
                <p className="text-3xl font-bold mt-1">{summary?.activeSponsors ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{summary?.totalSponsors ?? 0} total</p>
              </div>
              <div className="bg-chart-2/20 p-3 rounded-xl">
                <Heart className="h-6 w-6 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Funds Received</p>
                <p className="text-2xl font-bold mt-1">{formatCurrency(summary?.totalFundsReceived ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Total contributions</p>
              </div>
              <div className="bg-green-100 p-3 rounded-xl">
                <DollarSign className="h-6 w-6 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground font-medium">Pending Fees</p>
                <p className="text-2xl font-bold mt-1 text-destructive">{formatCurrency(summary?.pendingFees ?? 0)}</p>
                <p className="text-xs text-muted-foreground mt-1">Outstanding balance</p>
              </div>
              <div className="bg-destructive/10 p-3 rounded-xl">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Monthly Fund Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {financial?.monthlyTrend && Array.isArray(financial.monthlyTrend) && financial.monthlyTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={financial.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="received" fill="hsl(174 60% 35%)" radius={[4,4,0,0]} name="Received" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No payment data yet</div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Sponsorship Status</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[220px] flex items-center justify-center text-muted-foreground text-sm">No students yet</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sponsorship Summary + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Sponsorship Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-primary/5 rounded-lg">
              <span className="text-sm font-medium">Fully Sponsored</span>
              <Badge className="bg-primary text-primary-foreground">{summary?.fullySponsored ?? 0}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
              <span className="text-sm font-medium">Partially Sponsored</span>
              <Badge className="bg-orange-500 text-white">{summary?.partiallySponsored ?? 0}</Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-destructive/5 rounded-lg">
              <span className="text-sm font-medium">Unsponsored</span>
              <Badge variant="destructive">{summary?.unsponsored ?? 0}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="col-span-1 lg:col-span-2 border-border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {Array.isArray(activity) && activity.length > 0 ? activity.map((item) => (
                <div key={item.id} className="flex items-start gap-3 py-2 border-b border-border last:border-0">
                  <div className="w-2 h-2 rounded-full bg-primary mt-2 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{item.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.performedBy && <span className="text-xs text-muted-foreground">{item.performedBy}</span>}
                      <span className="text-xs text-muted-foreground">{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                </div>
              )) : (
                <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
