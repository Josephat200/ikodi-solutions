import { useGetStudentsReport, useGetPaymentsReport, useGetSponsorContributionsReport, useGetSponsorshipStats } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Heart, Printer } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Reports() {
  const { data: studentReport } = useGetStudentsReport({});
  const { data: paymentsReport } = useGetPaymentsReport({});
  const { data: sponsorReport } = useGetSponsorContributionsReport({});
  const { data: stats } = useGetSponsorshipStats();

  const handlePrint = () => window.print();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">Analytics and printable reports</p>
        </div>
        <Button onClick={handlePrint} variant="outline">
          <Printer className="h-4 w-4 mr-2" />Print Report
        </Button>
      </div>

      {/* Print Header */}
      <div className="page-header-print hidden">
        <h1 className="text-2xl font-bold text-[#0F766E]">IKODI</h1>
        <p className="text-sm text-gray-600">Student Sponsorship Management System</p>
        <p className="text-sm text-gray-600 mt-1">Report generated on: {new Date().toLocaleDateString("en-KE", { year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {/* Sponsorship Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Total Students</p><p className="text-2xl font-bold mt-1">{(stats.fullySponsored ?? 0) + (stats.partiallySponsored ?? 0) + (stats.unsponsored ?? 0)}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Fully Sponsored</p><p className="text-2xl font-bold mt-1 text-primary">{stats.fullySponsored ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Partially Sponsored</p><p className="text-2xl font-bold mt-1 text-orange-500">{stats.partiallySponsored ?? 0}</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground">Unsponsored</p><p className="text-2xl font-bold mt-1 text-destructive">{stats.unsponsored ?? 0}</p></CardContent></Card>
        </div>
      )}

      {/* Student Report */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4 text-primary" />Student Report</CardTitle></CardHeader>
        <CardContent>
          {studentReport?.students && studentReport.students.length > 0 ? (
            <>
              <p className="text-sm text-muted-foreground mb-3">Showing {studentReport.students.length} student(s)</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/40">
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Admission No.</th>
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Name</th>
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground hidden md:table-cell">School</th>
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Status</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground hidden lg:table-cell">Balance</th>
                  </tr></thead>
                  <tbody>
                    {Array.isArray(studentReport?.students) && studentReport.students.slice(0, 20).map((s: any) => (
                      <tr key={s.id} className="border-b border-border/50">
                        <td className="py-2 px-3 font-mono text-xs text-muted-foreground">{s.admissionNumber}</td>
                        <td className="py-2 px-3 font-medium">{s.firstName} {s.lastName}</td>
                        <td className="py-2 px-3 hidden md:table-cell text-muted-foreground">{s.schoolName ?? "—"}</td>
                        <td className="py-2 px-3"><Badge variant={s.sponsorshipStatus === "sponsored" ? "default" : s.sponsorshipStatus === "partial" ? "outline" : "destructive"} className="capitalize">{s.sponsorshipStatus}</Badge></td>
                        <td className="py-2 px-3 text-right hidden lg:table-cell text-destructive font-medium">{s.balance != null ? formatCurrency(s.balance) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : <p className="text-muted-foreground text-sm">No student data</p>}
        </CardContent>
      </Card>

      {/* Payments Report */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-primary" />Financial Report</CardTitle></CardHeader>
        <CardContent>
          {paymentsReport?.payments && paymentsReport.payments.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div className="p-3 bg-green-50 rounded-lg text-center"><p className="text-xs text-muted-foreground">Total Received</p><p className="text-xl font-bold mt-1 text-green-700">{formatCurrency(paymentsReport.payments.reduce((s: number, p: any) => s + (p.amount ?? 0), 0))}</p></div>
                <div className="p-3 bg-muted/40 rounded-lg text-center"><p className="text-xs text-muted-foreground">Total Transactions</p><p className="text-xl font-bold mt-1">{paymentsReport.payments.length}</p></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/40">
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Date</th>
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Sponsor</th>
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground hidden md:table-cell">Student</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Amount</th>
                  </tr></thead>
                  <tbody>
                    {Array.isArray(paymentsReport?.payments) && paymentsReport.payments.slice(0, 20).map((p: any) => (
                      <tr key={p.id} className="border-b border-border/50">
                        <td className="py-2 px-3 text-muted-foreground">{formatDate(p.paymentDate)}</td>
                        <td className="py-2 px-3 font-medium">{p.sponsorName ?? "—"}</td>
                        <td className="py-2 px-3 hidden md:table-cell text-muted-foreground">{p.studentName ?? "—"}</td>
                        <td className="py-2 px-3 text-right font-semibold text-green-700">{formatCurrency(p.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : <p className="text-muted-foreground text-sm">No payment data</p>}
        </CardContent>
      </Card>

      {/* Sponsor Contributions */}
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Heart className="h-4 w-4 text-primary" />Sponsor Contributions</CardTitle></CardHeader>
        <CardContent>
          {Array.isArray(sponsorReport) && sponsorReport.length > 0 ? (
            <>
              {Array.isArray(sponsorReport) && sponsorReport.length >= 3 && (
                <div className="mb-4">
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={Array.isArray(sponsorReport) ? sponsorReport.slice(0, 8) : []}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="sponsorName" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                      <Bar dataKey="totalContributed" fill="hsl(174 60% 35%)" radius={[4,4,0,0]} name="Total" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-border bg-muted/40">
                    <th className="text-left py-2 px-3 font-semibold text-muted-foreground">Sponsor</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground">Total Contributed</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground hidden lg:table-cell">Payments</th>
                    <th className="text-right py-2 px-3 font-semibold text-muted-foreground hidden lg:table-cell">Students</th>
                  </tr></thead>
                  <tbody>
                    {Array.isArray(sponsorReport) && sponsorReport.map((s) => (
                      <tr key={s.sponsorId} className="border-b border-border/50">
                        <td className="py-2 px-3 font-medium">{s.sponsorName}</td>
                        <td className="py-2 px-3 text-right font-semibold text-primary">{formatCurrency(s.totalContributed)}</td>
                        <td className="py-2 px-3 text-right hidden lg:table-cell text-muted-foreground">{s.paymentCount}</td>
                        <td className="py-2 px-3 text-right hidden lg:table-cell text-muted-foreground">{s.studentsSponsored}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : <p className="text-muted-foreground text-sm">No sponsor contribution data</p>}
        </CardContent>
      </Card>

      {/* Print Footer */}
      <div className="page-footer-print hidden">
        <p>IKODI All rights reserved 2026.</p>
      </div>
    </div>
  );
}
