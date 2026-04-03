import { useListAuditLogs } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Redirect } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert } from "lucide-react";
import { formatDate } from "@/lib/utils";

const actionColor: Record<string, string> = {
  create: "bg-green-100 text-green-800",
  update: "bg-blue-100 text-blue-800",
  delete: "bg-red-100 text-red-800",
  login: "bg-purple-100 text-purple-800",
  logout: "bg-gray-100 text-gray-800",
};

export default function AuditLogs() {
  const { user } = useAuth();
  if (user && user.role === "secretary") return <Redirect to="/" />;

  const { data: logs, isLoading } = useListAuditLogs({});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Audit Logs</h1>
        <p className="text-muted-foreground text-sm mt-1">System activity and change history</p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : !logs?.length ? (
            <div className="text-center py-12 text-muted-foreground"><ShieldAlert className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>No audit logs yet</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Timestamp</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">User</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Action</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">Entity</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden lg:table-cell">Description</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden xl:table-cell">IP Address</th>
                </tr></thead>
                <tbody>
                  {logs.map(l => (
                    <tr key={l.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-4 text-muted-foreground text-xs">{formatDate(l.createdAt)}</td>
                      <td className="py-3 px-4 font-medium">{l.performedBy ?? `User #${l.userId}`}</td>
                      <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${actionColor[l.action] ?? "bg-muted text-muted-foreground"}`}>{l.action}</span></td>
                      <td className="py-3 px-4 hidden md:table-cell"><Badge variant="outline" className="capitalize">{l.entityType}{l.entityId ? ` #${l.entityId}` : ""}</Badge></td>
                      <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground max-w-xs truncate">{l.description}</td>
                      <td className="py-3 px-4 hidden xl:table-cell text-muted-foreground font-mono text-xs">{l.ipAddress ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
