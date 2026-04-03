import { useRoute, Link } from "wouter";
import { useGetSponsor } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function SponsorDetail() {
  const [, params] = useRoute("/sponsors/:id");
  const id = parseInt(params?.id ?? "0");
  const { data: sponsor, isLoading } = useGetSponsor(id, { query: { enabled: !!id } });

  if (isLoading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>;
  if (!sponsor) return <div className="text-center py-20 text-muted-foreground">Sponsor not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/sponsors"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div>
          <h1 className="text-2xl font-bold">{sponsor.name}</h1>
          <Badge variant="outline" className="capitalize mt-1">{sponsor.type}</Badge>
        </div>
        <Badge className="ml-auto" variant={sponsor.status === "active" ? "default" : "secondary"}>{sponsor.status}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Total Contributed</p><p className="text-2xl font-bold text-primary mt-1">{formatCurrency(sponsor.totalContributed)}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Active Students</p><p className="text-2xl font-bold mt-1">{sponsor.activeStudents}</p></CardContent></Card>
        <Card><CardContent className="p-5"><p className="text-sm text-muted-foreground">Contact</p><p className="font-medium mt-1">{sponsor.phone ?? "—"}</p><p className="text-sm text-muted-foreground">{sponsor.email ?? "—"}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sponsorships */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Sponsorships</CardTitle></CardHeader>
          <CardContent>
            {(sponsor as any).sponsorships?.length > 0 ? (
              <div className="space-y-2">
                {(sponsor as any).sponsorships.map((sp: any) => (
                  <div key={sp.id} className="p-3 border border-border rounded-lg flex justify-between items-center">
                    <div>
                      <p className="font-medium text-sm">{sp.studentName ?? `Student #${sp.studentId}`}</p>
                      <p className="text-xs text-muted-foreground">{sp.term ?? "—"} • {sp.coverageType}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-sm">{formatCurrency(sp.amount)}</p>
                      <Badge variant={sp.status === "active" ? "default" : "secondary"} className="text-xs">{sp.status}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-muted-foreground text-sm">No sponsorships yet</p>}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Recent Payments</CardTitle></CardHeader>
          <CardContent>
            {(sponsor as any).recentPayments?.length > 0 ? (
              <div className="space-y-2">
                {(sponsor as any).recentPayments.slice(0, 8).map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center py-2 border-b border-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{formatDate(p.paymentDate)}</p>
                      <p className="text-xs text-muted-foreground capitalize">{p.paymentMethod?.replace("_", " ")}</p>
                    </div>
                    <p className="font-semibold text-green-700">{formatCurrency(p.amount)}</p>
                  </div>
                ))}
              </div>
            ) : <p className="text-muted-foreground text-sm">No payments recorded</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
