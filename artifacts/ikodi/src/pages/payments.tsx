import { useState } from "react";
import { useListPayments, useCreatePayment, useDeletePayment, getListPaymentsQueryKey, useListStudents, useListSponsors } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, CreditCard } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

const methodColors: Record<string, string> = {
  mpesa: "bg-green-100 text-green-800",
  bank_transfer: "bg-blue-100 text-blue-800",
  cash: "bg-yellow-100 text-yellow-800",
  cheque: "bg-purple-100 text-purple-800",
  online: "bg-indigo-100 text-indigo-800",
};

export default function Payments() {
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ studentId: "", sponsorId: "", amount: "", paymentDate: new Date().toISOString().split("T")[0], paymentMethod: "mpesa", referenceNumber: "", purpose: "", term: "" });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: payments, isLoading } = useListPayments({});
  const { data: students } = useListStudents({});
  const { data: sponsors } = useListSponsors({});
  const create = useCreatePayment({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() }); setShowAdd(false); toast({ title: "Payment recorded" }); } } });
  const remove = useDeletePayment({ mutation: { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListPaymentsQueryKey() }); toast({ title: "Payment deleted" }); } } });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold">Payments</h1><p className="text-muted-foreground text-sm mt-1">Payment ledger and financial records</p></div>
        <Button onClick={() => setShowAdd(true)}><Plus className="h-4 w-4 mr-2" />Record Payment</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
          ) : !payments?.length ? (
            <div className="text-center py-12 text-muted-foreground"><CreditCard className="h-10 w-10 mx-auto mb-3 opacity-40" /><p>No payments recorded yet</p></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-border bg-muted/40">
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Sponsor</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden md:table-cell">Student</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground">Amount</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden lg:table-cell">Method</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden lg:table-cell">Reference</th>
                  <th className="text-left py-3 px-4 font-semibold text-muted-foreground hidden lg:table-cell">Term</th>
                  <th className="py-3 px-4"></th>
                </tr></thead>
                <tbody>
                  {payments.map(p => (
                    <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                      <td className="py-3 px-4">{formatDate(p.paymentDate)}</td>
                      <td className="py-3 px-4 font-medium">{p.sponsorName ?? "—"}</td>
                      <td className="py-3 px-4 hidden md:table-cell text-muted-foreground">{p.studentName ?? "—"}</td>
                      <td className="py-3 px-4 font-bold text-green-700">{formatCurrency(p.amount)}</td>
                      <td className="py-3 px-4 hidden lg:table-cell"><span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${methodColors[p.paymentMethod] ?? "bg-muted text-muted-foreground"}`}>{p.paymentMethod.replace("_", " ")}</span></td>
                      <td className="py-3 px-4 hidden lg:table-cell font-mono text-xs text-muted-foreground">{p.referenceNumber ?? "—"}</td>
                      <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">{p.term ?? "—"}</td>
                      <td className="py-3 px-4"><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { if (confirm("Delete this payment?")) remove.mutate({ id: p.id }); }}><Trash2 className="h-4 w-4" /></Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Sponsor</Label>
              <Select value={form.sponsorId} onValueChange={v => setForm(f => ({ ...f, sponsorId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select sponsor" /></SelectTrigger>
                <SelectContent>{sponsors?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Student</Label>
              <Select value={form.studentId} onValueChange={v => setForm(f => ({ ...f, studentId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select student" /></SelectTrigger>
                <SelectContent>{students?.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.firstName} {s.lastName}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Amount (KES) *</Label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="45000" /></div>
            <div className="space-y-1.5"><Label>Payment Date *</Label><Input type="date" value={form.paymentDate} onChange={e => setForm(f => ({ ...f, paymentDate: e.target.value }))} /></div>
            <div className="col-span-2 space-y-1.5">
              <Label>Payment Method *</Label>
              <Select value={form.paymentMethod} onValueChange={v => setForm(f => ({ ...f, paymentMethod: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                  <SelectItem value="online">Online</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5"><Label>Reference Number</Label><Input value={form.referenceNumber} onChange={e => setForm(f => ({ ...f, referenceNumber: e.target.value }))} placeholder="MPE-001-2026" /></div>
            <div className="space-y-1.5"><Label>Term</Label><Input value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))} placeholder="Term 1 2026" /></div>
            <div className="col-span-2 space-y-1.5"><Label>Purpose</Label><Input value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} placeholder="School fees..." /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
            <Button disabled={!form.amount || !form.paymentDate || create.isPending} onClick={() => create.mutate({ data: { studentId: form.studentId ? parseInt(form.studentId) : null, sponsorId: form.sponsorId ? parseInt(form.sponsorId) : null, amount: parseFloat(form.amount), paymentDate: form.paymentDate, paymentMethod: form.paymentMethod as any, referenceNumber: form.referenceNumber || null, purpose: form.purpose || null, term: form.term || null } })}>
              {create.isPending ? "Saving..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
